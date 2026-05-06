# Setup

Full walk-through from a clean clone to a deployed app.

## Prerequisites

- Node 20+ (Node 24 tested)
- A Cloudflare account
- A Google Cloud project for OAuth credentials
- (Optional) `gh` CLI for repo management

## 1. Clone + install

```bash
git clone https://github.com/realitydn/reality-social-game.git
cd reality-social-game
npm install
```

## 2. Cloudflare CLI auth

```bash
npx wrangler login
```

Opens a browser to authorize. This account becomes the deploy target.

## 3. Create the D1 database

```bash
npx wrangler d1 create socialgame-state
```

Wrangler returns a UUID. Open `wrangler.jsonc` and paste it into `d1_databases[0].database_id`, replacing `REPLACE_AFTER_WRANGLER_D1_CREATE`.

Apply migrations locally and remotely:

```bash
npm run db:apply:local
npm run db:apply:remote
```

> If you ever change `wrangler.jsonc` bindings, regenerate the env types: `npm run cf-typegen`.

## 4. Enable R2 + create the photos bucket

R2 needs to be enabled once per account from the Cloudflare dashboard (Workers & Pages → R2 → Enable). Then:

```bash
npx wrangler r2 bucket create socialgame-photos
```

Set up a custom domain for public read access:

1. Cloudflare dashboard → R2 → `socialgame-photos` → Settings → Custom Domains
2. Add a domain like `photos.realitydn.com`
3. Wait for the DNS to propagate

The full URL (e.g. `https://photos.realitydn.com`) is what goes into `PHOTOS_BASE_URL` below.

## 5. Google OAuth credentials

1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID, type **Web application**
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (for `next dev`)
   - Your production domain
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
5. Note the Client ID and Client Secret

## 6. Local environment

```bash
cp .env.example .env.local
```

Fill in:

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<from Google Cloud>
AUTH_GOOGLE_SECRET=<from Google Cloud>
APP_URL=http://localhost:3000
ADMIN_EMAILS=<your email here>
PHOTOS_BASE_URL=https://photos.realitydn.com   # or whatever your custom domain is
```

`ADMIN_EMAILS` is a comma-separated list. Anyone signed in with a Google account whose email is on the list can access `/admin/*`.

## 7. Run locally

```bash
npm run dev
```

App at http://localhost:3000.

> **`next dev` caveats:** Durable Objects don't run under `next dev`, so WebSocket realtime falls back to polling. R2 uploads also fail (no PHOTOS bucket binding in dev). Use `npm run preview` (which goes through `wrangler dev`) for full-stack local testing.

## 8. Production secrets

For the deployed Worker, secrets are set via `wrangler secret put` — they don't go in `wrangler.jsonc`:

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put APP_URL                 # your production URL
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put PHOTOS_BASE_URL
# When wired:
# npx wrangler secret put RESEND_API_KEY
# npx wrangler secret put RESEND_AUDIENCE_ID
```

`wrangler secret put` prompts for the value; it doesn't echo, so you can paste safely.

## 9. Deploy

```bash
npm run deploy
```

Under the hood this runs:

```
opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

Which generates `.open-next/worker.js`, then bundles `worker.ts` (which wraps it + exports `SessionRoom` + intercepts `/api/sessions/<id>/ws`), then uploads to Cloudflare via wrangler.

## 10. Post-deploy verification

Walk through the night cycle in production:

1. Sign in with a Google account on the `ADMIN_EMAILS` list
2. Visit `/admin/session/new` → create a session
3. Open the big screen view (link from admin panel) on a TV / laptop / phone
4. Scan the QR with another phone → guest signup → join
5. Start Bingo from the admin panel
6. On the player phone, tap a square → enter the staff phone's 4-char code → confirm
7. Watch the leaderboard update on the big screen

If realtime works (WS connected), updates are sub-second. If only polling, ~5s.

End the session and confirm the recap splash appears.

## Common pitfalls

- **`Property 'DB' does not exist on type 'CloudflareEnv'`** — run `npm run cf-typegen` after editing `wrangler.jsonc` bindings, OR check that `cloudflare-env.d.ts` augmentations are committed.
- **WebSocket connection fails locally** — expected under `next dev`. Use `npm run preview` for DO support locally.
- **Photos upload returns 503** — `PHOTOS_BASE_URL` env var isn't set, or R2 bucket isn't bound. Check `wrangler.jsonc` and `wrangler secret list`.
- **Sign in returns "configuration"** — `AUTH_SECRET` not set, or Google redirect URI doesn't match exactly. Check both ends.
- **Admin gate redirects you home** — your email isn't in `ADMIN_EMAILS`, or you're signed in as a guest (admin requires Google).
- **DO migration warning during `next build`** — expected. The DO is bundled into the deployed Worker (via `worker.ts`), not into the `next build` output. Production deploys include it.

## Updating after schema or binding changes

When `wrangler.jsonc` bindings change:

```bash
npm run cf-typegen
```

When you add a migration (`migrations/000N_*.sql`):

```bash
npm run db:apply:local
npm run db:apply:remote
```

Migrations are tracked by Wrangler — applying twice is a no-op.

## Two-Worker architecture (potential future split)

If/when the realtime layer outgrows shared bundling with Next.js, the cleanest split is:

- `reality-social-game` Worker — Next.js app via OpenNext, no DOs
- `reality-realtime` Worker — only the SessionRoom DO + a thin fetch handler

The Next.js app would call the realtime Worker via service binding to broadcast. Not needed today, but the design accommodates it.
