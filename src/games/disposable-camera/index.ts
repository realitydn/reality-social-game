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
    waitingForVoting: "All shots used — nice. Voting opens soon.",
    votingOpensSoon: "Voting opens when the host closes the camera.",
    yourShots: "Your shots",
    fromLibrary: "From library",
    deletePhotoConfirmTitle: "Delete this photo?",
    deletePhotoConfirmBody: "It's removed from the night's roll for everyone.",
    deletePhotoConfirm: "Delete",
    deletePhotoCancel: "Keep",
    votingHeading: "Vote for your favourites",
    votesUsed: "Votes used",
    voteLimitReached: "You've used all your votes.",
    cantVoteOwn: "You can't vote for your own photos.",
    yoursTag: "yours",
    swipeLike: "Like",
    swipeSkip: "Skip",
    swipeHint: "Swipe right to like, left to skip",
    swipeDone: "All done — thanks for voting!",
    swipeNothing: "No photos to vote on yet.",
    revealHeading: "Photographers of the Night",
    noVotes: "No votes yet.",
    gameEnded: "Disposable Camera ended.",
    revealRecap: "You picked up {votes} across {photos}.",
    revealVotesOne: "1 vote",
    revealVotesMany: "{n} votes",
    revealPhotosOne: "1 photo",
    revealPhotosMany: "{n} photos",
    // Big-screen (projector) chrome
    bigShotsEach: "Up to {n} shots each — take some.",
    bigWaitingFirst: "Waiting for the first shot…",
    bigVoteOnPhone: "Vote on your phone",
    bigPickFavourites: "Pick {n} favourite",
    bigPickFavouritesPlural: "Pick {n} favourites",
    bigFinalResults: "Final results",
    bigNoVotes: "No votes were cast.",
    bigShots: "shots",
    bigPhotographers: "photographers",
    bigBallotsIn: "{n} ballots in",
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
    waitingForVoting: "Đã dùng hết lượt — tuyệt. Sắp mở bình chọn.",
    votingOpensSoon: "Bình chọn mở khi chủ phòng đóng máy ảnh.",
    yourShots: "Ảnh của bạn",
    fromLibrary: "Từ thư viện",
    deletePhotoConfirmTitle: "Xóa ảnh này?",
    deletePhotoConfirmBody: "Ảnh sẽ bị gỡ khỏi cuộn phim của cả phòng.",
    deletePhotoConfirm: "Xóa",
    deletePhotoCancel: "Giữ lại",
    votingHeading: "Bình chọn ảnh yêu thích",
    votesUsed: "Số phiếu đã dùng",
    voteLimitReached: "Bạn đã dùng hết lượt bình chọn.",
    cantVoteOwn: "Không thể tự bình chọn ảnh của mình.",
    yoursTag: "của bạn",
    swipeLike: "Thích",
    swipeSkip: "Bỏ qua",
    swipeHint: "Vuốt phải để thích, trái để bỏ qua",
    swipeDone: "Xong rồi — cảm ơn đã bình chọn!",
    swipeNothing: "Chưa có ảnh để bình chọn.",
    revealHeading: "Nhiếp Ảnh Gia Đêm Nay",
    noVotes: "Chưa có phiếu nào.",
    gameEnded: "Trò chơi đã kết thúc.",
    revealRecap: "Bạn nhận được {votes} trên {photos}.",
    revealVotesOne: "1 phiếu",
    revealVotesMany: "{n} phiếu",
    revealPhotosOne: "1 ảnh",
    revealPhotosMany: "{n} ảnh",
    // Big-screen (projector) chrome
    bigShotsEach: "Mỗi người tối đa {n} tấm — chụp đi nào.",
    bigWaitingFirst: "Đang chờ tấm đầu tiên…",
    bigVoteOnPhone: "Bình chọn trên điện thoại",
    bigPickFavourites: "Chọn {n} ảnh yêu thích",
    bigPickFavouritesPlural: "Chọn {n} ảnh yêu thích",
    bigFinalResults: "Kết quả cuối cùng",
    bigNoVotes: "Chưa có phiếu nào.",
    bigShots: "tấm",
    bigPhotographers: "người chụp",
    bigBallotsIn: "{n} phiếu đã gửi",
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
    waitingForVoting: "Все кадры сделаны — отлично. Голосование скоро.",
    votingOpensSoon: "Голосование откроется, когда ведущий закроет камеру.",
    yourShots: "Ваши снимки",
    fromLibrary: "Из галереи",
    deletePhotoConfirmTitle: "Удалить это фото?",
    deletePhotoConfirmBody: "Оно исчезнет из общей плёнки вечера для всех.",
    deletePhotoConfirm: "Удалить",
    deletePhotoCancel: "Оставить",
    votingHeading: "Голосуйте за лучшие",
    votesUsed: "Голосов отдано",
    voteLimitReached: "Голоса закончились.",
    cantVoteOwn: "Нельзя голосовать за свои фото.",
    yoursTag: "ваше",
    swipeLike: "Нравится",
    swipeSkip: "Пропустить",
    swipeHint: "Свайп вправо — лайк, влево — пропустить",
    swipeDone: "Готово — спасибо за голос!",
    swipeNothing: "Пока нет фото для голосования.",
    revealHeading: "Фотографы вечера",
    noVotes: "Голосов пока нет.",
    gameEnded: "Игра окончена.",
    revealRecap: "Вы набрали {votes} на {photos}.",
    revealVotesOne: "1 голос",
    revealVotesMany: "{n} голосов",
    revealPhotosOne: "1 фото",
    revealPhotosMany: "{n} фото",
    // Big-screen (projector) chrome
    bigShotsEach: "До {n} кадров на каждого — снимайте.",
    bigWaitingFirst: "Ждём первый кадр…",
    bigVoteOnPhone: "Голосуйте в телефоне",
    bigPickFavourites: "Выберите {n} любимый кадр",
    bigPickFavouritesPlural: "Выберите {n} любимых кадров",
    bigFinalResults: "Итоговые результаты",
    bigNoVotes: "Голосов не было.",
    bigShots: "кадров",
    bigPhotographers: "фотографов",
    bigBallotsIn: "{n} бюллетеней",
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
    waitingForVoting: "Усі кадри використано — чудово. Голосування скоро.",
    votingOpensSoon: "Голосування відкриється, коли ведучий закриє камеру.",
    yourShots: "Ваші знімки",
    fromLibrary: "З галереї",
    deletePhotoConfirmTitle: "Видалити це фото?",
    deletePhotoConfirmBody: "Воно зникне зі спільної плівки вечора для всіх.",
    deletePhotoConfirm: "Видалити",
    deletePhotoCancel: "Залишити",
    votingHeading: "Голосуйте за найкращі",
    votesUsed: "Голосів віддано",
    voteLimitReached: "Голоси вичерпано.",
    cantVoteOwn: "Не можна голосувати за власні фото.",
    yoursTag: "ваше",
    swipeLike: "Подобається",
    swipeSkip: "Пропустити",
    swipeHint: "Свайп праворуч — лайк, ліворуч — пропустити",
    swipeDone: "Готово — дякуємо за голос!",
    swipeNothing: "Поки немає фото для голосування.",
    revealHeading: "Фотографи вечора",
    noVotes: "Голосів поки немає.",
    gameEnded: "Гру завершено.",
    revealRecap: "Ви набрали {votes} на {photos}.",
    revealVotesOne: "1 голос",
    revealVotesMany: "{n} голосів",
    revealPhotosOne: "1 фото",
    revealPhotosMany: "{n} фото",
    // Big-screen (projector) chrome
    bigShotsEach: "До {n} кадрів на кожного — знімайте.",
    bigWaitingFirst: "Чекаємо перший кадр…",
    bigVoteOnPhone: "Голосуйте у телефоні",
    bigPickFavourites: "Виберіть {n} улюблений кадр",
    bigPickFavouritesPlural: "Виберіть {n} улюблених кадрів",
    bigFinalResults: "Підсумкові результати",
    bigNoVotes: "Голосів не було.",
    bigShots: "кадрів",
    bigPhotographers: "фотографів",
    bigBallotsIn: "{n} бюлетенів",
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
