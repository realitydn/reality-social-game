# Roadmap

Where this app might go, organized by how much it costs to get there. Shipped phases are at the top so you can see the slope.

## Shipped

| Phase | What | Commits |
|---|---|---|
| 0 | Scaffold — Next.js + CF Workers + D1 + Auth.js + i18n + REALITY brand | initial |
| 1 | Sessions + QR check-in + big-screen + attendee polling | session model + QR |
| 2 | `GameType<S, E>` interface + Bingo | extensibility hook |
| 3 | Target Hunt + score persistence + persistent leaderboards | second game |
| 4 | Speed Pair (server-mediated re-pairing) | third game, validates the architecture |
| 5 | Session-end recap on big screen + player ended state | night-cycle close |
| 6 | WebSocket realtime via Durable Objects | DO fan-out, polling fallback |
| 7 | Photo pipeline (R2 uploads, avatar UI, no facial recognition) | infra for photo-driven games |
| 8a | Quiz Round game type + host CMS (packages, MCQ + T/F, image media, live host control + big-screen renderer) | content-authored game pattern; question-type plugins |
| 9 | Karaoke Queue (first non-competitive game; free-text submissions, host CRUDs the queue, big-screen now-up + up-next + history strip) | host-driven game pattern generalized via `HOST_DRIVEN_GAMES` |
| 10 | Quiz Round question types: free-text (Levenshtein) + ordering (drag-and-drop) + audio-MCQ (R2-hosted clips) + per-option images for MCQ | photo upload pipeline extended to audio MIME types; deterministic per-player shuffle util |
| 11 | Disposable Camera (host-configured photo capture + audience voting + projector reveal); host start-form pattern (`GAMES_WITH_CUSTOM_START_FORM`) | second non-competitive game; client-side 2048px downscale + bumped Worker image limit |
| 12 | **Custom domain** (`app.realitydn.com`) + **staff roles** (`staff_roles` table: admin/host, `/admin/staff` manager, host picker on start) + **score ledger** (append-only; per-game-type + everything leaderboard tabs × time windows) + **host-awarded points** (`/award`: quiz winners, karaoke dares, auto Top Paparazzi) + **Pub Quiz teams** (event-sourced, team standings on the projector) | role-based admin replaces the env gate; ledger replaces score-from-`session_players`; `trustHost` for the proxied domain |
| 13 | **Security + UX hardening** | event-route participant/host auth (closed a cross-session IDOR), zod-validated event bodies, rowid-ordered replay, compare-and-swap `finalizeGame`; DO on the WebSocket Hibernation API; ConfirmModal, Live/Reconnecting badge, projector legibility, CMS lost-work guard, auth-aware home + real sign-out, player avatars; fixes — Google sign-in (users timestamps default), guest "Play as guest" 500, R2 immutable cache + avatar pruning |

## Tier 1 — drop-in games (~1 weekend each)

These slot into `src/games/<name>/` with no new infrastructure. The architecture is built for them.

- **Mafia** — Bingo with a twist: 1–2 players get a *different* prompt set (the "impostors"). Everyone plays normally. At admin's signal a voting round runs — each player votes who they think the impostor was. Citizens score for correct votes; impostors score for going undetected. Implements as a new GameType with a `mafia_vote` event kind.
- **Karaoke Wingman missions** — sits on top of the Phase 9 Karaoke Queue. Optional "mission cards" score points (e.g. "be the first to cheer for someone you don't know"). Layered scoring on top of a non-competitive queue — interesting because it lets the same game flip between casual mode and competitive mode without forking the type.

### Tier 1 (within Quiz Round) — further question types

Phase 10 shipped multiple-choice (with per-option images), true-false, free-text, ordering, audio-mcq. Future additions slot in the same way (folder under `src/games/quiz-round/question-types/<type>/` + 4 render branches):

- **LLM-judged free-text** — instead of Levenshtein matching, send the answer to a Workers AI model with a graded rubric. More forgiving than Levenshtein, no need to enumerate variants. Adds a runtime cost per answer.
- **Numeric range** — "How many people work at REALITY?" with a tolerance band. Cheap, common in trivia.
- **Multi-select MCQ** — pick all that apply. Scoring is the design call: full points for exact set match, or partial for each correct + penalty for wrong picks.
- **Picture grid** — variant of image-MCQ where options are images only (no text). Already supported by the data shape; just a render variant.

## Tier 2 — photo-driven games (photo pipeline already in place)

Now that uploads + R2 + the `photos` table exist, these are mostly UI + reducer work.

