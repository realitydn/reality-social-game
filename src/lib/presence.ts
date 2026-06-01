// Presence + Account policy. Pure (no I/O) — the DB bits live in sessions.ts and
// enforcement lives in the event API route.

// How verified-in-space a player is for a session.
export const PRESENCE = {
  NONE: 0, // joined only (e.g. from the logged-in menu)
  VENUE: 1, // scanned a static printed QR somewhere in the space
  SESSION: 2, // scanned the session-specific dynamic QR (e.g. the projector)
} as const;

export type PresenceLevel = 0 | 1 | 2;

// "Account" = a signed-in (Google) user, as opposed to an anonymous guest.
// NB: deliberately NOT "member" — that's the separate paid Membership project.
export function isAccount(user: { is_guest: boolean } | null | undefined): boolean {
  return !!user && !user.is_guest;
}

export type GamePresencePolicy = { tier: PresenceLevel; accountRequired: boolean };

// Per-game-type defaults. The meeting games need you in the room (soft venue
// tier — the mutual in-person confirm is the hard anti-grief); the rest don't
// gate on presence yet. Overridable per game via a `presence` block on
// games.config (written at game setup — wired in a later increment).
const DEFAULTS: Record<string, GamePresencePolicy> = {
  bingo: { tier: PRESENCE.VENUE, accountRequired: false },
  "target-hunt": { tier: PRESENCE.VENUE, accountRequired: false },
  "speed-pair": { tier: PRESENCE.VENUE, accountRequired: false },
  "quiz-round": { tier: PRESENCE.NONE, accountRequired: false },
  "quiz-scoreboard": { tier: PRESENCE.NONE, accountRequired: false },
  "karaoke-queue": { tier: PRESENCE.NONE, accountRequired: false },
  "disposable-camera": { tier: PRESENCE.NONE, accountRequired: false },
};

const FALLBACK: GamePresencePolicy = { tier: PRESENCE.NONE, accountRequired: false };

function isLevel(n: unknown): n is PresenceLevel {
  return n === 0 || n === 1 || n === 2;
}

// Effective policy = per-type default, overridden by an optional `presence`
// block on the game's (parsed) config.
export function resolveGamePolicy(gameType: string, config: unknown): GamePresencePolicy {
  const base = DEFAULTS[gameType] ?? FALLBACK;
  const override = (config as { presence?: { tier?: unknown; accountRequired?: unknown } } | null)
    ?.presence;
  if (!override) return base;
  return {
    tier: isLevel(override.tier) ? override.tier : base.tier,
    accountRequired:
      typeof override.accountRequired === "boolean"
        ? override.accountRequired
        : base.accountRequired,
  };
}

// The per-type default, for seeding a setup form's controls.
export function defaultGamePolicy(gameType: string): GamePresencePolicy {
  return DEFAULTS[gameType] ?? FALLBACK;
}

// Read a `presence` override from a start form. Returns {} when the form has no
// presence controls (e.g. the one-tap meeting games) so per-type defaults apply.
export function presenceConfigFromForm(
  formData: FormData,
): { presence?: GamePresencePolicy } {
  const tierRaw = formData.get("presenceTier");
  if (tierRaw === null) return {};
  const tier: PresenceLevel = tierRaw === "1" ? 1 : tierRaw === "2" ? 2 : 0;
  return { presence: { tier, accountRequired: formData.get("accountRequired") === "on" } };
}
