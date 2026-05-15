import type { GameType, GameValidation } from "@/games/types";
import type { Locale } from "@/i18n/locales";
import { reduceKaraokeQueue } from "./reducer";
import {
  EMPTY_KARAOKE_QUEUE_STATE,
  type KaraokeEvent,
  type KaraokeQueueState,
} from "./state";

const KQ_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Karaoke Queue",
    waitingToStart: "Waiting for the host to open the queue.",
    submitPlaceholder: "Song title (and artist, if you like)",
    submitButton: "Add to queue",
    yourRequest: "Your request",
    queuePosition: "Position",
    upNext: "Up next",
    queueEmpty: "Queue is empty — submit a song.",
    alreadyQueued: "You already have a song in the queue.",
    completed: "Performed",
    queueClosed: "Queue is closed.",
  },
  vi: {
    title: "Hàng Đợi Karaoke",
    waitingToStart: "Chờ chủ phòng mở hàng đợi.",
    submitPlaceholder: "Tên bài hát (và ca sĩ, nếu muốn)",
    submitButton: "Thêm vào hàng đợi",
    yourRequest: "Bài của bạn",
    queuePosition: "Thứ tự",
    upNext: "Tiếp theo",
    queueEmpty: "Hàng đợi trống — gửi một bài.",
    alreadyQueued: "Bạn đã có bài trong hàng đợi.",
    completed: "Đã hát",
    queueClosed: "Hàng đợi đã đóng.",
  },
  ru: {
    title: "Очередь Караоке",
    waitingToStart: "Ждём, пока ведущий откроет очередь.",
    submitPlaceholder: "Название песни (и исполнитель, если хотите)",
    submitButton: "Добавить в очередь",
    yourRequest: "Ваш запрос",
    queuePosition: "Позиция",
    upNext: "Следующий",
    queueEmpty: "Очередь пуста — отправьте песню.",
    alreadyQueued: "У вас уже есть песня в очереди.",
    completed: "Исполнено",
    queueClosed: "Очередь закрыта.",
  },
  uk: {
    title: "Черга Караоке",
    waitingToStart: "Чекаємо, поки ведучий відкриє чергу.",
    submitPlaceholder: "Назва пісні (і виконавець, якщо бажаєте)",
    submitButton: "Додати в чергу",
    yourRequest: "Ваш запит",
    queuePosition: "Позиція",
    upNext: "Наступний",
    queueEmpty: "Черга порожня — надішліть пісню.",
    alreadyQueued: "У вас вже є пісня в черзі.",
    completed: "Виконано",
    queueClosed: "Черга закрита.",
  },
};

// Seed shape passed via startGame's seedData for karaoke games. The admin
// server action sets hostId from the current signed-in user.
export type KaraokeSeed = {
  hostId: string;
};

export const KaraokeQueueGame: GameType<KaraokeQueueState, KaraokeEvent> = {
  type: "karaoke-queue",

  init() {
    return EMPTY_KARAOKE_QUEUE_STATE;
  },

  reduce(state, event) {
    return reduceKaraokeQueue(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "karaoke_start":
        // Seed event — emitted via onStart, not user-initiated.
        return { ok: true };

      case "karaoke_submit": {
        if (!state.started) return { ok: false, reason: "queue not open" };
        if (state.ended) return { ok: false, reason: "queue closed" };
        if (event.playerId !== actorId) return { ok: false, reason: "actor mismatch" };
        if (!event.songTitle?.trim())
          return { ok: false, reason: "song title required" };
        const existing = state.queue.find((r) => r.playerId === actorId);
        if (existing) return { ok: false, reason: "you already have a request" };
        return { ok: true };
      }

      case "karaoke_edit":
      case "karaoke_reorder":
      case "karaoke_complete":
      case "karaoke_delete":
      case "karaoke_end":
        if (!state.started) return { ok: false, reason: "queue not open" };
        if (state.hostId && state.hostId !== actorId)
          return { ok: false, reason: "host-only event" };
        return { ok: true };
    }
  },

  // No competitive scoring — Karaoke is a queue management game type.
  // finalizeGame() iterates these scores and adds to session_players.score;
  // an empty map is a clean no-op.
  score() {
    return {};
  },

  prompts(locale) {
    return KQ_LABELS[locale] ?? KQ_LABELS.en;
  },

  onStart(_ctx, _players, seedData) {
    const data = seedData as KaraokeSeed | undefined;
    if (!data) return [];
    return [
      {
        kind: "karaoke_start",
        payload: { hostId: data.hostId, createdAt: Date.now() },
      },
    ];
  },
};
