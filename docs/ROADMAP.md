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

## Tier 1 — drop-in games (~1 weekend each)

These slot into `src/games/<name>/` with no new infrastructure. The architecture is built for them.

- **Mafia** — Bingo with a twist: 1–2 players get a *different* prompt set (the "impostors"). Everyone plays normally. At admin's signal a voting round runs — each player votes who they think the impostor was. Citizens score for correct votes; impostors score for going undetected. Implements as a new GameType with a `mafia_vote` event kind.
- **Karaoke Queue** — not really a competitive game; a queue management feature presented through the GameType pattern. Players submit songs; queue projects on the big screen; admin advances the queue; optional "wingman" mission cards score points. Hooks naturally into existing DJ-night flow.

## Tier 2 — photo-driven games (photo pipeline already in place)

Now that uploads + R2 + the `photos` table exist, these are mostly UI + reducer work.

- **Photo Bingo Pro** — Bingo where the prompt requires a photo to claim ("a selfie with someone wearing red"). Photo gets attached to the claim event; target's confirm reviews the photo. Optional AI verification later via Cloudflare Workers AI multimodal models.
- **Disposable Camera** — each player gets N photos for the night, no other game mechanics. All pooled, projected at end as a slideshow. Audience votes on best 5; winners named "Photographers of the Night." Trades competition for collaborative memory-making.
- **Pose Bingo** — projector shows a target pose; players upload selfies attempting it; audience or AI scores similarity. A high-effort, high-memory variant.

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

## Infrastructure debt to pay down (when needed)

Listed so we don't lose track:

- **Rate limiting** on event POSTs and joins. KV-based per-IP counter; stop a motivated griefer from spamming claims. ~Half a day.
- **Block / report** — table + admin queue UI. Half a day. Build when first abuse is seen.
- **Score snapshots** — when reducer-from-events gets slow, store materialized state in `games.state_snapshot` and only re-reduce events newer than the snapshot.
- **Auth.js D1 adapter schema verification** — flagged in `migrations/0000_init.sql`. Verify the schema matches the installed adapter version before first sign-in attempt in production.
- **Real role-based admin** — replace the `ADMIN_EMAILS` env var soft gate with a `roles` table. Likely arrives alongside Membership.
- **Better dev experience** — `next dev` doesn't support DOs, so realtime and photo upload break locally. Either:
  - Add a `wrangler dev` workflow alongside, OR
  - Add a dev-only mock adapter that fakes WS + R2 against in-memory state.
- **Test seed data** — script that populates a session + N fake players + a running game, so dev work doesn't require a manual-clicking ramp-up.

## Decision log

Threading through these for context:

- **Polling kept as fallback** even after WebSockets landed (Phase 6) — realtime is a hint, not load-bearing. A flaky connection should never leave a client stale.
- **Bytes through the Worker for photo uploads** rather than presigned PUT — simpler at avatar sizes; switch later if Disposable Camera lands.
- **No path-based i18n routing** — cookie-based locale, shorter URLs, no auth/cache complications. Adopt path-based if SEO becomes a goal (it isn't).
- **D1 over Postgres** — matches the existing REALITY ecosystem pattern (sidework, planned Membership). No Hyperdrive, no Neon.
- **R2 over Cloudinary** for new uploads — Donald is consolidating onto Cloudflare. Cloudinary stays for sidework's existing usage.
