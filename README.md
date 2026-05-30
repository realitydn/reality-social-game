# REALITY Social Game

A bar-floor party game played in person at REALITY (86 Mai Thúc Lân, Đà Nẵng). Find another player in the room, do something with them, score points, see yourself on the projected leaderboard. Multiple game modes; one-night sessions with persistent leaderboards across nights.

Live at **[app.realitydn.com](https://app.realitydn.com)** — a Cloudflare Workers custom domain (the `*.workers.dev` URL stays as a fallback).

The repo is the venue's own piece of infrastructure — small enough to read end-to-end, deliberately built so adding a new game = dropping a folder.

## What's in here right now

Six playable games sharing one architecture (deterministic-card claims, chain-shifting tags, server-mediated re-pairing, host-driven question rounds, host-managed song queue, host-configured photo capture):

- **Bingo** — 4×4 prompts in EN / VI / RU / UK; mutual-confirm via 4-char player codes
- **Target Hunt** — non-elimination chain hunt; tag your target, inherit their target, chains converge
- **Speed Pair** — auto-pair, both tap "done" → re-pair from a FIFO queue; score = meetings completed
- **Quiz Round** — host-driven trivia from an authored package; per-package timer / scoring / leaderboard knobs; five question-type plugins (MCQ with per-option images, true/false, free-text with Levenshtein matching, ordering with drag-and-drop, audio-MCQ with R2-hosted clips); new types slot in as folders. Optional **Pub Quiz teams** mode — players create/join teams and the projector shows team standings; individual scoring is unchanged underneath
- **Karaoke Queue** — first non-competitive game; players submit a song title (one active per person), host arranges/edits/completes/deletes, big-screen shows now-up + up-next + history strip
- **Disposable Camera** — second non-competitive game; host-configured photo budget per player (default 5) + camera direction (front / back / either) + vote count (default 3); audience voting opens after capture; "Photographers of the Night" reveal on the projector

Plus the night-cycle plumbing:

- QR check-in → guest signup → live attendee list → projected leaderboard → end-of-session winners splash
- **Score ledger + persistent leaderboards** — an append-only `score_ledger` is the source of truth; `/leaderboard` has game-scope tabs (Everything / Pub Quiz / Karaoke / Paparazzi) × time windows (tonight / this week / all-time), with "tonight" cut off in Đà Nẵng time
- **Host-awarded points** — the quiz and karaoke host panels can award off-script points (quiz winners, karaoke dares); Disposable Camera auto-tallies a "Top Paparazzi" credit from photo votes
- **Staff roles** — a `staff_roles` table (`admin` / `host`) replaces the old binary email gate; a `/admin/staff` page manages it, and host-driven games get a host picker so e.g. Sam can run Pub Quiz without full admin
- WebSocket realtime via Durable Objects (Hibernation API — idle rooms stop billing), 5s polling fallback
- Photo upload pipeline (avatars + Quiz Round question media + Disposable Camera shots; the same plumbing supports future photo-driven games)
- Host CMS at `/host/*` for authoring quiz packages — library, editor with per-question-type sub-editors, image upload, solo preview, unsaved-changes guard
- Live host control panel at `/session/[id]/host` for advancing questions during a Quiz Round; big-screen takes over the projector with question display + live counts + reveal coloring
- Auth-aware home + a real sign-out at `/profile`

Build clean. Sessions span: admin creates → players join via QR → games run → admin ends → recap.

## Stack

- **Next.js 15** (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Cloudflare D1** for state (SQLite, append-only `game_events` log)
- **Cloudflare Durable Objects** — one `SessionRoom` per session, in-memory WebSocket fan-out
- **Cloudflare R2** for photo storage (avatars; future game uploads)
- **Auth.js v5** (Google OAuth + anonymous guest sessions; `trustHost` for the custom domain)
- **next-intl** for EN / VI / RU / UK (cookie-based, no path prefixing)
- **Tailwind v4** with REALITY brand tokens, Montserrat + Space Grotesk
- **Resend** for newsletter opt-in sync (wired in later phase)

> **Translation caveat:** the Vietnamese / Russian / Ukrainian strings added in the most recent batch (projector chrome, recap, teams, leaderboard scopes, home) are machine translations awaiting a native review pass.

## Quick start

```bash
npm install
cp .env.example .env.local
# generate AUTH_SECRET (openssl rand -base64 32)
# add your email to ADMIN_EMAILS — the bootstrap admin seed (you can't lock
# yourself out of an empty staff_roles table); manage everyone else from /admin/staff
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
    admin/                Session lifecycle (create / start game / end); staff/ role management
    host/                 Quiz package authoring CMS (library, editor, preview)
    session/[id]/host/    Live host control during a host-driven game
    big-screen/[id]/      Projector view (Quiz Round / Karaoke / Disposable take the stage when active)
    profile/              Signed-in profile + real sign-out
    leaderboard/          Persistent boards: game-scope tabs × time windows
    api/                  Routes: events, packages, photos upload, session state, award
    s/[id]/, session/[id] Player join + play pages
  components/             Shared UI; per-game player views; per-question-type renderers; ConfirmModal, LiveBadge
    host/                 Author-side editor components (PackageEditor, QuestionEditor, per-type sub-editors)
  durable-objects/        SessionRoom DO (WebSocket fan-out, Hibernation API)
  games/                  GameType impls — bingo, target-hunt, speed-pair, quiz-round, karaoke-queue, disposable-camera
    quiz-round/
      question-types/     Pluggable question types (multiple-choice, true-false, free-text, ordering, audio)
  i18n/                   next-intl config, locale constants
  lib/                    db, auth, roles, sessions, games, events, ledger, leaderboards, packages, photos, realtime, hashing
messages/                 Translations: en / vi / ru / uk
migrations/               D1 SQL migrations (0000–0005)
docs/                     Architecture, game catalog, roadmap, setup
worker.ts                 Custom CF Worker entry — wraps OpenNext + exports SessionRoom
wrangler.jsonc            Cloudflare bindings (D1, DO, R2, assets) + custom domain route
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the design choices, reasoned through
- [`docs/GAMES.md`](docs/GAMES.md) — catalog of built games + how to add a new one
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — the future, organized by tier
- [`docs/SETUP.md`](docs/SETUP.md) — full deploy walkthrough
- [`docs/MEMBERSHIP_HANDOFFS.md`](docs/MEMBERSHIP_HANDOFFS.md) — ideas for the REALITY Membership / Business Network project
