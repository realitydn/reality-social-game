// Quiz Round — generic question-round engine. Loads a package's content as a
// frozen snapshot in the start event, so post-start edits to the source
// package don't affect a running game and replay stays deterministic. The
// reducer treats per-question shapes opaquely and delegates score/correctness
// to the question-type plugin keyed by `type`.

export type QuizRoundConfig = {
  /** Seconds to auto-close a question. 0 / undefined = host-driven only. */
  timerSecs?: number;
  /** When points materialize. on_reveal = dramatic Kahoot-style. */
  scoreMaterialization: "on_reveal" | "on_answer";
  /** Show the leaderboard between questions on big-screen. */
  interQuestionLeaderboard: boolean;
  /** Linear time decay: faster correct = more points (down to half). */
  speedBonus: boolean;
  /** Default points per question if not overridden per-question. */
  defaultPoints: number;
  /** Team play: players join teams and the projector shows team standings
   *  (a team's score = the sum of its members' scores). Individual scoring and
   *  the per-player leaderboards are unchanged. */
  teamsEnabled?: boolean;
};

export const DEFAULT_QUIZ_ROUND_CONFIG: QuizRoundConfig = {
  timerSecs: 30,
  scoreMaterialization: "on_reveal",
  interQuestionLeaderboard: true,
  speedBonus: true,
  defaultPoints: 1000,
  teamsEnabled: false,
};

export type QuizRoundQuestion = {
  /** Stable id within the package. */
  id: string;
  /** Question-type plugin key, e.g. "multiple-choice". */
  type: string;
  /** Type-specific shape — opaque to the quiz-round reducer. */
  data: unknown;
  /** Override config.defaultPoints. */
  points?: number;
  /** Override config.timerSecs. */
  timerSecs?: number;
};

export type QuizRoundAnswer = {
  /** Type-specific. */
  value: unknown;
  /** Ms since the question opened — used for speed bonus. */
  elapsedMs: number;
  /** Absolute timestamp, for tie-breaks and audit. */
  submittedAt: number;
};

export type QuizTeam = { id: string; name: string };

export type QuizRoundState = {
  started: boolean;
  /** Who started the game; the only user authorized to push host events. */
  hostId: string | null;
  /** Frozen package snapshot, ordered. */
  questions: QuizRoundQuestion[];
  config: QuizRoundConfig;
  /** Index of the question in play, or null between questions / pre-start. */
  currentIdx: number | null;
  phase: "lobby" | "question" | "revealed" | "ended";
  /** When the current question was opened (ms epoch). */
  questionOpenedAt: number | null;
  /** Submitted answers: questionIdx → { playerId → answer }. First answer wins. */
  answers: Record<number, Record<string, QuizRoundAnswer>>;
  scores: Record<string, number>;
  /** Team play (config.teamsEnabled). teams[teamId] = {id,name}; playerTeam maps
   *  a player to their team. A team's standing is the sum of members' scores. */
  teams: Record<string, QuizTeam>;
  playerTeam: Record<string, string>;
  /** Reveal log: per question, the question's data + per-player score deltas. */
  reveals: Record<number, { questionData: unknown; deltas: Record<string, number> }>;
};

export const EMPTY_QUIZ_ROUND_STATE: QuizRoundState = {
  started: false,
  hostId: null,
  questions: [],
  config: DEFAULT_QUIZ_ROUND_CONFIG,
  currentIdx: null,
  phase: "lobby",
  questionOpenedAt: null,
  answers: {},
  scores: {},
  teams: {},
  playerTeam: {},
  reveals: {},
};

export type QuizRoundEvent =
  | {
      kind: "quiz_round_start";
      hostId: string;
      questions: QuizRoundQuestion[];
      config: QuizRoundConfig;
      createdAt: number;
    }
  | { kind: "quiz_round_open_question"; questionIdx: number; at: number }
  | {
      kind: "quiz_round_answer";
      playerId: string;
      questionIdx: number;
      value: unknown;
      elapsedMs: number;
      submittedAt: number;
    }
  | { kind: "quiz_round_close_question"; questionIdx: number; at: number }
  | { kind: "quiz_round_advance"; nextIdx: number; at: number }
  | { kind: "quiz_round_end"; at: number }
  | { kind: "quiz_create_team"; teamId: string; name: string; createdBy: string; at: number }
  | { kind: "quiz_join_team"; playerId: string; teamId: string; at: number };

export type TeamStanding = { teamId: string; name: string; score: number; members: number };

// Pure: derive team standings from per-player scores + team membership. Used by
// the player view, projector, and host panel. Sorted highest-first.
export function teamStandings(state: QuizRoundState): TeamStanding[] {
  const agg: Record<string, { score: number; members: number }> = {};
  for (const teamId of Object.keys(state.teams)) agg[teamId] = { score: 0, members: 0 };
  for (const [playerId, teamId] of Object.entries(state.playerTeam)) {
    if (!agg[teamId]) continue;
    agg[teamId].members += 1;
    agg[teamId].score += state.scores[playerId] ?? 0;
  }
  return Object.values(state.teams)
    .map((team) => ({
      teamId: team.id,
      name: team.name,
      score: agg[team.id]?.score ?? 0,
      members: agg[team.id]?.members ?? 0,
    }))
    .sort((a, b) => b.score - a.score);
}
