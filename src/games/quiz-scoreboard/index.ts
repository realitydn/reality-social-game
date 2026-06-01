import type { GameType, GameValidation } from "@/games/types";
import type { Locale } from "@/i18n/locales";
import { reduceQuizScoreboard } from "./reducer";
import {
  EMPTY_QUIZ_SCOREBOARD_STATE,
  type QuizScoreboardEvent,
  type QuizScoreboardState,
} from "./state";

const QS_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Pub Quiz",
    standings: "Standings",
    addTeam: "Add team",
    teamNamePlaceholder: "Team name",
    add: "Add",
    noTeamsHost: "No teams yet. Add teams as they form.",
    noTeams: "No teams yet.",
    waitingToStart: "Waiting for the host to set up the scoreboard.",
    watchBigScreen: "Scores are up on the big screen.",
    finalScores: "Final scores",
    ended: "ended",
    points: "pts",
    save: "Save",
    cancel: "Cancel",
    rename: "Rename",
    remove: "Remove",
    endBoard: "End scoreboard",
    endTitle: "End the scoreboard?",
    endBody: "Scores freeze and the big screen shows the final standings. Can't be undone.",
    endConfirm: "End scoreboard",
    removeTitle: "Remove this team?",
    removeBody: "Takes the team off the board. Can't be undone.",
    removeConfirm: "Remove",
    followUs: "Follow REALITY",
    scanSocials: "Scan for our socials",
  },
  vi: {
    title: "Đố Vui",
    standings: "Bảng xếp hạng",
    addTeam: "Thêm đội",
    teamNamePlaceholder: "Tên đội",
    add: "Thêm",
    noTeamsHost: "Chưa có đội nào. Thêm đội khi họ thành lập.",
    noTeams: "Chưa có đội nào.",
    waitingToStart: "Chờ chủ phòng thiết lập bảng điểm.",
    watchBigScreen: "Điểm số hiển thị trên màn hình lớn.",
    finalScores: "Điểm cuối cùng",
    ended: "đã kết thúc",
    points: "điểm",
    save: "Lưu",
    cancel: "Hủy",
    rename: "Đổi tên",
    remove: "Xóa",
    endBoard: "Kết thúc bảng điểm",
    endTitle: "Kết thúc bảng điểm?",
    endBody: "Điểm số sẽ được chốt và màn hình lớn hiển thị kết quả cuối. Không thể hoàn tác.",
    endConfirm: "Kết thúc",
    removeTitle: "Xóa đội này?",
    removeBody: "Gỡ đội khỏi bảng điểm. Không thể hoàn tác.",
    removeConfirm: "Xóa",
    followUs: "Theo dõi REALITY",
    scanSocials: "Quét để theo dõi chúng tôi",
  },
  ru: {
    title: "Викторина",
    standings: "Турнирная таблица",
    addTeam: "Добавить команду",
    teamNamePlaceholder: "Название команды",
    add: "Добавить",
    noTeamsHost: "Пока нет команд. Добавляйте по мере регистрации.",
    noTeams: "Пока нет команд.",
    waitingToStart: "Ждём, пока ведущий настроит табло.",
    watchBigScreen: "Счёт — на большом экране.",
    finalScores: "Итоговый счёт",
    ended: "завершено",
    points: "очк.",
    save: "Сохранить",
    cancel: "Отмена",
    rename: "Переименовать",
    remove: "Удалить",
    endBoard: "Завершить табло",
    endTitle: "Завершить табло?",
    endBody: "Счёт фиксируется, и большой экран показывает финальную таблицу. Отменить нельзя.",
    endConfirm: "Завершить",
    removeTitle: "Удалить эту команду?",
    removeBody: "Команда убирается с табло. Отменить нельзя.",
    removeConfirm: "Удалить",
    followUs: "Подпишитесь на REALITY",
    scanSocials: "Сканируйте, чтобы подписаться",
  },
  uk: {
    title: "Вікторина",
    standings: "Турнірна таблиця",
    addTeam: "Додати команду",
    teamNamePlaceholder: "Назва команди",
    add: "Додати",
    noTeamsHost: "Поки немає команд. Додавайте, коли вони формуються.",
    noTeams: "Поки немає команд.",
    waitingToStart: "Чекаємо, поки ведучий налаштує табло.",
    watchBigScreen: "Рахунок — на великому екрані.",
    finalScores: "Підсумковий рахунок",
    ended: "завершено",
    points: "очк.",
    save: "Зберегти",
    cancel: "Скасувати",
    rename: "Перейменувати",
    remove: "Видалити",
    endBoard: "Завершити табло",
    endTitle: "Завершити табло?",
    endBody: "Рахунок фіксується, і великий екран показує фінальну таблицю. Скасувати не можна.",
    endConfirm: "Завершити",
    removeTitle: "Видалити цю команду?",
    removeBody: "Команда прибирається з табло. Скасувати не можна.",
    removeConfirm: "Видалити",
    followUs: "Підпишіться на REALITY",
    scanSocials: "Скануйте, щоб підписатися",
  },
};

// Seed shape passed via startGame's seedData. The admin server action sets
// hostId from the host picker (defaults to the acting admin).
export type QuizScoreboardSeed = {
  hostId: string;
};

export const QuizScoreboardGame: GameType<QuizScoreboardState, QuizScoreboardEvent> = {
  type: "quiz-scoreboard",

  init() {
    return EMPTY_QUIZ_SCOREBOARD_STATE;
  },

  reduce(state, event) {
    return reduceQuizScoreboard(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "quiz_scoreboard_start":
        // Seed event — emitted via onStart, not user-initiated.
        return { ok: true };

      case "quiz_scoreboard_add_team":
      case "quiz_scoreboard_rename_team":
      case "quiz_scoreboard_set_score":
      case "quiz_scoreboard_adjust_score":
      case "quiz_scoreboard_remove_team":
      case "quiz_scoreboard_end":
        if (!state.started) return { ok: false, reason: "scoreboard not open" };
        if (state.ended) return { ok: false, reason: "scoreboard closed" };
        if (state.hostId && state.hostId !== actorId)
          return { ok: false, reason: "host-only event" };
        return { ok: true };
    }
  },

  // No per-user scoring — teams are free-text names, not player accounts. An
  // empty map makes finalizeGame a no-op, so nothing lands in the persistent
  // /leaderboard. The standings live in state and show on the projector.
  score() {
    return {};
  },

  prompts(locale) {
    return QS_LABELS[locale] ?? QS_LABELS.en;
  },

  onStart(_ctx, _players, seedData) {
    const data = seedData as QuizScoreboardSeed | undefined;
    if (!data) return [];
    return [
      {
        kind: "quiz_scoreboard_start",
        payload: { hostId: data.hostId, createdAt: Date.now() },
      },
    ];
  },
};
