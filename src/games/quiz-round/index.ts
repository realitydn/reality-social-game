import type { GameType, GameValidation } from "@/games/types";
import type { Locale } from "@/i18n/locales";
import { reduceQuizRound } from "./reducer";
import {
  EMPTY_QUIZ_ROUND_STATE,
  type QuizRoundConfig,
  type QuizRoundEvent,
  type QuizRoundQuestion,
  type QuizRoundState,
} from "./state";

const QR_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Quiz Round",
    waitingToStart: "Waiting for the host to start.",
    questionPending: "Get ready…",
    answerLocked: "Answer locked in.",
    waitingForReveal: "Waiting for the reveal…",
    revealHeading: "Reveal",
    correctMark: "Correct",
    incorrectMark: "Not this time",
    pointsEarned: "Points",
    waitingForHost: "Waiting for the host…",
    gameEnded: "Quiz round ended.",
    // Player inputs
    typeYourAnswer: "Type your answer",
    submit: "Submit",
    yourAnswer: "Your answer",
    submitOrder: "Submit order",
    orderingHint: "Use the arrows or drag. Top = first.",
    moveUp: "Move up",
    moveDown: "Move down",
    acceptedAnswers: "Accepted answers",
    trueLabel: "True",
    falseLabel: "False",
    // Big-screen chrome
    getReady: "Get ready",
    roundComplete: "Round complete",
    answered: "answered",
    leaderboard: "Leaderboard",
    answerOnPhone: "Type your answer on your phone",
    orderOnPhone: "Drag to order on your phone",
    correctOrder: "Correct order:",
    nowPlaying: "Playing…",
    tapPlay: "Tap play",
    // Teams
    teamsHeading: "Join a team",
    joinTeam: "Join a team",
    createTeam: "Create a team",
    teamNamePlaceholder: "Team name",
    yourTeam: "Your team",
    create: "Create",
    join: "Join",
    teamRank: "Rank",
    teamLeaderboard: "Team standings",
  },
  vi: {
    title: "Vòng Đố Vui",
    waitingToStart: "Chờ chủ phòng bắt đầu.",
    questionPending: "Sẵn sàng…",
    answerLocked: "Đã chốt câu trả lời.",
    waitingForReveal: "Chờ đáp án…",
    revealHeading: "Đáp án",
    correctMark: "Chính xác",
    incorrectMark: "Chưa đúng",
    pointsEarned: "Điểm",
    waitingForHost: "Đang chờ chủ phòng…",
    gameEnded: "Vòng đố vui đã kết thúc.",
    // Player inputs
    typeYourAnswer: "Nhập câu trả lời",
    submit: "Gửi",
    yourAnswer: "Câu trả lời của bạn",
    submitOrder: "Gửi thứ tự",
    orderingHint: "Dùng mũi tên hoặc kéo. Trên cùng = đầu tiên.",
    moveUp: "Lên",
    moveDown: "Xuống",
    acceptedAnswers: "Đáp án được chấp nhận",
    trueLabel: "Đúng",
    falseLabel: "Sai",
    // Big-screen chrome
    getReady: "Sẵn sàng",
    roundComplete: "Hoàn thành vòng",
    answered: "đã trả lời",
    leaderboard: "Bảng xếp hạng",
    answerOnPhone: "Nhập câu trả lời trên điện thoại",
    orderOnPhone: "Sắp xếp trên điện thoại",
    correctOrder: "Thứ tự đúng:",
    nowPlaying: "Đang phát…",
    tapPlay: "Nhấn phát",
    // Teams
    teamsHeading: "Tham gia đội",
    joinTeam: "Tham gia đội",
    createTeam: "Tạo đội",
    teamNamePlaceholder: "Tên đội",
    yourTeam: "Đội của bạn",
    create: "Tạo",
    join: "Tham gia",
    teamRank: "Hạng",
    teamLeaderboard: "Xếp hạng đội",
  },
  ru: {
    title: "Викторина",
    waitingToStart: "Ожидаем начала.",
    questionPending: "Приготовьтесь…",
    answerLocked: "Ответ зафиксирован.",
    waitingForReveal: "Ждём ответа…",
    revealHeading: "Ответ",
    correctMark: "Верно",
    incorrectMark: "Не в этот раз",
    pointsEarned: "Очки",
    waitingForHost: "Ждём ведущего…",
    gameEnded: "Викторина окончена.",
    // Player inputs
    typeYourAnswer: "Введите ответ",
    submit: "Отправить",
    yourAnswer: "Ваш ответ",
    submitOrder: "Отправить порядок",
    orderingHint: "Стрелки или перетаскивание. Сверху = первый.",
    moveUp: "Вверх",
    moveDown: "Вниз",
    acceptedAnswers: "Принятые ответы",
    trueLabel: "Верно",
    falseLabel: "Неверно",
    // Big-screen chrome
    getReady: "Приготовьтесь",
    roundComplete: "Раунд завершён",
    answered: "ответили",
    leaderboard: "Таблица лидеров",
    answerOnPhone: "Введите ответ на телефоне",
    orderOnPhone: "Упорядочите на телефоне",
    correctOrder: "Правильный порядок:",
    nowPlaying: "Играет…",
    tapPlay: "Нажмите play",
    // Teams
    teamsHeading: "Вступить в команду",
    joinTeam: "Вступить в команду",
    createTeam: "Создать команду",
    teamNamePlaceholder: "Название команды",
    yourTeam: "Ваша команда",
    create: "Создать",
    join: "Вступить",
    teamRank: "Место",
    teamLeaderboard: "Зачёт команд",
  },
  uk: {
    title: "Вікторина",
    waitingToStart: "Чекаємо на початок.",
    questionPending: "Приготуйтесь…",
    answerLocked: "Відповідь зафіксовано.",
    waitingForReveal: "Чекаємо на відповідь…",
    revealHeading: "Відповідь",
    correctMark: "Правильно",
    incorrectMark: "Не цього разу",
    pointsEarned: "Очки",
    waitingForHost: "Чекаємо на ведучого…",
    gameEnded: "Вікторину завершено.",
    // Player inputs
    typeYourAnswer: "Введіть відповідь",
    submit: "Надіслати",
    yourAnswer: "Ваша відповідь",
    submitOrder: "Надіслати порядок",
    orderingHint: "Стрілки або перетягування. Згори = перший.",
    moveUp: "Вгору",
    moveDown: "Вниз",
    acceptedAnswers: "Прийняті відповіді",
    trueLabel: "Правильно",
    falseLabel: "Неправильно",
    // Big-screen chrome
    getReady: "Приготуйтесь",
    roundComplete: "Раунд завершено",
    answered: "відповіли",
    leaderboard: "Таблиця лідерів",
    answerOnPhone: "Введіть відповідь на телефоні",
    orderOnPhone: "Упорядкуйте на телефоні",
    correctOrder: "Правильний порядок:",
    nowPlaying: "Грає…",
    tapPlay: "Натисніть play",
    // Teams
    teamsHeading: "Приєднатися до команди",
    joinTeam: "Приєднатися до команди",
    createTeam: "Створити команду",
    teamNamePlaceholder: "Назва команди",
    yourTeam: "Ваша команда",
    create: "Створити",
    join: "Приєднатися",
    teamRank: "Місце",
    teamLeaderboard: "Залік команд",
  },
};

