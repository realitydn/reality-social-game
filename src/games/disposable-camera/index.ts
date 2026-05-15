import type { GameType, GameValidation } from "@/games/types";
import type { Locale } from "@/i18n/locales";
import { reduceDisposableCamera } from "./reducer";
import {
  DEFAULT_DISPOSABLE_CAMERA_CONFIG,
  EMPTY_DISPOSABLE_CAMERA_STATE,
  type DisposableCameraConfig,
  type DisposableCameraState,
  type DisposableEvent,
} from "./state";

const DC_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Disposable Camera",
    waitingToStart: "Waiting for the host to start.",
    captureHeading: "Take some shots",
    captureSelfie: "Selfie",
    captureRoom: "Photo of the room",
    captureGeneric: "Take a photo",
    photosUsed: "Photos used",
    photoLimitReached: "You've used all your photos.",
    deletePhoto: "Delete",
    waitingForVoting: "Waiting for voting to open…",
    votingHeading: "Vote for your favourites",
    votesUsed: "Votes used",
    voteLimitReached: "You've used all your votes.",
    cantVoteOwn: "You can't vote for your own photos.",
    revealHeading: "Photographers of the Night",
    noVotes: "No votes yet.",
    gameEnded: "Disposable Camera ended.",
  },
  vi: {
    title: "Máy Ảnh Dùng Một Lần",
    waitingToStart: "Chờ chủ phòng bắt đầu.",
    captureHeading: "Chụp vài tấm",
    captureSelfie: "Selfie",
    captureRoom: "Chụp không gian",
    captureGeneric: "Chụp ảnh",
    photosUsed: "Ảnh đã dùng",
    photoLimitReached: "Bạn đã dùng hết lượt chụp.",
    deletePhoto: "Xóa",
    waitingForVoting: "Đang chờ mở vòng bình chọn…",
    votingHeading: "Bình chọn ảnh yêu thích",
    votesUsed: "Số phiếu đã dùng",
    voteLimitReached: "Bạn đã dùng hết lượt bình chọn.",
    cantVoteOwn: "Không thể tự bình chọn ảnh của mình.",
    revealHeading: "Nhiếp Ảnh Gia Đêm Nay",
    noVotes: "Chưa có phiếu nào.",
    gameEnded: "Trò chơi đã kết thúc.",
  },
  ru: {
    title: "Одноразовая камера",
    waitingToStart: "Ожидаем начала.",
    captureHeading: "Снимайте кадры",
    captureSelfie: "Селфи",
    captureRoom: "Фото зала",
    captureGeneric: "Сделать фото",
    photosUsed: "Снимков сделано",
    photoLimitReached: "Лимит снимков достигнут.",
    deletePhoto: "Удалить",
    waitingForVoting: "Ждём открытия голосования…",
    votingHeading: "Голосуйте за лучшие",
    votesUsed: "Голосов отдано",
    voteLimitReached: "Голоса закончились.",
    cantVoteOwn: "Нельзя голосовать за свои фото.",
    revealHeading: "Фотографы вечера",
    noVotes: "Голосов пока нет.",
    gameEnded: "Игра окончена.",
  },
  uk: {
    title: "Одноразова камера",
    waitingToStart: "Чекаємо початок.",
    captureHeading: "Зробіть знімки",
    captureSelfie: "Селфі",
    captureRoom: "Фото залу",
    captureGeneric: "Зробити фото",
    photosUsed: "Знімків зроблено",
    photoLimitReached: "Ліміт знімків вичерпано.",
    deletePhoto: "Видалити",
    waitingForVoting: "Чекаємо відкриття голосування…",
    votingHeading: "Голосуйте за найкращі",
    votesUsed: "Голосів віддано",
    voteLimitReached: "Голоси вичерпано.",
    cantVoteOwn: "Не можна голосувати за власні фото.",
    revealHeading: "Фотографи вечора",
    noVotes: "Голосів поки немає.",
    gameEnded: "Гру завершено.",
  },
};

// Seed shape passed via startGame's seedData. The admin server action
// resolves the host's user.id + the form-supplied config.
export type DisposableCameraSeed = {
  hostId: string;
  config: DisposableCameraConfig;
};

export const DisposableCameraGame: GameType<
  DisposableCameraState,
  DisposableEvent
> = {
  type: "disposable-camera",

  init() {
    return EMPTY_DISPOSABLE_CAMERA_STATE;
  },

  reduce(state, event) {
    return reduceDisposableCamera(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "disposable_start":
        return { ok: true }; // seed event

      case "disposable_photo_upload": {
        if (!state.started) return { ok: false, reason: "game not started" };
        if (state.phase !== "capturing")
          return { ok: false, reason: "capture phase closed" };
        if (event.uploaderId !== actorId)
          return { ok: false, reason: "actor mismatch" };
        const count = state.photos.filter((p) => p.uploaderId === actorId).length;
        if (count >= state.config.photosPerPlayer)
          return { ok: false, reason: "photo limit reached" };
        return { ok: true };
      }

      case "disposable_photo_delete": {
        if (state.phase !== "capturing")
          return { ok: false, reason: "deletion closed after capture" };
        const photo = state.photos.find((p) => p.id === event.photoId);
        if (!photo) return { ok: false, reason: "no such photo" };
        const isOwner = photo.uploaderId === actorId;
        const isHost = state.hostId === actorId;
        if (!isOwner && !isHost) return { ok: false, reason: "not your photo" };
        return { ok: true };
      }

      case "disposable_vote": {
        if (state.phase !== "voting")
          return { ok: false, reason: "not in voting phase" };
        if (event.voterId !== actorId)
          return { ok: false, reason: "actor mismatch" };
        // Cap + self-vote rules are enforced by the reducer (silently
        // filter / trim) so partial-good ballots still register.
        return { ok: true };
      }

      case "disposable_open_voting":
      case "disposable_open_reveal":
      case "disposable_end":
        if (!state.started) return { ok: false, reason: "game not started" };
        if (state.hostId && state.hostId !== actorId)
          return { ok: false, reason: "host-only event" };
        return { ok: true };
    }
  },

  // Non-competitive: votes don't aggregate into session_players.score, so
  // the persistent leaderboards aren't dominated by photo voting. The
  // recognition lives on the big-screen reveal instead.
  score() {
    return {};
  },

  prompts(locale) {
    return DC_LABELS[locale] ?? DC_LABELS.en;
  },

  onStart(_ctx, _players, seedData) {
    const data = seedData as DisposableCameraSeed | undefined;
    if (!data) return [];
    return [
      {
        kind: "disposable_start",
        payload: {
          hostId: data.hostId,
          config: { ...DEFAULT_DISPOSABLE_CAMERA_CONFIG, ...data.config },
          createdAt: Date.now(),
        },
      },
    ];
  },
};
