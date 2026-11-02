import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/token";

const secret = "test-secret-value-that-is-long-enough-for-hmac";

describe("admin session tokens", () => {
  it("round-trips a signed payload", async () => {
    const token = await createSessionToken(
      { sub: "owner-id", email: "owner@example.com", name: "Owner", sid: "session-id" },
      secret,
    );
    const payload = await verifySessionToken(token, secret);
    expect(payload?.sub).toBe("owner-id");
    expect(payload?.email).toBe("owner@example.com");
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken(
      { sub: "owner-id", email: "owner@example.com", name: "Owner", sid: "session-id" },
      secret,
    );
    const [body, signature] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ sub: "attacker", email: "a@b.com", name: "A", sid: "x", iat: 1, exp: 9999999999 }),
    )
      .toString("base64url");
    expect(await verifySessionToken(`${forgedBody}.${signature}`, secret)).toBeNull();
    expect(await verifySessionToken(`${body}.${"a".repeat(43)}`, secret)).toBeNull();
    expect(await verifySessionToken("garbage", secret)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(
      { sub: "owner-id", email: "owner@example.com", name: "Owner", sid: "session-id" },
      "another-secret-value-that-is-different",
    );
    expect(await verifySessionToken(token, secret)).toBeNull();
  });

  it("rejects expired sessions", async () => {
    const token = await createSessionToken(
      { sub: "owner-id", email: "owner@example.com", name: "Owner", sid: "session-id" },
      secret,
      -10,
    );
    expect(await verifySessionToken(token, secret)).toBeNull();
  });
});
