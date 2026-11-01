/**
 * Configuration / backend health check.
 *
 *   npm run seed:check
 *
 * Verifies environment variables, database reachability, required tables,
 * RLS status, the storage bucket and the owner provisioning state.
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
];

function line(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  let failures = 0;
  const provider = process.env.DATA_PROVIDER ?? (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local");

  console.log(`\nBackend check · provider=${provider}\n`);

  if (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32) {
    line(true, "ADMIN_SESSION_SECRET present (>= 32 chars)");
  } else {
    failures += 1;
    line(false, "ADMIN_SESSION_SECRET missing or shorter than 32 characters");
  }

  if (provider === "local") {
    line(true, "Local preview provider — no Supabase required");
    console.log("\nThis configuration is for development only. Set DATA_PROVIDER=supabase and the Supabase keys for production.\n");
    process.exit(failures ? 1 : 0);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "property-media";

  if (!line(Boolean(url), "NEXT_PUBLIC_SUPABASE_URL set")) failures += 1;
  if (!line(Boolean(anon), "NEXT_PUBLIC_SUPABASE_ANON_KEY set")) failures += 1;
  if (!line(Boolean(service), "SUPABASE_SERVICE_ROLE_KEY set (server-only)")) failures += 1;
  if (!url || !anon || !service) process.exit(1);

  const admin = createClient(url, service, { auth: { persistSession: false } });

  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select("*", { count: "exact", head: true });
    failures += line(!error, `table public.${table}`, error?.message ?? "") ? 0 : 1;
  }

  const { data: settings, error: settingsError } = await admin.from("site_settings").select("id").eq("id", 1).maybeSingle();
  failures += line(!settingsError && Boolean(settings), "site_settings singleton row") ? 0 : 1;

  const { count: ownerCount, error: ownerError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("is_authorized", true);
  failures += line(!ownerError && (ownerCount ?? 0) > 0, "authorised owner profile", `${ownerCount ?? 0} found`) ? 0 : 1;

  const { count: securityCount, error: securityError } = await admin
    .from("owner_security")
    .select("user_id", { count: "exact", head: true });
  failures += line(!securityError && (securityCount ?? 0) > 0, "owner_security record with 12-digit code hash") ? 0 : 1;

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  const bucketFound = (buckets ?? []).some((entry) => entry.name === bucket);
  failures += line(!bucketError && bucketFound, `storage bucket "${bucket}"`) ? 0 : 1;

  // Public anon key must NOT be able to read inquiries.
  const publicClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: leaked, error: leakError } = await publicClient.from("inquiries").select("id").limit(1);
  failures += line(!leaked?.length && Boolean(leakError), "inquiries are not readable with the anon key") ? 0 : 1;

  const { data: published, error: publishedError } = await publicClient
    .from("properties")
    .select("id")
    .eq("is_published", true)
    .limit(1);
  failures += line(!publishedError, "anon key can read published properties") ? 0 : 1;

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) need attention.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("✗ Backend check failed:", error);
  process.exit(1);
});
