# Aurum Estates — Implementation Report

Single Next.js 15 application containing the public luxury real-estate website **and** the embedded, private Owner Admin Studio. One codebase, one deployment, one Supabase project per client. No multi-tenancy, no separate admin app, no SaaS layer.

- Generated: 1 November 2026
- Verified build: `next build` (Next.js 15.5.28), production server smoke-tested over HTTP
- Local demo credentials live only in `.env.local` (git-ignored) and are **not** part of the production path

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router (React 19, Server Components by default) |
| Language | TypeScript strict + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS 3.4 with a custom token layer in `app/globals.css` |
| Data | `@supabase/supabase-js` (production) / file-backed local provider (development preview only) |
| Validation | Zod 4 on every public and admin write path |
| Auth | Supabase Auth (email + password) → owner authorization → bcrypt-hashed 12-digit secret code → signed session cookie |
| Fonts | `@fontsource` (self-hosted): Cormorant Garamond + Playfair Display (display), Inter Variable (body) |
| Icons | lucide-react + hand-built brand social icons |
| Tests | Vitest (24 assertions across 4 suites) |
| CLI | `tsx` scripts for owner-code hashing, storage pruning, backend verification |

### Directory map

```
app/(public)/…          public site (home, listings, detail, buy, rent, categories, about, contact, settings, legal)
app/admin/(studio)/…    protected studio (dashboard, properties, inquiries, media, settings)
app/api/…               all server endpoints (public + admin)
components/{admin,home,layout,property,ui,forms,settings}
lib/{data,auth,validation,config,storage,api,search-params,admin-filters}
supabase/migrations/    0001 schema · 0002 RLS · 0003 storage
supabase/seed.sql       brand/contact/hero/SEO defaults only (no properties, no testimonials)
scripts/                load-env, hash-owner-code, prune-orphan-media, check-backend
tests/                  validation, repository, session, rate-limit
middleware.ts           edge gate for /admin/*, /api/admin/*
```

### Two data providers, one interface

`lib/data/repository.ts` defines the contract; `lib/data/local/repository.ts` (JSON store) and `lib/data/supabase/repository.ts` implement it. `lib/data/index.ts` selects the provider from `DATA_PROVIDER`.

The local provider exists **only** so the app can be reviewed without a Supabase project. It refuses to run in a production build unless `ALLOW_LOCAL_PROVIDER=1` is set explicitly, so a misconfigured deployment cannot silently ship demo data. Every page and endpoint talks to the repository interface, so switching providers changes no UI code.

---

## 2. Environment variables

Copy `.env.example` → `.env.local` (never committed).

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Canonical origin, sitemap, OG URLs, `secure` flag decision for the session cookie |
| `DATA_PROVIDER` | server | `supabase` (production) or `local` (development preview only) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key — RLS-restricted, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Used by server routes; validated to be server-side and never returned to the client |
| `SUPABASE_STORAGE_BUCKET` | server | Defaults to `property-media` |
| `ADMIN_SESSION_SECRET` | server only | HMAC signing key for the admin session cookie (32+ random bytes) |
| `LOCAL_OWNER_EMAIL` / `_PASSWORD` / `_CODE` | dev only | Credentials for the local provider preview; ignored when `DATA_PROVIDER=supabase` |
| `ALLOW_LOCAL_PROVIDER` | dev/CI only | Permits the local provider inside a production build (used only for this sandbox preview) |

`lib/env.ts` validates presence and shape at startup and throws a readable error rather than failing at request time.

---

## 3. Supabase setup

### 3.1 Create the client project

1. Create one Supabase project per client (region closest to the properties).
2. Authentication → Providers → Email: enable. Disable public sign-ups if the owner is the only user.
3. Auth → Users → *Add user*: create the owner's email + password, confirm the email.

### 3.2 Apply migrations **in order**

```bash
# Dashboard → SQL Editor, or: supabase db push
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_rls_policies.sql
supabase/migrations/0003_storage.sql
supabase/seed.sql          # brand/contact/hero/SEO defaults only
```

