"use client";

import { useState } from "react";
import type {
  MCQData,
  MCQOption,
} from "@/games/quiz-round/question-types/multiple-choice";

type Props = {
  questionId: string;
  data: MCQData;
  onChange: (data: MCQData) => void;
};

export default function MultipleChoiceEditor({ questionId, data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);
  const [optionUploadError, setOptionUploadError] = useState<string | null>(null);

  const updateOption = (i: number, patch: Partial<MCQOption>) => {
    const options = data.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onChange({ ...data, options });
  };

  const addOption = () => {
    onChange({
      ...data,
      options: [...data.options, { id: crypto.randomUUID(), text: "" }],
    });
  };

  const removeOption = (i: number) => {
    if (data.options.length <= 2) return;
    const opt = data.options[i];
    const options = data.options.filter((_, idx) => idx !== i);
    const correctOptionId = data.correctOptionId === opt.id ? "" : data.correctOptionId;
    onChange({ ...data, options, correctOptionId });
  };

  const uploadStem = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "quiz-question");
      const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(j.error ?? "Upload failed");
        return;
      }
      const j = (await res.json()) as { url: string };
      onChange({ ...data, image: j.url });
    } finally {
      setUploading(false);
    }
  };

  const uploadOptionImage = async (optionId: string, file: File) => {
    setUploadingOptionId(optionId);
    setOptionUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "quiz-question");
      const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setOptionUploadError(j.error ?? "Upload failed");
        return;
      }
      const j = (await res.json()) as { url: string };
      const i = data.options.findIndex((o) => o.id === optionId);
      if (i >= 0) updateOption(i, { image: j.url });
    } finally {
      setUploadingOptionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={data.prompt}
        onChange={(e) => onChange({ ...data, prompt: e.target.value })}
        placeholder="Question prompt"
        rows={2}
        className="border-2 border-ink px-3 py-2 font-body text-base"
      />

      <div className="flex items-center gap-3 flex-wrap">
        {data.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.image}
            alt=""
            className="h-24 w-24 object-cover border-2 border-ink"
          />
        )}
        <label
          className="border-2 border-ink px-3 py-2 font-display font-bold uppercase text-xs cursor-pointer hover:bg-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {uploading ? "Uploading…" : data.image ? "Replace image" : "+ Image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadStem(file);
            }}
          />
        </label>
        {data.image && (
          <button
            type="button"
            onClick={() => onChange({ ...data, image: null })}
            className="font-body text-sm text-red"
          >
            Remove
          </button>
        )}
        {uploadError && (
          <span className="font-body text-xs text-red">{uploadError}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {data.options.map((opt, i) => {
          const isUploadingThis = uploadingOptionId === opt.id;
          return (
            <div key={opt.id} className="border border-ink/20 p-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${questionId}`}
                  checked={data.correctOptionId === opt.id}
                  onChange={() => onChange({ ...data, correctOptionId: opt.id })}
                  className="w-5 h-5"
                  aria-label={`Mark option ${i + 1} as correct`}
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  placeholder={`Option ${i + 1}`}
                  className="border-2 border-ink px-3 py-2 font-body text-base flex-1 min-w-0"
                />
                {data.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-red px-2"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-7">
                {opt.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={opt.image}
                    alt=""
                    className="h-12 w-12 object-cover border border-ink"
                  />
                )}
                <label className="font-body text-xs cursor-pointer underline text-ink/60 hover:text-ink">
                  {isUploadingThis
                    ? "Uploading…"
                    : opt.image
                      ? "Replace image"
                      : "+ Image"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadOptionImage(opt.id, file);
                    }}
                  />
                </label>
                {opt.image && (
                  <button
                    type="button"
                    onClick={() => updateOption(i, { image: null })}
                    className="font-body text-xs text-red"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {optionUploadError && (
        <p className="font-body text-xs text-red">{optionUploadError}</p>
      )}

      <button
        type="button"
        onClick={addOption}
        disabled={data.options.length >= 8}
        className="font-display font-bold text-xs uppercase text-ink/60 hover:text-ink self-start disabled:opacity-30"
        style={{ letterSpacing: "0.05em" }}
      >
        + Add option
      </button>
    </div>
  );
}
