"use client";

import { useMemo, useState } from "react";
import type { ParsedPackage } from "@/lib/packages";
import type { QuizRoundQuestion } from "@/games/quiz-round/state";
import { getQuestionType } from "@/games/quiz-round/question-types";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";
import type { FreeTextData } from "@/games/quiz-round/question-types/free-text";
import type { OrderingData } from "@/games/quiz-round/question-types/ordering";
import type { AudioMCQData } from "@/games/quiz-round/question-types/audio-mcq";
import { deterministicShuffle } from "@/games/quiz-round/question-types/lib/shuffle";

export default function PackagePreview({ pkg }: { pkg: ParsedPackage }) {
  const questions =
    ((pkg.content as { questions?: QuizRoundQuestion[] }).questions) ?? [];
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"question" | "revealed">("question");
  const [answer, setAnswer] = useState<unknown | null>(null);

  if (questions.length === 0) {
    return (
      <section className="flex-1 flex items-center justify-center px-6">
        <p className="font-body text-cream/70 text-center">
          No questions to preview yet.
        </p>
      </section>
    );
  }

  const q = questions[idx];
  const qt = getQuestionType(q.type);
  const isCorrect =
    qt && answer !== null ? qt.isCorrect(q.data as never, answer as never) : null;

  const reveal = () => setPhase("revealed");
  const next = () => {
    setIdx((i) => Math.min(i + 1, questions.length - 1));
    setPhase("question");
    setAnswer(null);
  };
  const restart = () => {
    setIdx(0);
    setPhase("question");
    setAnswer(null);
  };

  return (
    <section className="flex-1 flex flex-col px-6 pb-12 max-w-3xl w-full mx-auto">
      <div
        className="font-display font-semibold text-xs uppercase text-cream/60 mb-2"
        style={{ letterSpacing: "0.05em" }}
      >
        Q{idx + 1} of {questions.length} · {q.type}
      </div>

      <PreviewQuestionRenderer
        q={q}
        phase={phase}
        answer={answer}
        setAnswer={setAnswer}
      />

      {phase === "revealed" && isCorrect !== null && (
        <p
          className={`font-display font-bold text-2xl uppercase mt-4 ${
            isCorrect ? "text-yellow" : "text-red"
          }`}
          style={{ letterSpacing: "0.05em" }}
        >
          {isCorrect ? "Correct" : "Not correct"}
        </p>
      )}

      <div className="flex gap-3 mt-8">
        {phase === "question" && (
          <button
            type="button"
            onClick={reveal}
            disabled={answer === null}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-2 disabled:opacity-50"
            style={{ letterSpacing: "0.05em" }}
          >
            Reveal
          </button>
        )}
        {phase === "revealed" && idx < questions.length - 1 && (
          <button
            type="button"
            onClick={next}
            className="bg-cream text-ink font-display font-bold uppercase px-5 py-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Next →
          </button>
        )}
        {phase === "revealed" && idx === questions.length - 1 && (
          <button
            type="button"
            onClick={restart}
            className="bg-cream text-ink font-display font-bold uppercase px-5 py-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Restart
          </button>
        )}
      </div>
    </section>
  );
}

