import type { QuestionType } from "../types";
import { withSpeedBonus } from "../lib/scoring";

export type AudioMCQOption = {
  id: string;
  text: string;
};

export type AudioMCQData = {
  prompt: string;
  /** R2 URL of the audio file. Played in <audio> element on player phones
   *  + on the big-screen. */
  audioUrl: string;
  options: AudioMCQOption[];
  correctOptionId: string;
};

export type AudioMCQAnswer = {
  optionId: string;
};

export const AudioMCQType: QuestionType<AudioMCQData, AudioMCQAnswer> = {
  type: "audio-mcq",
  validateAnswer(q, a) {
    if (!a || typeof a.optionId !== "string") return false;
    return q.options.some((opt) => opt.id === a.optionId);
  },
  isCorrect(q, a) {
    return a.optionId === q.correctOptionId;
  },
  scoreAnswer({ question, answer, elapsedMs, config }) {
    if (answer.optionId !== question.correctOptionId) return 0;
    return withSpeedBonus(config.basePoints, elapsedMs, config);
  },
};
