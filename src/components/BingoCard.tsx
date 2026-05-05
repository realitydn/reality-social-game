"use client";

import { useState } from "react";
import { generateCard, hasBingo } from "@/games/bingo/card";
import type { Locale } from "@/i18n/locales";

type Props = {
  sessionId: string;
  gameId: string;
  userId: string;
  locale: Locale;
  filled: number[];
  labels: Record<string, string>;
  onClaim: (
    squareIdx: number,
    promptId: string,
    targetCode: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

// Static map so Tailwind sees the classes at build time.
const SWATCH_BG = [
  "bg-yellow",
  "bg-amber",
  "bg-red",
  "bg-pink",
  "bg-purple",
  "bg-blue",
  "bg-teal",
  "bg-green",
];

export default function BingoCard({
  sessionId,
  gameId,
  userId,
  locale,
  filled,
  labels,
  onClaim,
}: Props) {
  const card = generateCard(sessionId, gameId, userId);
  const filledSet = new Set(filled);
  const isBingo = hasBingo(filledSet);
  const [activeSquare, setActiveSquare] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(idx: number) {
    if (filledSet.has(idx)) return;
    setActiveSquare(idx);
    setCode("");
    setError(null);
  }

  function close() {
    setActiveSquare(null);
    setCode("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSquare === null || code.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    const result = await onClaim(activeSquare, card[activeSquare].id, code.trim().toUpperCase());
    setSubmitting(false);
    if (result.ok) close();
    else setError(result.error ?? "Could not send claim");
  }

  return (
    <>
      {isBingo && (
        <div
          className="bg-yellow text-ink font-display font-bold text-3xl uppercase text-center py-4 mb-4"
          style={{ letterSpacing: "0.1em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          {labels.bingoBanner}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {card.map((prompt, idx) => {
          const isFilled = filledSet.has(idx);
          const swatch = SWATCH_BG[idx % SWATCH_BG.length];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => open(idx)}
              disabled={isFilled}
              className={`aspect-square p-2 text-left text-xs font-body border-2 border-ink transition ${
                isFilled ? `${swatch} cursor-default` : "bg-cream hover:bg-yellow"
              }`}
            >
              <span className="line-clamp-4">{prompt.text[locale]}</span>
            </button>
          );
        })}
      </div>

      {activeSquare !== null && (
        <div
          className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50"
          onClick={close}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-cream border-2 border-ink p-6 max-w-sm w-full flex flex-col gap-4"
            style={{ boxShadow: "0 12px 3px rgba(13, 9, 5, 0.18)" }}
          >
            <p
              className="font-display font-semibold text-xs uppercase text-ink/60"
              style={{ letterSpacing: "0.05em" }}
            >
              {labels.claimSquare}
            </p>
            <p className="font-body text-base">{card[activeSquare].text[locale]}</p>
            <div>
              <label
                htmlFor="targetCode"
                className="font-display font-semibold text-xs uppercase block mb-2"
                style={{ letterSpacing: "0.05em" }}
              >
                {labels.targetCodePrompt}
              </label>
              <input
                id="targetCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={labels.targetCodePlaceholder}
                maxLength={4}
                autoFocus
                required
                className="w-full border-2 border-ink bg-cream px-3 py-2 font-display font-bold text-2xl tracking-widest text-center focus:outline-none focus:bg-yellow uppercase"
              />
            </div>
            {error && <p className="font-body text-red text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-ink hover:text-cream"
                style={{ letterSpacing: "0.05em" }}
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting || code.length === 0}
                className="flex-1 bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
                style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
              >
                {labels.submitClaim}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
