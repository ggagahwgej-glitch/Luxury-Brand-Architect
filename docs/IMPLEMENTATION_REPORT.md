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
| Tests | Vitest (47 assertions across 6 suites) + 36 SQL/RLS checks |
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
| `LOCAL_OWNER_EMAIL` / `_PASSWORD` / `_CODE` | dev only | Credentials for the local provider preview; ignored when `DATA_PROVIDER=supabase`. **No defaults are compiled in** — the preview cannot sign in until all three are set |
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

- **0001** creates `profiles`, `properties`, `property_media`, `inquiries`, `site_settings`, `owner_security`, `login_attempts`; UUID primary keys (`gen_random_uuid()`), check constraints on enums/prices/area, `set_updated_at()` triggers, `is_owner()` SECURITY DEFINER helper, and indexes for published/status, purpose, type, lower(location), price, featured, `area_display` plus a GIN `tsvector` search index and inquiry status/property/date indexes. `properties.area_display` is a stored generated column (`coalesce(built_up_area, plot_area, carpet_area, 0)`) so min/max-area filters and area sorting compare one value on every provider.
- **0002** enables RLS on all seven tables and adds policies: anon may read only published properties, their media and site settings; the owner (via `is_owner()`) has full access to content and inquiries; `inquiries`, `owner_security` and `login_attempts` are never readable by anon — anonymous inserts into `inquiries` are allowed through the server route only, and grants are scoped per table.
- **0003** creates the public `property-media` bucket (64 MB limit, image/video MIME allowlist) with public read and owner-only insert/update/delete policies.

