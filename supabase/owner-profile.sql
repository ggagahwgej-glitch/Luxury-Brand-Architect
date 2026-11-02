-- ============================================================================
--  AUTHORISE THE OWNER  (run after supabase/apply-all.sql)
--
--  The owner account must already exist in Supabase → Authentication → Users
--  (create it there with "Auto Confirm User", or run `npm run owner:create`).
--
--  Replace the email in the WHERE clause with the owner's email, paste this into
--  the Supabase SQL editor and run it. It is safe to run again.
--
--  This is the phone/tablet-friendly alternative to `npm run owner:create` for
--  the default two-factor sign-in (email + password). A 12-digit access code is
--  only needed when OWNER_ACCESS_CODE=enabled — see `npm run owner:hash`.
-- ============================================================================

insert into public.profiles (id, email, full_name, role, is_authorized)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
  'owner',
  true
from auth.users u
where lower(u.email) = lower('rohitsaha0795@gmail.com')   -- ← change this email
on conflict (id) do update
  set email      = excluded.email,
      role       = 'owner',
      is_authorized = true,
      updated_at = now();

-- Verify: should return exactly one row with role = owner, is_authorized = true.
select p.email, p.role, p.is_authorized, p.created_at
from public.profiles p
where p.role = 'owner';
