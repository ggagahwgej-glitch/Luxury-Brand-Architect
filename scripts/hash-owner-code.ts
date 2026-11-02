/**
 * Generates the bcrypt hash for an owner's permanent 12-digit access code.
 *
 *   npm run owner:hash -- 741852963147 owner@example.com
 *
 * The printed SQL must be run against the client's Supabase project. The raw
 * code is NEVER stored, logged to the repository or sent to the browser.
 */
import bcrypt from "bcryptjs";

async function main() {
  const [code, email] = process.argv.slice(2);

  if (!code || !/^\d{12}$/.test(code)) {
    console.error("✗ Provide a 12-digit numeric code.\n  Example: npm run owner:hash -- 741852963147 owner@example.com");
    process.exit(1);
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("✗ Provide the owner's email address as the second argument.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(code, 12);
  // Emails are only used inside single quotes below.
  const safeEmail = email.replace(/'/g, "''");

  console.log("\nOwner access code hash generated (bcrypt, cost 12).\n");
  console.log("Paste this into the Supabase SQL editor. It provisions the profile row,");
  console.log("authorises it as the owner and stores only the hash of the code:\n");
  console.log(`-- 1) authorise (or create) the owner profile
insert into public.profiles (id, email, full_name, role, is_authorized)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email), 'owner', true
from auth.users
where lower(email) = lower('${safeEmail}')
on conflict (id) do update
  set email = excluded.email,
      role = 'owner',
      is_authorized = true,
      updated_at = now();

-- 2) store the 12-digit code hash
insert into public.owner_security (user_id, secret_code_hash)
select id, '${hash}'
from auth.users
where lower(email) = lower('${safeEmail}')
on conflict (user_id) do update
  set secret_code_hash = excluded.secret_code_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = now();
`);
  console.log("Keep the 12-digit code offline. It cannot be recovered from the hash.\n");
}

main().catch((error) => {
  console.error("✗ Failed to hash code:", error);
  process.exit(1);
});
