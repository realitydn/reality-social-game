# Architecture

The thinking behind the design choices, written so a smart collaborator (or future-you at 2am) can pick up the codebase quickly.

## The shape of the system

```
                          ┌─────────────────────┐
   Player phones ───WS─►  │   SessionRoom DO    │  ◄── notifySession()
   Big screen   ───WS─►  │  (one per session)   │      from server actions
   Polling clients ──HTTP┴─────────────────────┘      (best-effort)
                                  │
                                  │ broadcasts "ping"
                                  ▼
                          Each client refetches
                          /api/sessions/[id]/state
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │   Next.js Worker       │
                      │   (OpenNext-built)     │
                      └────────────┬───────────┘
                                   │
                            ┌──────┴──────┐
                            ▼             ▼
                       D1 (state)     R2 (photos)
```

One Durable Object per session is the realtime hub. It holds nothing but the set of connected WebSockets (owned by the runtime via the Hibernation API, so an idle room can be evicted from memory). Every state-changing action on the server fires a `notifySession()` ping into the DO, which broadcasts to all subscribers. Subscribers respond by refetching the dashboard endpoint — the DO is purely a notification channel, not a state store. This keeps the source of truth in one place (D1) and makes losing a DO instance survivable: clients reconnect, refetch, carry on.

## Data flow: actions become events

Every state change in a game goes through the same path:

1. Client posts to `/api/games/[id]/events` (e.g. `{ kind: "bingo_claim", squareIdx, promptId, targetCode }`)
2. Server **authorizes the actor** — being signed in (or holding a guest cookie) is not enough; the actor must be a participant in *this* session, a site admin, or the game's host (see [Event-route security](#event-route-security) below)
3. Server **zod-validates the body** against a discriminated union keyed on `kind` — untrusted JSON is never cast straight to a type
4. Server loads the game's current state by **reducing all rows** from `game_events` for that game through the registered `GameType`'s reducer
5. Server constructs a typed `event` from the body, calls `gameType.validate(state, event, actorId, ctx)`
6. If valid, server appends a row to `game_events` with the event's payload
7. Server calls `notifySession(sessionId, kind)` — best-effort fan-out
8. Connected clients receive the ping and refetch `/api/sessions/[id]/state`

The reducer is **pure**. State is never stored — always derived. The event log replays in **`rowid` order** (`SELECT ... ORDER BY rowid ASC`) — SQLite assigns rowids monotonically in insertion order, so it's the true append sequence and never ties. The earlier `ORDER BY created_at, id` was non-deterministic within a millisecond (`id` is a random UUID), which could flip replay order and corrupt order-sensitive games (Speed Pair re-pairing, Target Hunt chain inheritance).

Replaying is slow if events grow unbounded, but a single bar night caps at maybe a few thousand events; D1 reads them in milliseconds. If we ever need to scale, snapshot-and-replay is a small change.

## The `GameType<State, Event>` interface

`src/games/types.ts` defines the contract. Every game implements:

```ts
interface GameType<State, Event> {
  type: string;                                    // matches games.type column
  init(ctx): State;                                // empty state
  reduce(state, event, ctx): State;                // pure folder
  validate(state, event, actorId, ctx): GameValidation;  // authorize before append
  score(state, ctx): Record<userId, number>;       // for leaderboards
  prompts(locale): Record<string, string>;         // i18n labels
  onStart?(ctx, players): SeedEvent[];             // optional seed events at start
}
```

**Adding a new game = adding a folder under `src/games/<name>/` and one line in `src/games/registry.ts`.** No core changes. No new tables. No schema migrations. Game state lives entirely in `game_events` rows.

`onStart` is the escape hatch for games that need to seed shared state from the player roster (Target Hunt's ring assignments, Speed Pair's initial pairings). The Bingo game doesn't define one — its cards are deterministic from `(sessionId, gameId, userId)`.

Phase 8a extended `onStart` with an optional third `seedData` argument so content-driven games (Quiz Round) can have their package snapshot handed in by the orchestration layer without the GameType needing DB access. Existing games ignore it; their signatures are unchanged.

## Authoring layer: packages and question-type plugins

Some games (Quiz Round, future Pub Quiz, future card-deck games) need authored content separate from the game runtime. Phase 8a added two patterns to support this without leaking content concerns into the GameType abstraction:

**Packages** are first-class authored entities, stored in `packages` (id, name, game_type, author_id, config, content, status). The `content` and `config` columns are JSON blobs whose shape is owned by the consuming game type — Quiz Round stores `{ questions: Question[] }` but a future deck-based game can use `{ cards: Card[] }` without a migration. Authored in the `/host/*` CMS; sign-in required, no further gate (obscurity model for v1).

