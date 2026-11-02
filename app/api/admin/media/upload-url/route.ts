import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/api";
import { checkRateLimit, UPLOAD_RATE_LIMIT } from "@/lib/auth/rate-limit";
import { createSignedUpload, UploadError, type UploadKind } from "@/lib/storage";
import { MAX_PROXY_UPLOAD_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(200 * 1024 * 1024),
  kind: z.enum(["image", "video", "brand"]).default("image"),
});

/**
 * Tells the browser how to upload a file.
 *
 * On Supabase the file is PUT straight to Storage with a signed URL, because
 * Vercel caps serverless request bodies at ~4.5 MB (any larger video or photo
 * would fail before reaching our code). With the local preview provider there
 * is no object storage, so the browser posts the file to /api/admin/media/upload
 * instead and the route writes it to disk.
 */
export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) return jsonError("Not authorised.", 401);
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const limit = checkRateLimit(`upload:${session.sub}`, UPLOAD_RATE_LIMIT.limit, UPLOAD_RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Upload limit reached. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("The file details could not be read.", 422);

  const kind = parsed.data.kind as UploadKind;

  try {
    const upload = await createSignedUpload(parsed.data, kind);
    if (!upload) {
      return jsonOk({ strategy: "proxy" as const, maxBytes: MAX_PROXY_UPLOAD_BYTES });
    }
    return jsonOk({ strategy: "direct" as const, upload });
  } catch (error) {
    if (error instanceof UploadError) return jsonError(error.message, 400);
    console.error("[media/upload-url] signing failed:", error);
    // The browser falls back to the proxy route for small files.
    return jsonOk({ strategy: "proxy" as const, maxBytes: MAX_PROXY_UPLOAD_BYTES });
  }
}
