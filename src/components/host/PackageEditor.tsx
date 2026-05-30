"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedPackage } from "@/lib/packages";
import {
  DEFAULT_QUIZ_ROUND_CONFIG,
  type QuizRoundConfig,
  type QuizRoundQuestion,
} from "@/games/quiz-round/state";
import { AUTHORABLE_QUESTION_TYPES } from "@/games/quiz-round/question-types";
import QuestionEditor, { validateQuestion } from "./QuestionEditor";
import ConfirmModal from "@/components/ConfirmModal";

type Props = { pkg: ParsedPackage };

// A serialized snapshot of everything the author can change. We compare the
// current working snapshot against the last-saved snapshot to derive a real
// dirty flag — the old "Saved at 3:42" indicator never cleared, so it kept
// claiming the work was safe while the author kept typing.
type Snapshot = string;

function snapshotOf(
  name: string,
  config: QuizRoundConfig,
  questions: QuizRoundQuestion[],
): Snapshot {
  return JSON.stringify({ name, config, questions });
}

export default function PackageEditor({ pkg }: Props) {
  const router = useRouter();

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

  // The snapshot of what's currently persisted server-side. Starts as the
  // package we were handed; updated on every successful save.
  const [savedSnapshot, setSavedSnapshot] = useState<Snapshot>(() =>
    snapshotOf(pkg.name, initialConfig, initialQuestions),
  );

  const currentSnapshot = useMemo(
    () => snapshotOf(name, config, questions),
    [name, config, questions],
  );
  const dirty = currentSnapshot !== savedSnapshot;

  // Pending in-app navigation intercepted while dirty (see capture listener).
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    // Capture exactly what we're sending so the saved snapshot matches the
    // payload even if the author keeps typing during the request.
    const sending = snapshotOf(name, config, questions);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, config, content: { questions } }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Save failed");
        return false;
      }
      setSavedSnapshot(sending);
      setSavedAt(Date.now());
      return true;
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

  // Per-question validation warnings. Authoring drafts is fine, so this never
  // blocks Save — it just surfaces problems (e.g. an MCQ with no correct option
  // selected) that would otherwise only show up mid-quiz when the reveal has no
  // right answer.
  const questionWarnings = useMemo(
    () => questions.map((q) => validateQuestion(q)),
    [questions],
  );
  const totalWarnings = useMemo(
    () => questionWarnings.reduce((sum, w) => sum + w.length, 0),
    [questionWarnings],
  );

  // (1b) Native browser guard — warns on close / refresh / back when dirty.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy assignment kept for older browsers; the empty string is enough
      // for modern ones to show their generic "unsaved changes" prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // (1c) In-app navigation guard. The header "Preview" and "← Library" links
  // live in the parent server component (which we can't touch), so we intercept
  // their clicks at the document level: when dirty, swallow the navigation, then
  // confirm before letting the router proceed. Keep the latest dirty flag in a
  // ref so the listener doesn't need to re-bind on every keystroke.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      // Respect modified clicks (new tab / download / non-left button).
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // Only guard same-origin in-app navigations; let external/new-origin
      // links fall through to the beforeunload guard above.
      let dest: URL;
      try {
        dest = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;
      if (
        dest.pathname === window.location.pathname &&
        dest.search === window.location.search
      ) {
        return;
      }

      e.preventDefault();
      setPendingHref(dest.pathname + dest.search + dest.hash);
    };
    // Capture phase so we beat Next's <Link> click handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

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
              warnings={questionWarnings[i]}
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
        <div className="font-body text-sm min-w-0 flex flex-col gap-0.5">
          {error ? (
            <span className="text-red">{error}</span>
          ) : dirty ? (
            <span
              className="font-display font-bold text-xs uppercase text-red"
              style={{ letterSpacing: "0.05em" }}
            >
              Unsaved changes
            </span>
          ) : (
            <span
              className="font-display font-bold text-xs uppercase text-ink/60"
              style={{ letterSpacing: "0.05em" }}
            >
              Saved ✓
              {savedAt ? ` · ${new Date(savedAt).toLocaleTimeString()}` : ""}
            </span>
          )}
          {totalWarnings > 0 && (
            <span className="font-body text-xs text-red/80 truncate">
              ⚠ {totalWarnings} issue{totalWarnings === 1 ? "" : "s"} across{" "}
              {questionWarnings.filter((w) => w.length > 0).length} question
              {questionWarnings.filter((w) => w.length > 0).length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5 disabled:opacity-50 shrink-0"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>

      <ConfirmModal
        open={pendingHref !== null}
        title="Leave without saving?"
        body="You have unsaved changes. They'll be lost if you leave this page."
        confirmLabel="Leave"
        cancelLabel="Stay"
        tone="danger"
        onConfirm={confirmLeave}
        onCancel={() => setPendingHref(null)}
      />
    </div>
  );
}

function defaultDataFor(typeKey: string): unknown {
  if (typeKey === "multiple-choice") {
    return {
      prompt: "",
      options: [
        { id: crypto.randomUUID(), text: "", image: null },
        { id: crypto.randomUUID(), text: "", image: null },
        { id: crypto.randomUUID(), text: "", image: null },
        { id: crypto.randomUUID(), text: "", image: null },
      ],
      correctOptionId: "",
      image: null,
    };
  }
  if (typeKey === "true-false") {
    return { prompt: "", correctValue: true, image: null };
  }
  if (typeKey === "free-text") {
    return { prompt: "", acceptedAnswers: [""], image: null };
  }
  if (typeKey === "ordering") {
    return {
      prompt: "",
      items: [
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ],
      image: null,
    };
  }
  if (typeKey === "audio-mcq") {
    return {
      prompt: "",
      audioUrl: "",
      options: [
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ],
      correctOptionId: "",
    };
  }
  return {};
}
