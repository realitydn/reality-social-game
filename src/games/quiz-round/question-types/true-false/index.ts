import type { QuestionType } from "../types";
import { withSpeedBonus } from "../lib/scoring";

export type TFData = {
  prompt: string;
  correctValue: boolean;
  image?: string | null;
};

export type TFAnswer = {
  value: boolean;
};

export const TrueFalseType: QuestionType<TFData, TFAnswer> = {
  type: "true-false",
  validateAnswer(_q, a) {
    return !!a && typeof a.value === "boolean";
  },
  isCorrect(q, a) {
    return q.correctValue === a.value;
  },
  scoreAnswer({ question, answer, elapsedMs, config }) {
    if (answer.value !== question.correctValue) return 0;
    return withSpeedBonus(config.basePoints, elapsedMs, config);
  },
};
