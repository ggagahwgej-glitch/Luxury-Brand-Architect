import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateOwner } from "@/lib/auth/owner";
import { createSessionToken } from "@/lib/auth/token";
import { sessionCookieOptions, ADMIN_COOKIE } from "@/lib/auth/session";
import { assertAdminSecret, resolveDataProvider } from "@/lib/env";
import { checkRateLimit, hashIdentifier, LOGIN_RATE_LIMIT, resetRateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/admin";
import { isSameOrigin, jsonError, readJson } from "@/lib/api";
import { uuid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request origin rejected.", 403);

  const ip = await clientIp();
  const ipHash = hashIdentifier(ip);
  const limit = checkRateLimit(`login:${ipHash}`, LOGIN_RATE_LIMIT.limit, LOGIN_RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many sign-in attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) before trying again.`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return jsonError("Please correct the highlighted fields.", 422, { fieldErrors });
  }

  // A deployment that has not been given its environment variables should say
  // so plainly instead of failing with a generic error on every attempt.
  try {
    resolveDataProvider();
    assertAdminSecret();
  } catch (error) {
    console.error("[login] deployment is not configured:", error);
    return jsonError(
      "The Owner Studio is not configured on this deployment yet. Add the Supabase and ADMIN_SESSION_SECRET environment variables, then redeploy.",
      503,
    );
  }

  let result;
  try {
    result = await authenticateOwner({
      email: parsed.data.email,
      password: parsed.data.password,
      code: parsed.data.code,
      ipHash,
    });
  } catch (error) {
    console.error("[login] unexpected failure:", error);
    return jsonError("Sign-in could not be completed right now. Please try again shortly.", 500);
  }

  if (!result.ok) {
    const status = result.reason === "locked" ? 429 : result.reason === "config" ? 500 : 401;
    return NextResponse.json(
      { ok: false, error: result.message, retryAfterSeconds: result.retryAfterSeconds },
      { status, headers: result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : undefined },
    );
  }

  let secret: string;
  try {
    secret = assertAdminSecret();
  } catch (error) {
    console.error("[login] session secret missing:", error);
    return jsonError("Admin sessions are not configured on this deployment (ADMIN_SESSION_SECRET).", 500);
  }

  const token = await createSessionToken(
    { sub: result.owner.id, email: result.owner.email, name: result.owner.name, sid: uuid() },
    secret,
  );

  // A successful, fully verified sign-in clears the throttle for this client.
  resetRateLimit(`login:${ipHash}`);

  const response = NextResponse.json({ ok: true, redirectTo: "/admin/dashboard", name: result.owner.name });
  response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions());
  return response;
}
