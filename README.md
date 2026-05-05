# REALITY Social Game (working title)

A bar-floor party game played in person at REALITY (86 Mai Thúc Lân, Đà Nẵng). Find another player in the room, complete tasks together, score points, see yourself on the projected leaderboard.

**Phase 0 scaffold:** auth, profile, i18n, REALITY brand chrome. Game modes and realtime layer arrive in Phase 1+.

## Stack

- **Next.js 15** (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Cloudflare D1** (database)
- **Cloudflare Durable Objects** (planned, Phase 1) — one Durable Object per session, brokers realtime via WebSockets
- **Cloudflare R2** (planned) — user avatars; **not yet enabled on the account**
- **Auth.js v5** with Google OAuth + anonymous guest mode
- **next-intl** for EN / VI / RU / UK (cookie-based, no path-based routing)
- **Tailwind v4** with REALITY brand tokens (cream / ink + 8 chromatic swatches; Montserrat + Space Grotesk)
- **Resend** for newsletter opt-in (sync wired in Phase 1)

## Local dev

```bash
npm install
cp .env.example .env.local
# Generate AUTH_SECRET: openssl rand -base64 32
# Google OAuth creds optional for now — guest mode works without them
npm run dev
```

App runs at http://localhost:3000.

## Cloudflare setup (one-time)

```bash
npx wrangler login

# Create the D1 database, then paste the returned database_id into wrangler.jsonc.
npx wrangler d1 create socialgame-state

# Apply migrations locally + remotely.
npm run db:apply:local
npm run db:apply:remote   # after wrangler.jsonc has the real id

# Enable R2 in the Cloudflare dashboard, then:
# npx wrangler r2 bucket create reality-game-avatars
# (also uncomment AVATARS in cloudflare-env.d.ts and the r2_buckets block in wrangler.jsonc)
```

## Production secrets

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_AUDIENCE_ID
```

## Deploy

```bash
npm run deploy
```

## Layout

```
src/
  app/
    layout.tsx                       Fonts, locale provider, brand chrome
    page.tsx                         Home — sign in or play as guest
    profile/page.tsx                 Display name + locale + newsletter (avatar stubbed for R2)
    api/auth/[...nextauth]/route.ts  Auth.js handlers
  components/
    Wordmark.tsx                     REALITY wordmark (Montserrat Alternates, 0.1em)
    LocaleSwitcher.tsx               EN / VI / RU / UK toggle, cookie-based
    SignInButtons.tsx                Google sign-in + guest entry
  i18n/
    locales.ts                       Locale constants
    request.ts                       next-intl config (cookie + Accept-Language)
  lib/
    db.ts                            D1 binding from CF context
    auth.ts                          Auth.js config (Google + D1 adapter)
    session.ts                       getCurrentUser / createGuest / updateProfile
messages/                            Translations: en / vi / ru / uk
migrations/0000_init.sql             D1 schema (Auth.js + game state tables)
wrangler.jsonc                       Cloudflare Worker bindings
open-next.config.ts                  OpenNext adapter config
cloudflare-env.d.ts                  CloudflareEnv interface augmentations
```

## What's next

- **Phase 1**: sessions + presence (one night = one session, QR check-in, live attendee list, big-screen projection route)
- **Phase 2**: first game (Bingo). Define the `GameType` interface — `init`, `reduce`, `validate`, `score`, `prompts(locale)`. New games live in `src/games/<name>/` and slot in via the `game_events` log without schema changes.
- **Phase 3**: persistent leaderboards (nightly / weekly / all-time)
- **Phase 4+**: more games (Target Hunt, Speed Pairing, …)

## TODOs flagged in the code

- `wrangler.jsonc` — paste real `database_id` after `wrangler d1 create socialgame-state`
- `cloudflare-env.d.ts` — uncomment `AVATARS` binding after R2 is enabled
- `next.config.ts` — uncomment the R2 image hostname when avatars are live
- `src/app/profile/page.tsx` — avatar uploader stub waiting on R2
- `migrations/0000_init.sql` — verify Auth.js D1 adapter schema matches the installed adapter version (`@auth/d1-adapter`) before first sign-in
