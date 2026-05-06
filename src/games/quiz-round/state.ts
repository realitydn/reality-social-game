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
};

export const DEFAULT_QUIZ_ROUND_CONFIG: QuizRoundConfig = {
  timerSecs: 30,
  scoreMaterialization: "on_reveal",
  interQuestionLeaderboard: true,
  speedBonus: true,
  defaultPoints: 1000,
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
  | { kind: "quiz_round_end"; at: number };
