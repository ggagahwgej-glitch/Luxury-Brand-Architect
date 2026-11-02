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

/**
 * Canonical site origin.
 *
 * Order: explicit `NEXT_PUBLIC_SITE_URL` → Vercel's own deployment hosts →
 * localhost. The Vercel fallbacks matter because canonical URLs, OG tags,
 * robots.txt and the sitemap are built from this value at request time; without
 * them a deployment that forgets the variable would advertise localhost.
 */
function resolvePublicSiteUrl() {
  const explicit = read("NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelHost = read("VERCEL_PROJECT_PRODUCTION_URL") ?? read("VERCEL_URL");
  if (vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export const publicSiteUrl = resolvePublicSiteUrl();

/** True when the origin was configured explicitly (not derived from the host). */
export const publicSiteUrlIsExplicit = Boolean(read("NEXT_PUBLIC_SITE_URL"));

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
export function localProviderAllowed() {
  // The preview provider writes to the local filesystem, which is read-only and
  // ephemeral on Vercel — never allow it there, even if someone opts in.
  if (read("VERCEL") === "1") return false;
  // Outside a production build the preview provider is always available.
  // Inside one it must be opted into explicitly, so a deployment that simply
  // forgot its environment variables fails loudly instead of quietly serving
  // (and writing) demo data from the local JSON store.
  return process.env.NODE_ENV !== "production" || read("ALLOW_LOCAL_PROVIDER") === "1";
}

export function resolveDataProvider(): DataProviderName {
  const requested = read("DATA_PROVIDER");

  if (requested === "supabase") {
    if (!isSupabaseConfigured) {
      throw new Error(
        "DATA_PROVIDER=supabase requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return "supabase";
  }

  if (requested === "local" || !isSupabaseConfigured) {
    if (!localProviderAllowed()) {
      throw new Error(
        requested === "local"
          ? "DATA_PROVIDER=local is a development-only preview provider and is blocked in production builds. Configure Supabase instead."
          : "No data provider is configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see README.md).",
      );
    }
    return "local";
  }

  return "supabase";
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

/**
 * Credentials for the development preview provider.
 *
 * There are deliberately no fallback values: a checkout with no `.env.local`
 * must never accept a password that is visible in the source tree. Returns
 * null until all three variables are supplied (see `.env.example`).
 */
export function localOwnerCredentials(): { email: string; password: string; code: string } | null {
  const email = read("LOCAL_OWNER_EMAIL");
  const password = read("LOCAL_OWNER_PASSWORD");
  const code = read("LOCAL_OWNER_CODE");
  if (!email || !password || !code) return null;
  return { email, password, code };
}

/**
 * Configuration diagnostics for server logs. Called from the root layout so a
 * misconfigured deployment prints an actionable line instead of failing with an
 * opaque 500. Never throws and never logs secret values.
 */
let diagnosticsLogged = false;
export function logConfigDiagnostics() {
  if (diagnosticsLogged || process.env.NODE_ENV !== "production") return;
  diagnosticsLogged = true;

  const warnings: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) warnings.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) warnings.push("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!adminSessionSecret || adminSessionSecret.length < 32) warnings.push("ADMIN_SESSION_SECRET is missing or shorter than 32 characters");
  if (!publicSiteUrlIsExplicit) warnings.push(`NEXT_PUBLIC_SITE_URL is not set (using ${publicSiteUrl})`);
  if (read("ALLOW_LOCAL_PROVIDER") === "1") warnings.push("ALLOW_LOCAL_PROVIDER is set — remove it in production");

  if (warnings.length) {
    console.error(`[config] deployment is missing recommended variables:\n  - ${warnings.join("\n  - ")}`);
  }
}
