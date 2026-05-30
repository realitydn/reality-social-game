"use client";

import { useState } from "react";
import type { FreeTextData } from "@/games/quiz-round/question-types/free-text";

type Props = {
  questionId: string;
  data: FreeTextData;
  onChange: (data: FreeTextData) => void;
};

export default function FreeTextEditor({ data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateAnswer = (i: number, value: string) => {
    const acceptedAnswers = data.acceptedAnswers.map((a, idx) => (idx === i ? value : a));
    onChange({ ...data, acceptedAnswers });
  };

  const addAnswer = () => {
    onChange({ ...data, acceptedAnswers: [...data.acceptedAnswers, ""] });
  };

  const removeAnswer = (i: number) => {
    if (data.acceptedAnswers.length <= 1) return;
    onChange({
      ...data,
      acceptedAnswers: data.acceptedAnswers.filter((_, idx) => idx !== i),
    });
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
          className={`border-2 border-ink px-3 py-2 font-display font-bold uppercase text-xs ${
            uploading
              ? "opacity-50 pointer-events-none cursor-default"
              : "cursor-pointer hover:bg-yellow"
          }`}
          style={{ letterSpacing: "0.05em" }}
        >
          {uploading ? "Uploading…" : data.image ? "Replace image" : "+ Image"}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={uploading}
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
        {uploadError && <span className="font-body text-xs text-red">{uploadError}</span>}
      </div>

      <p
        className="font-display font-semibold text-xs uppercase text-ink/60 mt-1"
        style={{ letterSpacing: "0.05em" }}
      >
        Accepted answers (variants help — typos within ~2 chars are forgiven)
      </p>
      <div className="flex flex-col gap-2">
        {data.acceptedAnswers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={ans}
              onChange={(e) => updateAnswer(i, e.target.value)}
              placeholder={i === 0 ? "Primary answer" : "Variant"}
              className="border-2 border-ink px-3 py-2 font-body text-base flex-1"
            />
            {data.acceptedAnswers.length > 1 && (
              <button
                type="button"
                onClick={() => removeAnswer(i)}
                className="text-red px-2"
                aria-label={`Remove variant ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAnswer}
        className="font-display font-bold text-xs uppercase text-ink/60 hover:text-ink self-start"
        style={{ letterSpacing: "0.05em" }}
      >
        + Add variant
      </button>
    </div>
  );
}
