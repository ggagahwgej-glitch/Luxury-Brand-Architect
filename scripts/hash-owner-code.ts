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

  console.log("\nOwner access code hash generated (bcrypt, cost 12).\n");
  console.log("Run this in the Supabase SQL editor, replacing the email after checking it:\n");
  console.log(`insert into public.owner_security (user_id, secret_code_hash)
select id, '${hash}'
from auth.users
where lower(email) = lower('${email}')
on conflict (user_id) do update
  set secret_code_hash = excluded.secret_code_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = now();

update public.profiles
set role = 'owner', is_authorized = true, updated_at = now()
where id = (select id from auth.users where lower(email) = lower('${email}'));
`);
  console.log("Keep the 12-digit code offline. It cannot be recovered from the hash.\n");
}

main().catch((error) => {
  console.error("✗ Failed to hash code:", error);
  process.exit(1);
});
