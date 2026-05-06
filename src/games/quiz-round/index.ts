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
