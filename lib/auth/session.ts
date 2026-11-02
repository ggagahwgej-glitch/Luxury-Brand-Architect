import "server-only";
import { publicSiteUrl } from "@/lib/env";
export {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  ADMIN_SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/token";

/**
 * Admin session cookie policy.
 * HttpOnly + SameSite=Lax, Secure in production, 8 hour absolute lifetime.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Secure whenever the site is served over HTTPS (the production norm).
    secure: publicSiteUrl.startsWith("https://"),
    path: "/",
    maxAge: 8 * 60 * 60,
  };
}