- **0001** creates `profiles`, `properties`, `property_media`, `inquiries`, `site_settings`, `owner_security`, `login_attempts`; UUID primary keys (`gen_random_uuid()`), check constraints on enums/prices/area, `set_updated_at()` triggers, `is_owner()` SECURITY DEFINER helper, and indexes for published/status, purpose, type, lower(location), price, featured plus a GIN `tsvector` search index and inquiry status/property/date indexes.
- **0002** enables RLS on all seven tables and adds policies: anon may read only published properties, their media and site settings; the owner (via `is_owner()`) has full access to content and inquiries; `inquiries`, `owner_security` and `login_attempts` are never readable by anon — anonymous inserts into `inquiries` are allowed through the server route only, and grants are scoped per table.
- **0003** creates the public `property-media` bucket (64 MB limit, image/video MIME allowlist) with public read and owner-only insert/update/delete policies.

### 3.3 Authorize the owner

Run this table-agnostic SQL after creating the Auth user:

```sql
insert into public.profiles (id, email, full_name, role, is_authorized)
select id, email, 'Owner', 'owner', true from auth.users where email = 'owner@client-domain.com'
on conflict (id) do update set role = 'owner', is_authorized = true;
```

Authorization is data-driven (`profiles.role = 'owner'` **and** `is_authorized = true`). There is no hardcoded email or password anywhere in the codebase.

### 3.4 Set the 12-digit secret code

```bash
npm run owner:hash 741852963147 owner@client-domain.com
```

The script prints a bcrypt hash plus the `insert/update` statement for `owner_security.secret_code_hash` (with `digits = 12`, `max_attempts`, `locked_until`). Only the hash is stored; the plaintext never touches the database or the logs.

### 3.5 Verify

```bash
npm run seed:check
```

Asserts env shape, that all six content tables + `login_attempts` exist, that the `site_settings` singleton row exists, that an owner profile and `owner_security` row exist, that the storage bucket exists, and that an **anon key cannot read inquiries** — a fast guard against a broken RLS deployment.

### 3.6 Storage

- Bucket: `property-media` (public read).
- Paths written by the app: `properties/YYYY/<uuid>-<name>` and `brand/<uuid>-<name>`.
- API routes delete the storage object when a media row is removed and when a property is deleted, so orphans cannot accumulate.
- Sweep: `npm run storage:prune` (dry run) → `npm run storage:prune -- --apply`.

---

## 4. Owner authentication (three factors, server-side)

`POST /api/admin/login` performs, in order:

1. **Origin check** — mismatched `Origin` → `403 Request origin rejected.`
2. **Rate limit** — 5 attempts / 15 min per hashed IP, then `429` with `Retry-After` and `retryAfterSeconds`.
3. **Factor 1** — email + password verified with Supabase Auth (`signInWithPassword`); the local provider compares against dev credentials.
4. **Factor 2** — owner authorization: `profiles.role = 'owner'` **and** `is_authorized = true`.
5. **Factor 3** — 12-digit code compared with bcrypt against `owner_security.secret_code_hash`; 5 wrong codes lock the factor for 15 minutes. A successful login clears both counters.
6. Issues the session cookie and writes a login attempt record (identifier + IP stored as HMAC hashes only).