When an admin starts a content-driven game, the server action loads the package and calls:

```ts
startGame(sessionId, type, {
  config:   { packageId },        // persisted on games.config for audit
  seedData: { /* resolved package data */ },  // passed opaquely to onStart
});
```

The GameType's `onStart` reads `seedData` and emits a seed event that snapshots the content into the event log. This decouples content loading (DB-bound, in the orchestration layer) from game logic (pure, in the reducer) and gives us replay determinism for free — the package can be edited or deleted after game start without affecting the running game.

**Question-type plugins** are GameType-style plugins one level down. Inside `src/games/quiz-round/question-types/`, each type (`multiple-choice`, `true-false`, future `image-mcq`, `free-text`, `ordering`, `audio`) is a folder exporting a `QuestionType<Q, A>` with pure `validateAnswer`, `isCorrect`, `scoreAnswer`. Adding a new question type = one new folder + one registry line + 3 small render components (host editor, player UI, big-screen). The reducer dispatches by `question.type` and calls the plugin's pure functions during answer-validation and reveal-time scoring.

The pattern generalizes: any future GameType that needs pluggable sub-content can apply the same shape (registry of pure plugins keyed by a type string, with separate render components in `src/components/`).

## Game lifecycle

Sessions and games are separate concepts:

- A **session** = one night at the venue. `game_sessions` table. `starts_at`, `ends_at`.
- A **game** = one round of a specific game type within a session. `games` table. Multiple games can run in sequence within a session.

Lifecycle:

```
createSession (admin)
  ↓
joinSession (QR scan)  ← repeatable; players trickle in
  ↓
startGame              ← finalizes any prior game first
  ↓
game events accumulate
  ↓
endGame                ← finalizeGame() persists scores to session_players.score
  ↓
(optionally another startGame in same session)
  ↓
endSession             ← session.ends_at set; big screen flips to recap splash
```

`finalizeGame()` reads the game's final scores via `gameType.score()` and writes them to **two** places: it adds them to `session_players.score` (additive — multiple games per session accumulate; this is what the in-session recap reads) and it appends per-game rows (`reason='game'`) to the append-only `score_ledger` (which the persistent `/leaderboard` reads). See [Score ledger](#score-ledger--leaderboards) below.

`finalizeGame()` is a **compare-and-swap**: it flips `games.status` from `running` to `ended` first, and only the caller that wins that flip applies the score deltas. The flip happens both on an explicit `endGame` and when the next game starts (the prior running game is finalized first), so without the CAS a double-tapped "end" — or an "end" racing the auto-finalize — could credit the same points twice.

## Score ledger + leaderboards

There are now two distinct score stores, and the split is deliberate:

- **`session_players.score`** — the in-session cumulative. One column, additive across the games in a night. The end-of-session recap reads it. It's per-session and disposable.
- **`score_ledger`** (`migrations/0005`) — an **append-only** ledger of point events: `(user_id, session_id, game_id, game_type, points, reason, awarded_by, created_at)`. This is the source of truth for the persistent `/leaderboard`.

Keeping the ledger append-only (rather than a running per-user total) buys the same things event-sourcing buys the games: every point is attributable (which game, which night, who awarded it), boards can be re-derived by re-summing, and we can slice by `game_type` or time window without a schema change. `reason` tags where points came from — `'game'` (written by `finalizeGame`), `'paparazzi'` (Disposable Camera vote tally), `'quiz_winner'` / `'karaoke_dare'` (host awards). `awarded_by` records the staff member on host-awarded rows.

`src/lib/leaderboards.ts` reads the ledger. The board has **game-scope tabs** (Everything / Pub Quiz / Karaoke / Paparazzi — a `gameType` filter, `null` = everything) crossed with **time windows** (tonight / week / all). Guests appear on the nightly board (they were physically here) but are excluded from week/all-time. The "tonight" cutoff is computed in **Đà Nẵng time** (UTC+7, no DST) — it rolls over at 14:00 ICT, so an event that runs past midnight still counts as one night. Workers run in UTC, so the cutoff math adds the offset by hand.

### Host-awarded points

`POST /api/sessions/[id]/award` lets a host hand out off-script points — Sam marking a Pub Quiz winner, a karaoke dare bonus — from buttons in the quiz and karaoke host panels. It's authorized to the **host of the active game or a site admin**, writes a `score_ledger` row (with `awarded_by`) so it shows on the everything + per-game-type boards, and bumps `session_players.score` so the recap reflects it. Disposable Camera's "Top Paparazzi" is the automatic cousin: it scores nothing in `score()`, so `finalizeGame` derives each photographer's `reason='paparazzi'` points from the votes their photos received.

