// Pub Quiz Scoreboard — a host-run manual scoreboard GameType. The actual quiz
// runs off slides (not in the app); the host just records team names and their
// running scores, and the projector shows branded standings. No per-user
// scoring — teams are free-text names, not player accounts — so score() returns
// {} and nothing lands in the persistent /leaderboard (same as Karaoke). The
// standings are derived from state and shown live on the big screen.
//
// Host-only events are locked to state.hostId in validate (the start seed sets
// it). Reducer stays pure: all timestamps + ids arrive on the event.

export const MAX_TEAM_NAME = 40;
export const MAX_TEAMS = 100;
/** Sane bounds so a fat-fingered entry can't break the projector layout. */
export const MIN_SCORE = -100000;
export const MAX_SCORE = 100000;

export type ScoreTeam = {
  /** Stable id (= the add_team event's id). */
  id: string;
  name: string;
  score: number;
};

export type QuizScoreboardState = {
  started: boolean;
  /** Who started the game; the only user authorized to push host events. */
  hostId: string | null;
  /** Teams in entry order (host edits this stable list; the projector sorts). */
  teams: ScoreTeam[];
  ended: boolean;
};

export const EMPTY_QUIZ_SCOREBOARD_STATE: QuizScoreboardState = {
  started: false,
  hostId: null,
  teams: [],
  ended: false,
};

export type QuizScoreboardEvent =
  | { kind: "quiz_scoreboard_start"; hostId: string; createdAt: number }
  | { kind: "quiz_scoreboard_add_team"; id: string; name: string; at: number }
  | { kind: "quiz_scoreboard_rename_team"; teamId: string; name: string; at: number }
  | { kind: "quiz_scoreboard_set_score"; teamId: string; score: number; at: number }
  | { kind: "quiz_scoreboard_adjust_score"; teamId: string; delta: number; at: number }
  | { kind: "quiz_scoreboard_remove_team"; teamId: string; at: number }
  | { kind: "quiz_scoreboard_end"; at: number };

export function sanitizeTeamName(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, MAX_TEAM_NAME);
}

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(n)));
}

/**
 * Teams sorted for display: highest score first, ties broken by name (A→Z) so
 * the order is deterministic and stable across refreshes / replay.
 */
export function standings(state: QuizScoreboardState): ScoreTeam[] {
  return [...state.teams].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}