function PreviewQuestionRenderer({
  q,
  phase,
  answer,
  setAnswer,
}: {
  q: QuizRoundQuestion;
  phase: "question" | "revealed";
  answer: unknown | null;
  setAnswer: (a: unknown) => void;
}) {
  if (q.type === "multiple-choice") {
    const data = q.data as MCQData;
    const sel = (answer as { optionId?: string } | null)?.optionId ?? null;
    return (
      <div className="flex flex-col gap-4">
        {data.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.image}
            alt=""
            className="max-h-72 object-contain mx-auto"
          />
        )}
        <h2
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {data.prompt || "(no prompt)"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.options.map((opt) => {
            const selected = sel === opt.id;
            const isRight = phase === "revealed" && opt.id === data.correctOptionId;
            const isWrongPick =
              phase === "revealed" && selected && opt.id !== data.correctOptionId;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={phase === "revealed"}
                onClick={() => setAnswer({ optionId: opt.id })}
                className={`border-2 p-4 font-body text-left transition ${
                  isRight
                    ? "bg-yellow text-ink border-yellow"
                    : isWrongPick
                      ? "bg-red text-cream border-red"
                      : selected
                        ? "bg-cream text-ink border-cream"
                        : "border-cream/50 text-cream hover:bg-cream/10"
                }`}
              >
                {opt.text || "(empty option)"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "true-false") {
    const data = q.data as TFData;
    const sel = (answer as { value?: boolean } | null)?.value;
    return (
      <div className="flex flex-col gap-4">
        <h2
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {data.prompt || "(no prompt)"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((v) => {
            const selected = sel === v;
            const isRight = phase === "revealed" && data.correctValue === v;
            const isWrongPick =
              phase === "revealed" && selected && data.correctValue !== v;
            return (
              <button
                key={String(v)}
                type="button"
                disabled={phase === "revealed"}
                onClick={() => setAnswer({ value: v })}
                className={`border-2 p-6 font-display font-bold text-2xl uppercase transition ${
                  isRight
                    ? "bg-yellow text-ink border-yellow"
                    : isWrongPick
                      ? "bg-red text-cream border-red"
                      : selected
                        ? "bg-cream text-ink border-cream"
                        : "border-cream/50 text-cream hover:bg-cream/10"
                }`}
                style={{ letterSpacing: "0.05em" }}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "free-text") {
    const data = q.data as FreeTextData;
    const submitted = (answer as { text?: string } | null)?.text ?? "";
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-3xl uppercase" style={{ letterSpacing: "0.05em" }}>
          {data.prompt || "(no prompt)"}
        </h2>
        {phase === "question" ? (
          <input
            type="text"
            value={submitted}
            onChange={(e) => setAnswer({ text: e.target.value })}
            placeholder="Type your answer"
            maxLength={200}
            className="bg-cream/10 border-2 border-cream/50 px-3 py-2 font-body text-base text-cream placeholder:text-cream/40"
          />
        ) : (
          <>
            <p className="font-body text-cream/70">
              You typed: <span className="font-display font-bold text-cream">{submitted || "(nothing)"}</span>
            </p>
            <div className="border-2 border-yellow bg-yellow/10 p-4">
              <p
                className="font-display font-semibold text-xs uppercase text-cream/60 mb-1"
                style={{ letterSpacing: "0.05em" }}
              >
                Accepted answers
              </p>
              <p className="font-display font-bold text-xl uppercase text-yellow" style={{ letterSpacing: "0.05em" }}>
                {data.acceptedAnswers.filter((a) => a.trim()).join("  ·  ")}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }
  if (q.type === "ordering") {
    const data = q.data as OrderingData;
    return <OrderingPreview data={data} phase={phase} answer={answer} setAnswer={setAnswer} />;
  }
  if (q.type === "audio-mcq") {
    const data = q.data as AudioMCQData;
    const sel = (answer as { optionId?: string } | null)?.optionId ?? null;
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-3xl uppercase" style={{ letterSpacing: "0.05em" }}>
          {data.prompt || "(no prompt)"}
        </h2>
        {data.audioUrl ? (
          <audio src={data.audioUrl} controls className="w-full" preload="metadata" />
        ) : (
          <p className="font-body text-cream/40 italic">(no audio uploaded)</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.options.map((opt) => {
            const selected = sel === opt.id;
            const isRight = phase === "revealed" && opt.id === data.correctOptionId;
            const isWrongPick = phase === "revealed" && selected && opt.id !== data.correctOptionId;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={phase === "revealed"}
                onClick={() => setAnswer({ optionId: opt.id })}
                className={`border-2 p-4 font-body text-left transition ${
                  isRight
                    ? "bg-yellow text-ink border-yellow"
                    : isWrongPick
                      ? "bg-red text-cream border-red"
                      : selected
                        ? "bg-cream text-ink border-cream"
                        : "border-cream/50 text-cream hover:bg-cream/10"
                }`}
              >
                {opt.text || "(empty option)"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

function OrderingPreview({
  data,
  phase,
  answer,
  setAnswer,
}: {
  data: OrderingData;
  phase: "question" | "revealed";
  answer: unknown | null;
  setAnswer: (a: unknown) => void;
}) {
  const initial = useMemo(
    () => deterministicShuffle(data.items.map((i) => i.id), "preview"),
    [data.items],
  );
  // If the player hasn't reordered, fall back to the shuffle. The reveal
  // comparison works on this either way; setAnswer-on-render would warn.
  const order = (answer as { order?: string[] } | null)?.order ?? initial;

  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[i], next[target]] = [next[target], next[i]];
    setAnswer({ order: next });
  };

  const correctOrder = data.items.map((i) => i.id);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-3xl uppercase" style={{ letterSpacing: "0.05em" }}>
        {data.prompt || "(no prompt)"}
      </h2>
      <p className="font-body text-cream/60 text-sm italic">
        Preview uses ↑↓ buttons; players see drag-and-drop on their phones.
      </p>
      <ol className="flex flex-col gap-2">
        {order.map((id, i) => {
          const item = data.items.find((it) => it.id === id);
          if (!item) return null;
          const isCorrect = phase === "revealed" && correctOrder[i] === id;
          const cls =
            phase === "revealed"
              ? isCorrect
                ? "bg-yellow text-ink border-yellow"
                : "bg-red/20 text-cream border-red/50"
              : "border-cream/50 text-cream";
          return (
            <li key={id} className={`border-2 p-3 flex items-center gap-2 ${cls}`}>
              <span className="font-display font-bold text-lg tabular-nums w-6 text-right">
                {i + 1}.
              </span>
              <span className="font-body flex-1">{item.text}</span>
              {phase === "question" && (
                <>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-2 py-1 border-2 border-cream/50 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1}
                    className="px-2 py-1 border-2 border-cream/50 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
