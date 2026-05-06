import { getQuestionType } from "./question-types";
import type { QuizRoundEvent, QuizRoundQuestion, QuizRoundState } from "./state";

export function reduceQuizRound(state: QuizRoundState, event: QuizRoundEvent): QuizRoundState {
  switch (event.kind) {
    case "quiz_round_start": {
      if (state.started) return state;
      return {
        ...state,
        started: true,
        hostId: event.hostId,
        questions: event.questions,
        config: event.config,
        scores: {},
        phase: "lobby",
      };
    }

    case "quiz_round_open_question": {
      if (!state.started || state.phase === "ended") return state;
      if (event.questionIdx < 0 || event.questionIdx >= state.questions.length) return state;
      return {
        ...state,
        currentIdx: event.questionIdx,
        phase: "question",
        questionOpenedAt: event.at,
      };
    }

    case "quiz_round_answer": {
      if (state.phase !== "question") return state;
      if (state.currentIdx !== event.questionIdx) return state;
      const question = state.questions[event.questionIdx];
      if (!question) return state;
      const qt = getQuestionType(question.type);
      if (!qt) return state;
      if (!qt.validateAnswer(question.data, event.value as never)) return state;

      // First answer wins — late submissions / changes are dropped silently.
      const perQuestion = state.answers[event.questionIdx] ?? {};
      if (perQuestion[event.playerId]) return state;

      const newAnswers = {
        ...state.answers,
        [event.questionIdx]: {
          ...perQuestion,
          [event.playerId]: {
            value: event.value,
            elapsedMs: event.elapsedMs,
            submittedAt: event.submittedAt,
          },
        },
      };

      if (state.config.scoreMaterialization === "on_answer") {
        const points = qt.scoreAnswer({
          question: question.data,
          answer: event.value as never,
          elapsedMs: event.elapsedMs,
          config: pluginScoringContext(state, question),
        });
        return {
          ...state,
          answers: newAnswers,
          scores: {
            ...state.scores,
            [event.playerId]: (state.scores[event.playerId] ?? 0) + points,
          },
        };
      }

      return { ...state, answers: newAnswers };
    }

    case "quiz_round_close_question": {
      if (state.currentIdx !== event.questionIdx) return state;
      if (state.phase !== "question") return state;
      const question = state.questions[event.questionIdx];
      if (!question) return state;
      const qt = getQuestionType(question.type);
      if (!qt) return state;

      const submissions = state.answers[event.questionIdx] ?? {};
      const deltas: Record<string, number> = {};
      let newScores = state.scores;
      const onReveal = state.config.scoreMaterialization === "on_reveal";

      for (const [playerId, ans] of Object.entries(submissions)) {
        const points = qt.scoreAnswer({
          question: question.data,
          answer: ans.value as never,
          elapsedMs: ans.elapsedMs,
          config: pluginScoringContext(state, question),
        });
        deltas[playerId] = points;
        if (onReveal) {
          newScores = { ...newScores, [playerId]: (newScores[playerId] ?? 0) + points };
        }
      }

      return {
        ...state,
        phase: "revealed",
        scores: newScores,
        reveals: {
          ...state.reveals,
          [event.questionIdx]: { questionData: question.data, deltas },
        },
      };
    }

    case "quiz_round_advance": {
      if (state.phase === "ended") return state;
      if (event.nextIdx < 0 || event.nextIdx >= state.questions.length) return state;
      return {
        ...state,
        currentIdx: event.nextIdx,
        phase: "question",
        questionOpenedAt: event.at,
      };
    }

    case "quiz_round_end": {
      return { ...state, phase: "ended" };
    }
  }
}

function pluginScoringContext(state: QuizRoundState, question: QuizRoundQuestion) {
  return {
    speedBonus: state.config.speedBonus,
    basePoints: question.points ?? state.config.defaultPoints,
    timerSecs: question.timerSecs ?? state.config.timerSecs,
  };
}
