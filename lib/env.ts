/**
 * Server-side environment access with explicit, fail-fast semantics.
 * Nothing in this module is safe to import from a client component except
 * `publicSiteUrl` and `dataProvider` (both derived from NEXT_PUBLIC_* values).
 */

export type DataProviderName = "supabase" | "local";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const publicSiteUrl = (read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/$/, "");

export const supabaseUrl = read("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const supabaseServiceRoleKey = read("SUPABASE_SERVICE_ROLE_KEY");
export const supabaseBucket = read("SUPABASE_STORAGE_BUCKET") ?? "property-media";
export const adminSessionSecret = read("ADMIN_SESSION_SECRET");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);

/**
 * Provider resolution:
 *  - explicit DATA_PROVIDER wins;
 *  - otherwise Supabase is used when fully configured;
 *  - the local preview provider is never allowed in a production build.
 */
export function resolveDataProvider(): DataProviderName {
  const requested = read("DATA_PROVIDER");
  if (requested === "local") {
    if (process.env.NODE_ENV === "production" && read("ALLOW_LOCAL_PROVIDER") !== "1") {
      throw new Error(
        "DATA_PROVIDER=local is a development-only preview provider and is blocked in production builds. Configure Supabase instead.",
      );
    }
    return "local";
  }
  if (requested === "supabase") {
    if (!isSupabaseConfigured) {
      throw new Error(
        "DATA_PROVIDER=supabase requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return "supabase";
  }
  return isSupabaseConfigured ? "supabase" : "local";
}

export function assertAdminSecret() {
  const secret = adminSessionSecret;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or too short (minimum 32 characters). Generate one with `openssl rand -base64 48`.",
    );
  }
  return secret;
}

export const localOwnerCredentials = {
  email: read("LOCAL_OWNER_EMAIL") ?? "owner@aurumestates.com",
  password: read("LOCAL_OWNER_PASSWORD") ?? "RoyalAccess2026!",
  code: read("LOCAL_OWNER_CODE") ?? "741852963147",
};