## Identity model

Three flavors of identity, all sharing one `users` table:

| Type | Signed in via | Persistent | Has `email` |
|---|---|---|---|
| Member (Google) | Auth.js Google provider | Yes | Yes |
| Guest (anonymous) | Cookie `reality_guest_id` | Until cookie clears | No |
| (Future) Membership-linked | Same Google + `member_id` FK to Membership system | Yes | Yes |

Auth.js's required columns (`name`, `email`, `emailVerified`, `image`) live in `users` alongside REALITY-specific extensions (`locale`, `newsletter_opt_in`, `is_guest`, `member_id`). The schema in `migrations/0000_init.sql` is annotated.

`session_players` adds a per-session `code` (4-char shortId from a 32-symbol unambiguous alphabet). This is what other players type in to claim a Bingo square or confirm a Target Hunt tag.

## Realtime — Durable Objects + polling fallback

`src/durable-objects/session-room.ts` defines `SessionRoom`. It accepts WebSocket connections at `/connect` and broadcasts whatever payload arrives at `/broadcast`. That's it.

It uses the **WebSocket Hibernation API** (`acceptWebSocket` / `getWebSockets`) rather than holding sockets in an in-memory `Set`. The runtime owns the socket set and can evict the DO from memory while a room is idle — so a quiet bar night with dozens of phones still connected costs nothing, instead of billing wall-clock for every hour the sockets stay open — and the connections survive hibernation. Clients never send frames (the room is one-way fan-out), but a no-op `webSocketMessage` handler exists so a stray inbound frame can't error a hibernating instance.

`worker.ts` (root) is a custom Worker entry. It wraps the OpenNext-built Next.js worker, exports `SessionRoom`, and intercepts `/api/sessions/<id>/ws` upgrade requests directly — Next.js can't return a 101 with a `webSocket` field cleanly, so we route around it.

