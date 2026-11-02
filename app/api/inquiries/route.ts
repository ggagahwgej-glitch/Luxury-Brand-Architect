import { NextResponse } from "next/server";
import { inquirySchema } from "@/lib/validation/inquiry";
import { getRepository } from "@/lib/data";
import { checkRateLimit, hashIdentifier, INQUIRY_RATE_LIMIT } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public enquiry endpoint. Writes go through the server so the browser never
 * holds a database credential and enquires can be validated, rate-limited and
 * spam-checked before they are stored.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const ip = await clientIp();
  const ipHash = hashIdentifier(ip);
  const limit = checkRateLimit(`inquiry:${ipHash}`, INQUIRY_RATE_LIMIT.limit, INQUIRY_RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "You have sent several enquiries already. Please wait a few minutes, or contact us on WhatsApp.",
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await readJson(request);
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return jsonError("Please check the highlighted fields and try again.", 422, { fieldErrors });
  }

  // Honeypot / instant-submission heuristics: respond as though accepted so
  // automated clients receive no signal, but store nothing.
  if (parsed.data.company || (parsed.data.elapsedMs !== undefined && parsed.data.elapsedMs < 1200)) {
    return jsonOk({ message: "Thank you — your enquiry has been received." });
  }

  try {
    const inquiry = await getRepository().createInquiry(
      {
        propertyId: parsed.data.propertyId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        message: parsed.data.message,
        intent: parsed.data.intent,
      },
      { ipHash, userAgent: request.headers.get("user-agent") },
    );
    return jsonOk({ message: "Thank you — a private advisor will respond within one business day.", id: inquiry.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your enquiry could not be saved.";
    console.error("[inquiries] create failed:", error);
    const status = message.includes("no longer available") ? 409 : 500;
    return jsonError(
      status === 500 ? "Your enquiry could not be saved right now. Please try again or contact us on WhatsApp." : message,
      status,
    );
  }
}
