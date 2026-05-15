"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { QuizRoundState, QuizRoundAnswer } from "@/games/quiz-round/state";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";
import type { FreeTextData } from "@/games/quiz-round/question-types/free-text";
import type { OrderingData } from "@/games/quiz-round/question-types/ordering";
import type { AudioMCQData } from "@/games/quiz-round/question-types/audio-mcq";
import { deterministicShuffle } from "@/games/quiz-round/question-types/lib/shuffle";

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
      {q.type === "free-text" && (
        <FreeTextPlayerInner
          data={q.data as FreeTextData}
          phase={state.phase}
          myAnswer={myAnswer}
          revealedAccepted={
            reveal ? (reveal.questionData as FreeTextData).acceptedAnswers : null
          }
          onAnswer={onAnswer}
          labels={labels}
        />
      )}
      {q.type === "ordering" && (
        <OrderingPlayerInner
          data={q.data as OrderingData}
          phase={state.phase}
          myAnswer={myAnswer}
          questionId={q.id}
          meId={meId}
          revealedItems={reveal ? (reveal.questionData as OrderingData).items : null}
          onAnswer={onAnswer}
          labels={labels}
        />
      )}
      {q.type === "audio-mcq" && (
        <AudioMCQPlayerInner
          data={q.data as AudioMCQData}
          phase={state.phase}
          myAnswer={myAnswer}
          revealedCorrectId={
            reveal ? (reveal.questionData as AudioMCQData).correctOptionId : null
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
              className={`border-2 p-4 font-body text-left transition disabled:cursor-not-allowed flex items-center gap-3 ${cls}`}
            >
              {opt.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={opt.image}
                  alt=""
                  className="h-14 w-14 object-cover border border-ink/30 shrink-0"
                />
              )}
              <span className="flex-1">{opt.text}</span>
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

function FreeTextPlayerInner({
  data,
  phase,
  myAnswer,
  revealedAccepted,
  onAnswer,
  labels,
}: {
  data: FreeTextData;
  phase: QuizRoundState["phase"];
  myAnswer: QuizRoundAnswer | undefined;
  revealedAccepted: string[] | null;
  onAnswer: (value: unknown) => Promise<{ ok: boolean; error?: string }>;
  labels: Record<string, string>;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myText = (myAnswer?.value as { text?: string } | undefined)?.text ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting || myAnswer || phase !== "question") return;
    setSubmitting(true);
    setError(null);
    const r = await onAnswer({ text: text.trim() });
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not submit");
  };

  return (
    <div className="flex flex-col gap-3">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={data.image} alt="" className="max-h-48 object-contain mx-auto border-2 border-ink" />
      )}
      <h2 className="font-display font-bold text-2xl uppercase" style={{ letterSpacing: "0.05em" }}>
        {data.prompt}
      </h2>
      {myAnswer ? (
        <div className="border-2 border-ink p-3">
          <p className="font-display font-semibold text-xs uppercase text-ink/60" style={{ letterSpacing: "0.05em" }}>
            Your answer
          </p>
          <p className="font-display font-bold text-xl uppercase" style={{ letterSpacing: "0.05em" }}>
            {myText}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={phase !== "question"}
            placeholder="Type your answer"
            maxLength={200}
            className="border-2 border-ink px-3 py-2 font-body text-base"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting || phase !== "question"}
            className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Submit
          </button>
        </form>
      )}
      {phase === "revealed" && revealedAccepted && (
        <div className="border-2 border-yellow bg-yellow/10 p-3">
          <p className="font-display font-semibold text-xs uppercase text-ink/60 mb-1" style={{ letterSpacing: "0.05em" }}>
            Accepted answers
          </p>
          <p className="font-body">{revealedAccepted.join(" / ")}</p>
        </div>
      )}
      {error && <p className="font-body text-red text-sm">{error}</p>}
      {myAnswer && phase === "question" && (
        <p className="font-body text-xs text-ink/60 italic">{labels.answerLocked}</p>
      )}
    </div>
  );
}

