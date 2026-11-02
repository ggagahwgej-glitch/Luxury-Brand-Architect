/**
 * Configuration / backend health check — run this first on any new deployment.
 *
 *   npm run seed:check
 *
 * Verifies environment variables, database reachability, schema, RLS, the
 * storage bucket and the owner provisioning state, and prints the exact fix for
 * anything that is missing. Exit code 1 means "do not announce the site yet".
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_TABLES = [
  "profiles",
  "properties",
  "property_media",
  "inquiries",
  "site_settings",
  "owner_security",
  "login_attempts",
];

const hints: string[] = [];

function line(ok: boolean, label: string, detail = "", hint?: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok && hint && !hints.includes(hint)) hints.push(hint);
  return ok;
}

function normaliseUrl(value: string | undefined) {
  if (!value) return undefined;
  let url = value.trim().replace(/\/+$/, "");
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** A denied/invalid-relation error proves the check; a transport error does not. */
function isRealDenial(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  if (!message) return false;
  if (/fetch failed|network|timeout|ENOTFOUND|ECONNREFUSED|socket hang up/i.test(message)) return false;
  return /permission denied|does not exist|invalid api key|no api key|JWT|PGRST|schema cache|not found/i.test(message);
}

async function main() {
  let failures = 0;
  const provider = process.env.DATA_PROVIDER ?? (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local");

  console.log(`\nBackend check · provider=${provider}\n`);

  // ── environment ──────────────────────────────────────────────────────────
  if (!line(
    Boolean(process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32),
    "ADMIN_SESSION_SECRET present (>= 32 characters)",
    process.env.ADMIN_SESSION_SECRET ? `${process.env.ADMIN_SESSION_SECRET.length} chars` : "missing",
    "Add ADMIN_SESSION_SECRET to .env.local / Vercel → generate one with: openssl rand -base64 48",
  )) failures += 1;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  failures += line(
    Boolean(siteUrl && /^https?:\/\//.test(siteUrl)),
    "NEXT_PUBLIC_SITE_URL set",
    siteUrl ?? "missing",
    "Add NEXT_PUBLIC_SITE_URL (e.g. https://your-domain.com, no trailing slash)",
  ) ? 0 : 1;

  if (provider === "local") {
    line(true, "Local preview provider — no Supabase required");
    console.log("\nThis configuration is for development only. Set DATA_PROVIDER=supabase and the Supabase keys for production.\n");
    process.exit(failures ? 1 : 0);
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = normaliseUrl(rawUrl);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "property-media";

  failures += line(
    Boolean(url),
    "NEXT_PUBLIC_SUPABASE_URL is a valid URL",
    url ?? rawUrl ?? "missing",
    "Paste the Project URL exactly as shown in Supabase → Project Settings → API (no trailing slash)",
  ) ? 0 : 1;
  failures += line(
    Boolean(anon),
    "NEXT_PUBLIC_SUPABASE_ANON_KEY set (publishable key)",
    anon ? `${anon.slice(0, 12)}…` : "missing",
    "Add the publishable key (sb_publishable_…) as NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ) ? 0 : 1;
  failures += line(
    Boolean(service),
    "SUPABASE_SERVICE_ROLE_KEY set (server-only)",
    service ? `${service.slice(0, 10)}…` : "missing",
    "Add the secret key (sb_secret_…) as SUPABASE_SERVICE_ROLE_KEY — server-side only, never NEXT_PUBLIC_",
  ) ? 0 : 1;

  if (!url || !anon || !service) {
    console.log("\nCannot reach the database without the three Supabase values. See README → Production setup.\n");
    process.exit(1);
  }

  // Pre-flight: a wrong URL/key otherwise shows up as fifteen identical
  // "fetch failed" lines that look like schema problems.
  try {
    const preflight = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(10000),
    });
    if (preflight.status === 401 || preflight.status === 403) {
      console.log(`✗ Supabase rejected the publishable key (HTTP ${preflight.status}).`);
      console.log("  Copy it again from Project Settings → API keys.\n");
      process.exit(1);
    }
    line(true, `Supabase project reachable (${url})`, `HTTP ${preflight.status}`);
  } catch (error) {
    console.log(`✗ Cannot reach ${url} — ${error instanceof Error ? error.message : "network error"}`);
    console.log("  Check the Project URL, that the project is not paused, and your network/egress rules.\n");
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // ── schema ───────────────────────────────────────────────────────────────
  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select("*", { count: "exact", head: true });
    failures += line(
      !error,
      `table public.${table}`,
      error?.message ?? "",
      "Apply supabase/migrations/0001, 0002, 0003 in the Supabase SQL editor (in that order), then supabase/seed.sql",
    ) ? 0 : 1;
  }

  const { data: settings, error: settingsError } = await admin
    .from("site_settings")
    .select("id, branding")
    .eq("id", 1)
    .maybeSingle();
  failures += line(
    !settingsError && Boolean(settings),
    "site_settings singleton row (id = 1)",
    settingsError?.message ?? (settings ? "present" : "missing"),
    "Run supabase/seed.sql, or open Studio → Settings once the schema exists",
  ) ? 0 : 1;

  const branding = (settings as { branding?: Record<string, unknown> } | null)?.branding;
  failures += line(
    Boolean(branding && typeof branding === "object" && Object.keys(branding).length > 0),
    "site settings branding is populated (or falls back to defaults)",
    branding ? `${Object.keys(branding).length} keys` : "empty object — defaults will be used",
  ) ? 0 : 1;

  // ── owner provisioning ───────────────────────────────────────────────────
  const { data: owner, error: ownerError } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "owner")
    .eq("is_authorized", true)
    .maybeSingle();
  failures += line(
    !ownerError && Boolean(owner),
    "authorised owner profile",
    ownerError?.message ?? (owner ? String((owner as { email: string }).email) : "none"),
    "Create the owner in Authentication → Users (auto-confirm), then insert the profiles row (README → 3.3)",
  ) ? 0 : 1;

  const { data: security, error: securityError } = await admin
    .from("owner_security")
    .select("user_id, secret_code_hash")
    .maybeSingle();
  const securityRow = security as { user_id?: string; secret_code_hash?: string } | null;
  failures += line(
    !securityError && Boolean(securityRow?.secret_code_hash),
    "owner_security record with the 12-digit code hash",
    securityError?.message ?? (securityRow?.secret_code_hash ? "hash present" : "missing"),
    "Run: npm run owner:hash <12-digit-code> <owner-email> and execute the printed SQL",
  ) ? 0 : 1;

  if (owner && securityRow?.user_id && securityRow.user_id !== (owner as { id: string }).id) {
    failures += line(
      false,
      "owner_security belongs to the authorised owner",
      "user_id mismatch",
      "owner_security.user_id must equal the profiles.id of the owner account",
    ) ? 0 : 1;
  }

  // ── storage ──────────────────────────────────────────────────────────────
  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  const found = (buckets ?? []).find((entry) => entry.name === bucket);
  failures += line(
    !bucketError && Boolean(found),
    `storage bucket "${bucket}"`,
    bucketError?.message ?? (found ? `public=${found.public}` : "missing"),
    "Run supabase/migrations/0003_storage.sql (it creates the bucket), or create it manually as a public bucket",
  ) ? 0 : 1;
  if (found) {
    failures += line(
      found.public === true,
      `bucket "${bucket}" is public-read`,
      String(found.public),
      "Make the bucket public (Object URL reads are used by the website)",
    ) ? 0 : 1;
  }

  // ── RLS guarantees with the public key ───────────────────────────────────
  const publicClient = createClient(url, anon, { auth: { persistSession: false } });

  const { data: leakedInquiries, error: inquiriesError } = await publicClient.from("inquiries").select("id").limit(1);
  failures += line(
    !leakedInquiries?.length && isRealDenial(inquiriesError),
    "inquiries are not readable with the anon key",
    inquiriesError ? inquiriesError.message : `${leakedInquiries?.length ?? 0} row(s) visible`,
    "Re-apply supabase/migrations/0002_rls_policies.sql — enquiries must never be public",
  ) ? 0 : 1;

  const { data: leakedSecurity, error: securityLeakError } = await publicClient
    .from("owner_security")
    .select("user_id")
    .limit(1);
  failures += line(
    !leakedSecurity?.length && isRealDenial(securityLeakError),
    "owner_security is not readable with the anon key",
    securityLeakError ? "denied" : `${leakedSecurity?.length ?? 0} row(s) visible`,
    "Re-apply supabase/migrations/0002_rls_policies.sql",
  ) ? 0 : 1;

  const { data: published, error: publishedError } = await publicClient
    .from("properties")
    .select("id")
    .eq("is_published", true)
    .limit(1);
  failures += line(
    !publishedError,
    "anon key can read published properties",
    publishedError?.message ?? `${published?.length ?? 0} row(s)`,
    "Check the select grant/policy on public.properties in migration 0002",
  ) ? 0 : 1;

  const { error: settingsReadError } = await publicClient.from("site_settings").select("id").eq("id", 1).limit(1);
  failures += line(
    !settingsReadError,
    "anon key can read site settings",
    settingsReadError?.message ?? "ok",
    "Check the select grant/policy on public.site_settings in migration 0002",
  ) ? 0 : 1;

  // ── auth configuration ───────────────────────────────────────────────────
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const auth = (await response.json()) as {
        external?: Record<string, boolean>;
        disable_signup?: boolean;
        mailer_autoconfirm?: boolean;
      };
      failures += line(
        auth.external?.email !== false,
        "email/password sign-in enabled in Supabase Auth",
        auth.external?.email === false ? "disabled" : "enabled",
        "Supabase → Authentication → Providers → Email: enable it",
      ) ? 0 : 1;
      failures += line(
        auth.disable_signup === true,
        "public sign-ups disabled (only the owner should exist)",
        auth.disable_signup === true ? "disabled" : "enabled",
        "Supabase → Authentication → Sign In / Providers → turn off \"Allow new users to sign up\"",
      ) ? 0 : 1;
      if (auth.mailer_autoconfirm === false) {
        line(true, "email confirmation is on — the owner account must be confirmed or auto-confirmed");
      }
    } else {
      line(true, "auth settings endpoint not readable (skipped)", `HTTP ${response.status}`);
    }
  } catch (error) {
    line(true, "auth settings endpoint unreachable (skipped)", error instanceof Error ? error.message : "network error");
  }

  // ── summary ──────────────────────────────────────────────────────────────
  console.log(`\n${failures === 0 ? "All checks passed — the deployment is ready." : `${failures} check(s) need attention.`}`);
  if (hints.length) {
    console.log("\nHow to fix:");
    for (const hint of hints) console.log(`  • ${hint}`);
  }
  console.log("");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("✗ Backend check failed:", error instanceof Error ? error.message : error);
  console.error("  Check that NEXT_PUBLIC_SUPABASE_URL is reachable and the service key is correct.\n");
  process.exit(1);
});
