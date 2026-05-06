# REALITY Social Game

A bar-floor party game played in person at REALITY (86 Mai Thúc Lân, Đà Nẵng). Find another player in the room, do something with them, score points, see yourself on the projected leaderboard. Multiple game modes; one-night sessions with persistent leaderboards across nights.

The repo is the venue's own piece of infrastructure — small enough to read end-to-end, deliberately built so adding a new game = dropping a folder.

## What's in here right now

Three playable games sharing one architecture (deterministic-card claims, chain-shifting tags, server-mediated re-pairing):

- **Bingo** — 4×4 prompts in EN / VI / RU / UK; mutual-confirm via 4-char player codes
- **Target Hunt** — non-elimination chain hunt; tag your target, inherit their target, chains converge
- **Speed Pair** — auto-pair, both tap "done" → re-pair from a FIFO queue; score = meetings completed

Plus the night-cycle plumbing:

- QR check-in → guest signup → live attendee list → projected leaderboard → end-of-session winners splash
- Persistent leaderboards (tonight / this week / all-time) at `/leaderboard`
- WebSocket realtime via Durable Objects, 5s polling fallback
- Photo upload pipeline (avatars; the same plumbing supports future photo-driven games)

15 routes total. Build clean. Sessions span: admin creates → players join via QR → games run → admin ends → recap.

## Stack

- **Next.js 15** (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Cloudflare D1** for state (SQLite, append-only `game_events` log)
- **Cloudflare Durable Objects** — one `SessionRoom` per session, in-memory WebSocket fan-out
- **Cloudflare R2** for photo storage (avatars; future game uploads)
- **Auth.js v5** (Google OAuth + anonymous guest sessions)
- **next-intl** for EN / VI / RU / UK (cookie-based, no path prefixing)
- **Tailwind v4** with REALITY brand tokens, Montserrat + Space Grotesk
- **Resend** for newsletter opt-in sync (wired in later phase)

## Quick start

```bash
npm install
cp .env.example .env.local
# generate AUTH_SECRET (openssl rand -base64 32)
# add your email to ADMIN_EMAILS
npx wrangler login
npx wrangler d1 create socialgame-state
# paste returned database_id into wrangler.jsonc
npm run db:apply:local
npm run dev
```

For the full setup (Cloudflare + Google OAuth + R2 custom domain), see [`docs/SETUP.md`](docs/SETUP.md).

## Project layout

```
src/
  app/                    Next.js App Router (player + admin + big-screen pages, API routes)
  components/             UI components (Bingo, TargetHunt, SpeedPair views; Leaderboard; AvatarUpload; etc.)
  durable-objects/        SessionRoom DO (WebSocket fan-out)
  games/                  GameType implementations — bingo, target-hunt, speed-pair
  i18n/                   next-intl config, locale constants
  lib/                    db, auth, sessions, games, events, photos, realtime, hashing
messages/                 Translations: en / vi / ru / uk
migrations/               D1 SQL migrations
docs/                     Architecture, game catalog, roadmap, setup
worker.ts                 Custom CF Worker entry — wraps OpenNext + exports SessionRoom
wrangler.jsonc            Cloudflare bindings (D1, DO, R2, assets)
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the design choices, reasoned through
- [`docs/GAMES.md`](docs/GAMES.md) — catalog of built games + how to add a new one
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — the future, organized by tier
- [`docs/SETUP.md`](docs/SETUP.md) — full deploy walkthrough
- [`docs/MEMBERSHIP_HANDOFFS.md`](docs/MEMBERSHIP_HANDOFFS.md) — ideas for the REALITY Membership / Business Network project
