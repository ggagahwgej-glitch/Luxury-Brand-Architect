-- ============================================================================
--  0002 · ROW LEVEL SECURITY
--  The application server uses the service role for writes (never exposed to
--  the browser). These policies are the second layer: they guarantee that the
--  public anon key can only ever read public listing data.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.properties     enable row level security;
alter table public.property_media enable row level security;
alter table public.inquiries      enable row level security;
alter table public.site_settings  enable row level security;
alter table public.owner_security enable row level security;
alter table public.login_attempts enable row level security;

-- Force RLS for table owners too (defence in depth).
alter table public.owner_security force row level security;
alter table public.login_attempts force row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "Owner can read own profile" on public.profiles;
create policy "Owner can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Owner can update own profile" on public.profiles;
create policy "Owner can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = 'owner');

-- No insert/delete policies: profiles are provisioned by the administrator.

-- ── properties ──────────────────────────────────────────────────────────────
drop policy if exists "Public can read published properties" on public.properties;
create policy "Public can read published properties"
  on public.properties for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Owner can read all properties" on public.properties;
create policy "Owner can read all properties"
  on public.properties for select
  to authenticated
  using (public.is_owner());

drop policy if exists "Owner can insert properties" on public.properties;
create policy "Owner can insert properties"
  on public.properties for insert
  to authenticated
  with check (public.is_owner());

drop policy if exists "Owner can update properties" on public.properties;
create policy "Owner can update properties"
  on public.properties for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists "Owner can delete properties" on public.properties;
create policy "Owner can delete properties"
  on public.properties for delete
  to authenticated
  using (public.is_owner());

-- ── property_media ──────────────────────────────────────────────────────────
drop policy if exists "Public can read media of published properties" on public.property_media;
create policy "Public can read media of published properties"
  on public.property_media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_media.property_id and p.is_published = true
    )
  );

drop policy if exists "Owner can read all media" on public.property_media;
create policy "Owner can read all media"
  on public.property_media for select
  to authenticated
  using (public.is_owner());

drop policy if exists "Owner can manage media" on public.property_media;
create policy "Owner can manage media"
  on public.property_media for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── inquiries ───────────────────────────────────────────────────────────────
-- Deliberately NO anon policy: enquiries are written exclusively by the server
-- endpoint holding the service role. Public keys cannot read or insert.
drop policy if exists "Owner can read inquiries" on public.inquiries;
create policy "Owner can read inquiries"
  on public.inquiries for select
  to authenticated
  using (public.is_owner());

drop policy if exists "Owner can update inquiries" on public.inquiries;
create policy "Owner can update inquiries"
  on public.inquiries for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists "Owner can delete inquiries" on public.inquiries;
create policy "Owner can delete inquiries"
  on public.inquiries for delete
  to authenticated
  using (public.is_owner());

-- ── site_settings ───────────────────────────────────────────────────────────
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (id = 1);

drop policy if exists "Owner can update site settings" on public.site_settings;
create policy "Owner can update site settings"
  on public.site_settings for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner() and id = 1);

-- ── owner_security / login_attempts ─────────────────────────────────────────
-- No policies at all on purpose: only the service role (server) may touch
-- these tables. The access code hash is therefore unreachable from any client.

-- ── Grants ──────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.properties, public.property_media, public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.properties, public.property_media to authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant select, update on public.site_settings to authenticated;
grant select on public.profiles to authenticated;
grant execute on function public.is_owner() to anon, authenticated;
