"use client";

import type { TFData } from "@/games/quiz-round/question-types/true-false";

type Props = {
  questionId: string;
  data: TFData;
  onChange: (data: TFData) => void;
};

export default function TrueFalseEditor({ questionId, data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={data.prompt}
        onChange={(e) => onChange({ ...data, prompt: e.target.value })}
        placeholder="Statement (true or false?)"
        rows={2}
        className="border-2 border-ink px-3 py-2 font-body text-base"
      />
      <fieldset className="flex gap-4">
        <legend className="font-body text-xs text-ink/60 mb-1">Correct answer</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`tf-${questionId}`}
            checked={data.correctValue === true}
            onChange={() => onChange({ ...data, correctValue: true })}
          />
          <span className="font-body">True</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`tf-${questionId}`}
            checked={data.correctValue === false}
            onChange={() => onChange({ ...data, correctValue: false })}
          />
          <span className="font-body">False</span>
        </label>
      </fieldset>
    </div>
  );
}
