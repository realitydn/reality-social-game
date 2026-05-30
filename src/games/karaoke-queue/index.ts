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
    adding: "Adding…",
    addedConfirm: "Added ✓",
    yourRequest: "Your request",
    queuePosition: "Position",
    youreNext: "You're next.",
    upNext: "Up next",
    queueEmpty: "Queue is empty — submit a song.",
    alreadyQueued: "You already have a song in the queue.",
    completed: "Performed",
    queueClosed: "Queue is closed.",
    someone: "Someone",
    // Big screen + host chrome
    nowUp: "Now up",
    submitFromPhone: "Submit a song from your phone",
    alreadyPerformed: "Already performed",
    inQueueSuffix: "in queue",
    queueEmptyHost: "Queue is empty. Players submit songs from their phones.",
    save: "Save",
    cancel: "Cancel",
    closeQueue: "Close queue",
    ended: "ended",
    closeQueueTitle: "Close the karaoke queue?",
    closeQueueBody: "No new songs can be added. The current queue stays visible.",
    closeQueueConfirm: "Close queue",
    removeTitle: "Remove this request?",
    removeBody: "This takes the song off the queue. It can't be undone.",
    removeConfirm: "Remove",
  },
  vi: {
    title: "Hàng Đợi Karaoke",
    waitingToStart: "Chờ chủ phòng mở hàng đợi.",
    submitPlaceholder: "Tên bài hát (và ca sĩ, nếu muốn)",
    submitButton: "Thêm vào hàng đợi",
    adding: "Đang thêm…",
    addedConfirm: "Đã thêm ✓",
    yourRequest: "Bài của bạn",
    queuePosition: "Thứ tự",
    youreNext: "Sắp đến lượt bạn.",
    upNext: "Tiếp theo",
    queueEmpty: "Hàng đợi trống — gửi một bài.",
    alreadyQueued: "Bạn đã có bài trong hàng đợi.",
    completed: "Đã hát",
    queueClosed: "Hàng đợi đã đóng.",
    someone: "Một người",
    // Big screen + host chrome
    nowUp: "Đang hát",
    submitFromPhone: "Gửi một bài từ điện thoại của bạn",
    alreadyPerformed: "Đã hát xong",
    inQueueSuffix: "trong hàng đợi",
    queueEmptyHost: "Hàng đợi trống. Người chơi gửi bài từ điện thoại.",
    save: "Lưu",
    cancel: "Hủy",
    closeQueue: "Đóng hàng đợi",
    ended: "đã kết thúc",
    closeQueueTitle: "Đóng hàng đợi karaoke?",
    closeQueueBody: "Không thể thêm bài mới. Hàng đợi hiện tại vẫn hiển thị.",
    closeQueueConfirm: "Đóng hàng đợi",
    removeTitle: "Xóa yêu cầu này?",
    removeBody: "Thao tác này gỡ bài khỏi hàng đợi và không thể hoàn tác.",
    removeConfirm: "Xóa",
  },
  ru: {
    title: "Очередь Караоке",
    waitingToStart: "Ждём, пока ведущий откроет очередь.",
    submitPlaceholder: "Название песни (и исполнитель, если хотите)",
    submitButton: "Добавить в очередь",
    adding: "Добавляем…",
    addedConfirm: "Добавлено ✓",
    yourRequest: "Ваш запрос",
    queuePosition: "Позиция",
    youreNext: "Вы следующий.",
    upNext: "Следующий",
    queueEmpty: "Очередь пуста — отправьте песню.",
    alreadyQueued: "У вас уже есть песня в очереди.",
    completed: "Исполнено",
    queueClosed: "Очередь закрыта.",
    someone: "Кто-то",
    // Big screen + host chrome
    nowUp: "Сейчас поёт",
    submitFromPhone: "Отправьте песню со своего телефона",
    alreadyPerformed: "Уже исполнено",
    inQueueSuffix: "в очереди",
    queueEmptyHost: "Очередь пуста. Игроки отправляют песни со своих телефонов.",
    save: "Сохранить",
    cancel: "Отмена",
    closeQueue: "Закрыть очередь",
    ended: "завершено",
    closeQueueTitle: "Закрыть очередь караоке?",
    closeQueueBody: "Новые песни добавить нельзя. Текущая очередь остаётся видимой.",
    closeQueueConfirm: "Закрыть очередь",
    removeTitle: "Удалить этот запрос?",
    removeBody: "Песня будет убрана из очереди. Отменить нельзя.",
    removeConfirm: "Удалить",
  },
  uk: {
    title: "Черга Караоке",
    waitingToStart: "Чекаємо, поки ведучий відкриє чергу.",
    submitPlaceholder: "Назва пісні (і виконавець, якщо бажаєте)",
    submitButton: "Додати в чергу",
    adding: "Додаємо…",
    addedConfirm: "Додано ✓",
    yourRequest: "Ваш запит",
    queuePosition: "Позиція",
    youreNext: "Ви наступний.",
    upNext: "Наступний",
    queueEmpty: "Черга порожня — надішліть пісню.",
    alreadyQueued: "У вас вже є пісня в черзі.",
    completed: "Виконано",
    queueClosed: "Черга закрита.",
    someone: "Хтось",
    // Big screen + host chrome
    nowUp: "Зараз співає",
    submitFromPhone: "Надішліть пісню зі свого телефона",
    alreadyPerformed: "Вже виконано",
    inQueueSuffix: "у черзі",
    queueEmptyHost: "Черга порожня. Гравці надсилають пісні зі своїх телефонів.",
    save: "Зберегти",
    cancel: "Скасувати",
    closeQueue: "Закрити чергу",
    ended: "завершено",
    closeQueueTitle: "Закрити чергу караоке?",
    closeQueueBody: "Нові пісні додати не можна. Поточна черга залишається видимою.",
    closeQueueConfirm: "Закрити чергу",
    removeTitle: "Видалити цей запит?",
    removeBody: "Пісню буде прибрано з черги. Скасувати не можна.",
    removeConfirm: "Видалити",
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
