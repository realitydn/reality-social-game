import type { QuestionType } from "../types";

export type MCQOption = {
  id: string;
  text: string;
  /** Optional image URL alongside or in place of text. */
  image?: string | null;
};

export type MCQData = {
  prompt: string;
  options: MCQOption[];
  correctOptionId: string;
  /** Optional stem media (image URL). */
  image?: string | null;
};

export type MCQAnswer = {
  optionId: string;
};

export const MultipleChoiceType: QuestionType<MCQData, MCQAnswer> = {
  type: "multiple-choice",
  validateAnswer(q, a) {
    if (!a || typeof a.optionId !== "string") return false;
    return q.options.some((opt) => opt.id === a.optionId);
  },
  isCorrect(q, a) {
    return a.optionId === q.correctOptionId;
  },
  scoreAnswer({ question, answer, elapsedMs, config }) {
    if (answer.optionId !== question.correctOptionId) return 0;
    const base = config.basePoints;
    if (!config.speedBonus || !config.timerSecs) return base;
    // Linear decay across the timer window: full at 0ms, half at the timer mark.
    const timerMs = config.timerSecs * 1000;
    const ratio = 1 - elapsedMs / (timerMs * 2);
    return Math.round(base * Math.max(0.5, Math.min(1, ratio)));
  },
};
