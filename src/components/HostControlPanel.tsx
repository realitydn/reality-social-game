"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizRoundState, QuizRoundQuestion } from "@/games/quiz-round/state";
import type { SessionPlayer } from "@/lib/sessions";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  game: { id: string; type: string; status: string } | null;
  gameState: QuizRoundState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  gameId: string;
  initialState: QuizRoundState;
  initialPlayers: SessionPlayer[];
};

export default function HostControlPanel({
  sessionId,
  gameId,
  initialState,
  initialPlayers,
}: Props) {
  const [state, setState] = useState<QuizRoundState>(initialState);
  const [players, setPlayers] = useState<SessionPlayer[]>(initialPlayers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as Dashboard;
        if (j.gameState) setState(j.gameState);
        if (j.players) setPlayers(j.players);
      }
    } catch {
      /* swallow */
    }
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useRoomNotifications(sessionId, refresh);

  const post = useCallback(
    async (body: unknown) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/${gameId}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Action failed");
        } else {
          await refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [gameId, refresh],
  );

  const openQuestion = (idx: number) =>
    post({ kind: "quiz_round_open_question", questionIdx: idx });
  const closeQuestion = () => post({ kind: "quiz_round_close_question" });
  const endGame = () => {
    if (typeof window !== "undefined" && !window.confirm("End the quiz round?")) return;
    post({ kind: "quiz_round_end" });
  };

  const total = state.questions.length;
  const idx = state.currentIdx;
  const q = idx !== null ? state.questions[idx] ?? null : null;
  const submissions = idx !== null ? state.answers[idx] ?? {} : {};
  const reveal = idx !== null ? state.reveals[idx] : undefined;
  const isLast = idx !== null && idx === total - 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {state.phase === "ended"
            ? "Round ended"
            : `Q${idx === null ? "—" : idx + 1} / ${total}`}
        </span>
        <span
          className="font-display font-semibold text-xs uppercase text-ink/60 px-2 py-1 border-2 border-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          {state.phase}
        </span>
      </div>

      {error && <p className="font-body text-red text-sm">{error}</p>}

      {q ? (
        <div className="border-2 border-ink p-4">
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Question
          </p>
          <QuestionPreviewWithCounts
            q={q}
            submissions={submissions}
            phase={state.phase}
          />
        </div>
      ) : state.phase === "lobby" && total === 0 ? (
        <p className="font-body text-ink/60 italic">
          This package has no questions. Add some in the host editor.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {state.phase === "lobby" && total > 0 && (
          <button
            type="button"
            onClick={() => openQuestion(0)}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Start question 1 →
          </button>
        )}
        {state.phase === "question" && (
          <button
            type="button"
            onClick={closeQuestion}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Reveal answer ↓
          </button>
        )}
        {state.phase === "revealed" && !isLast && idx !== null && (
          <button
            type="button"
            onClick={() => openQuestion(idx + 1)}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Next question →
          </button>
        )}
        {state.phase === "revealed" && isLast && (
          <button
            type="button"
            onClick={endGame}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Finish round
          </button>
        )}
        {state.phase !== "ended" && state.phase !== "lobby" && (
          <button
            type="button"
            onClick={endGame}
            disabled={busy}
            className="border-2 border-red text-red font-display font-bold uppercase px-5 py-3"
            style={{ letterSpacing: "0.05em" }}
          >
            End early
          </button>
        )}
      </div>

      {idx !== null && (
        <div>
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Answered ({Object.keys(submissions).length} / {players.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {players.map((p) => {
              const has = !!submissions[p.user_id];
              return (
                <span
                  key={p.user_id}
                  className={`text-xs px-2 py-1 border ${
                    has
                      ? "bg-yellow text-ink border-yellow"
                      : "bg-ink/5 text-ink/40 border-ink/10"
                  }`}
                >
                  {p.display_name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {reveal && (
        <div>
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Points awarded
          </p>
          <div className="flex flex-col gap-1">
            {Object.entries(reveal.deltas)
              .sort((a, b) => b[1] - a[1])
              .filter(([, v]) => v > 0)
              .slice(0, 10)
              .map(([uid, v]) => {
                const p = players.find((x) => x.user_id === uid);
                return (
                  <div key={uid} className="flex justify-between font-body text-sm">
                    <span>{p?.display_name ?? "Unknown"}</span>
                    <span className="font-display font-bold">+{v}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPreviewWithCounts({
  q,
  submissions,
  phase,
}: {
  q: QuizRoundQuestion;
  submissions: Record<string, { value: unknown }>;
  phase: QuizRoundState["phase"];
}) {
  const showCorrect = phase === "revealed";
  if (q.type === "multiple-choice") {
    const data = q.data as MCQData;
    const counts: Record<string, number> = {};
    for (const a of Object.values(submissions)) {
      const optId = (a.value as { optionId?: string }).optionId;
      if (optId) counts[optId] = (counts[optId] ?? 0) + 1;
    }
    return (
      <div className="flex flex-col gap-2">
        {data.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.image}
            alt=""
            className="max-h-32 object-contain self-start border border-ink"
          />
        )}
        <p
          className="font-display font-bold text-xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {data.prompt}
        </p>
        <div className="flex flex-col gap-1">
          {data.options.map((opt) => {
            const isCorrect = showCorrect && opt.id === data.correctOptionId;
            const count = counts[opt.id] ?? 0;
            return (
              <div
                key={opt.id}
                className={`flex items-center justify-between p-2 border-2 ${
                  isCorrect ? "bg-yellow border-yellow" : "border-ink/20"
                }`}
              >
                <span className="font-body">
                  {isCorrect && <span className="font-display font-bold mr-2">✓</span>}
                  {opt.text}
                </span>
                <span className="font-display font-bold tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "true-false") {
    const data = q.data as TFData;
    let trueCount = 0;
    let falseCount = 0;
    for (const a of Object.values(submissions)) {
      const v = (a.value as { value?: boolean }).value;
      if (v === true) trueCount++;
      else if (v === false) falseCount++;
    }
    return (
      <div className="flex flex-col gap-2">
        <p
          className="font-display font-bold text-xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {data.prompt}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`flex items-center justify-between p-2 border-2 ${
              showCorrect && data.correctValue === true
                ? "bg-yellow border-yellow"
                : "border-ink/20"
            }`}
          >
            <span className="font-display font-bold">
              {showCorrect && data.correctValue === true ? "✓ True" : "True"}
            </span>
            <span className="font-display font-bold tabular-nums">{trueCount}</span>
          </div>
          <div
            className={`flex items-center justify-between p-2 border-2 ${
              showCorrect && data.correctValue === false
                ? "bg-yellow border-yellow"
                : "border-ink/20"
            }`}
          >
            <span className="font-display font-bold">
              {showCorrect && data.correctValue === false ? "✓ False" : "False"}
            </span>
            <span className="font-display font-bold tabular-nums">{falseCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
