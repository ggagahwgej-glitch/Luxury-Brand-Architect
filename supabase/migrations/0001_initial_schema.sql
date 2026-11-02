-- ============================================================================
--  0001 · INITIAL SCHEMA
--  Independent Supabase project for a single client website.
--  No multi-tenancy, no business_id, no workspace switching.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Shared helpers ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
-- One authorised owner per deployment. Created manually after the owner
-- signs up (see README → Owner account provisioning).
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text not null default 'owner' check (role in ('owner')),
  is_authorized boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── properties ──────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title         text not null check (char_length(title) between 3 and 140),
  description   text not null default '' check (char_length(description) <= 8000),
  property_type text not null default 'villa' check (property_type in (
                  'villa','apartment','penthouse','independent_house','residential_plot',
                  'commercial_building','commercial_shop','office','land','farmhouse','other')),
  purpose       text not null check (purpose in ('sale','rent')),
  price         numeric(14,2) not null check (price > 0),
  currency      text not null default 'INR' check (char_length(currency) = 3),
  location      text not null check (char_length(location) between 2 and 120),
  address       text,
  bedrooms      integer check (bedrooms is null or bedrooms between 0 and 50),
  bathrooms     integer check (bathrooms is null or bathrooms between 0 and 50),
  balconies     integer check (balconies is null or balconies between 0 and 50),
  built_up_area numeric(12,2) check (built_up_area is null or built_up_area >= 0),
  carpet_area   numeric(12,2) check (carpet_area is null or carpet_area >= 0),
  plot_area     numeric(12,2) check (plot_area is null or plot_area >= 0),
  area_unit     text not null default 'sqft' check (area_unit in ('sqft','sqm','sqyd','acre','hectare')),
  amenities     text[] not null default '{}',
  features      text[] not null default '{}',
  status        text not null default 'available'
                 check (status in ('available','under_offer','sold','rented','unavailable')),
  is_featured   boolean not null default false,
  is_published  boolean not null default false,
  latitude      numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude     numeric(9,6) check (longitude is null or longitude between -180 and 180),
  -- Single comparable area value used by min/max-area filters and area sorting,
  -- matching what the public site displays (built-up, else plot, else carpet).
  area_display  numeric(12,2) generated always as
                  (coalesce(built_up_area, plot_area, carpet_area, 0)) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists properties_published_idx on public.properties (is_published, status, created_at desc);
create index if not exists properties_purpose_idx on public.properties (purpose) where is_published;
create index if not exists properties_type_idx2 on public.properties (property_type) where is_published;
create index if not exists properties_location_idx on public.properties (lower(location)) where is_published;
create index if not exists properties_price_idx on public.properties (price) where is_published;
create index if not exists properties_area_idx on public.properties (area_display) where is_published;
create index if not exists properties_featured_idx on public.properties (is_featured) where is_published;
create index if not exists properties_search_idx on public.properties
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(location,'') || ' ' || coalesce(address,'') || ' ' || coalesce(description,'')));

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ── property_media ──────────────────────────────────────────────────────────
create table if not exists public.property_media (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties (id) on delete cascade,
  url          text not null check (char_length(url) between 1 and 2048),
  storage_path text,
  media_type   text not null default 'image' check (media_type in ('image','video')),
  sort_order   integer not null default 0 check (sort_order >= 0),
  is_cover     boolean not null default false,
  alt          text,
  created_at   timestamptz not null default now()
);

create index if not exists property_media_property_idx on public.property_media (property_id, sort_order);
-- A property can only have one cover image.
create unique index if not exists property_media_single_cover_idx
  on public.property_media (property_id) where is_cover;

-- ── inquiries ───────────────────────────────────────────────────────────────
create table if not exists public.inquiries (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references public.properties (id) on delete set null,
  property_title text,
  name           text not null check (char_length(name) between 2 and 80),
  phone          text not null check (char_length(phone) between 7 and 20),
  email          text not null check (char_length(email) between 5 and 160),
  message        text not null check (char_length(message) between 10 and 2000),
  intent         text not null default 'information'
                  check (intent in ('information','callback','visit','availability')),
  status         text not null default 'new' check (status in ('new','read','contacted','resolved')),
  ip_hash        text,
  user_agent     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_property_idx on public.inquiries (property_id, created_at desc);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ── site_settings (single row) ──────────────────────────────────────────────
create table if not exists public.site_settings (
  id           smallint primary key default 1 check (id = 1),
  branding     jsonb not null default '{}'::jsonb,
  contact      jsonb not null default '{}'::jsonb,
  social       jsonb not null default '{}'::jsonb,
  website      jsonb not null default '{}'::jsonb,
  seo          jsonb not null default '{}'::jsonb,
  design       jsonb not null default '{}'::jsonb,
  testimonials jsonb not null default '[]'::jsonb check (jsonb_typeof(testimonials) = 'array'),
  updated_at   timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ── owner_security ──────────────────────────────────────────────────────────
-- Stores ONLY the bcrypt hash of the permanent 12-digit access code.
-- Never the code itself, never a password.
create table if not exists public.owner_security (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  secret_code_hash text not null,
  failed_attempts  integer not null default 0 check (failed_attempts >= 0),
  locked_until     timestamptz,
  updated_at       timestamptz not null default now()
);

create trigger owner_security_set_updated_at
  before update on public.owner_security
  for each row execute function public.set_updated_at();

-- ── login_attempts (durable audit trail) ────────────────────────────────────
create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  identifier text,
  ip_hash    text,
  success    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_created_idx on public.login_attempts (created_at desc);
create index if not exists login_attempts_identifier_idx on public.login_attempts (identifier, created_at desc);

-- ── Ownership helper ────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can check the caller without recursive RLS
-- problems on profiles.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
      and profiles.is_authorized = true
  );
$$;
