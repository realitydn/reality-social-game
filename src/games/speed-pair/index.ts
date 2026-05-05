import type { GameType, GameValidation } from "@/games/types";
import { reduceSpeedPair } from "./reducer";
import {
  EMPTY_SPEED_PAIR_STATE,
  type SpeedPairEvent,
  type SpeedPairState,
} from "./state";
import type { Locale } from "@/i18n/locales";

const SP_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Speed Pair",
    yourPartner: "Your partner",
    waiting: "Waiting for a new partner…",
    icebreakerHint: "Two truths and a lie. Or: best meal in Đà Nẵng.",
    doneButton: "Done — find me a new pair",
    doneSent: "Waiting for them to tap done…",
    yourMeetings: "People you've met",
    waitingToStart: "Waiting for the host to start.",
  },
  vi: {
    title: "Ghép Đôi Nhanh",
    yourPartner: "Người ghép đôi",
    waiting: "Đang chờ người ghép đôi mới…",
    icebreakerHint: "Hai sự thật và một lời nói dối. Hoặc: bữa ăn ngon nhất ở Đà Nẵng.",
    doneButton: "Xong — tìm cặp mới",
    doneSent: "Đang chờ họ bấm xong…",
    yourMeetings: "Số người đã gặp",
    waitingToStart: "Chờ chủ phòng bắt đầu.",
  },
  ru: {
    title: "Быстрые пары",
    yourPartner: "Ваш партнёр",
    waiting: "Ждём нового партнёра…",
    icebreakerHint: "Две правды и одна ложь. Или: лучшее блюдо в Đà Nẵng.",
    doneButton: "Готово — найдите новую пару",
    doneSent: "Ждём, пока партнёр нажмёт «готово»…",
    yourMeetings: "Сколько людей вы встретили",
    waitingToStart: "Ожидаем начала игры.",
  },
  uk: {
    title: "Швидкі пари",
    yourPartner: "Ваш партнер",
    waiting: "Чекаємо на нового партнера…",
    icebreakerHint: "Дві правди та одна брехня. Або: найкраща страва в Đà Nẵng.",
    doneButton: "Готово — знайдіть нову пару",
    doneSent: "Чекаємо, поки партнер натисне «готово»…",
    yourMeetings: "Скільки людей ви зустріли",
    waitingToStart: "Очікуємо початку гри.",
  },
};

export const SpeedPairGame: GameType<SpeedPairState, SpeedPairEvent> = {
  type: "speed-pair",

  init() {
    return EMPTY_SPEED_PAIR_STATE;
  },

  reduce(state, event) {
    return reduceSpeedPair(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "speed_pair_start":
      case "speed_pair_assign":
        // System events — emitted by the server, not by users directly.
        return { ok: true };
      case "speed_pair_done": {
        if (event.playerId !== actorId) return { ok: false, reason: "actor mismatch" };
        const partner = state.partner[actorId];
        if (!partner) return { ok: false, reason: "no current partner" };
        if (state.done[actorId]) return { ok: false, reason: "already marked done" };
        return { ok: true };
      }
    }
  },

  score(state) {
    return { ...state.scores };
  },

  prompts(locale) {
    return SP_LABELS[locale] ?? SP_LABELS.en;
  },

  onStart(_ctx, players) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const pairs: string[][] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push(i + 1 < shuffled.length ? [shuffled[i], shuffled[i + 1]] : [shuffled[i]]);
    }
    return [{ kind: "speed_pair_start", payload: { pairs, createdAt: Date.now() } }];
  },
};