> If an earlier copy of `0001` was already applied, add the generated column before deploying this build:
> ```sql
> alter table public.properties add column area_display numeric(12,2)
>   generated always as (coalesce(built_up_area, plot_area, carpet_area, 0)) stored;
> create index properties_area_idx on public.properties (area_display) where is_published;
> ```

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
npx vitest run        → 47 passing (6 files)
npm run verify:sql    → 36 schema/RLS checks passing
npx tsc --noEmit      → clean (excluding generated .next/types)
npm run build         → compiled successfully, 19 routes
npm run seed:check    → passes in local mode
npm run owner:hash    → prints bcrypt hash + SQL
```

Coverage: validation schemas (16), local repository CRUD/filtering/pagination (10), provider/env guards (5), session token signing/tampering/expiry (4), rate-limit windows and lockout (2).

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

## 11. Bug-fix pass (post-review)

A review pass over the whole app — production build smoke tests, edge-case URLs, and a read-through of every production-only (Supabase) code path — found and fixed the following. Each item was reproduced first, and the ones testable without Supabase were re-verified after the fix.

| # | Area | Bug found | Fix |
| --- | --- | --- | --- |
| 1 | Detail page | A Suspense boundary (`properties/loading.tsx`) wrapped `[slug]`, so missing or unpublished listings rendered a 404 screen with **HTTP 200** | Listing page + skeleton moved into a `(index)` route group; both cases now return a real `404` |
| 2 | Listing pages | `?page=99` showed "The register is being prepared" on a register full of listings | Repository clamps the page to the last real page (both providers); `/buy` and `/rent` redirect to a valid page |
| 3 | Filters | A `maxArea`-only URL was applied but not counted, so the empty state claimed nothing is listed | `activeFilterCount` counts max area |
| 4 | Listings (Supabase) | `.or("purpose.eq.…,location.eq.…")` broke on any location containing a comma — e.g. "Guwahati, Assam" — which would 500 every related-properties block | Two indexed queries merged in code |
| 5 | Media (Supabase) | Moving the cover image updated rows one by one and collided with the `property_media_single_cover_idx` unique index | Existing covers are cleared before the new cover is applied |
| 6 | Media/storage | Duplicated listings share a stored object; deleting the copy's media (or the copy itself) deleted the file used by the original | New `findReferencedStoragePaths()` check before any object is removed |
| 7 | Media pruning | `storage:prune --apply` ignored brand assets referenced from `site_settings` and would delete the uploaded logo | Prune counts settings assets and never touches `brand/` |
| 8 | Studio properties | The published/draft visibility filter ran *after* pagination, so "1 record" could hide drafts on page 2 | `published` filter pushed into the query for both providers |
| 9 | Studio URLs | Non-UUID ids (`/admin/properties/abc/edit`, `?focus=abc`) raised a Postgres uuid error → 500 instead of a clean 404 | `isUuid()` guards in the Supabase lookups |
| 10 | Studio tables | Pagination links built `?&visibility=draft` | Query string rebuilt with `URLSearchParams` |
| 11 | Gallery | Navigating between listings kept the old image index; with the lightbox open on a shorter gallery this hit `images[active]!` and crashed | Index clamped to the current gallery; no non-null assertion remains |
| 12 | Settings | One half-filled testimonial card blocked every other settings tab from saving | Incomplete cards are skipped and reported; the form jumps to the tab owning the first invalid field |
| 13 | Dates | Studio timestamps formatted in the server's zone and the browser's zone → hydration mismatch and inconsistent times | All dates use one business timezone (`Asia/Kolkata`) via `SITE_TIME_ZONE` |
| 14 | SEO | `/about`'s Open Graph image pointed at a missing file (`/seed/brand-story.jpg`) | Points at an existing asset |
| 15 | SEO | Root layout forced `canonical: "/"` onto Studio pages | Root canonical removed; every public route declares its own |
| 16 | Security | A production build with **no** provider configured silently fell back to the local JSON store | `resolveDataProvider()` now fails fast with a clear message |
| 17 | Security | The preview owner's email/password/code were compiled in as defaults | Removed; `.env.local` must supply all three |
| 18 | Security | `?next=` accepted any `/admin`-prefixed string | `safeAdminPath()` allows only Studio paths and blocks protocol-relative URLs |
| 19 | Security | Error responses echoed raw database messages (constraint names, SQL text) | Routes return generic messages and log the detail |
| 20 | Security | Cross-site requests without an `Origin` header were accepted; JSON bodies were unbounded | `Sec-Fetch-Site: cross-site` is rejected and JSON bodies are capped at 1 MB |
| 21 | Security | Sign-out required a *valid* session, so an expired session could not clear its cookie | Logout route bypasses the session gate |
| 22 | Data | A public enquiry could be linked to an unpublished listing when its id was known | Both providers require the listing to be published |
| 23 | Data | A slug truncated at 72 characters could end with a hyphen, failing the slug constraint | `slugify()` trims trailing hyphens |
| 24 | Facets | Location counts included sold listings on one provider and not the other | Both count browsable (`available`/`under_offer`) listings only |
| 25 | Errors | A duplicate slug surfaced as `500` | Returns `409` with an actionable message |

Verification after the fixes: `tsc` clean, `vitest run` 37 passing, production build succeeds, all public routes 200, missing/unpublished slugs 404, Studio 307→login, admin CRUD/publish/duplicate/delete round-trip, settings reflected on the public site, storage-reference case reproduced then fixed (copy deleted → original image still served; both deleted → file gone), inquiry create→status→delete round-trip, media/traversal/upload-rejection checks.

## 12. Known limitations & recommended next steps

1. **Run the Supabase verification pass** — apply 0001→0003, seed, bootstrap the owner, `npm run seed:check`, then repeat the curl matrix in §10 against `DATA_PROVIDER=supabase`. This is the only meaningful gap between "verified" and "production-proven".
2. **Email notifications for inquiries** — add a provider (Resend/Postmark) behind a server action; the data model already carries everything needed.
3. **Image derivatives** — Supabase Storage serves originals; adding on-the-fly resizing (Supabase image transformation or a CDN) is worthwhile once real photography is uploaded. Next/Image already negotiates AVIF/WebP for local assets.
4. **Backups** — enable Supabase daily backups (or PITR) and export `property-media` periodically; nothing in the app depends on `login_attempts` history.
5. **`login_attempts` retention** — a scheduled delete of rows older than 30 days keeps the audit table small.
6. **Demo content** — the local provider ships nine `isDemo` listings and two seed images per property so the design can be reviewed. Supabase starts empty by design and shows tasteful empty states; nothing in the production provider pretends to be a real listing.
7. **Brand assets have no delete button** — replacing or clearing a logo/favicon in settings detaches the file, and the orphan sweep then removes it. A dedicated brand-asset list in the media library would be a nice addition.
8. **In-process rate limiting** — the limiter is per server instance. A multi-instance serverless deployment should front `/api/admin/login` and `/api/inquiries` with a shared limiter (e.g. Upstash Redis).

---

## 13. Rendering mode & build-time configuration

Public routes are intentionally **request-rendered**, not prerendered:

```ts
// app/(public)/layout.tsx, app/(public)/page.tsx, app/robots.ts, app/sitemap.ts
export const dynamic = "force-dynamic";
```

Why: every public page reads `site_settings`, and most also read listings, so a
static build would (a) need runtime env plus a reachable database at build time,
and (b) freeze content at deploy time — Studio edits would only appear after a
redeploy.

This was the direct cause of a Vercel build failure (`Error: No data provider is
configured…` while pre-rendering `/`): the page used to be a static candidate,
so the build executed `getRepository()` → `resolveDataProvider()` without any
runtime env present. With the segment marked dynamic, `/`, `/legal/*`,
`/properties*`, `/buy`, `/rent`, `/categories`, `/about`, `/contact`,
`/settings` and `robots.txt` are all `ƒ` and the build performs no data access.

Verified both ways:

| Build | Result |
| --- | --- |
| `ALLOW_LOCAL_PROVIDER=1 npm run build` with `.env.local` + local provider | succeeds, 19 routes |
| `npm run build` with **`.env.local` removed and every provider variable unset** | succeeds — no prerender of data-driven pages, no provider error |

Only three routes remain static and none of them touch the database:
`/_not-found`, `/admin` (a redirect stub) and `/icon.svg`.

Guarding against transient failures: the homepage's data reads are wrapped in
`.catch()` fallbacks (`EMPTY_PAGE`, `[]`), `getSiteSettings()` falls back to
`DEFAULT_SITE_SETTINGS`, and `sitemap.ts` catches and still returns its static
entries — so a database hiccup degrades to designed empty states instead of a
500.

Environment variables therefore only need to exist at **runtime**. In Vercel:
set them for the Production environment (and Preview if used), then redeploy;
`NEXT_PUBLIC_SITE_URL` must be the final HTTPS origin (no trailing slash) and
`ADMIN_SESSION_SECRET` 32+ random characters. `ALLOW_LOCAL_PROVIDER` must not be
set.

Trade-off: HTML is now served `no-store` (CDN still caches images/assets). To
get cached HTML later, swap `force-dynamic` for `export const revalidate = 60`;
`revalidatePath` calls already exist in every mutation route.

## 14. Deployment checklist

1. `DATA_PROVIDER=supabase`, `NEXT_PUBLIC_SITE_URL=https://client-domain.com`, Supabase URL/anon/service-role keys, `ADMIN_SESSION_SECRET` (`openssl rand -base64 48`), `SUPABASE_STORAGE_BUCKET=property-media`. Do **not** set `ALLOW_LOCAL_PROVIDER` in production.
2. Apply migrations 0001→0003 + `seed.sql`; create the owner Auth user; insert the `profiles` row as owner/authorized; run `npm run owner:hash` and apply the printed SQL.
3. `npm ci && npm run build && npm run start` (or deploy to Vercel with the same variables). `next start` binds `0.0.0.0:3000`; on Vercel no port config is needed.
4. Post-deploy: `npm run seed:check` against production env, log in at `/admin/login`, upload one property with images, publish it, submit a test inquiry, confirm it appears `new` in the studio, then delete the test records.
5. Confirm HTTPS (cookie `Secure` turns on automatically), and that `/admin` is `noindex` in the deployed HTML.

## 15. Pre-deployment audit (Vercel)

A full pass over environment fallbacks, client/server boundaries, API route
configuration, middleware, and App Router segments — done before the first real
deployment so the deploy throws nothing unexpected.

### 15.1 Environment fallbacks

| Item | Before | Now |
| --- | --- | --- |
| Site origin | `NEXT_PUBLIC_SITE_URL` or `http://localhost:3000` | explicit → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → localhost. Canonical/OG/sitemap/robots no longer advertise localhost on a deployment that forgot the variable. |
| Local provider on Vercel | allowed if `ALLOW_LOCAL_PROVIDER=1` | hard-blocked when `VERCEL=1` (the FS is read-only and ephemeral). |
| Diagnostics | silent | `logConfigDiagnostics()` runs once per server process from the root layout and logs which recommended variables are missing (never prints values). |
| Studio with no config | generic 500 on sign-in | `/api/admin/login` pre-checks provider + secret and returns **503** with the exact variables to add. |

### 15.2 Client/server boundaries

- No client component imports `lib/env`, `lib/data`, `lib/auth` or `lib/storage`
  (grep-verified). Client code only touches `lib/config/site`, `lib/constants`
  and the new `lib/upload-client` ("use client", no server imports).
- `lib/storage` keeps `import "server-only"` so a future client import fails at
  build time instead of leaking the service-role client.
- `serverExternalPackages: ["bcryptjs"]` retained (native binding must not be
  bundled).

### 15.3 Uploads: Vercel body limit (real bug found)

Supabase/`local` uploads were both streamed through
`POST /api/admin/media/upload`, but Vercel caps function request bodies at
≈4.5 MB while the app allowed 8 MB images and 64 MB videos — every large photo
or any video would have failed in production.

- New `POST /api/admin/media/upload-url` (auth + same-origin + rate limit +
  Zod) returns a **signed Supabase upload URL** (`strategy: "direct"`) so the
  browser PUTs the file straight to Storage with XHR progress. Files never pass
  through a function.
- The proxy route stays as the fallback (local preview provider, or a failed
  signed PUT for small files) and now rejects oversized bodies with a clear
  **413** (`MAX_PROXY_UPLOAD_BYTES` = 4 MB).
- `lib/upload-client.ts` implements the strategy switch for both the property
  form (images/video) and the settings form (brand assets), preserving progress
  and surfacing validation/auth/rate-limit errors verbatim.
- Requires the storage bucket CORS policy to allow the site origin — see
  README ("Deployment notes").
- Dead `experimental.serverActions.bodySizeLimit` removed; the project does not
  use Server Actions.

### 15.4 Images, headers, middleware

- `images.remotePatterns` adds `**.supabase.co/storage/v1/object/public/**` so
  `next/image` works even when `NEXT_PUBLIC_SUPABASE_URL` is only present at
  runtime (the previous list was computed at build time and would have made
  every uploaded photo throw).
- `images.minimumCacheTTL` = 30 days (upload names are immutable).
- Headers: HSTS (2 years, `includeSubDomains`), `X-DNS-Prefetch-Control: on`
  added to the existing `nosniff` / `SAMEORIGIN` / referrer / permissions set.
- Middleware: cross-site state-changing `/api/admin/*` calls are rejected (403)
  from `Origin` + `Sec-Fetch-Site` before routing; every Studio response carries
  `X-Robots-Tag: noindex, nofollow, noarchive`.

### 15.5 App Router segments

- Added `app/(public)/error.tsx`, `app/admin/error.tsx` and
  `app/admin/(studio)/error.tsx`. Previously a failed fetch on a public page, the
  sign-in screen or inside the Studio surfaced as the global error screen; now
  each keeps its own chrome (site header/footer, or the Studio sidebar) and
  offers retry.
- **Soft-404 caught during this audit:** adding `loading.tsx` above a page that
  calls `notFound()` makes Next stream the shell first, so an unknown property
  URL answered **200** with the 404 design instead of a real 404. Those loading
  states were therefore limited to segments that never 404 — the listing
  (`/properties`) and the dashboard, which already had them. Unknown slugs and
  unknown Studio property ids now return a true 404.
- All 13 API routes are `runtime = "nodejs"` + `dynamic = "force-dynamic"`;
  only `/_not-found`, `/admin` and `/icon.svg` are static.
- Every referenced local asset exists (`public/seed/*`, `app/icon.svg`) — checked
  against the code and the seeded media rows.

### 15.6 Verified after the changes

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 47/47 (6 files) |
| `npm run build` with `.env.local` removed and provider vars unset | exit 0 |
| `ALLOW_LOCAL_PROVIDER=1 npm run build` + `next start` | exit 0, 15 routes served |
| Public smoke (`/`, `/properties`, `/properties/[slug]`, `/buy`, `/rent`, `/categories`, `/about`, `/contact`, `/settings`, `/admin/login`, `/robots.txt`, `/sitemap.xml`) | all 200 |
| Unauthenticated `/admin/dashboard` | 307 → `/admin/login?next=…` |
| Unknown property slug / unknown Studio property id | 404 (real status, no soft-404) |
| Owner sign-in (3 factors) | 200 + HttpOnly cookie |
| `POST /api/admin/media/upload-url` (local provider) | 200 `{strategy:"proxy", maxBytes:4194304}` |
| Same endpoint, unsupported type | 400 with a human message |
| Same endpoint, cross-site `Origin` + `Sec-Fetch-Site: cross-site` | 403 |
| Multipart proxy upload (small PNG) | 200, file served from `/api/media/…` |
| Inquiry submission (valid / invalid) | 200 with id / 422 with field errors |
| `X-Robots-Tag` on `/admin/*` | `noindex, nofollow, noarchive` |

**Still untested** (no Supabase project in this environment): the signed
direct-to-Storage PUT, Storage CORS, and `SUPABASE_*` runtime-only behaviour.
Those paths are exercised only on a real deployment — hence the deployment
checklist item below.

### 15.7 Extra deployment step

After deploying, confirm in Supabase → Storage → `property-media` → Settings →
CORS that the site origin is allowed for `PUT`/`GET`, otherwise large uploads
fall back to the 4 MB proxy path (and videos will be refused with a clear
message rather than failing silently).

## 16. Connecting the client's Supabase project (round 4)

The client supplied a project: `https://aybxmtqozjkakhdefyqq.supabase.co` with
its **publishable** key. The secret key is intentionally not in the repository;
it is required before the Studio or the enquiry endpoint can write anything.

> **Environment note:** this build sandbox has no outbound access to
> `*.supabase.co`, so the live project could not be probed from here. Everything
> that *can* be verified without the network was verified, and the checks that
> need the project are packaged as `npm run seed:check` (see §16.4) for the
> operator to run once, from a machine that can reach Supabase.

### 16.1 The schema was executed for real (not just reviewed)

`npm run verify:sql` (`scripts/verify-sql.mjs`) now boots Postgres 18 in-process
(PGlite, a WASM build of real Postgres), stubs only the Supabase-owned pieces
(`auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`, the
`anon`/`authenticated`/`service_role` roles) and applies the migrations exactly
as written, followed by `seed.sql`. **36/36 checks pass**, including:

| Area | Verified |
| --- | --- |
| Migrations | 0001, 0002, 0003 and `seed.sql` apply without error |
| Structure | all 7 tables, RLS enabled on every table, bucket created public with the MIME allow-list |
| Constraints | invalid status, price ≤ 0, malformed slug and duplicate slug are all rejected |
| Generated column | `area_display` = `built_up_area` (used by area filters and sorting) |
| Trigger | `updated_at` is bumped on update |
| Cover rule | a second cover image is rejected by the partial unique index |
| RLS (anon) | published rows visible, drafts invisible, `inquiries` unreadable *and* unwritable, settings readable |
| RLS (auth) | an unauthorised account reads nothing; the authorised owner reads drafts; `is_owner()` only true for them |
| Provisioning | the SQL printed by `npm run owner:hash` creates the profile **and** the hash |

This is the first time the SQL had actually been executed — it was previously
reviewed by eye only.

### 16.2 Bugs found and fixed in this round

| # | Bug | Effect | Fix |
| --- | --- | --- | --- |
| 1 | `npm run owner:hash` printed SQL that only `update`d `profiles` | On a fresh project the owner row does not exist yet → update touches 0 rows → login answers "not authorised" forever | The SQL now upserts `profiles` (owner + authorised) and then writes the `owner_security` hash; verified in Postgres |
| 2 | `npm run lint` ran `next lint` with no ESLint config | Interactive prompt hangs/fails in CI | Removed the broken script; the gates are `typecheck`, `test`, `verify:sql`, `build` |
| 3 | `sharp` was a devDependency | `next/image` production optimisation can fail on hosts that prune dev dependencies | Moved to `dependencies` |
| 4 | Preview provider duplicated a listing as `slug-2-2`, Supabase provider as `slug-copy` | Inconsistent, ugly URLs between environments | Both now produce `-copy`, then `-copy-2` |
| 5 | Public slug read relied on RLS alone | A future policy mistake would expose a draft | `getPropertyBySlug` now also filters `is_published = true` unless the Studio asks otherwise |
| 6 | `listInquiries` reused a postgrest-js builder (builders mutate in place) | The page-clamp path appended `order` twice | Each run builds its own query |
| 7 | Supabase URL was used verbatim | A trailing slash or missing scheme (common paste error) broke every request with "Invalid URL" | Normalised once in `lib/env.ts` (scheme added, trailing slash trimmed, parsed); diagnostics name the value when it is invalid |
| 8 | Only the legacy key names were read | New-format keys (`sb_secret_…`) or variant names would be treated as missing | `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_ANON_KEY` are both accepted; `.env.example` documents the new formats |
| 9 | A network/config failure during sign-in was reported as "wrong credentials" | The owner retries a *correct* password and locks the account for 15 minutes | Transport/auth-service failures now return a configuration message, not an invalid-credentials one |
| 10 | `seed:check` printed "✓" for RLS checks when the project was unreachable, after ~90 s of retries | False confidence + noise | Preflight reachability probe (10 s) and "real denial vs transport error" detection |

### 16.3 New tests

`tests/supabase-repository.test.ts` (10 tests) records the PostgREST query the
Supabase provider builds — the part the JSON preview provider never exercises:
default filters, published-only slug reads, area sorting on `area_display`,
search-term escaping (commas/parentheses/quotes/percent), out-of-range page
clamping, malformed-UUID short-circuit and numeric bounds.

### 16.4 What the operator still has to do (in order)

1. Add the **secret key** to `.env.local` (`SUPABASE_SERVICE_ROLE_KEY`) and to
   Vercel.
2. Run the four SQL files (0001 → 0002 → 0003 → seed) in the Supabase SQL editor.
3. Authentication: keep Email on, **disable public sign-ups**, create the owner
   user with *Auto Confirm*.
4. `npm run owner:hash -- <12-digit-code> <owner-email>` and run the printed SQL.
5. Storage → `property-media` → CORS: allow the site origin (`GET`/`PUT`/`POST`).
6. `npm run seed:check` until it prints **All checks passed**.
7. Deploy with the same variables, then sign in at `/admin/login` and create the
   first listing (the site is intentionally empty until then).

### 16.5 Verified in this round

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 47/47 (6 files) |
| `npm run verify:sql` | 36/36 |
| `npm run build` (no env) and `ALLOW_LOCAL_PROVIDER=1 npm run build` | both exit 0 |
| Empty database (0 properties, 0 enquiries) | every public page renders designed empty states, no 500 |
| Admin CRUD | create → duplicate (`-copy`) → publish/unpublish (public 404/200) → delete (404) |
| Settings round-trip | save hero heading → visible on `/` → restored |
| Enquiry round-trip | create → status `contacted` → delete |
| Session | logout → `/admin/dashboard` 307 → `/admin/login` |
| Upload pipeline | plan endpoint (proxy strategy locally), validation 400, cross-origin 403, multipart upload 200 |

**Still untested** (needs the live project): signed direct-to-Storage uploads,
Storage CORS, `sb_secret_…` key acceptance, and auth against the real project.

## 17. Going live without visible errors (round 5)

The client supplied the full key set (publishable + secret + both legacy JWTs)
for `https://aybxmtqozjkakhdefyqq.supabase.co`. They are configured in
`.env.local` only (git-ignored); nothing secret is in the repository. This build
sandbox still has no outbound access to `*.supabase.co`, so the live project
cannot be driven from here — instead the go-live path was made one-paste short
and every failure mode was exercised by pointing the app at an unreachable
database.

### 17.1 A database outage no longer produces a 500

Measured before: with the provider configured but the database unreachable,
`/buy`, `/rent`, `/categories`, `/contact` and `/properties/[slug]` all returned
**500** (the generic error boundary). That is exactly what a paused Supabase
project (free tier pauses after inactivity) or a half-finished setup looks like
to a visitor.

Now those pages use `safeData()` (`lib/data/resilient.ts`): the failure is logged
as `[data] … unavailable: …` on the server, and the page renders its designed
empty state. The property detail page renders a branded
`UnavailableNotice` (with a WhatsApp shortcut) instead of the error screen, and
its `generateMetadata` no longer throws. Re-measured with the same unreachable
database: **every public route returns 200** — `/`, `/properties`, `/buy`,
`/rent`, `/categories`, `/about`, `/contact`, `/settings`, `/admin/login`,
`/robots.txt`, `/sitemap.xml`, `/properties/<anything>`.

Studio pages deliberately keep their error boundary: an owner must see a real
error when a write or a private read fails, not a silent empty table.

The sign-in screen now answers **503** with "The authentication service could not
be reached. Check the Supabase URL and keys…" instead of pretending the password
was wrong (which previously led owners to lock themselves out).

### 17.2 One-paste setup, one-command owner

| Artefact | Purpose |
| --- | --- |
| `supabase/apply-all.sql` | migrations 0001→0003 + seed concatenated by `npm run sql:bundle`; pasted once into the SQL editor |
| `npm run owner:create -- <email> <password> <code>` | creates the Auth user **email-confirmed**, upserts `profiles` (owner/authorised), stores the bcrypt code hash, then reads all three back to verify |
| `npm run verify:sql` | now also applies `apply-all.sql` to a fresh in-process database, so the bundle cannot drift from the migrations (**37 checks**) |
| `docs/SUPABASE_SETUP.md` | the seven steps, plus a troubleshooting table mapping each error message to its fix |

### 17.3 Verified in this round

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 47/47 |
| `npm run verify:sql` | 37/37 (including the bundle) |
| Local provider build + `next start` | all public routes 200, Studio 307 → login |
| **Supabase mode with an unreachable database** | all 12 public routes 200, detail page shows the branded notice, login answers 503 with the configuration message |
| `npm run owner:create` argument validation / offline error path | clear messages, non-zero exit |
| Bundle → database | `apply-all.sql` creates 7 tables and 15 policies on a clean database |

**Still needs the live project** (outbound access is blocked here): signed
direct-to-Storage uploads, Storage CORS, real Supabase Auth sign-in and
`sb_secret_…` acceptance — all covered by `npm run seed:check`, which prints the
fix for every ✗.
