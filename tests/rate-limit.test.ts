import { describe, expect, it } from "vitest";
import { checkRateLimit, hashIdentifier, resetRateLimit } from "@/lib/auth/rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    resetRateLimit(key);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("hashes identifiers irreversibly and deterministically", () => {
    const a = hashIdentifier("203.0.113.5");
    const b = hashIdentifier("203.0.113.5");
    expect(a).toBe(b);
    expect(a).not.toContain("203.0.113.5");
    expect(hashIdentifier("203.0.113.6")).not.toBe(a);
  });
});
