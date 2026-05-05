import type { GameType, GameValidation } from "@/games/types";
import { reduceTargetHunt } from "./reducer";
import { EMPTY_TARGET_HUNT_STATE, type TargetHuntEvent, type TargetHuntState } from "./state";
import type { Locale } from "@/i18n/locales";

const TH_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Target Hunt",
    yourTarget: "Your target",
    noTarget: "No target right now.",
    tagButton: "I tagged them",
    tagSent: "Tag sent — waiting for them to confirm",
    pendingHeading: "Did they tag you?",
    pendingDescription: "claims they tagged you.",
    confirm: "Yes, they got me",
    deny: "No, they didn't",
    yourTags: "Your tags",
    waitingToStart: "Waiting for the host to start.",
  },
  vi: {
    title: "Săn Mục tiêu",
    yourTarget: "Mục tiêu của bạn",
    noTarget: "Không có mục tiêu lúc này.",
    tagButton: "Tôi đã chạm trúng",
    tagSent: "Đã gửi — đang chờ họ xác nhận",
    pendingHeading: "Họ có chạm trúng bạn không?",
    pendingDescription: "tuyên bố đã chạm trúng bạn.",
    confirm: "Đúng, họ trúng tôi",
    deny: "Không, họ chưa",
    yourTags: "Số lượt chạm",
    waitingToStart: "Chờ chủ phòng bắt đầu.",
  },
  ru: {
    title: "Охота",
    yourTarget: "Ваша цель",
    noTarget: "Сейчас нет цели.",
    tagButton: "Я их поймал",
    tagSent: "Заявка отправлена — ждём подтверждения",
    pendingHeading: "Они вас поймали?",
    pendingDescription: "утверждает, что поймал вас.",
    confirm: "Да, поймали",
    deny: "Нет, не поймали",
    yourTags: "Ваши поимки",
    waitingToStart: "Ожидаем начала игры.",
  },
  uk: {
    title: "Полювання",
    yourTarget: "Ваша ціль",
    noTarget: "Зараз немає цілі.",
    tagButton: "Я їх упіймав",
    tagSent: "Заявку надіслано — чекаємо підтвердження",
    pendingHeading: "Вони вас упіймали?",
    pendingDescription: "стверджує, що впіймав вас.",
    confirm: "Так, упіймали",
    deny: "Ні, не впіймали",
    yourTags: "Ваші упіймання",
    waitingToStart: "Очікуємо початку гри.",
  },
};

export const TargetHuntGame: GameType<TargetHuntState, TargetHuntEvent> = {
  type: "target-hunt",

  init() {
    return EMPTY_TARGET_HUNT_STATE;
  },

  reduce(state, event) {
    return reduceTargetHunt(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "target_hunt_start": {
        // Seed event — applied via the onStart hook, not user-initiated.
        return { ok: true };
      }
      case "target_hunt_tag_claim": {
        if (event.taggerId !== actorId) return { ok: false, reason: "actor must be tagger" };
        if (event.taggerId === event.taggedId) return { ok: false, reason: "cannot tag yourself" };
        const target = state.targets[event.taggerId];
        if (target !== event.taggedId) return { ok: false, reason: "that's not your target" };
        const existing = Object.values(state.pending).find((p) => p.taggerId === event.taggerId);
        if (existing) return { ok: false, reason: "you already have a pending tag" };
        return { ok: true };
      }
      case "target_hunt_tag_confirm":
      case "target_hunt_tag_deny": {
        const claim = state.pending[event.claimId];
        if (!claim) return { ok: false, reason: "no such pending tag" };
        if (claim.taggedId !== actorId) return { ok: false, reason: "only the tagged can resolve" };
        if (event.confirmerId !== actorId) return { ok: false, reason: "confirmer mismatch" };
        return { ok: true };
      }
    }
  },

  score(state) {
    return { ...state.scores };
  },

  prompts(locale) {
    return TH_LABELS[locale] ?? TH_LABELS.en;
  },

  onStart(_ctx, players) {
    // Capture a shuffled order as a seed event. Math.random is fine here because
    // the resulting order is recorded in the payload — replays stay deterministic.
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    return [
      {
        kind: "target_hunt_start",
        payload: { players: shuffled, createdAt: Date.now() },
      },
    ];
  },
};
