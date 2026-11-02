/**
 * Edge-safe session token primitives (Web Crypto only).
 * Imported by middleware, route handlers and server components.
 */
import type { AdminSessionPayload } from "@/lib/types";


export const ADMIN_COOKIE = "aurum_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
export const ADMIN_SESSION_MAX_AGE = ADMIN_SESSION_TTL_SECONDS;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function sign(payload: string, secret: string) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(
  payload: Omit<AdminSessionPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS,
) {
  const now = Math.floor(Date.now() / 1000);
  const full: AdminSessionPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(full)));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<AdminSessionPayload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const expected = await sign(body, secret);
    // Constant-time comparison.
    if (expected.length !== signature.length) return null;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i += 1) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as AdminSessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