On the client, `src/lib/use-room-notifications.ts` is a tiny hook that opens a WebSocket, exponential-backoff-reconnects, and triggers a refresh callback on every message. `AttendeeList`, `Leaderboard`, and `GameView` each call it alongside their existing 5-second polling. The polling is the **fallback** — if the WebSocket connection fails (e.g. `next dev` doesn't support DOs), the UI still updates within 5 seconds.

## Photo pipeline

Avatars (and, soon, game-driven photo uploads) live in **R2**, bytes uploaded through the Worker:

1. Client picks a file via `<input type="file" accept="image/*" capture="user">`
2. Client resizes via Canvas API to ≤512px longest edge, encodes as JPEG quality 0.85 → typically <100KB
3. Client POSTs multipart to `/api/photos/upload`
4. Server validates type/size, generates `r2_key = "{purpose}/{userId}/{photoId}.jpg"`, puts to R2 with an immutable `Cache-Control` (`public, max-age=31536000, immutable` — keys are content-addressed by photo id, so they never change under a URL), records a row in `photos`, updates `users.image` (for avatars). Replacing an avatar **prunes** the user's prior avatar objects so R2 doesn't accumulate orphans.
5. Returns `{ id, url }`. The URL is `${PHOTOS_BASE_URL}/${r2_key}`.

The `photos` table is purpose-segmented (`avatar` / `quiz-question` / `disposable` / future `photo-bingo`) so the same plumbing serves multiple games without schema changes. Quiz Round media (question images, audio clips) and Disposable Camera shots all ride the same upload route; the `purpose` segment keys them apart.

We deliberately **send bytes through the Worker** rather than presigned PUTs — at avatar/quiz-image sizes a single round-trip is simpler than a 3-trip presigned dance, and Disposable Camera's pragmatic 2048px shots (~0.5–1.5MB) still fit under the bumped Worker request limit. Switch to presigned URLs later if archival full-resolution shots ever land.

## i18n

`next-intl` in non-routing mode (no `/en/...` path prefix). Locale comes from a cookie (`NEXT_LOCALE`); default falls through to `Accept-Language`; falls through to `en`. The `LocaleSwitcher` component is a server component with an inline server action that writes the cookie and revalidates.

Two layers of strings:

- **App-owned strings** in `messages/{en,vi,ru,uk}.json` — homepage, profile, footer, leaderboard, scan/join screens
- **Game-owned strings** returned by `GameType.prompts(locale)` — scoped to one game type, kept colocated with the game logic in `src/games/<name>/index.ts`

Bingo prompts are a third category: each prompt is a `{ id, text: Record<Locale, string> }` object in `src/games/bingo/prompts.ts`, picked deterministically into a player's card by FNV-1a hashing `(sessionId, gameId, userId, promptId)`.

## Auth + roles

Auth.js v5 with Google provider, sessions stored in D1 via `@auth/d1-adapter`. Configured in `src/lib/auth.ts` as a function form (so `getDB()` resolves at request time). It sets `trustHost: true` — behind Cloudflare on the custom domain (`app.realitydn.com`), Auth.js v5 would otherwise reject the proxied host header as `UntrustedHost` and Google sign-in would fail.

Authorization is a **roles table** now, not the old binary env gate. `migrations/0005` adds `staff_roles` (email PK, `role` = `'admin' | 'host'`), and `src/lib/roles.ts` is the accessor (`isAdmin` / `isHost` / `getStaffRole` / `listStaff` / `setStaffRole` / `removeStaff` / `listStaffUsers`). Roles are keyed by **email** so staff can be pre-authorized before they ever sign in. `ADMIN_EMAILS` survives as a **bootstrap seed** — anyone on it is always admin, so you can't lock yourself out of an empty table — but everyone else is managed from the `/admin/staff` page (add/remove by email, set role). `host` is the lighter grant: it can run host-driven games and award points without full admin.

Two non-obvious authorization rules fell out of this:

- **Server actions self-authorize.** The `/admin/*` layout still redirects non-admins home, but that's only a UX gate — a layout doesn't protect anything, because the server actions it renders are themselves public POST endpoints. So every admin server action (create/start/end session, manage staff) now re-checks `isAdmin(user.email)` itself before doing work.
- **Host-driven games get a host picker.** When an admin starts a host-driven game (Quiz Round, Karaoke, Disposable Camera), the start form has a host `<select>` populated by `listStaffUsers()` (staff who have signed in at least once). The chosen `user.id` is passed via `seedData.hostId` and baked into the game's start event; the GameType's `validate` then locks every host-only event to that id. This is how "Sam hosts Pub Quiz" works without making Sam an admin — defaults to the admin themselves if no one is picked.

## Event-route security

`/api/games/[id]/events` is the one endpoint any phone in the room hits constantly, so it carries the most authorization weight:

- **Participant check (closes a cross-session IDOR).** Being signed in (or holding a guest cookie) is not enough to act in a game. The actor must be a participant in *this* session, a site admin, or the game's host. Without this, anyone holding a leaked game id could act in a session they never joined — inject quiz answers, farm Bingo claims. The host is allowed without joining the roster, because a host runs the game without necessarily playing it.
- **zod body validation.** Every event body is parsed against a discriminated union keyed on `kind`, with bounded string lengths and integer ranges. Previously untrusted JSON was cast straight to the event type, letting malformed payloads (string/NaN indexes, multi-megabyte strings) reach the reducer and the DB.
- **Server-trusted timing + ids.** Quiz answer `elapsedMs` is computed server-side from `state.questionOpenedAt`, never trusted from the client, so nobody can fake a fast answer for the speed bonus. Event ids and team ids are server-generated.
- **Reducer-level anti-cheat still applies.** Even past the route, the pure reducers refuse to trust clients — Disposable Camera silently filters self-votes, Karaoke enforces one active request per user, capture limits are re-checked in the reducer — so a hand-crafted request can't game state that replays deterministically.

## Error handling

Most write paths are best-effort or idempotent:

- `joinSession` is idempotent (`ON CONFLICT DO NOTHING`)
- `notifySession` swallows broadcast failures — realtime is a hint, not load-bearing
- WebSocket reconnects with exponential backoff
- Polling continues regardless of WS state

There's no retry logic for D1 writes — they're inside a single Worker request, so any transient error becomes a 500 to the client, who'll see it and retry the action. Acceptable for v1.

## What's deliberately NOT in here yet

- **Rate limiting** on event POSTs and joins. A motivated griefer could spam claims. KV-based per-IP rate limiting is a clean future add.
- **Block / report**. Reports table + admin queue UI is a half-day's work — defer until we see real abuse.
- **Push notifications** for off-screen players. iOS PWA push works in 16.4+ but most players are physically present, so deferred.
- **Score snapshots**. The reducer-from-events approach gets slow at multi-thousands of events; we'll add `games.state_snapshot` when we see pain.

(Role-based admin used to live on this list; it shipped — see [Auth + roles](#auth--roles).)

These are listed in `docs/ROADMAP.md` with rough costs.
