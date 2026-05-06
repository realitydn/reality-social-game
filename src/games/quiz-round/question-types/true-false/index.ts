import type { QuestionType } from "../types";

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
    const base = config.basePoints;
    if (!config.speedBonus || !config.timerSecs) return base;
    const timerMs = config.timerSecs * 1000;
    const ratio = 1 - elapsedMs / (timerMs * 2);
    return Math.round(base * Math.max(0.5, Math.min(1, ratio)));
  },
};
