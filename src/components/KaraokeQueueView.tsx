"use client";

import { useEffect, useState } from "react";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { SessionPlayer } from "@/lib/sessions";

type Props = {
  state: KaraokeQueueState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  onSubmit: (songTitle: string) => Promise<{ ok: boolean; error?: string }>;
};

export default function KaraokeQueueView({
  state,
  meId,
  players,
  labels,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myRequest = state.queue.find((r) => r.playerId === meId);
  const myPosition = myRequest
    ? state.queue.findIndex((r) => r.playerId === meId) + 1
    : null;
  const imNext = myPosition !== null && myPosition <= 2;

  // Once the request lands in shared state the card replaces the form, so the
  // optimistic "Added ✓" flag has served its purpose — clear it. A timeout is a
  // safety net in case the new state never arrives (so the button can't stay
  // stuck on "Added ✓").
  useEffect(() => {
    if (!justAdded) return;
    if (myRequest) {
      setJustAdded(false);
      return;
    }
    const t = setTimeout(() => setJustAdded(false), 4000);
    return () => clearTimeout(t);
  }, [justAdded, myRequest]);

  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }
  if (state.ended) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.queueClosed}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting || justAdded) return;
    setSubmitting(true);
    setError(null);
    const r = await onSubmit(title.trim());
    setSubmitting(false);
    if (!r.ok) {
      // Map the common "already in queue" server reason to the localized label
      // instead of leaking raw English error text.
      const reason = r.error ?? "";
      setError(
        /already have a request/i.test(reason)
          ? labels.alreadyQueued
          : reason || labels.alreadyQueued,
      );
    } else {
      // Optimistic confirmation: clear the input and hold a disabled "Added ✓"
      // button until the new shared state (the request card) arrives.
      setTitle("");
      setJustAdded(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {myRequest ? (
        <div
          className={`${imNext ? "bg-yellow" : "bg-teal"} text-ink p-6`}
          style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-1"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.yourRequest}
          </p>
          <p
            className="font-display font-bold text-2xl uppercase break-words"
            style={{ letterSpacing: "0.05em" }}
          >
            {myRequest.songTitle}
          </p>
          {imNext && (
            <p
              className="font-display font-bold text-base uppercase mt-2"
              style={{ letterSpacing: "0.05em" }}
            >
              {labels.youreNext}
            </p>
          )}
          <p className="font-body text-sm mt-3">
            {labels.queuePosition}:{" "}
            <span className="font-display font-bold text-lg">{myPosition}</span>
            {" / "}
            {state.queue.length}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label
            className="font-display font-semibold text-xs uppercase text-ink/60"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.submitButton}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={labels.submitPlaceholder}
            maxLength={200}
            className="border-2 border-ink px-3 py-2 font-body text-base"
          />
          <button
            type="submit"
            disabled={(!title.trim() && !justAdded) || submitting || justAdded}
            className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 disabled:opacity-50 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            {justAdded
              ? labels.addedConfirm
              : submitting
                ? labels.adding
                : labels.submitButton}
          </button>
          {error && <p className="font-body text-red text-sm">{error}</p>}
        </form>
      )}

      {state.queue.length > 0 ? (
        <div>
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.upNext}
          </p>
          <ol className="flex flex-col gap-1">
            {state.queue.slice(0, 8).map((r, i) => {
              const player = players.find((p) => p.user_id === r.playerId);
              const isMine = r.playerId === meId;
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-2 p-2 ${
                    isMine ? "bg-yellow text-ink" : "border border-ink/20"
                  }`}
                >
                  <span className="font-display font-bold tabular-nums w-6 text-right">
                    {i + 1}.
                  </span>
                  <span className="font-body truncate flex-1">{r.songTitle}</span>
                  <span className="font-body text-xs text-ink/60 truncate max-w-[40%]">
                    {player?.display_name ?? labels.someone}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="font-body text-sm text-ink/50 italic">{labels.queueEmpty}</p>
      )}

      {state.completed.length > 0 && (
        <details className="border border-ink/20 p-3">
          <summary
            className="font-display font-semibold text-xs uppercase text-ink/60 cursor-pointer"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.completed} ({state.completed.length})
          </summary>
          <ul className="flex flex-col gap-1 mt-2">
            {state.completed.slice(-10).reverse().map((r) => {
              const player = players.find((p) => p.user_id === r.playerId);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-2 font-body text-xs text-ink/60"
                >
                  <span className="truncate flex-1">{r.songTitle}</span>
                  <span className="truncate max-w-[40%]">
                    {player?.display_name ?? labels.someone}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
