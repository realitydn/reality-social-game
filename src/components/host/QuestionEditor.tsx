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
  warnings: string[];
  onChange: (q: QuizRoundQuestion) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
};

// Shared icon-button styling. ≥44px hit area (the WCAG/Apple touch minimum) so
// these are actually tappable on a phone, where hosts build packages.
const ICON_BTN =
  "min-w-[44px] min-h-[44px] flex items-center justify-center border-2 text-lg leading-none disabled:opacity-30";

export default function QuestionEditor({
  question,
  index,
  total,
  warnings,
  onChange,
  onDelete,
  onMove,
}: Props) {
  const hasWarnings = warnings.length > 0;
  return (
    <div className={`border-2 p-4 ${hasWarnings ? "border-red" : "border-ink"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="font-display font-bold text-lg uppercase"
            style={{ letterSpacing: "0.05em" }}
          >
            Q{index + 1} · {labelFor(question.type)}
          </span>
          {hasWarnings && (
            <span
              className="font-display font-bold text-xs uppercase bg-red text-cream px-2 py-0.5"
              style={{ letterSpacing: "0.05em" }}
              title={warnings.join("\n")}
            >
              ⚠ {warnings.length} issue{warnings.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className={`${ICON_BTN} border-ink`}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className={`${ICON_BTN} border-ink`}
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`${ICON_BTN} border-red text-red ml-4`}
            aria-label="Delete question"
          >
            ×
          </button>
        </div>
      </div>

      {hasWarnings && (
        <ul className="mb-3 flex flex-col gap-1 font-body text-xs text-red">
          {warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}

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

export function labelFor(typeKey: string): string {
  if (typeKey === "multiple-choice") return "Multiple choice";
  if (typeKey === "true-false") return "True / false";
  if (typeKey === "free-text") return "Free text";
  if (typeKey === "ordering") return "Ordering";
  if (typeKey === "audio-mcq") return "Audio + MCQ";
  return typeKey;
}

// Author-facing content validation. Returns a list of human-readable problems
// that would otherwise only surface mid-quiz (e.g. a reveal with no correct
// answer because no option was marked). Drafts are allowed, so these are
// warnings, never hard blocks.
export function validateQuestion(q: QuizRoundQuestion): string[] {
  const warnings: string[] = [];

  if (q.type === "multiple-choice" || q.type === "audio-mcq") {
    const data = q.data as MCQData | AudioMCQData;
    if (!data.prompt?.trim()) warnings.push("Prompt is empty.");
    if (q.type === "audio-mcq" && !(data as AudioMCQData).audioUrl?.trim()) {
      warnings.push("No audio uploaded.");
    }
    const blanks = data.options.filter((o) => !o.text?.trim()).length;
    if (blanks > 0) {
      warnings.push(`${blanks} option${blanks === 1 ? " is" : "s are"} blank.`);
    }
    const hasCorrect =
      data.correctOptionId !== "" &&
      data.options.some((o) => o.id === data.correctOptionId);
    if (!hasCorrect) warnings.push("No correct option selected.");
    return warnings;
  }

  if (q.type === "true-false") {
    const data = q.data as TFData;
    if (!data.prompt?.trim()) warnings.push("Statement is empty.");
    return warnings;
  }

  if (q.type === "free-text") {
    const data = q.data as FreeTextData;
    if (!data.prompt?.trim()) warnings.push("Prompt is empty.");
    if (!data.acceptedAnswers.some((a) => a.trim())) {
      warnings.push("No accepted answer provided.");
    }
    return warnings;
  }

  if (q.type === "ordering") {
    const data = q.data as OrderingData;
    if (!data.prompt?.trim()) warnings.push("Prompt is empty.");
    const filled = data.items.filter((it) => it.text?.trim()).length;
    if (filled < 2) warnings.push("Needs at least 2 non-blank items.");
    return warnings;
  }

  return warnings;
}
