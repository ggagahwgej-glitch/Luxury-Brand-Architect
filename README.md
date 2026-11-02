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

## Production setup

1. Create one Supabase project for the client, enable Email auth, create the owner's Auth user.
2. Apply `supabase/migrations/0001_initial_schema.sql` → `0002_rls_policies.sql` → `0003_storage.sql`, then `supabase/seed.sql`.
3. Authorize the owner in `profiles` (`role='owner'`, `is_authorized=true`).
4. Generate the secret-code hash: `npm run owner:hash 741852963147 owner@client.com` and apply the printed SQL.
5. Set env vars (`DATA_PROVIDER=supabase`, Supabase URL/anon/service-role keys, `ADMIN_SESSION_SECRET`, `SUPABASE_STORAGE_BUCKET`).
6. `npm run seed:check` → `npm run build` → `npm run start`.

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
| `npm test` | Vitest suite (37 tests) |
| `npm run owner:hash <code> <email>` | bcrypt hash + SQL for `owner_security` |
| `npm run storage:prune [-- --apply]` | Report/remove orphaned media files |
| `npm run seed:check` | Verify env, tables, settings row, owner, bucket, anon-leak guards |

## Structure

```
app/(public)      public pages          app/admin/(studio)   protected studio
app/api           server endpoints      components/          UI, admin, property, home
lib/data          repository interface + local/supabase providers
lib/auth          session, token, rate limit, owner authorization
lib/validation    Zod schemas           supabase/            migrations + seed
```
