"use client";

import { useState } from "react";
import type { SpeedPairState } from "@/games/speed-pair/state";
import type { SessionPlayer } from "@/lib/sessions";

type Props = {
  state: SpeedPairState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  onDone: () => Promise<{ ok: boolean; error?: string }>;
};

export default function SpeedPairView({ state, meId, players, labels, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }

  function nameOf(id: string): string {
    return players.find((p) => p.user_id === id)?.display_name ?? "Someone";
  }

  function codeOf(id: string): string | null {
    return players.find((p) => p.user_id === id)?.code ?? null;
  }

  const partnerId = state.partner[meId] ?? null;
  const iAmDone = state.done[meId] === true;
  const myScore = state.scores[meId] ?? 0;

  async function tapDone() {
    setSubmitting(true);
    setError(null);
    const r = await onDone();
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not submit");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p
          className="font-display font-semibold text-xs uppercase text-ink/60 mb-3"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.yourPartner}
        </p>
        {partnerId ? (
          <>
            <div
              className="bg-teal text-ink p-6 mb-4 flex items-center justify-between"
              style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              <span
                className="font-display font-bold text-2xl uppercase truncate"
                style={{ letterSpacing: "0.05em" }}
              >
                {nameOf(partnerId)}
              </span>
              {codeOf(partnerId) && (
                <span
                  className="font-display font-bold text-2xl tracking-widest"
                  style={{ letterSpacing: "0.15em" }}
                >
                  {codeOf(partnerId)}
                </span>
              )}
            </div>
            <p className="font-body text-sm text-ink/60 italic mb-4">{labels.icebreakerHint}</p>
            <button
              type="button"
              onClick={tapDone}
              disabled={submitting || iAmDone}
              className="w-full bg-ink text-cream font-display font-bold uppercase px-6 py-4 transition hover:translate-y-0.5 disabled:opacity-50"
              style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              {iAmDone ? labels.doneSent : labels.doneButton}
            </button>
          </>
        ) : (
          <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50 mb-4">
            {labels.waiting}
          </div>
        )}
        {error && <p className="font-body text-red text-sm mt-2">{error}</p>}
      </div>

      <div className="flex items-center justify-between border-2 border-ink p-3">
        <span
          className="font-display font-semibold text-xs uppercase text-ink/60"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.yourMeetings}
        </span>
        <span className="font-display font-bold text-2xl">{myScore}</span>
      </div>
    </div>
  );
}
