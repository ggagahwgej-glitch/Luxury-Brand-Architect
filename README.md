# Aurum Estates — Luxury Real Estate Website + Owner Studio

A single Next.js 15 application: a cinematic public real-estate website and an embedded, private Owner Admin Studio. One codebase, one deployment, one Supabase project per client.

> Full build notes, security model, Supabase setup and the tested/untested matrix live in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).

## Quick start (local preview, no Supabase needed)

```bash
npm install
cp .env.example .env.local     # then set DATA_PROVIDER=local below
npm run dev                    # http://localhost:3000
```

Minimum `.env.local` for the offline preview:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATA_PROVIDER=local
ADMIN_SESSION_SECRET=<openssl rand -base64 48>
LOCAL_OWNER_EMAIL=owner@aurumestates.com
LOCAL_OWNER_PASSWORD=RoyalAccess2026!
LOCAL_OWNER_CODE=741852963147
```

The local provider writes to `.data/db.json` (git-ignored) and is refused inside a production build unless `ALLOW_LOCAL_PROVIDER=1` is set, so demo data cannot leak into a real deployment.

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

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js on `0.0.0.0:3000` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest suite (24 tests) |
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
