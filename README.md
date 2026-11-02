# Aurum Estates — Luxury Real Estate Website + Owner Studio

A single Next.js 15 application: a cinematic public real-estate website and an embedded, private Owner Admin Studio. One codebase, one deployment, one Supabase project per client.

> Full build notes, security model, Supabase setup and the tested/untested matrix live in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).

## Quick start (local preview, no Supabase needed)

```bash
npm install
cp .env.example .env.local     # then set DATA_PROVIDER=local below
npm run dev                    # http://localhost:3000
```

There are **no fallback credentials in the source tree** — the preview provider refuses to sign anyone in until all three `LOCAL_OWNER_*` values exist.

Minimum `.env.local` for the offline preview:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATA_PROVIDER=local
ADMIN_SESSION_SECRET=<openssl rand -base64 48>
LOCAL_OWNER_EMAIL=owner@aurumestates.com
LOCAL_OWNER_PASSWORD=RoyalAccess2026!
LOCAL_OWNER_CODE=741852963147
```

The local provider writes to `.data/db.json` (git-ignored). Inside a production build it is refused unless `ALLOW_LOCAL_PROVIDER=1` is set, and a production build with *no* provider configured now fails fast with a clear message instead of quietly serving demo data.

- Public site: `/`
- Studio: `/admin/login` (email + password + 12-digit code)
- The admin link is deliberately absent from the main navigation — it lives on `/settings` and in the footer.

## Production setup (one Supabase project per client)

Everything below is done once per client. `npm run seed:check` at the end tells
you exactly what is still missing, so you cannot half-deploy by accident.

### 1. Environment

Start from `.env.example` → `.env.local` (never committed):

| Variable | Where it comes from |
| --- | --- |
| `DATA_PROVIDER=supabase` | literal |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_…`) or the legacy anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** key (`sb_secret_…`) or the legacy `service_role` JWT — server-only |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 48` (32+ chars) |
| `NEXT_PUBLIC_SITE_URL` | final HTTPS origin, no trailing slash |
| `SUPABASE_STORAGE_BUCKET` | `property-media` (default) |

Do **not** set `ALLOW_LOCAL_PROVIDER` in production, and never prefix a secret
with `NEXT_PUBLIC_`.

### 2. Schema

Open the SQL editor and run, in this order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_storage.sql` (creates the public `property-media` bucket)
4. `supabase/seed.sql` (brand/contact defaults; no demo listings)

Alternatively `supabase db push` if the project is linked to this repo.
`npm run verify:sql` runs the same migrations against an in-process Postgres and
checks the constraints, triggers and RLS rules — use it after editing any SQL.

### 3. Auth

- Authentication → Sign In / Providers → Email: enabled.
- Authentication → Providers → turn **off** "Allow new users to sign up" (the
  owner is the only account).
- Authentication → Users → “Add user”, enter the owner email + a strong
  password, tick **Auto Confirm User** (otherwise the first sign-in fails with
  "Email not confirmed").

### 4. Owner provisioning

```bash
npm run owner:hash -- <12-digit-code> owner@client.com
```

Paste the printed SQL into the Supabase SQL editor. It creates/authorises the
`profiles` row **and** stores the bcrypt hash of the code in `owner_security`
(the raw code is never stored).

### 5. Storage CORS (large uploads)

Storage → `property-media` → Settings → CORS: allow the site origin(s) for
`GET`, `PUT`, `POST` with headers `Content-Type`, `cache-control`, `x-upsert`.
Without it, files above 4 MB cannot upload directly and videos are refused.

### 6. Verify, then deploy

```bash
npm run verify:sql    # schema checks, no network needed
npm run seed:check    # live project: env, tables, RLS, bucket, owner
npm run build
```

On Vercel: add every variable from step 1 to the Production environment (Preview
too if you use it), then deploy. `npm run build` needs no runtime environment.

## Deployment notes (Vercel / any CI)

The public segment (`app/(public)/layout.tsx`) and `robots.txt` are marked
`export const dynamic = "force-dynamic"`, together with `sitemap.xml`. Every
public page reads site settings — and most read listings — from the database,
so rendering happens per request:

- `npm run build` needs **no** runtime environment variables and no reachable
  database, so a Vercel build cannot fail while prerendering `/`.
- Studio edits appear immediately (the API routes already call `revalidatePath`).
- Environment variables only need to exist at **runtime**; set them for the
  Production environment in Vercel (and redeploy after changing them).
- Consequence: HTML is served with `Cache-Control: private, no-cache` — the CDN
  caches images and static assets, not the rendered pages. If you later want
  CDN-cached HTML, replace `force-dynamic` with `export const revalidate = 60`
  on the public pages; the revalidation hooks are already in place.
- If `NEXT_PUBLIC_SITE_URL` is omitted the app falls back to Vercel's own
  deployment hosts (`VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`), so
  canonical URLs never advertise `localhost`. Set it anyway.
- Missing configuration is reported, not guessed: the server logs one
  `[config]` line listing absent variables, and `/admin/login` answers 503 with
  the exact variables to add. `ALLOW_LOCAL_PROVIDER` is ignored on Vercel.

### Large uploads (important)

Vercel caps serverless request bodies at ~4.5 MB, while the app accepts 8 MB
images and 64 MB videos. Studio uploads therefore go **browser → Supabase
Storage** using a signed URL from `POST /api/admin/media/upload-url`; the file
never passes through a function. The old proxy route remains as a fallback for
the local preview provider and for small files (≤ 4 MB) and returns `413` above
that.

One-time setup: Supabase → Storage → `property-media` → Settings → **CORS** —
allow the site origin (e.g. `https://client-domain.com`, plus
`http://localhost:3000` for local work) for `GET`/`PUT`/`POST` with
`Content-Type`, `cache-control` and `x-upsert` headers. Without it the direct PUT
is blocked and uploads fall back to the 4 MB proxy path.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js on `0.0.0.0:3000` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest suite (47 tests) |
| `npm run verify:sql` | Apply all migrations to an in-process Postgres and assert constraints + RLS |
| `npm run owner:hash -- <code> <email>` | bcrypt hash + owner-provisioning SQL |
| `npm run storage:prune [-- --apply]` | Report/remove orphaned media files |
| `npm run seed:check` | Live-project doctor: env, tables, RLS, bucket, owner, auth settings |

## Structure

```
app/(public)      public pages          app/admin/(studio)   protected studio
app/api           server endpoints      components/          UI, admin, property, home
lib/data          repository interface + local/supabase providers
lib/auth          session, token, rate limit, owner authorization
lib/validation    Zod schemas           supabase/            migrations + seed
```
