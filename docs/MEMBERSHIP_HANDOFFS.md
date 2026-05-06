# Handoffs to the REALITY Membership / Business Network project

Two ideas Donald flagged as "great, but they belong in Membership rather than this app." Captured here so the design doesn't get lost when work shifts to `members.realitydn.com` (the planned Cloudflare Workers + D1 site).

The linkage point already exists: `users.member_id` (nullable FK) in this app's schema. Once Membership has user accounts, the linkage flows through that field — no schema migration on this end.

---

## Constellation

**The pitch:** every time a member visits REALITY and plays a game, the people they met become nodes in their personal social-graph map. Over time you accumulate a constellation of everyone you've met at REALITY, viewable on a private member page.

**Why it belongs in Membership:** it's a longitudinal feature. The data source is this app's `session_players` + `game_events` tables, but the *feature* — the "your constellation" page, the gradual unlocking, the social-graph rendering — is a member benefit, not a per-night game experience.

### Data flow

```
SocialGameApp                          Membership
  game_events           (member_id      members.realitydn.com
  session_players       linkage)        ────────────────────
  ─────────────         ───────►         /me/constellation
                                         /me/who-i-met
```

Member-facing page reads (via SQL, service binding, or replicated view) which other members they've co-occurred with in the same session. Computes a graph: each node = a member, each edge = a session-pair.

### Visual treatment

Match REALITY brand: `#fffbf1` cream background, `#0d0905` ink edges, chromatic node colors per member. Edges weighted by number of co-occurrences. Force-directed layout. Hover to see "you met at [session name] on [date]."

Mobile-first since members will check this on their phones during/after a visit.

### Mechanics that emerge

- **Unlocking** — first visit, you see only yourself + people you met that night. Each subsequent visit grows the constellation. Creates a return-visit incentive.
- **Suggestions** — "you've met X 3 times across 3 sessions; X has met Y twice. Want a soft intro?" Membership's gentle networking layer, anchored in real co-presence.
- **Anniversary moments** — when you're about to surpass a threshold (10 people met, 100 people met), a small note shows up next visit.
- **Privacy default** — opt-out per member. Anyone can pull themselves out of others' constellations; their nodes go gray with "preferred not to share."

### Implementation sketch

A scheduled job (Cloudflare Cron Trigger) on the Membership Worker runs nightly:

1. Query SocialGameApp's D1 for new sessions completed since last run
2. For each session, join `session_players` against `users` filtered to non-guest, non-null `member_id`
3. Insert / upsert pairs into Membership's `member_co_occurrences` table
4. Don't re-process sessions

The Membership app exposes `/me/constellation` reading from `member_co_occurrences`. Visual layer renders with d3-force or a similar library.

### Effort

- Cross-app data access: 1-2 days (service binding + the cron job)
- `member_co_occurrences` table + nightly aggregator: 1 day
- Constellation page + force-directed visualization: 2-3 days
- Polish + privacy controls: 1-2 days

Roughly a week of Membership work once Membership has its `users` table and basic auth.

---

## Anniversary Cards

**The pitch:** when a member reaches their 1-year (or 6-month, or N-month) anniversary of joining the program, the next time they visit REALITY they get a personalized card delivered through the app. Becomes a tradition; reinforces the "members hear things first" feeling.

**Why it belongs in Membership:** the anniversary date is a Membership property (date of subscription start). The trigger is a Membership lifecycle event. SocialGameApp can *display* the card if the member is in a session, but the source of truth is Membership.

### Trigger logic

```
On member's nth-month anniversary, while they're checked in to a session:
  → Membership posts a "card" to the member's account
  → On next session-page poll, member's dashboard shows the card with a confetti animation
```

### Card content

Static template per anniversary milestone, personalized with:

- The member's display name
- Their member-since date
- Stats from the SocialGameApp data: number of sessions attended, top game, top other-member-met-with
- A handwritten-feel quote / message (curated by Donald + June, refreshed quarterly)
- Optional: a redeemable benefit ("this month's keychain on the house" / "a drink on us" — whatever the venue's economics permit)

### Implementation sketch

`anniversary_cards` table on Membership:

```sql
CREATE TABLE anniversary_cards (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  milestone TEXT NOT NULL,           -- '1mo', '6mo', '1yr', '5yr'
  template_id TEXT NOT NULL,
  payload TEXT NOT NULL,             -- JSON: stats, message, benefit
  created_at INTEGER NOT NULL,
  delivered_at INTEGER,              -- when the member viewed it
  redeemed_at INTEGER                -- if a benefit was attached
);
```

Cron triggers nightly: find members whose anniversary is today, generate cards by reading SocialGameApp stats via service binding.

SocialGameApp checks for undelivered cards in the dashboard endpoint:

```ts
// In GET /api/sessions/[id]/state
const undeliveredCards = await fetchPendingCards(currentUser.member_id);
return { ..., pendingMemberCards: undeliveredCards };
```

Player session view renders the card prominently; tapping marks it delivered (POST back to Membership).

### Effort

- Membership: cards table + cron generator + member-facing endpoints: 2-3 days
- SocialGameApp: integration into the dashboard endpoint + UI for displaying cards: 1 day
- Card template design (handwritten-feel typography on REALITY palette): 1 day per milestone

Roughly 4-5 days end-to-end.

---

## Other potential handoffs (not Donald-flagged but worth tracking)

- **Regulars' Codex** — community lore, member-only. Same data sources as Constellation.
- **Inheritance** — last month's leaderboard winner wears a digital "champion's mark" next month. The leaderboard data lives in this app; the "mark" UI element belongs in member profiles.
- **Member-only game variants** — perhaps a Bingo prompt set or Target Hunt variant only available when a Membership-active player is in the session.
