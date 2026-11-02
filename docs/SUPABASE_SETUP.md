# Connecting this website to its Supabase project

One Supabase project per client. For this deployment the project is
`https://aybxmtqozjkakhdefyqq.supabase.co`.

Everything below takes about ten minutes and is done once. At the end,
`npm run seed:check` must print **All checks passed**.

> The service-role / secret key belongs only in `.env.local` and in the Vercel
> environment variables. Never commit it, never prefix it with `NEXT_PUBLIC_`.

---

## 1. Environment variables

`.env.local` (local work) and Vercel → Project → Settings → Environment
Variables (production) need the same seven values:

| Variable | Value |
| --- | --- |
| `DATA_PROVIDER` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aybxmtqozjkakhdefyqq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key (`sb_publishable_…`) — public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key (`sb_secret_…`) — server only |
| `SUPABASE_STORAGE_BUCKET` | `property-media` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (no trailing slash) |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 48` |

Notes:

- The legacy JWT keys (`anon`, `service_role`, both starting `eyJ…`) work too if
  a key is ever rotated; put the anon JWT in `SUPABASE_ANON_KEY` and the
  service-role JWT in `SUPABASE_SERVICE_ROLE_KEY`.
- Do **not** set `ALLOW_LOCAL_PROVIDER` in production.
- Changing a variable on Vercel requires a redeploy.

---

## 2. Create the schema (one paste)

Supabase dashboard → **SQL Editor** → New query → paste the whole of
[`supabase/apply-all.sql`](../supabase/apply-all.sql) → **Run**.

That file is generated (`npm run sql:bundle`) and contains, in order:

1. `0001_initial_schema.sql` — seven tables, constraints, indexes, triggers
2. `0002_rls_policies.sql` — row level security + grants
3. `0003_storage.sql` — the public `property-media` bucket (64 MB, image/video MIME types)
4. `seed.sql` — brand/contact defaults, **no demo listings**

It is idempotent, so running it twice is harmless. Expect "Success. No rows
returned". Check: Table Editor should list `properties`, `property_media`,
`inquiries`, `site_settings`, `profiles`, `owner_security`, `login_attempts`,
and no property rows (a production site starts empty on purpose).

---

## 3. Create the owner account + authorise it

Two ways — pick one. Both end with the same rows in `profiles` and
`owner_security`.

### Fast path (one command)

```bash
npm run owner:create -- owner@your-domain.com "a-strong-password" 741852963147
```

It creates the Auth user **with the email already confirmed**, authorises the
`profiles` row, stores a bcrypt hash of the 12-digit code, then reads everything
back to confirm. Running it again rotates the password/code for the same email
instead of creating a second account. Replace the sample code with your own
12 digits and keep it offline.

### Dashboard path

Authentication → **Sign In / Providers**:

- Email provider: enabled.
- **"Allow new users to sign up": off** (only the owner should ever have an account).
- Authentication → **Users** → *Add user* — email, strong password, and tick
  **Auto Confirm User** (without it the first sign-in fails with
  "Email not confirmed").

Then, in the repo:

```bash
npm run owner:hash -- 741852963147 owner@your-domain.com
```

Paste the SQL it prints into the SQL Editor and run it: it upserts the
`profiles` row as `role = 'owner'`, `is_authorized = true` and stores the bcrypt
hash of the code in `owner_security` (the code itself is never stored).

---

## 4. How the Studio sign-in works

`/admin/login` asks for three factors, all checked server-side:

1. email + password (Supabase Auth)
2. the `profiles` row is `role = 'owner'` **and** `is_authorized = true`
3. the 12-digit code, compared against the bcrypt hash in `owner_security`

Five wrong codes lock the Studio for 15 minutes. The code is permanent; the
session is an HttpOnly cookie that expires after 8 hours.

## 5. Storage CORS (needed for large uploads)

Storage → `property-media` → Settings → CORS. Allow the site origin for
`GET`, `PUT`, `POST` with the headers `Content-Type`, `cache-control` and
`x-upsert`:

```json
[
  {
    "origin": ["https://your-domain.com", "http://localhost:3000"],
    "method": ["GET", "PUT", "POST", "HEAD"],
    "maxAgeSeconds": 3600,
    "allowedHeaders": ["Content-Type", "cache-control", "x-upsert", "authorization", "apikey"]
  }
]
```

Why: images up to 8 MB and videos up to 64 MB are uploaded **browser → Storage**
with a signed URL, because Vercel rejects function bodies above ~4.5 MB. Without
CORS the browser blocks that PUT; files under 4 MB still work through the server
fallback, larger ones are refused with a clear message.

---

## 6. Verify before announcing the site

```bash
npm run verify:sql    # schema + RLS logic, no network needed (37 checks)
npm run seed:check    # the real project: env, tables, RLS, bucket, owner, auth
```

`seed:check` prints a ✓/✗ line per item and, for every ✗, the exact fix. Do not
deploy until it says **All checks passed**.

---

## 7. First run

1. Deploy (or `npm run build && npm run start`).
2. Open `/admin/login`, sign in with the three factors.
3. Studio → Properties → New: add the first listing, upload photographs, publish.
4. Public site → the listing appears on `/`, `/properties`, `/buy` or `/rent`.
5. Studio → Settings: set the real business name, phone, WhatsApp, email, address,
   hero copy and SEO — every change is reflected on the public site immediately.
6. Send yourself a test enquiry from `/contact`, confirm it lands in
   Studio → Enquiries, then delete it.

---

## Troubleshooting

| What you see | Cause | Fix |
| --- | --- | --- |
| Sign-in: "The Owner Studio is not configured…" | `SUPABASE_SERVICE_ROLE_KEY` or `ADMIN_SESSION_SECRET` missing | step 1, then redeploy |
| Sign-in: "This account is not authorised" | `profiles` row missing / not authorised | step 4 |
| Sign-in: "The 12-digit access code has not been configured" | no `owner_security` row | step 4 |
| Sign-in: "Email not confirmed" | user created without Auto Confirm | confirm the user in Authentication → Users |
| Public pages show "register is being prepared" | no published listings yet | expected on a fresh project |
| Enquiry form: "could not be saved right now" | service key wrong or schema missing | `npm run seed:check` |
| Upload of a large photo/video fails | Storage CORS missing | step 5 |
| Studio tables empty but data exists | `is_published = false` | toggle Publish in the Studio |
