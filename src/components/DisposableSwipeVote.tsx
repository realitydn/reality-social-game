"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { DisposableCameraState } from "@/games/disposable-camera/state";

// Stable per-voter ordering so the deck doesn't bias by upload order and stays
// the same across refreshes (FNV-1a over voterId+photoId).
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Props = {
  state: DisposableCameraState;
  meId: string;
  labels: Record<string, string>;
  onVote: (photoIds: string[]) => Promise<{ ok: boolean; error?: string }>;
};

const SWIPE_THRESHOLD = 90; // px of drag before a release counts as a decision

export default function DisposableSwipeVote({ state, meId, labels, onVote }: Props) {
  const serverBallot = state.votes[meId] ?? [];
  const unlimited = !!state.config.unlimitedVotes;
  const cap = state.config.votesPerPlayer;

  // Liked set is seeded from the server ballot once; the deck excludes those so
  // a refresh doesn't re-show photos you've already voted for. Photos are frozen
  // during the voting phase (host can't delete then), so the deck is stable.
  const initialLiked = useRef<Set<string>>(new Set(serverBallot));
  const deck = useMemo(
    () =>
      state.photos
        .filter((p) => p.uploaderId !== meId && !initialLiked.current.has(p.id))
        .sort((a, b) => hashStr(meId + a.id) - hashStr(meId + b.id)),
    // Recompute only if the photo set size changes (it shouldn't mid-vote).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.photos.length, meId],
  );

  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>(serverBallot);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  const atCap = !unlimited && liked.length >= cap;
  const done = idx >= deck.length || atCap;
  const current = deck[idx] ?? null;

  const send = (next: string[]) => {
    setLiked(next);
    void onVote(next).then((r) => {
      if (!r.ok) setError(r.error ?? "Vote failed");
    });
  };

  const decide = (dir: "like" | "skip") => {
    if (!current) return;
    if (dir === "like" && !atCap) send([...liked, current.id]);
    setError(null);
    setDrag(0);
    startX.current = null;
    setIdx((i) => i + 1);
  };

  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (startX.current !== null) setDrag(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const dx = drag;
    if (dx > SWIPE_THRESHOLD) decide("like");
    else if (dx < -SWIPE_THRESHOLD) decide("skip");
    else {
      setDrag(0);
      startX.current = null;
    }
  };

  if (deck.length === 0 && liked.length === 0) {
    return <p className="font-body text-ink/50 italic">{labels.swipeNothing}</p>;
  }

  if (done) {
    return (
      <div className="border-2 border-green bg-green/15 px-4 py-6 text-center flex flex-col gap-1">
        <p className="font-display font-bold text-xl uppercase" style={{ letterSpacing: "0.05em" }}>
          {labels.swipeDone}
        </p>
        <p className="font-body text-sm text-ink/60">
          {labels.swipeLike}: {liked.length}
        </p>
      </div>
    );
  }

  const likeHint = drag > 40;
  const skipHint = drag < -40;

  return (
    <div className="flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-ink/50">{labels.swipeHint}</span>
        <span className="font-display font-bold text-sm tabular-nums text-ink/60">
          {idx + 1} / {deck.length}
          {!unlimited && ` · ${liked.length}/${cap}`}
        </span>
      </div>

      {error && <p className="font-body text-red text-sm">{error}</p>}

      {/* The draggable card. touch-action:none so the gesture doesn't scroll. */}
      <div className="relative aspect-square w-full overflow-hidden">
        {current && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-0 border-4 border-ink bg-ink cursor-grab active:cursor-grabbing"
            style={{
              transform: `translateX(${drag}px) rotate(${drag / 25}deg)`,
              transition: startX.current === null ? "transform 0.2s ease" : "none",
              touchAction: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt=""
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
            {likeHint && (
              <span className="absolute top-4 left-4 bg-green text-cream font-display font-bold text-2xl uppercase px-3 py-1 border-2 border-cream rotate-[-12deg]">
                {labels.swipeLike}
              </span>
            )}
            {skipHint && (
              <span className="absolute top-4 right-4 bg-red text-cream font-display font-bold text-2xl uppercase px-3 py-1 border-2 border-cream rotate-[12deg]">
                {labels.swipeSkip}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tap fallback for non-swipe / accessibility. */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => decide("skip")}
          className="flex-1 border-2 border-ink text-ink font-display font-bold uppercase px-4 py-3 transition hover:bg-ink hover:text-cream"
          style={{ letterSpacing: "0.05em" }}
        >
          ✕ {labels.swipeSkip}
        </button>
        <button
          type="button"
          onClick={() => decide("like")}
          className="flex-1 bg-ink text-cream font-display font-bold uppercase px-4 py-3 transition hover:translate-y-0.5"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          ♥ {labels.swipeLike}
        </button>
      </div>
    </div>
  );
}
