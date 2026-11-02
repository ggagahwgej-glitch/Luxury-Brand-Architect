import "server-only";
import { NextResponse } from "next/server";

export type ApiError = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
};

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function jsonError(error: string, status = 400, extra: Partial<ApiError> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** JSON bodies are metadata only (media travels as multipart), so 1 MB is generous. */
const MAX_JSON_BYTES = 1_000_000;

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Defence-in-depth against cross-site state-changing requests.
 * Cookies are already SameSite=Lax; this rejects mismatched origins outright.
 */
export function isSameOrigin(request: Request) {
  // Browsers label every cross-site request; honour that even when no Origin
  // header is present (older clients, some form posts).
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl) have no Origin
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("host");
    return !host || originHost === host;
  } catch {
    return false;
  }
}

export function forbiddenOrigin() {
  return jsonError("This request was rejected because it came from an unexpected origin.", 403);
}
