"use client";

import { useState } from "react";
import { findPrompt } from "@/games/bingo/prompts";
import type { BingoClaim } from "@/games/bingo/state";
import type { Locale } from "@/i18n/locales";

type Player = { user_id: string; display_name: string };

type Props = {
  pending: BingoClaim[];
  players: Player[];
  locale: Locale;
  labels: Record<string, string>;
  onResolve: (claimId: string, action: "confirm" | "deny") => Promise<void>;
};

export default function BingoPendingClaims({ pending, players, locale, labels, onResolve }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (pending.length === 0) return null;

  function nameOf(userId: string): string {
    return players.find((p) => p.user_id === userId)?.display_name ?? "Someone";
  }

  async function resolve(claimId: string, action: "confirm" | "deny") {
    setBusy(claimId);
    await onResolve(claimId, action);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <h2
        className="font-display font-semibold text-sm uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.pendingHeading}
      </h2>
      {pending.map((claim) => {
        const prompt = findPrompt(claim.promptId);
        return (
          <div key={claim.id} className="border-2 border-ink p-4 flex flex-col gap-3 bg-yellow">
            <p className="font-body text-sm">
              <span
                className="font-display font-bold uppercase"
                style={{ letterSpacing: "0.05em" }}
              >
                {nameOf(claim.claimerId)}
              </span>{" "}
              {labels.pendingDescription}
            </p>
            <p className="font-body text-base">{prompt?.text[locale] ?? claim.promptId}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === claim.id}
                onClick={() => resolve(claim.id, "deny")}
                className="flex-1 border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-ink hover:text-cream disabled:opacity-50"
                style={{ letterSpacing: "0.05em" }}
              >
                {labels.deny}
              </button>
              <button
                type="button"
                disabled={busy === claim.id}
                onClick={() => resolve(claim.id, "confirm")}
                className="flex-1 bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
                style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
              >
                {labels.confirm}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
