/**
 * Schema verification — runs the real migrations against an in-process Postgres
 * (PGlite) and checks the constraints and RLS policies the application relies
 * on. No Supabase project and no network access required.
 *
 *   npm run verify:sql
 *
 * Supabase-specific pieces (the `auth` and `storage` schemas, `auth.uid()`) are
 * stubbed below exactly as far as the migrations touch them. If a migration is
 * edited, run this before deploying — it is the only way to know the SQL still
 * applies cleanly.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(
    /^\s*create extension[^;]*;\s*$/gim,
    "-- (extension line skipped: PGlite has no pgcrypto)",
  );

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  accepted_mime_types text[],
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);
`;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const db = await PGlite.create();
await db.exec(BOOTSTRAP);

for (const file of [
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_rls_policies.sql",
  "supabase/migrations/0003_storage.sql",
]) {
  try {
    await db.exec(read(file));
    check(`apply ${file}`, true);
  } catch (error) {
    check(`apply ${file}`, false, error.message.split("\n")[0]);
    process.exit(1);
  }
}

try {
  await db.exec(read("supabase/seed.sql"));
  check("apply supabase/seed.sql", true);
} catch (error) {
  check("apply supabase/seed.sql", false, error.message.split("\n")[0]);
}

// ── structure ───────────────────────────────────────────────────────────────
const tables = await db.query(`select tablename from pg_tables where schemaname = 'public'`);
const names = tables.rows.map((row) => row.tablename);
for (const table of [
  "profiles",
  "properties",
  "property_media",
  "inquiries",
  "site_settings",
  "owner_security",
  "login_attempts",
]) {
  check(`table ${table} exists`, names.includes(table));
}

const rls = await db.query(
  `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
);
for (const row of rls.rows) check(`RLS enabled on ${row.relname}`, row.relrowsecurity === true);

const bucket = await db.query(`select public, accepted_mime_types from storage.buckets where id = 'property-media'`);
check("storage bucket 'property-media' exists and is public", bucket.rows[0]?.public === true);

const settings = await db.query(`select id from public.site_settings`);
check("site_settings singleton row exists", settings.rows.length === 1);

// ── constraints and triggers ────────────────────────────────────────────────
async function expectError(sql, label) {
  try {
    await db.exec(sql);
    check(label, false, "statement unexpectedly succeeded");
  } catch (error) {
    check(label, true, error.message.split("\n")[0].slice(0, 80));
  }
}

const ownerId = "11111111-1111-4111-8111-111111111111";
await db.exec(`insert into auth.users (id, email) values ('${ownerId}', 'owner@example.com')`);
await db.exec(`insert into public.profiles (id, email, full_name, role, is_authorized)
  values ('${ownerId}', 'owner@example.com', 'Owner', 'owner', true)`);

const propertyId = "22222222-2222-4222-8222-222222222222";
await db.exec(`
  insert into public.properties (id, slug, title, description, property_type, purpose, price, location, built_up_area, status, is_published, is_featured)
  values ('${propertyId}', 'test-villa', 'Test Villa', 'Description', 'villa', 'sale', 12500000.00, 'Guwahati', 3200.50, 'available', true, true)
`);

const generated = await db.query(`select area_display from public.properties where id = '${propertyId}'`);
check("area_display is generated from built_up_area", Number(generated.rows[0].area_display) === 3200.5);

await expectError(
  `insert into public.properties (slug, title, description, property_type, purpose, price, location, status)
   values ('bad-status', 'Bad Status', '', 'villa', 'sale', 100, 'Guwahati', 'nonsense')`,
  "invalid status is rejected",
);
await expectError(
  `insert into public.properties (slug, title, description, property_type, purpose, price, location)
   values ('zero-price', 'Zero Price', '', 'villa', 'sale', 0, 'Guwahati')`,
  "price must be > 0",
);
await expectError(
  `insert into public.properties (slug, title, description, property_type, purpose, price, location)
   values ('Bad Slug', 'Bad Slug', '', 'villa', 'sale', 100, 'Guwahati')`,
  "slug format is enforced",
);
await expectError(
  `insert into public.properties (slug, title, description, property_type, purpose, price, location)
   values ('test-villa', 'Duplicate', '', 'villa', 'sale', 100, 'Guwahati')`,
  "slug is unique",
);

await db.exec(`insert into public.property_media (property_id, url, media_type, sort_order, is_cover)
  values ('${propertyId}', 'https://example.com/a.jpg', 'image', 0, true)`);
await expectError(
  `insert into public.property_media (property_id, url, media_type, sort_order, is_cover)
   values ('${propertyId}', 'https://example.com/b.jpg', 'image', 1, true)`,
  "only one cover image per property",
);

const before = (await db.query(`select updated_at from public.properties where id = '${propertyId}'`)).rows[0].updated_at;
await new Promise((resolve) => setTimeout(resolve, 10));
await db.exec(`update public.properties set title = 'Test Villa Updated' where id = '${propertyId}'`);
const after = (await db.query(`select updated_at from public.properties where id = '${propertyId}'`)).rows[0].updated_at;
check("updated_at trigger fires", new Date(after) > new Date(before));

// ── RLS behaviour ───────────────────────────────────────────────────────────
async function asAnon(sql) {
  await db.exec("set role anon");
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}

const anonPublished = await asAnon(`select count(*)::int as n from public.properties where is_published = true`);
check("anon can read published properties", anonPublished.rows[0].n >= 1);

await db.exec(`insert into public.properties (slug, title, description, property_type, purpose, price, location, is_published)
  values ('draft-listing', 'Draft Listing', '', 'villa', 'sale', 900000, 'Guwahati', false)`);
const anonDraft = await asAnon(`select count(*)::int as n from public.properties where is_published = false`);
check("anon cannot see drafts", anonDraft.rows[0].n === 0);

const anonInquiries = await asAnon(`select count(*)::int as n from public.inquiries`).then(
  (result) => result.rows[0].n,
  (error) => `denied (${error.code})`,
);
check("anon cannot read inquiries", anonInquiries === 0 || String(anonInquiries).startsWith("denied"), String(anonInquiries));

let anonInsertBlocked = false;
try {
  await asAnon(
    `insert into public.inquiries (name, phone, email, message, intent) values ('x','9999999999','x@example.com','hi','visit')`,
  );
} catch {
  anonInsertBlocked = true;
}
check("anon cannot insert inquiries", anonInsertBlocked);

const anonSettings = await asAnon(`select count(*)::int as n from public.site_settings`);
check("anon can read site settings", anonSettings.rows[0].n === 1);

const strangerId = "33333333-3333-4333-8333-333333333333";
await db.exec(`insert into auth.users (id, email) values ('${strangerId}', 'stranger@example.com')`);
await db.exec(
  `insert into public.profiles (id, email, role, is_authorized) values ('${strangerId}', 'stranger@example.com', 'owner', false)`,
);
await db.exec("set role authenticated");
await db.exec(`select set_config('test.uid', '${strangerId}', false)`);
const strangerRead = await db.query(`select count(*)::int as n from public.inquiries`).then(
  (result) => result.rows[0].n,
  (error) => `denied (${error.code})`,
);
check("unauthorised account cannot read inquiries", strangerRead === 0 || String(strangerRead).startsWith("denied"));
await db.exec("reset role");

await db.exec("set role authenticated");
await db.exec(`select set_config('test.uid', '${ownerId}', false)`);
const ownerRead = await db
  .query(`select count(*)::int as n from public.properties`)
  .catch((error) => ({ rows: [{ n: `denied (${error.code})` }] }));
check("authorised owner can read all properties (incl. drafts)", ownerRead.rows[0].n >= 2);
const ownerFlag = await db.query(`select public.is_owner() as ok`);
check("is_owner() true only for the authorised owner", ownerFlag.rows[0].ok === true);
await db.exec("reset role");

// ── owner provisioning SQL printed by `npm run owner:hash` ──────────────────
const provision = `
insert into public.profiles (id, email, full_name, role, is_authorized)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email), 'owner', true
from auth.users where lower(email) = lower('owner@example.com')
on conflict (id) do update
  set email = excluded.email, role = 'owner', is_authorized = true, updated_at = now();

insert into public.owner_security (user_id, secret_code_hash)
select id, '$2b$12$abcdefghijklmnopqrstuv'
from auth.users where lower(email) = lower('owner@example.com')
on conflict (user_id) do update
  set secret_code_hash = excluded.secret_code_hash, failed_attempts = 0, locked_until = null, updated_at = now();
`;
try {
  await db.exec(provision);
  const provisioned = await db.query(`select p.role, p.is_authorized, s.secret_code_hash is not null as has_hash
    from public.profiles p join public.owner_security s on s.user_id = p.id
    where p.email = 'owner@example.com'`);
  check(
    "owner provisioning SQL from `npm run owner:hash` works",
    provisioned.rows[0]?.is_authorized === true && provisioned.rows[0]?.has_hash === true,
  );
} catch (error) {
  check("owner provisioning SQL from `npm run owner:hash` works", false, error.message.split("\n")[0]);
}

const failures = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failures}/${results.length} checks passed\n`);
process.exit(failures ? 1 : 0);
