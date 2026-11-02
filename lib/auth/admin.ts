import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdminSecret } from "@/lib/env";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth/session";
import type { AdminSessionPayload } from "@/lib/types";

/**
 * Server-side authorisation helpers. Every admin page and API route calls one
 * of these before touching data — route hiding is never treated as security.
 */

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token, assertAdminSecret());
  } catch {
    return null;
  }
}

/** For pages: redirects unauthenticated visitors to the discreet login screen. */
export async function requireAdminPage(nextPath = "/admin/dashboard"): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

/** For API routes: returns null and lets the caller answer 401. */
export async function requireAdminApi(): Promise<AdminSessionPayload | null> {
  return getAdminSession();
}

export async function ownerDisplayName(): Promise<string> {
  const session = await getAdminSession();
  return session?.name || "Owner";
}

/** Best-effort client IP, used only as a salted hash for rate limiting/audit. */
export async function clientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerStore.get("x-real-ip") ?? "unknown";
}