function OrderingPlayerInner({
  data,
  phase,
  myAnswer,
  questionId,
  meId,
  revealedItems,
  onAnswer,
  labels,
}: {
  data: OrderingData;
  phase: QuizRoundState["phase"];
  myAnswer: QuizRoundAnswer | undefined;
  questionId: string;
  meId: string;
  revealedItems: { id: string; text: string }[] | null;
  onAnswer: (value: unknown) => Promise<{ ok: boolean; error?: string }>;
  labels: Record<string, string>;
}) {
  const seedKey = useMemo(() => `${meId}-${questionId}`, [meId, questionId]);
  const initialOrder = useMemo(
    () => deterministicShuffle(data.items.map((i) => i.id), seedKey),
    [data.items, seedKey],
  );
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRectsRef = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    if (!listRef.current) return;
    const map = new Map<string, DOMRect>();
    listRef.current.querySelectorAll<HTMLElement>("[data-item-id]").forEach((el) => {
      const id = el.dataset.itemId!;
      map.set(id, el.getBoundingClientRect());
    });
    itemRectsRef.current = map;
  }, [order]);

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLLIElement>) => {
    if (myAnswer || phase !== "question") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    if (!draggingId) return;
    const y = e.clientY;
    let hoverIdx = -1;
    let i = 0;
    for (const id of order) {
      const rect = itemRectsRef.current.get(id);
      if (rect && y >= rect.top && y <= rect.bottom) {
        hoverIdx = i;
        break;
      }
      i++;
    }
    if (hoverIdx === -1) return;
    const fromIdx = order.indexOf(draggingId);
    if (fromIdx === hoverIdx) return;
    const next = [...order];
    const [item] = next.splice(fromIdx, 1);
    next.splice(hoverIdx, 0, item);
    setOrder(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraggingId(null);
  };

  const submit = async () => {
    if (submitting || myAnswer || phase !== "question") return;
    setSubmitting(true);
    setError(null);
    const r = await onAnswer({ order });
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not submit");
  };

  const correctOrder = revealedItems?.map((i) => i.id) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={data.image} alt="" className="max-h-48 object-contain mx-auto border-2 border-ink" />
      )}
      <h2 className="font-display font-bold text-2xl uppercase" style={{ letterSpacing: "0.05em" }}>
        {data.prompt}
      </h2>
      <p className="font-body text-xs text-ink/60 italic">
        Drag to rearrange. Top = first.
      </p>
      <ol ref={listRef} className="flex flex-col gap-2">
        {order.map((id, i) => {
          const item = data.items.find((it) => it.id === id);
          if (!item) return null;
          const isDragging = draggingId === id;
          const isCorrectPos = correctOrder !== null && correctOrder[i] === id;
          const cls =
            phase === "revealed"
              ? isCorrectPos
                ? "bg-yellow text-ink border-yellow"
                : "bg-red/10 text-ink border-red/30"
              : isDragging
                ? "bg-ink text-cream border-ink"
                : "border-ink hover:bg-yellow/30";
          return (
            <li
              key={id}
              data-item-id={id}
              onPointerDown={onPointerDown(id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`border-2 p-3 flex items-center gap-3 select-none ${cls} ${
                phase === "question" && !myAnswer ? "cursor-grab" : "cursor-default"
              }`}
              style={{ touchAction: "none" }}
            >
              <span className="font-display font-bold text-lg tabular-nums w-6 text-right">
                {i + 1}.
              </span>
              <span className="font-body flex-1">{item.text}</span>
              {phase === "question" && !myAnswer && (
                <span className="font-display font-bold text-xl text-ink/40">⋮⋮</span>
              )}
            </li>
          );
        })}
      </ol>
      {phase === "question" && !myAnswer && (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 disabled:opacity-50"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          Submit order
        </button>
      )}
      {myAnswer && phase === "question" && (
        <p className="font-body text-xs text-ink/60 italic">{labels.answerLocked}</p>
      )}
      {error && <p className="font-body text-red text-sm">{error}</p>}
    </div>
  );
}

function AudioMCQPlayerInner({
  data,
  phase,
  myAnswer,
  revealedCorrectId,
  onAnswer,
  labels,
}: {
  data: AudioMCQData;
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
      <h2 className="font-display font-bold text-2xl uppercase" style={{ letterSpacing: "0.05em" }}>
        {data.prompt}
      </h2>
      {data.audioUrl && (
        <audio src={data.audioUrl} controls className="w-full" preload="metadata" />
      )}
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