// Seed shape passed to startGame's `seedData` for quiz-round games. The admin
// server action loads the package from D1 (it has the package id in
// games.config) and constructs this object before invoking startGame.
export type QuizRoundSeed = {
  hostId: string;
  questions: QuizRoundQuestion[];
  config: QuizRoundConfig;
};

export const QuizRoundGame: GameType<QuizRoundState, QuizRoundEvent> = {
  type: "quiz-round",

  init() {
    return EMPTY_QUIZ_ROUND_STATE;
  },

  reduce(state, event) {
    return reduceQuizRound(state, event);
  },

  validate(state, event, actorId): GameValidation {
    switch (event.kind) {
      case "quiz_round_start":
        // Seed event — emitted via onStart, not user-initiated.
        return { ok: true };

      case "quiz_round_open_question":
      case "quiz_round_close_question":
      case "quiz_round_advance":
      case "quiz_round_end":
        if (!state.started) return { ok: false, reason: "not started" };
        if (state.hostId && state.hostId !== actorId)
          return { ok: false, reason: "host-only event" };
        return { ok: true };

      case "quiz_round_answer": {
        if (state.phase !== "question") return { ok: false, reason: "no question open" };
        if (state.currentIdx !== event.questionIdx)
          return { ok: false, reason: "answering wrong question" };
        if (event.playerId !== actorId) return { ok: false, reason: "actor mismatch" };
        const existing = state.answers[event.questionIdx]?.[event.playerId];
        if (existing) return { ok: false, reason: "already answered" };
        return { ok: true };
      }

      case "quiz_create_team": {
        if (!state.config.teamsEnabled) return { ok: false, reason: "teams not enabled" };
        if (!state.started || state.phase === "ended") return { ok: false, reason: "not active" };
        if (event.createdBy !== actorId) return { ok: false, reason: "actor mismatch" };
        if (!event.name?.trim()) return { ok: false, reason: "team name required" };
        return { ok: true };
      }

      case "quiz_join_team": {
        if (!state.config.teamsEnabled) return { ok: false, reason: "teams not enabled" };
        if (!state.started || state.phase === "ended") return { ok: false, reason: "not active" };
        if (event.playerId !== actorId) return { ok: false, reason: "actor mismatch" };
        return { ok: true };
      }
    }
  },

  score(state) {
    return { ...state.scores };
  },

  prompts(locale) {
    return QR_LABELS[locale] ?? QR_LABELS.en;
  },

  // Seed events come from the seedData arg passed through startGame — see
  // src/lib/games.ts. The admin layer resolves the package before invoking.
  onStart(_ctx, _players, seedData) {
    const data = seedData as QuizRoundSeed | undefined;
    if (!data) return [];
    return [
      {
        kind: "quiz_round_start",
        payload: {
          hostId: data.hostId,
          questions: data.questions,
          config: data.config,
          createdAt: Date.now(),
        },
      },
    ];
  },
};
