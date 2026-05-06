"use client";

import { useEffect, useState } from "react";
import type { QuizRoundState, QuizRoundAnswer } from "@/games/quiz-round/state";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";

type Props = {
  state: QuizRoundState;
  meId: string;
  labels: Record<string, string>;
  onAnswer: (value: unknown) => Promise<{ ok: boolean; error?: string }>;
};

export default function QuizRoundView({ state, meId, labels, onAnswer }: Props) {
  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }

  if (state.phase === "ended") {
    const myScore = state.scores[meId] ?? 0;
    return (
      <div className="flex flex-col gap-4">
        <p
          className="font-display font-bold text-2xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.gameEnded}
        </p>
        <div
          className="bg-yellow text-ink p-6 flex items-center justify-between"
          style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          <span
            className="font-display font-semibold text-xs uppercase text-ink/60"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.pointsEarned}
          </span>
          <span className="font-display font-bold text-5xl">{myScore}</span>
        </div>
      </div>
    );
  }

  if (state.phase === "lobby" || state.currentIdx === null) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.questionPending}
      </div>
    );
  }

  const idx = state.currentIdx;
  const q = state.questions[idx];
  if (!q) return null;
  const myAnswer = state.answers[idx]?.[meId];
  const reveal = state.reveals[idx];

  return (
    <div className="flex flex-col gap-4">
      <p
        className="font-display font-semibold text-xs uppercase text-ink/60"
        style={{ letterSpacing: "0.05em" }}
      >
        Q{idx + 1} / {state.questions.length}
      </p>

      {q.type === "multiple-choice" && (
        <MCQPlayerInner
          data={q.data as MCQData}
          phase={state.phase}
          myAnswer={myAnswer}
          revealedCorrectId={
            reveal ? (reveal.questionData as MCQData).correctOptionId : null
          }
          onAnswer={onAnswer}
          labels={labels}
        />
      )}
      {q.type === "true-false" && (
        <TFPlayerInner
          data={q.data as TFData}
          phase={state.phase}
          myAnswer={myAnswer}
          revealedCorrectValue={
            reveal ? (reveal.questionData as TFData).correctValue : null
          }
          onAnswer={onAnswer}
          labels={labels}
        />
      )}

      {state.phase === "question" && state.questionOpenedAt !== null && (
        <Countdown
          openedAt={state.questionOpenedAt}
          timerSecs={q.timerSecs ?? state.config.timerSecs}
        />
      )}

      {state.phase === "revealed" && reveal && (
        <div className="border-2 border-ink p-3 flex items-center justify-between">
          <span
            className="font-display font-semibold text-xs uppercase text-ink/60"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.pointsEarned}
          </span>
          <span className="font-display font-bold text-2xl">
            +{reveal.deltas[meId] ?? 0}
          </span>
        </div>
      )}
    </div>
  );
}

function MCQPlayerInner({
  data,
  phase,
  myAnswer,
  revealedCorrectId,
  onAnswer,
  labels,
}: {
  data: MCQData;
  phase: QuizRoundState["phase"];
  myAnswer: QuizRoundAnswer | undefined;
  revealedCorrectId: string | null;
  onAnswer: (value: unknown) => Promise<{ ok: boolean; error?: string }>;
  labels: Record<string, string>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myPicked = (myAnswer?.value as { optionId?: string } | undefined)?.optionId ?? null;

  const submit = async (optionId: string) => {
    if (submitting || myAnswer || phase !== "question") return;
    setSubmitting(true);
    setError(null);
    const r = await onAnswer({ optionId });
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not submit");
  };

  return (
    <div className="flex flex-col gap-3">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={data.image}
          alt=""
          className="max-h-48 object-contain mx-auto border-2 border-ink"
        />
      )}
      <h2
        className="font-display font-bold text-2xl uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {data.options.map((opt) => {
          const isMine = myPicked === opt.id;
          const isCorrect = phase === "revealed" && opt.id === revealedCorrectId;
          const isWrongPick =
            phase === "revealed" && isMine && opt.id !== revealedCorrectId;
          const cls = isCorrect
            ? "bg-yellow text-ink border-yellow"
            : isWrongPick
              ? "bg-red text-cream border-red"
              : isMine
                ? "bg-ink text-cream border-ink"
                : "border-ink hover:bg-yellow";
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!!myAnswer || phase !== "question" || submitting}
              onClick={() => submit(opt.id)}
              className={`border-2 p-4 font-body text-left transition disabled:cursor-not-allowed ${cls}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {myAnswer && phase === "question" && (
        <p className="font-body text-xs text-ink/60 italic">{labels.answerLocked}</p>
      )}
      {error && <p className="font-body text-red text-sm">{error}</p>}
    </div>
  );
}

function TFPlayerInner({
  data,
  phase,
  myAnswer,
  revealedCorrectValue,
  onAnswer,
  labels,
}: {
  data: TFData;
  phase: QuizRoundState["phase"];
  myAnswer: QuizRoundAnswer | undefined;
  revealedCorrectValue: boolean | null;
  onAnswer: (value: unknown) => Promise<{ ok: boolean; error?: string }>;
  labels: Record<string, string>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myPicked = (myAnswer?.value as { value?: boolean } | undefined)?.value;

  const submit = async (value: boolean) => {
    if (submitting || myAnswer || phase !== "question") return;
    setSubmitting(true);
    setError(null);
    const r = await onAnswer({ value });
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not submit");
  };

  return (
    <div className="flex flex-col gap-3">
      <h2
        className="font-display font-bold text-2xl uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => {
          const isMine = myPicked === v;
          const isCorrect = phase === "revealed" && revealedCorrectValue === v;
          const isWrongPick =
            phase === "revealed" && isMine && revealedCorrectValue !== v;
          const cls = isCorrect
            ? "bg-yellow text-ink border-yellow"
            : isWrongPick
              ? "bg-red text-cream border-red"
              : isMine
                ? "bg-ink text-cream border-ink"
                : "border-ink hover:bg-yellow";
          return (
            <button
              key={String(v)}
              type="button"
              disabled={!!myAnswer || phase !== "question" || submitting}
              onClick={() => submit(v)}
              className={`border-2 p-6 font-display font-bold text-2xl uppercase transition disabled:cursor-not-allowed ${cls}`}
              style={{ letterSpacing: "0.05em" }}
            >
              {v ? "True" : "False"}
            </button>
          );
        })}
      </div>
      {myAnswer && phase === "question" && (
        <p className="font-body text-xs text-ink/60 italic">{labels.answerLocked}</p>
      )}
      {error && <p className="font-body text-red text-sm">{error}</p>}
    </div>
  );
}

function Countdown({
  openedAt,
  timerSecs,
}: {
  openedAt: number;
  timerSecs?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerSecs) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timerSecs]);

  if (!timerSecs) return null;
  const elapsed = (now - openedAt) / 1000;
  const remaining = Math.max(0, timerSecs - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / timerSecs) * 100));

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-ink transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-body text-xs text-ink/60 self-end">
        {Math.ceil(remaining)}s
      </span>
    </div>
  );
}