Cookie: `aurum_admin_session`, HMAC-SHA256 signed payload (sub, role, iat, exp), 8-hour TTL, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` whenever `NEXT_PUBLIC_SITE_URL` is HTTPS.

Enforcement is layered: `middleware.ts` redirects unauthenticated HTML requests for `/admin*` to `/admin/login?next=…` and returns `401` for `/api/admin/*`; every admin route handler *also* calls `requireAdminApi()` and re-checks the signature, so bypassing the middleware still yields `401`. Error responses are uniform (`Not authorised.`) and never reveal which factor failed. Logout clears the cookie server-side.

---

## 5. Public website

| Route | Implemented |
| --- | --- |
| `/` | Ten-section homepage: cinematic hero with working search (routes into `/properties` with query params), brand introduction, signature properties from live data, collections, destinations, "why choose us", brand story, testimonials **or hidden empty state** when none are configured, closing CTA, footer. Sections can be toggled from settings. |
| `/properties` | Server-rendered listing: keyword, purpose, type, location, min/max price, bedrooms, bathrooms, min/max area, status and five sorts, 9 per page with pagination, skeleton (`loading.tsx`), empty and error states, filter chips and result count. |
| `/properties/[slug]` | Gallery with fullscreen viewer, keyboard/arrow and touch-swipe navigation, amenity and feature lists, optional property film, OpenStreetMap embed with graceful "coordinates on request" fallback, sticky price/enquiry rail, tel + WhatsApp actions, related residences, inquiry form, `RealEstateListing` JSON-LD. Missing **or unpublished** slugs return a real `404` (verified — see §10). |
| `/buy`, `/rent` | Dedicated landing pages with their own metadata, canonical URLs, curated highlights and CTAs into the filtered listing. |
| `/categories` | Property-type overview with live counts. |
| `/about` | Brand story, principles, process, and the discreet admin entry point. |
| `/contact` | Contact details from settings, opening hours, inquiry form, map, social links. |
| `/settings` | Visitor preferences (persisted "Reduce motion" toggle) plus a discreet studio entry point — the admin link never appears in the primary navigation. |
| `/legal/privacy`, `/legal/terms` | Plain-language policies covering inquiry data and media. |
| `not-found` / `error` | Branded 404 and recoverable error boundary. |

### Inquiry system

- Zod schema shared by client and server; server-side re-validation, trimming, length caps, control-character stripping and email/phone normalisation.
- Honeypot field + timing check + 5 submissions / 10 min per hashed IP.
- Persists to `inquiries` with optional `property_id` association; never returns owner contact data or inquiry lists to the public.
- Clear success state and per-field error messages; failures surface a human message, not a stack trace.

---

## 6. Owner Admin Studio (`/admin`)

| Route | Implemented |
| --- | --- |
| `/admin/login` | Three-factor form with inline errors, lockout messaging and `next` redirect; noindex. |
| `/admin/dashboard` | Real stats (total/available/sold/rental/featured properties, total/unread inquiries, media assets), 14-day inquiry sparkline with an accessible text alternative, recent activity, quick actions. |
| `/admin/properties` | Paginated table (10/page) with search, status/purpose/type filters, sorting, publish/unpublish and feature toggles, duplicate, delete with confirmation, and links to edit. |
| `/admin/properties/new` · `/[id]/edit` | Full form (identity, classification, pricing, dimensions, amenities, features, media, publish state) with per-field validation, disable-while-saving, and a `?saved=1` confirmation banner on redirect. |
| `/admin/inquiries` | Split view: searchable, filterable queue (new / read / contacted / resolved) with detail pane (`?focus=<id>`), status changes, clickable phone, WhatsApp shortcut, mailto, and delete. |
| `/admin/media` | Library of every stored asset with counts, type/property filters, previews and delete-with-confirmation. Uploads (multi-image, video, brand assets) with progress and per-file errors happen from the property form's media manager, which also handles drag-to-reorder, move up/down and cover selection. Orphan-safe: deleting a row deletes the storage object, and removing the cover promotes the next image. |
| `/admin/settings` | Seven tabs — Branding, Contact, Social, Website (hero/CTA/toggles), SEO, Design (accent presets, typography), Testimonials — persisted to `site_settings` and reflected on the public site without a code change. |

Every mutation revalidates the affected public paths, so publishing, unpublishing or editing content is visible immediately without a redeploy.

### Settings → public site wiring (verified)

Changing the hero heading, the accent preset (`imperial_gold` → `champagne`) and the contact phone in the studio updated `/` on the next request, including the CSS custom properties `--accent`, `--accent-soft`, `--accent-deep` and `--font-display` emitted from `app/layout.tsx`. An invalid email in settings was rejected with `fieldErrors: { "contact.email": "Invalid email address" }` instead of being persisted.

---

## 7. Design system

- Palette tokens: obsidian `#090B10`, imperial `#08090D`, royal navy `#101827`, charcoal `#171A22`, gold `#C6A45A` / `#E5D1A0` / `#927442`, burgundy `#351820`, ivory `#F4F0E7`, silver `#A9ADB7`, success `#3F9B76`, danger `#C45B5B`.
- Display serif (Cormorant Garamond / Playfair) against Inter body text; gold used only for accents, rules, eyebrows and primary actions — never as a background wash.
- Brand name, tagline, hero copy, contact details, social links, SEO defaults and accent preset all come from `site_settings`, seeded from `lib/config/site.ts`. There is one place to change the brand for a new client.
- Motion is restrained: short reveal-on-scroll, hover states and page transitions, all disabled by `prefers-reduced-motion` **and** by the persisted user toggle (`aurum:reduce-motion` in `localStorage`, applied to `<html data-reduce-motion>` by an inline pre-hydration script so there is no flash).

---

## 8. SEO

- Per-page titles and descriptions from a template, canonical URLs, Open Graph and Twitter cards, OG images taken from the property's cover media.
- `RealEstateListing` JSON-LD on detail pages, `RealEstateAgent`/organisation JSON-LD site-wide, both sanitised against script injection.
- `app/sitemap.ts` renders on demand and lists published properties only (verified: unpublished slugs absent); `app/robots.ts` disallows `/admin` and `/api`.
- Admin is excluded from indexing three ways: `robots` metadata, an `X-Robots-Tag` header on `/admin/:path*`, and the robots.txt disallow.

---

## 9. Security summary

| Control | Status |
| --- | --- |
| Admin API requires a valid signed session on every handler | ✅ verified (`401` without/with forged cookie) |
| Same-origin enforcement on all mutating routes | ✅ verified (`403` on cross-origin POST) |
| Login rate limiting 5/15 min + code lockout 5 attempts/15 min | ✅ verified (`429` with `retryAfterSeconds`) |
| Successful login clears the counters | ✅ verified |
| HttpOnly cookie, 8h TTL, HMAC-signed | ✅ verified via `Set-Cookie` |
| No plaintext secret code, no hardcoded credentials | ✅ bcrypt hash only; env-driven |
| Owner PII never returned to the public site | ✅ inquiries are write-only publicly; contact data comes from settings |
| RLS: public reads published only; inquiries/owner_security/login_attempts closed to anon | ✅ policies in 0002 + `seed:check` assertion (SQL reviewed; not executed against a live project — see §11) |
| Security headers (nosniff, frame options, referrer policy, permissions policy) | ✅ present on every response |
| Input sanitisation / strict validation on every write | ✅ Zod schemas + control-character stripping |
| Service-role key never reaches the client | ✅ server-only module (`server-only` import guard) |

---

## 10. What was actually tested

### Automated

```
npx vitest run        → 24 passing (4 files)
npx tsc --noEmit      → clean (excluding generated .next/types)
npm run build         → compiled successfully, 19 routes
npm run seed:check    → passes in local mode
npm run owner:hash    → prints bcrypt hash + SQL
```

Coverage: validation schemas (11), local repository CRUD/filtering/pagination (7), session token signing/tampering/expiry (4), rate-limit windows and lockout (2).

### Production build, HTTP-tested with curl

| Check | Result |
| --- | --- |
| 12 public routes + `/legal/*` + `/sitemap.xml` + `/robots.txt` + `/icon.svg` | `200` |
| `/properties/aurum-riverside-residence` | `200` with title, canonical, `og:*`, 2 JSON-LD blocks |
| Missing slug `/properties/does-not-exist` | `404` |
| Unpublished slug `/properties/meridian-executive-floor` | `404` |
| Unknown route | `404` |
| `/admin`, `/admin/dashboard`, `/admin/properties`, `/admin/properties/new`, `/admin/inquiries`, `/admin/media`, `/admin/settings` unauthenticated | `307` → `/admin/login?next=…` |
| `/api/admin/{properties,settings,media/upload}` unauthenticated | `401` |
| Login with three correct factors | `200` + `Set-Cookie` (`HttpOnly`) |
| Studio pages with cookie | `200` (all six) |
| `/admin` with cookie | `307` → `/admin/dashboard` |
| Admin page meta robots | `noindex, nofollow, nocache` |
| Create property (draft) | `200`; public slug `404` while draft |
| Publish + feature | `200`; slug `200`, appears in listing and sitemap |
| Duplicate | `200`, copy created unpublished with new id/slug |
| Unpublish | `200`; slug back to `404` |
| Delete both test properties | `200`; register back to 9 |
| Public inquiry POST | `200`, persisted as `new` |
| Inquiry PATCH `contacted` / invalid status | `200` / `422` |
| Inquiry DELETE | `200` |
| Logout | `200`; `/admin/dashboard` → `307` |
| Cross-origin admin POST | `403 Request origin rejected.` |
| Forged session cookie | `401` |
| 6th rapid failed login | `429` with `retryAfterSeconds` |
| Settings PUT (hero, accent, phone) reflected on public `/` | ✅ |
| Invalid settings email | `422` + `fieldErrors` |
| Media upload → delete → URL gone | `200` → `404`; storage object removed |
| Sitemap contents | published slugs only; no admin URLs |
| Test data cleanup | `.data/uploads` empty, no orphan media, QA inquiry purged |

### Not tested (and why)

- **Live Supabase instance.** No Supabase project or credentials were available in this environment. All Supabase-provider code paths (Auth sign-in, table reads/writes, RLS enforcement, storage upload/signed URLs) are written against the documented API and type-checked, but were **not executed against a real project**. They must be exercised once against the client project before launch — §3.5 `seed:check` is the first gate.
- **Real image upload to Supabase Storage.** Uploads were tested through the local provider (write, serve, delete, orphan sweep). The Supabase branch of the same service was not run.
- **Browser-level audits.** No browser automation was available, so Lighthouse, axe-core, real screen-reader passes, and pixel-level checks at 320 px were not run. Responsiveness is implemented with mobile-first breakpoints (320 px → wide desktop) and the admin shell is intentionally touch-sized, but it has been verified by code inspection and HTTP output, not by screenshot comparison.
- **Email delivery.** There is no transactional email provider; inquiries are stored and surfaced in the studio. A notification email is a deliberate follow-up, not a hidden feature.
- **Payment/CRM integrations.** Out of scope by design.

---

## 11. Known limitations & recommended next steps

1. **Run the Supabase verification pass** — apply 0001→0003, seed, bootstrap the owner, `npm run seed:check`, then repeat the curl matrix in §10 against `DATA_PROVIDER=supabase`. This is the only meaningful gap between "verified" and "production-proven".
2. **Email notifications for inquiries** — add a provider (Resend/Postmark) behind a server action; the data model already carries everything needed.
3. **Image derivatives** — Supabase Storage serves originals; adding on-the-fly resizing (Supabase image transformation or a CDN) is worthwhile once real photography is uploaded. Next/Image already negotiates AVIF/WebP for local assets.
4. **Backups** — enable Supabase daily backups (or PITR) and export `property-media` periodically; nothing in the app depends on `login_attempts` history.
5. **`login_attempts` retention** — a scheduled delete of rows older than 30 days keeps the audit table small.
6. **Demo content** — the local provider ships nine `isDemo` listings and two seed images per property so the design can be reviewed. Supabase starts empty by design and shows tasteful empty states; nothing in the production provider pretends to be a real listing.

---

## 12. Deployment checklist

1. `DATA_PROVIDER=supabase`, `NEXT_PUBLIC_SITE_URL=https://client-domain.com`, Supabase URL/anon/service-role keys, `ADMIN_SESSION_SECRET` (`openssl rand -base64 48`), `SUPABASE_STORAGE_BUCKET=property-media`. Do **not** set `ALLOW_LOCAL_PROVIDER` in production.
2. Apply migrations 0001→0003 + `seed.sql`; create the owner Auth user; insert the `profiles` row as owner/authorized; run `npm run owner:hash` and apply the printed SQL.
3. `npm ci && npm run build && npm run start` (or deploy to Vercel with the same variables). `next start` binds `0.0.0.0:3000`; on Vercel no port config is needed.
4. Post-deploy: `npm run seed:check` against production env, log in at `/admin/login`, upload one property with images, publish it, submit a test inquiry, confirm it appears `new` in the studio, then delete the test records.
5. Confirm HTTPS (cookie `Secure` turns on automatically), and that `/admin` is `noindex` in the deployed HTML.
