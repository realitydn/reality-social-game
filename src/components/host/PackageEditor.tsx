"use client";

import { useCallback, useState } from "react";
import type { ParsedPackage } from "@/lib/packages";
import {
  DEFAULT_QUIZ_ROUND_CONFIG,
  type QuizRoundConfig,
  type QuizRoundQuestion,
} from "@/games/quiz-round/state";
import { AUTHORABLE_QUESTION_TYPES } from "@/games/quiz-round/question-types";
import QuestionEditor from "./QuestionEditor";

type Props = { pkg: ParsedPackage };

export default function PackageEditor({ pkg }: Props) {
  const initialQuestions =
    ((pkg.content as { questions?: QuizRoundQuestion[] }).questions) ?? [];
  const initialConfig: QuizRoundConfig = {
    ...DEFAULT_QUIZ_ROUND_CONFIG,
    ...(pkg.config as Partial<QuizRoundConfig>),
  };

  const [name, setName] = useState(pkg.name);
  const [config, setConfig] = useState<QuizRoundConfig>(initialConfig);
  const [questions, setQuestions] = useState<QuizRoundQuestion[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, config, content: { questions } }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Save failed");
      } else {
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }, [pkg.id, name, config, questions]);

  const addQuestion = useCallback((typeKey: string) => {
    const q: QuizRoundQuestion = {
      id: crypto.randomUUID(),
      type: typeKey,
      data: defaultDataFor(typeKey),
    };
    setQuestions((qs) => [...qs, q]);
  }, []);

  const updateQuestion = useCallback((idx: number, q: QuizRoundQuestion) => {
    setQuestions((qs) => qs.map((existing, i) => (i === idx ? q : existing)));
  }, []);

  const deleteQuestion = useCallback((idx: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this question?")) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }, []);

  const moveQuestion = useCallback((idx: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const next = [...qs];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label
          className="font-display font-semibold text-xs uppercase text-ink/60 mb-2 block"
          style={{ letterSpacing: "0.05em" }}
        >
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="border-2 border-ink px-3 py-2 font-display font-bold text-2xl uppercase w-full"
          style={{ letterSpacing: "0.05em" }}
        />
      </div>

      <details className="border-2 border-ink p-4">
        <summary
          className="font-display font-semibold text-xs uppercase text-ink/60 cursor-pointer"
          style={{ letterSpacing: "0.05em" }}
        >
          Game settings
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-ink/60">Default points / question</span>
            <input
              type="number"
              min={0}
              max={10000}
              value={config.defaultPoints}
              onChange={(e) =>
                setConfig({ ...config, defaultPoints: parseInt(e.target.value, 10) || 0 })
              }
              className="border-2 border-ink px-2 py-1 font-body"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-ink/60">
              Default timer (seconds, 0 = host-driven only)
            </span>
            <input
              type="number"
              min={0}
              max={300}
              value={config.timerSecs ?? 0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setConfig({ ...config, timerSecs: v > 0 ? v : undefined });
              }}
              className="border-2 border-ink px-2 py-1 font-body"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.speedBonus}
              onChange={(e) => setConfig({ ...config, speedBonus: e.target.checked })}
            />
            <span className="font-body text-sm">
              Speed bonus (faster correct = more points)
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.interQuestionLeaderboard}
              onChange={(e) =>
                setConfig({ ...config, interQuestionLeaderboard: e.target.checked })
              }
            />
            <span className="font-body text-sm">Show leaderboard between questions</span>
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={config.scoreMaterialization === "on_reveal"}
              onChange={(e) =>
                setConfig({
                  ...config,
                  scoreMaterialization: e.target.checked ? "on_reveal" : "on_answer",
                })
              }
            />
            <span className="font-body text-sm">
              Reveal scores at end of question (rather than instantly per answer)
            </span>
          </label>
        </div>
      </details>

      <div>
        <h2
          className="font-display font-semibold text-sm uppercase mb-4"
          style={{ letterSpacing: "0.05em" }}
        >
          Questions ({questions.length})
        </h2>
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMove={(dir) => moveQuestion(i, dir)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {AUTHORABLE_QUESTION_TYPES.map((qt) => (
            <button
              key={qt.key}
              type="button"
              onClick={() => addQuestion(qt.key)}
              className="border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-yellow"
              style={{ letterSpacing: "0.05em" }}
            >
              + {qt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-cream border-t-2 border-ink px-6 py-3 flex items-center justify-between gap-4">
        <div className="font-body text-sm text-ink/60 truncate">
          {error ? (
            <span className="text-red">{error}</span>
          ) : savedAt ? (
            `Saved at ${new Date(savedAt).toLocaleTimeString()}`
          ) : (
            "Unsaved changes"
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5 disabled:opacity-50 shrink-0"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function defaultDataFor(typeKey: string): unknown {
  if (typeKey === "multiple-choice") {
    return {
      prompt: "",
      options: [
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ],
      correctOptionId: "",
      image: null,
    };
  }
  if (typeKey === "true-false") {
    return { prompt: "", correctValue: true, image: null };
  }
  return {};
}
