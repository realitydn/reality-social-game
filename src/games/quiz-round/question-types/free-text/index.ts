import type { QuestionType } from "../types";
import { matchesAny } from "../lib/text-match";
import { withSpeedBonus } from "../lib/scoring";

export type FreeTextData = {
  prompt: string;
  /** One or more accepted answers. Hosts list variants ("Mai Thúc Lân",
   *  "Mai Thuc Lan") to handle accents; the matcher normalizes both
   *  sides and tolerates small typos via Levenshtein. */
  acceptedAnswers: string[];
  image?: string | null;
};

export type FreeTextAnswer = {
  text: string;
};

const MAX_LEN = 200;

export const FreeTextType: QuestionType<FreeTextData, FreeTextAnswer> = {
  type: "free-text",
  validateAnswer(_q, a) {
    return !!a && typeof a.text === "string" && a.text.length > 0 && a.text.length <= MAX_LEN;
  },
  isCorrect(q, a) {
    return matchesAny(a.text, q.acceptedAnswers);
  },
  scoreAnswer({ question, answer, elapsedMs, config }) {
    if (!matchesAny(answer.text, question.acceptedAnswers)) return 0;
    return withSpeedBonus(config.basePoints, elapsedMs, config);
  },
};
