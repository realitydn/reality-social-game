# REALITY Social Game

A bar-floor party game played in person at REALITY (86 Mai Thúc Lân, Đà Nẵng). Find another player in the room, do something with them, score points, see yourself on the projected leaderboard. Multiple game modes; one-night sessions with persistent leaderboards across nights.

The repo is the venue's own piece of infrastructure — small enough to read end-to-end, deliberately built so adding a new game = dropping a folder.

## What's in here right now

Six playable games sharing one architecture (deterministic-card claims, chain-shifting tags, server-mediated re-pairing, host-driven question rounds, host-managed song queue, host-configured photo capture):

- **Bingo** — 4×4 prompts in EN / VI / RU / UK; mutual-confirm via 4-char player codes
- **Target Hunt** — non-elimination chain hunt; tag your target, inherit their target, chains converge
- **Speed Pair** — auto-pair, both tap "done" → re-pair from a FIFO queue; score = meetings completed
- **Quiz Round** — host-driven trivia from an authored package; per-package timer / scoring / leaderboard knobs; five question-type plugins (MCQ with per-option images, true/false, free-text with Levenshtein matching, ordering with drag-and-drop, audio-MCQ with R2-hosted clips); new types slot in as folders
- **Karaoke Queue** — first non-competitive game; players submit a song title (one active per person), host arranges/edits/completes/deletes, big-screen shows now-up + up-next + history strip
- **Disposable Camera** — second non-competitive game; host-configured photo budget per player (default 5) + camera direction (front / back / either) + vote count (default 3); audience voting opens after capture; "Photographers of the Night" reveal on the projector

Plus the night-cycle plumbing:

- QR check-in → guest signup → live attendee list → projected leaderboard → end-of-session winners splash
- Persistent leaderboards (tonight / this week / all-time) at `/leaderboard`
- WebSocket realtime via Durable Objects, 5s polling fallback
- Photo upload pipeline (avatars + Quiz Round question media; the same plumbing supports future photo-driven games)
- Host CMS at `/host/*` for authoring quiz packages — library, editor with per-question-type sub-editors, image upload, solo preview
- Live host control panel at `/session/[id]/host` for advancing questions during a Quiz Round; big-screen takes over the projector with question display + live counts + reveal coloring

22 routes. Build clean. Sessions span: admin creates → players join via QR → games run → admin ends → recap.

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
  app/
    admin/                Session lifecycle (create / start game / end)
    host/                 Quiz package authoring CMS (library, editor, preview)
    session/[id]/host/    Live host control during a Quiz Round game
    big-screen/[id]/      Projector view (Quiz Round takes the stage when active)
    api/                  Routes: events, packages, photos upload, session state
    s/[id]/, session/[id] Player join + play pages
  components/             Shared UI; per-game player views; per-question-type renderers
    host/                 Author-side editor components (PackageEditor, QuestionEditor, MCQ/TF sub-editors)
  durable-objects/        SessionRoom DO (WebSocket fan-out)
  games/                  GameType implementations — bingo, target-hunt, speed-pair, quiz-round
    quiz-round/
      question-types/     Pluggable question types (multiple-choice, true-false, future image-mcq etc.)
  i18n/                   next-intl config, locale constants
  lib/                    db, auth, sessions, games, events, packages, photos, realtime, hashing
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