- **Photo Bingo Pro** — Bingo where the prompt requires a photo to claim ("a selfie with someone wearing red"). Photo gets attached to the claim event; target's confirm reviews the photo. Optional AI verification later via Cloudflare Workers AI multimodal models.
- **Pose Bingo** — projector shows a target pose; players upload selfies attempting it; audience or AI scores similarity. A high-effort, high-memory variant.
- **Disposable Camera v2** — full archival-resolution shots via R2 presigned PUTs (Phase 11 ships pragmatic 2048px). Worth doing once we have a clear archival use case (Donald wants REALITY's collected photo history pristine, or printed annual zine, etc).

## Tier 3 — hardware integration (ESP32 + venue infrastructure)

The mechanic class that makes REALITY uniquely a game venue rather than a venue-with-an-app. First fixture is the foundational tooling investment; subsequent fixtures are cheap.

- **Light Voting** — ESP32 controllers per zone (1L / 2E / 2L / 3P) drive LEDs. Subscribe each ESP32 to the existing Durable Object WebSocket fan-out as a `lights` channel. Game events emit color/zone messages; lights respond.
  - **Tribal Bingo** — chromatic team affiliations; confirmed squares pulse the bar in your team's color. Dominant color wins the night.
  - **Mood Wave** — periodic player votes (calmer / louder / weirder); lights respond. Anti-spam decay on repeat votes.
  - **Color Hunt** — find a player who picked the same starting color; mutual tap flares everywhere for 10s.
- **Sound Reactive** — ESP32 + microphone reading ambient SPL. Crowd cheers above threshold unlock 30-second multiplier windows ("every Bingo claim worth double right now"). Quiet stretches unlock alternative scoring modes.
- **Beacon Tag (BLE)** — ESP32 beacons placed in zones. Phones detect them via Web Bluetooth. Game: "spend 60s on the patio" / "be in 2E during the DJ set." Side benefit: anonymous heatmaps for ops planning.
- **Physical Bingo Display** — 4×4 LED matrix behind the bar cycling through random session players' card-fills in real-time. Lowers the activation energy for newcomers walking past to start playing.

**Energy Bidding** *(parked, far-future)* — drink purchases earn "color tokens"; spending tokens locks the bar in your color for 60s. Auction-style, visible token economy on the projector. Donald wants this on the long-term roadmap, but it requires POS integration and operations care.

## Tier 4 — long game (Membership-territory)

These reward returning over weeks/months and are best built once the [REALITY Membership / Business Network](MEMBERSHIP_HANDOFFS.md) project is closer to ready. Listed here because the data they consume comes from this app, but they probably *live* in the Membership app.

See [`docs/MEMBERSHIP_HANDOFFS.md`](MEMBERSHIP_HANDOFFS.md) for full design notes on:

- **Constellation** — personal social-graph map of everyone you've met across all REALITY visits
- **Anniversary Cards** — 1-year-of-membership personalized card surfaces on next visit
- **Regulars' Codex** — community lore unlockable by members, growing from things logged during games
- **Inheritance** — last month's leaderboard winner wears a digital "champion's mark" next month

## Parked / explore later

Worth thinking about, not yet justified.

- **Tarot Round** — projector deals a card; rules of play change for the next 10 minutes per the card drawn ("The Hermit: no claims allowed, only confirms"). Could be a meta-mechanic layered on top of any game. Donald flagged this as worth exploring.
- **Anonymous Compliments** — leave a compliment for any player; deliverable on their next visit. Retroactive social warmer.
- **Mood Rings** — your phone background hue reflects how positive your interactions have been tonight. Subtle ambient status signal.
- **Truth Glitter** — spend points to "sprinkle" a question on someone else's screen. Answering truthfully = both score; lying detected = both lose.
- **Cabinet of Curiosities** — physical objects in the bar (a strange book, a bell, a wooden duck) have "powers" you unlock by activating them in-game.
- **Whisper Network** — intel drop on a random player; passes propagate; whoever holds it at deadline claims a real reward.
- **Six Degrees** — given two random players, find a path of acquaintance between them.
- **Quote of the Night** — submit overheard quotes; end-of-night vote. Bar lore over time.

## Avoid (deliberate non-goals)

- **Bartender involvement / drink specials / POS integration.** Donald flagged this as operationally risky for now — disrupting bar operations to play a game is bad for the venue. May revisit when the GM is in place and operations are stable. Examples we're NOT building: Bartender's Boost, Round Bingo, Speak Easy, Daily Special Cascade.
- **Facial recognition.** Privacy complexity, opt-in pain, and we don't need it for the photo-driven games to work (Photo Bingo Pro relies on human or multimodal-LLM verification, not face matching). May revisit if a specific use case justifies it.
- **Drinking volume gamification.** Anything that rewards drinking-per-unit-time. Tempting, sociologically risky, and a venue-reputation problem if a regular ends up in trouble. Hard line.
- **Persistent shame-shaped scores.** Single-game "least photographed" is fine as a one-night twist. A persistent leaderboard of "biggest losers" is not.

## Quiz Round v2 / v3 backlog

Carved out of Phase 8a scoping; deferred to keep the first ship narrow.

- **v2: Video question media** — Cloudflare Stream with adaptive bitrate. Cap clip length (60s for v1 → maybe 120s).
- **v2: Package cloning** — "fork last week's Pub Quiz" is high-value for Sam's recurring slot.
- **v2: Library search / filter** — by author, last-used, status. Becomes useful once there are >20 packages.
- **v2: Per-author URL slugs** — `/host/sam-h7x9k2` if the obscurity model starts feeling thin.
- **v3: `package_bundle`** — a meta-package that strings sub-packages into a multi-round Pub Quiz Night macro (intermission cards, themed round titles). Held until standalone Quiz Round nights expose the actual shape.

## Infrastructure debt to pay down (when needed)

Listed so we don't lose track:

- **Rate limiting** on event POSTs and joins. KV-based per-IP counter; stop a motivated griefer from spamming claims. ~Half a day.
- **Block / report** — table + admin queue UI. Half a day. Build when first abuse is seen.
- **Score snapshots** — when reducer-from-events gets slow, store materialized state in `games.state_snapshot` and only re-reduce events newer than the snapshot. Quiz Round games with N players × N questions × ~3 events each can hit several thousand events per game.
- **Auth.js D1 adapter schema verification** — was flagged in `migrations/0000_init.sql`. `migrations/0004` fixed the concrete bite (the adapter's `createUser` omits `created_at`/`updated_at`, so those columns now `DEFAULT 0`). Re-verify if the adapter version bumps.
- **Host CMS access control** — role-based admin shipped (Phase 12: `staff_roles`, `isAdmin`/`isHost`), but the `/host/*` package CMS is still open to any signed-in user (obscurity model). Gating it behind `isHost` is the remaining piece.
- **Better dev experience** — `next dev` doesn't support DOs, so realtime and photo upload break locally. Either:
  - Add a `wrangler dev` workflow alongside, OR
  - Add a dev-only mock adapter that fakes WS + R2 against in-memory state.
- **Test seed data** — script that populates a session + N fake players + a running game, so dev work doesn't require a manual-clicking ramp-up.
- **Server-side timer auto-close** — Quiz Round timer is currently a UI hint; auto-closing requires DO alarms. Host can manually close, so deferred.

## Decision log

Threading through these for context:

- **Polling kept as fallback** even after WebSockets landed (Phase 6) — realtime is a hint, not load-bearing. A flaky connection should never leave a client stale.
- **Bytes through the Worker for photo uploads** rather than presigned PUT — simpler at avatar sizes; switch later if Disposable Camera lands.
- **No path-based i18n routing** — cookie-based locale, shorter URLs, no auth/cache complications. Adopt path-based if SEO becomes a goal (it isn't).
- **D1 over Postgres** — matches the existing REALITY ecosystem pattern (sidework, planned Membership). No Hyperdrive, no Neon.
- **R2 over Cloudinary** for new uploads — Donald is consolidating onto Cloudflare. Cloudinary stays for sidework's existing usage.
- **Append-only ledger over a running total** for persistent scores (Phase 12) — same reasoning as event-sourcing the games: attributable points, re-derivable boards, and slice-by-game-type / time-window without a schema change. `session_players.score` stays as the cheap in-session cumulative.
- **Roles keyed by email, with `ADMIN_EMAILS` as a bootstrap seed** (Phase 12) — emails let us pre-authorize staff before they sign in, and the seed means an empty `staff_roles` table can't lock everyone out. Admin server actions self-authorize because a layout gate doesn't protect a public POST endpoint.
- **Custom domain via wrangler `routes` + `trustHost`** (Phase 12) — `app.realitydn.com` is canonical; the `*.workers.dev` URL stays as a fallback. Behind Cloudflare's proxy, Auth.js v5 needs `trustHost` or it rejects the host header.
- **WebSocket Hibernation API** for the SessionRoom DO (Phase 13) — idle rooms get evicted from memory instead of billing wall-clock while dozens of phones idle on a quiet night. The runtime-owned socket set also survives hibernation.
