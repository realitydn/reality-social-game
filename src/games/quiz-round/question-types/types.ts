// Question-type plugin contract — same shape as GameType, one level down.
// Adding a new question type = a new folder + one line in ./index.ts.
// Plugins must be pure: no I/O, no Date.now, no Math.random.

export type ScoringContext = {
  speedBonus: boolean;
  basePoints: number;
  timerSecs?: number;
};

export interface QuestionType<Q, A> {
  readonly type: string;
  /** Is the submitted answer well-formed for this question? */
  validateAnswer(question: Q, answer: A): boolean;
  /** Is the answer correct? */
  isCorrect(question: Q, answer: A): boolean;
  /** Compute points for an answer. Incorrect → 0. */
  scoreAnswer(args: {
    question: Q;
    answer: A;
    elapsedMs: number;
    config: ScoringContext;
  }): number;
}
