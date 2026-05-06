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

One Durable Object per session is the realtime hub. It holds nothing but a Set of connected WebSockets. Every state-changing action on the server fires a `notifySession()` ping into the DO, which broadcasts to all subscribers. Subscribers respond by refetching the dashboard endpoint — the DO is purely a notification channel, not a state store. This keeps the source of truth in one place (D1) and makes losing a DO instance survivable: clients reconnect, refetch, carry on.

## Data flow: actions become events

Every state change in a game goes through the same path:

1. Client posts to `/api/games/[id]/events` (e.g. `{ kind: "bingo_claim", squareIdx, promptId, targetCode }`)
2. Server loads the game's current state by **reducing all rows** from `game_events` for that game through the registered `GameType`'s reducer
3. Server constructs a typed `event` from the body, calls `gameType.validate(state, event, actorId, ctx)`
4. If valid, server appends a row to `game_events` with the event's payload
5. Server calls `notifySession(sessionId, kind)` — best-effort fan-out
6. Connected clients receive the ping and refetch `/api/sessions/[id]/state`

The reducer is **pure**. State is never stored — always derived. This is slow if events grow unbounded, but a single bar night caps at maybe a few thousand events; D1 reads them in milliseconds. If we ever need to scale, snapshot-and-replay is a small change.

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

`finalizeGame()` reads the game's final scores via `gameType.score()` and adds them to `session_players.score` (additive — multiple games per session accumulate). This is what makes the persistent `/leaderboard` aggregations work.

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

`worker.ts` (root) is a custom Worker entry. It wraps the OpenNext-built Next.js worker, exports `SessionRoom`, and intercepts `/api/sessions/<id>/ws` upgrade requests directly — Next.js can't return a 101 with a `webSocket` field cleanly, so we route around it.

On the client, `src/lib/use-room-notifications.ts` is a tiny hook that opens a WebSocket, exponential-backoff-reconnects, and triggers a refresh callback on every message. `AttendeeList`, `Leaderboard`, and `GameView` each call it alongside their existing 5-second polling. The polling is the **fallback** — if the WebSocket connection fails (e.g. `next dev` doesn't support DOs), the UI still updates within 5 seconds.

## Photo pipeline

Avatars (and, soon, game-driven photo uploads) live in **R2**, bytes uploaded through the Worker:

1. Client picks a file via `<input type="file" accept="image/*" capture="user">`
2. Client resizes via Canvas API to ≤512px longest edge, encodes as JPEG quality 0.85 → typically <100KB
3. Client POSTs multipart to `/api/photos/upload`
4. Server validates type/size, generates `r2_key = "{purpose}/{userId}/{photoId}.jpg"`, puts to R2, records a row in `photos`, updates `users.image` (for avatars)
5. Returns `{ id, url }`. The URL is `${PHOTOS_BASE_URL}/${r2_key}`.

The `photos` table is purpose-segmented (`avatar` / `photo-bingo` / `disposable`) so the same plumbing serves future photo-driven games without schema changes.

We deliberately **send bytes through the Worker** rather than presigned PUTs — at the resize sizes we use (~100KB), a single round-trip is simpler than a 3-trip presigned dance. Switch to presigned URLs later if Disposable Camera Mode (full-resolution shots) lands.

## i18n

`next-intl` in non-routing mode (no `/en/...` path prefix). Locale comes from a cookie (`NEXT_LOCALE`); default falls through to `Accept-Language`; falls through to `en`. The `LocaleSwitcher` component is a server component with an inline server action that writes the cookie and revalidates.

Two layers of strings:

- **App-owned strings** in `messages/{en,vi,ru,uk}.json` — homepage, profile, footer, leaderboard, scan/join screens
- **Game-owned strings** returned by `GameType.prompts(locale)` — scoped to one game type, kept colocated with the game logic in `src/games/<name>/index.ts`

Bingo prompts are a third category: each prompt is a `{ id, text: Record<Locale, string> }` object in `src/games/bingo/prompts.ts`, picked deterministically into a player's card by FNV-1a hashing `(sessionId, gameId, userId, promptId)`.

## Auth + admin gate

Auth.js v5 with Google provider, sessions stored in D1 via `@auth/d1-adapter`. Configured in `src/lib/auth.ts` as a function form (so `getDB()` resolves at request time).

Admin routes (`/admin/*`) are gated by `src/app/admin/layout.tsx` — checks the signed-in user's email against `ADMIN_EMAILS` (comma-separated env var). Anyone not on the list is redirected home. This is a soft gate for v1; replace with a roles table when staff accounts are formalized.

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
- **Real role-based admin**. Email allowlist is fine until staff accounts arrive (probably alongside Membership).
- **Score snapshots**. The reducer-from-events approach gets slow at multi-thousands of events; we'll add `games.state_snapshot` when we see pain.

These are listed in `docs/ROADMAP.md` with rough costs.
