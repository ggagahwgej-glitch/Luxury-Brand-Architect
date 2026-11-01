import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Provider resolution is the guard that keeps a misconfigured deployment from
 * silently serving (and writing) demo data from the local JSON store.
 */
async function loadEnvModule() {
  vi.resetModules();
  return import("@/lib/env");
}

describe("data provider resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the local preview provider outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATA_PROVIDER", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { resolveDataProvider } = await loadEnvModule();
    expect(resolveDataProvider()).toBe("local");
  });

  it("refuses to fall back to the local provider in a production build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_PROVIDER", "");
    vi.stubEnv("ALLOW_LOCAL_PROVIDER", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { resolveDataProvider } = await loadEnvModule();
    expect(() => resolveDataProvider()).toThrow(/No data provider is configured/i);
  });

  it("allows the local provider in production only when explicitly opted in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_PROVIDER", "local");
    vi.stubEnv("ALLOW_LOCAL_PROVIDER", "1");
    const { resolveDataProvider } = await loadEnvModule();
    expect(resolveDataProvider()).toBe("local");
  });

  it("requires full Supabase configuration when supabase is requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_PROVIDER", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { resolveDataProvider } = await loadEnvModule();
    expect(() => resolveDataProvider()).toThrow(/requires NEXT_PUBLIC_SUPABASE_URL/i);
  });

  it("never ships hardcoded preview credentials", async () => {
    vi.stubEnv("LOCAL_OWNER_EMAIL", "");
    vi.stubEnv("LOCAL_OWNER_PASSWORD", "");
    vi.stubEnv("LOCAL_OWNER_CODE", "");
    const { localOwnerCredentials } = await loadEnvModule();
    expect(localOwnerCredentials()).toBeNull();

    vi.stubEnv("LOCAL_OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("LOCAL_OWNER_PASSWORD", "secret-value");
    vi.stubEnv("LOCAL_OWNER_CODE", "123456789012");
    const reloaded = await loadEnvModule();
    expect(reloaded.localOwnerCredentials()).toEqual({
      email: "owner@example.com",
      password: "secret-value",
      code: "123456789012",
    });
  });
});
