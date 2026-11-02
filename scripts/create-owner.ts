/**
 * One-command owner provisioning (optional shortcut for the dashboard steps).
 *
 *   npm run owner:create -- owner@client.com "strong-password" 741852963147
 *
 * The 12-digit code may be omitted when OWNER_ACCESS_CODE=disabled; it is then
 * not stored and the Studio asks only for email + password.
 *
 * Requires the schema to exist ("npm run sql:bundle" pasted into the SQL editor)
 * and the service/secret key in .env.local. It is idempotent: running it again
 * rotates the password and the access code for the same email instead of
 * creating a second account.
 *
 * What it does:
 *   1. creates (or updates) the Supabase Auth user with the email confirmed
 *   2. upserts the profiles row as role=owner, is_authorized=true
 *   3. stores a bcrypt hash of the 12-digit code in owner_security
 */
import "./load-env";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

function fail(message: string): never {
  console.error(`✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  const [email, password, code] = process.argv.slice(2);

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail('Provide the owner email.\n  npm run owner:create -- owner@client.com "strong-password" 741852963147');
  }
  if (!password || password.length < 10) {
    fail("Provide a password of at least 10 characters.");
  }
  const codeRequired = !["disabled", "off", "false", "0"].includes(
    (process.env.OWNER_ACCESS_CODE ?? "enabled").toLowerCase(),
  );
  if (code && !/^\d{12}$/.test(code)) {
    fail("The access code must be exactly 12 digits (or omit it when OWNER_ACCESS_CODE=disabled).");
  }
  if (!code && codeRequired) {
    fail(
      "This deployment expects a 12-digit access code. Pass one, e.g.\n  npm run owner:create -- owner@client.com \"strong-password\" 741852963147",
    );
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !service) {
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // The tables must exist before anything else can be written.
  const { error: schemaError } = await admin.from("profiles").select("id", { head: true, count: "exact" });
  if (schemaError) {
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|timeout/i.test(schemaError.message)) {
      fail(`Could not reach ${url}. Check the URL, that the project is not paused, and this machine's network.`);
    }
    fail(
      `The database is not ready: ${schemaError.message}\n  Paste supabase/apply-all.sql into the Supabase SQL editor first.`,
    );
  }

  // ── auth user ────────────────────────────────────────────────────────────
  let userId: string | null = null;
  const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) fail(`Could not list users: ${listError.message}`);
  const match = existing?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (match) {
    userId = match.id;
    const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) fail(`Could not update the existing user: ${error.message}`);
    console.log(`✓ Existing auth user updated (${email})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) fail(`Could not create the auth user: ${error?.message ?? "no user returned"}`);
    userId = data.user.id;
    console.log(`✓ Auth user created (${email}) — email already confirmed`);
  }

  // ── profile ──────────────────────────────────────────────────────────────
  const { error: profileError } = await admin.from("profiles").upsert(
    { id: userId, email, role: "owner", is_authorized: true, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (profileError) fail(`Could not authorise the owner profile: ${profileError.message}`);
  console.log("✓ profiles row authorised as owner");

  // ── 12-digit code ────────────────────────────────────────────────────────
  if (!code) {
    console.log("• OWNER_ACCESS_CODE=disabled — no 12-digit code stored (email + password only)");
    console.log(`\nDone. Sign in at /admin/login with the email ${email} and the password you just set.\n`);
    return;
  }

  const hash = await bcrypt.hash(code, 12);
  const { error: securityError } = await admin.from("owner_security").upsert(
    {
      user_id: userId,
      secret_code_hash: hash,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (securityError) fail(`Could not store the access-code hash: ${securityError.message}`);
  console.log("✓ owner_security hash stored (the code itself is never saved)");

  // ── verify ───────────────────────────────────────────────────────────────
  // owner_security references auth.users (not profiles), so it is read
  // separately rather than embedded.
  const [{ data: profile }, { data: security }] = await Promise.all([
    admin.from("profiles").select("email, role, is_authorized").eq("id", userId).maybeSingle(),
    admin.from("owner_security").select("secret_code_hash").eq("user_id", userId).maybeSingle(),
  ]);

  const profileRow = profile as { role?: string; is_authorized?: boolean } | null;
  const securityRow = security as { secret_code_hash?: string } | null;

  if (profileRow?.role !== "owner" || profileRow.is_authorized !== true || !securityRow?.secret_code_hash) {
    fail("Verification failed — the owner rows were written but could not be read back as expected.");
  }

  console.log(`\nDone. Sign in at /admin/login with:\n  email     ${email}\n  password  (the one you just set)\n  code      the 12-digit code you passed\n`);
  console.log("The code cannot be recovered from the hash — keep it offline.\n");
}

main().catch((error) => {
  console.error("✗ Owner provisioning failed:", error instanceof Error ? error.message : error);
  console.error("  Check the Supabase URL/key and that supabase/apply-all.sql has been applied.\n");
  process.exit(1);
});
