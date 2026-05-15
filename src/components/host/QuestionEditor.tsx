"use client";

import type { QuizRoundQuestion } from "@/games/quiz-round/state";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import TrueFalseEditor from "./TrueFalseEditor";
import FreeTextEditor from "./FreeTextEditor";
import OrderingEditor from "./OrderingEditor";
import AudioMCQEditor from "./AudioMCQEditor";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";
import type { FreeTextData } from "@/games/quiz-round/question-types/free-text";
import type { OrderingData } from "@/games/quiz-round/question-types/ordering";
import type { AudioMCQData } from "@/games/quiz-round/question-types/audio-mcq";

type Props = {
  question: QuizRoundQuestion;
  index: number;
  total: number;
  onChange: (q: QuizRoundQuestion) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
};

export default function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: Props) {
  return (
    <div className="border-2 border-ink p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-display font-bold text-lg uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          Q{index + 1} · {labelFor(question.type)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="px-2 py-1 border-2 border-ink disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="px-2 py-1 border-2 border-ink disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-2 py-1 border-2 border-red text-red ml-2"
            aria-label="Delete"
          >
            ×
          </button>
        </div>
      </div>

      {question.type === "multiple-choice" && (
        <MultipleChoiceEditor
          questionId={question.id}
          data={question.data as MCQData}
          onChange={(d) => onChange({ ...question, data: d })}
        />
      )}
      {question.type === "true-false" && (
        <TrueFalseEditor
          questionId={question.id}
          data={question.data as TFData}
          onChange={(d) => onChange({ ...question, data: d })}
        />
      )}
      {question.type === "free-text" && (
        <FreeTextEditor
          questionId={question.id}
          data={question.data as FreeTextData}
          onChange={(d) => onChange({ ...question, data: d })}
        />
      )}
      {question.type === "ordering" && (
        <OrderingEditor
          questionId={question.id}
          data={question.data as OrderingData}
          onChange={(d) => onChange({ ...question, data: d })}
        />
      )}
      {question.type === "audio-mcq" && (
        <AudioMCQEditor
          questionId={question.id}
          data={question.data as AudioMCQData}
          onChange={(d) => onChange({ ...question, data: d })}
        />
      )}

      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-ink/20">
        <label className="flex items-center gap-2 font-body text-xs text-ink/60">
          Points override:
          <input
            type="number"
            min={0}
            max={10000}
            value={question.points ?? ""}
            placeholder="default"
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
              onChange({ ...question, points: v });
            }}
            className="border border-ink px-2 py-0.5 w-24 font-body text-sm"
          />
        </label>
        <label className="flex items-center gap-2 font-body text-xs text-ink/60">
          Timer override (s):
          <input
            type="number"
            min={0}
            max={300}
            value={question.timerSecs ?? ""}
            placeholder="default"
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
              onChange({ ...question, timerSecs: v });
            }}
            className="border border-ink px-2 py-0.5 w-24 font-body text-sm"
          />
        </label>
      </div>
    </div>
  );
}

function labelFor(typeKey: string): string {
  if (typeKey === "multiple-choice") return "Multiple choice";
  if (typeKey === "true-false") return "True / false";
  if (typeKey === "free-text") return "Free text";
  if (typeKey === "ordering") return "Ordering";
  if (typeKey === "audio-mcq") return "Audio + MCQ";
  return typeKey;
}
