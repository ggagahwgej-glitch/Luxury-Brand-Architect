import { describe, expect, it } from "vitest";
import { describeDatabaseError } from "@/lib/db-errors";

describe("database error translation", () => {
  it("explains an unmigrated project", () => {
    expect(describeDatabaseError({ message: 'relation "public.profiles" does not exist', code: "42P01" })).toMatch(
      /apply-all\.sql/,
    );
    expect(describeDatabaseError({ message: "Could not find the table 'public.profiles' in the schema cache" })).toMatch(
      /not set up yet/,
    );
  });

  it("points at the secret key when authentication fails", () => {
    expect(describeDatabaseError({ message: "Invalid API key" })).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(describeDatabaseError({ message: "permission denied for table profiles" })).toMatch(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("distinguishes an unreachable project", () => {
    expect(describeDatabaseError({ message: "TypeError: fetch failed" })).toMatch(/could not be reached/);
  });

  it("falls back without leaking internals", () => {
    const message = describeDatabaseError({ message: "unexpected internal detail" });
    expect(message).not.toContain("internal detail");
    expect(message.length).toBeGreaterThan(10);
  });
});
