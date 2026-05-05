"use client";

import { useState } from "react";
import type { TargetHuntState } from "@/games/target-hunt/state";
import type { SessionPlayer } from "@/lib/sessions";

type Props = {
  state: TargetHuntState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  onTag: () => Promise<{ ok: boolean; error?: string }>;
  onResolve: (claimId: string, action: "confirm" | "deny") => Promise<void>;
};

export default function TargetHuntView({ state, meId, players, labels, onTag, onResolve }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyClaim, setBusyClaim] = useState<string | null>(null);

  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }

  function nameOf(userId: string): string {
    return players.find((p) => p.user_id === userId)?.display_name ?? "Someone";
  }

  function codeOf(userId: string): string | null {
    return players.find((p) => p.user_id === userId)?.code ?? null;
  }

  const myTargetId = state.targets[meId] ?? null;
  const myPendingForMe = Object.values(state.pending).filter((c) => c.taggedId === meId);
  const myPendingByMe = Object.values(state.pending).find((c) => c.taggerId === meId);
  const myScore = state.scores[meId] ?? 0;

  async function tag() {
    setSubmitting(true);
    setError(null);
    const r = await onTag();
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Could not send tag");
  }

  async function resolve(claimId: string, action: "confirm" | "deny") {
    setBusyClaim(claimId);
    await onResolve(claimId, action);
    setBusyClaim(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pending tags claimed against me — confirm/deny */}
      {myPendingForMe.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2
            className="font-display font-semibold text-sm uppercase"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.pendingHeading}
          </h2>
          {myPendingForMe.map((claim) => (
            <div key={claim.id} className="border-2 border-ink p-4 flex flex-col gap-3 bg-yellow">
              <p className="font-body text-sm">
                <span
                  className="font-display font-bold uppercase"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {nameOf(claim.taggerId)}
                </span>{" "}
                {labels.pendingDescription}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyClaim === claim.id}
                  onClick={() => resolve(claim.id, "deny")}
                  className="flex-1 border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-ink hover:text-cream disabled:opacity-50"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {labels.deny}
                </button>
                <button
                  type="button"
                  disabled={busyClaim === claim.id}
                  onClick={() => resolve(claim.id, "confirm")}
                  className="flex-1 bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
                  style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                >
                  {labels.confirm}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My target */}
      <div>
        <p
          className="font-display font-semibold text-xs uppercase text-ink/60 mb-3"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.yourTarget}
        </p>
        {myTargetId ? (
          <div
            className="bg-pink text-cream p-6 mb-4 flex items-center justify-between"
            style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            <span
              className="font-display font-bold text-2xl uppercase truncate"
              style={{ letterSpacing: "0.05em" }}
            >
              {nameOf(myTargetId)}
            </span>
            {codeOf(myTargetId) && (
              <span
                className="font-display font-bold text-2xl tracking-widest text-yellow"
                style={{ letterSpacing: "0.15em" }}
              >
                {codeOf(myTargetId)}
              </span>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50 mb-4">
            {labels.noTarget}
          </div>
        )}

        {myTargetId && (
          <button
            type="button"
            onClick={tag}
            disabled={submitting || !!myPendingByMe}
            className="w-full bg-ink text-cream font-display font-bold uppercase px-6 py-4 transition hover:translate-y-0.5 disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            {myPendingByMe ? labels.tagSent : labels.tagButton}
          </button>
        )}
        {error && <p className="font-body text-red text-sm mt-2">{error}</p>}
      </div>

      {/* Score badge */}
      <div className="flex items-center justify-between border-2 border-ink p-3">
        <span
          className="font-display font-semibold text-xs uppercase text-ink/60"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.yourTags}
        </span>
        <span className="font-display font-bold text-2xl">{myScore}</span>
      </div>
    </div>
  );
}
