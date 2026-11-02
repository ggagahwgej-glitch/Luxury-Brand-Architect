import "server-only";
import { createHmac } from "node:crypto";

/**
 * Fixed-window rate limiter.
 *
 * This is an in-process limiter: it protects a single running instance and is
 * sufficient for the standard single-region deployment of one client site.
 * Durable login auditing is handled separately (owner_security + login_attempts
 * in Supabase). For multi-instance serverless deployments, front the login
 * endpoint with a shared limiter (e.g. Upstash Redis) — documented in README.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt).slice(0, 500);
    for (const [key] of oldest) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000), limit };
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return { allowed: bucket.count <= limit, remaining, retryAfterSeconds, limit };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Salted, non-reversible identifier — we never store raw IP addresses. */
export function hashIdentifier(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "development-only-salt";
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 40);
}

export const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };
export const INQUIRY_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };
export const UPLOAD_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
