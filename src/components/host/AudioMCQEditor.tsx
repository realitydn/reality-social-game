"use client";

import { useState } from "react";
import type {
  AudioMCQData,
  AudioMCQOption,
} from "@/games/quiz-round/question-types/audio-mcq";

type Props = {
  questionId: string;
  data: AudioMCQData;
  onChange: (data: AudioMCQData) => void;
};

export default function AudioMCQEditor({ questionId, data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateOption = (i: number, patch: Partial<AudioMCQOption>) => {
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

  const uploadAudio = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "quiz-audio");
      const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(j.error ?? "Upload failed");
        return;
      }
      const j = (await res.json()) as { url: string };
      onChange({ ...data, audioUrl: j.url });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={data.prompt}
        onChange={(e) => onChange({ ...data, prompt: e.target.value })}
        placeholder="Question prompt — e.g. 'What song is this?'"
        rows={2}
        className="border-2 border-ink px-3 py-2 font-body text-base"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <label
          className={`border-2 border-ink px-3 py-2 font-display font-bold uppercase text-xs ${
            uploading
              ? "opacity-50 pointer-events-none cursor-default"
              : "cursor-pointer hover:bg-yellow"
          }`}
          style={{ letterSpacing: "0.05em" }}
        >
          {uploading ? "Uploading…" : data.audioUrl ? "Replace audio" : "+ Audio (mp3 / m4a / ogg)"}
          <input
            type="file"
            accept="audio/*"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAudio(file);
            }}
          />
        </label>
        {data.audioUrl && (
          <button
            type="button"
            onClick={() => onChange({ ...data, audioUrl: "" })}
            className="font-body text-sm text-red"
          >
            Remove
          </button>
        )}
        {uploadError && <span className="font-body text-xs text-red">{uploadError}</span>}
      </div>

      {data.audioUrl && (
        <audio src={data.audioUrl} controls className="w-full" preload="metadata" />
      )}

      <div className="flex flex-col gap-2 mt-2">
        {data.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
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
              className="border-2 border-ink px-3 py-2 font-body text-base flex-1"
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
        ))}
      </div>

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
