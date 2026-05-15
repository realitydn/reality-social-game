import type { QuestionType } from "../types";
import { withSpeedBonus } from "../lib/scoring";

export type OrderingItem = {
  id: string;
  text: string;
};

export type OrderingData = {
  prompt: string;
  /** Stored in the CORRECT order. The player UI shuffles deterministically
   *  per (gameId, questionId, playerId) so each player sees a stable
   *  shuffle that doesn't change on refresh, but different players see
   *  different starting orders. */
  items: OrderingItem[];
  image?: string | null;
};

export type OrderingAnswer = {
  /** Item ids in the order the player submitted them. */
  order: string[];
};

function isExactMatch(items: OrderingItem[], submitted: string[]): boolean {
  if (items.length !== submitted.length) return false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].id !== submitted[i]) return false;
  }
  return true;
}

export const OrderingType: QuestionType<OrderingData, OrderingAnswer> = {
  type: "ordering",
  validateAnswer(q, a) {
    if (!a || !Array.isArray(a.order)) return false;
    if (a.order.length !== q.items.length) return false;
    const valid = new Set(q.items.map((it) => it.id));
    const seen = new Set<string>();
    for (const id of a.order) {
      if (typeof id !== "string" || !valid.has(id) || seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  },
  isCorrect(q, a) {
    return isExactMatch(q.items, a.order);
  },
  scoreAnswer({ question, answer, elapsedMs, config }) {
    if (!isExactMatch(question.items, answer.order)) return 0;
    return withSpeedBonus(config.basePoints, elapsedMs, config);
  },
};
