import type { GameType, GameValidation } from "@/games/types";
import { promptIdAt } from "./card";
import { reduceBingo } from "./reducer";
import { EMPTY_BINGO_STATE, type BingoEvent, type BingoState } from "./state";
import type { Locale } from "@/i18n/locales";

const BINGO_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    cardHeading: "Your card",
    yourCode: "Your code",
    claim: "Claim",
    claimSquare: "Claim this square",
    targetCodePrompt: "Their code",
    targetCodePlaceholder: "ABCD",
    submitClaim: "Send for confirmation",
    cancel: "Cancel",
    pendingHeading: "Confirm or deny",
    pendingDescription: "claims you both match:",
    confirm: "Confirm",
    deny: "Deny",
    bingoBanner: "BINGO!",
  },
  vi: {
    cardHeading: "Thẻ của bạn",
    yourCode: "Mã của bạn",
    claim: "Tuyên bố",
    claimSquare: "Tuyên bố ô này",
    targetCodePrompt: "Mã của họ",
    targetCodePlaceholder: "ABCD",
    submitClaim: "Gửi để xác nhận",
    cancel: "Hủy",
    pendingHeading: "Xác nhận hoặc từ chối",
    pendingDescription: "tuyên bố cả hai đều khớp:",
    confirm: "Xác nhận",
    deny: "Từ chối",
    bingoBanner: "BINGO!",
  },
  ru: {
    cardHeading: "Ваша карточка",
    yourCode: "Ваш код",
    claim: "Заявить",
    claimSquare: "Заявить эту клетку",
    targetCodePrompt: "Их код",
    targetCodePlaceholder: "ABCD",
    submitClaim: "Отправить на подтверждение",
    cancel: "Отмена",
    pendingHeading: "Подтвердить или отклонить",
    pendingDescription: "утверждает, что вы оба подходите:",
    confirm: "Подтвердить",
    deny: "Отклонить",
    bingoBanner: "БИНГО!",
  },
  uk: {
    cardHeading: "Ваша картка",
    yourCode: "Ваш код",
    claim: "Заявити",
    claimSquare: "Заявити цю клітинку",
    targetCodePrompt: "Їхній код",
    targetCodePlaceholder: "ABCD",
    submitClaim: "Надіслати на підтвердження",
    cancel: "Скасувати",
    pendingHeading: "Підтвердити або відхилити",
    pendingDescription: "стверджує, що ви обидва підходите:",
    confirm: "Підтвердити",
    deny: "Відхилити",
    bingoBanner: "БІНГО!",
  },
};

export const BingoGame: GameType<BingoState, BingoEvent> = {
  type: "bingo",

  init() {
    return EMPTY_BINGO_STATE;
  },

  reduce(state, event) {
    return reduceBingo(state, event);
  },

  validate(state, event, actorId, ctx): GameValidation {
    switch (event.kind) {
      case "bingo_claim": {
        if (event.claimerId !== actorId) return { ok: false, reason: "actor must be claimer" };
        if (event.claimerId === event.targetId) return { ok: false, reason: "cannot claim yourself" };
        if (event.squareIdx < 0 || event.squareIdx >= 16) return { ok: false, reason: "bad square" };
        const expectedPromptId = promptIdAt(ctx.sessionId, ctx.gameId, event.claimerId, event.squareIdx);
        if (expectedPromptId !== event.promptId) return { ok: false, reason: "prompt mismatch" };
        const filled = state.filled[event.claimerId] ?? [];
        if (filled.includes(event.squareIdx)) return { ok: false, reason: "already filled" };
        const conflicting = Object.values(state.pending).find(
          (p) => p.claimerId === event.claimerId && p.squareIdx === event.squareIdx,
        );
        if (conflicting) return { ok: false, reason: "claim already pending" };
        return { ok: true };
      }
      case "bingo_confirm":
      case "bingo_deny": {
        const claim = state.pending[event.claimId];
        if (!claim) return { ok: false, reason: "no such pending claim" };
        if (claim.targetId !== actorId) return { ok: false, reason: "only target can resolve" };
        if (event.confirmerId !== actorId) return { ok: false, reason: "confirmer mismatch" };
        return { ok: true };
      }
    }
  },

  score(state) {
    const out: Record<string, number> = {};
    for (const [userId, filled] of Object.entries(state.filled)) {
      out[userId] = filled.length;
    }
    // Bingo bonus: +5 to the first 3 to bingo, in order.
    const bingoBonuses = [5, 5, 5];
    state.bingos.forEach((b, idx) => {
      if (idx < bingoBonuses.length) out[b.userId] = (out[b.userId] ?? 0) + bingoBonuses[idx];
    });
    return out;
  },

  prompts(locale) {
    return BINGO_LABELS[locale] ?? BINGO_LABELS.en;
  },
};
