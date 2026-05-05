"use client";

import { useEffect, useState } from "react";
import type { SessionPlayer } from "@/lib/sessions";

type Dashboard = {
  game: { id: string; type: string; status: string } | null;
  players: SessionPlayer[];
  scores: Record<string, number>;
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  pollMs?: number;
  topN?: number;
};

// Static class list so Tailwind keeps these in the bundle.
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

export default function Leaderboard({ sessionId, initial, pollMs = 2500, topN = 5 }: Props) {
  const [data, setData] = useState<Dashboard>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Dashboard;
        if (!cancelled) setData(next);
      } catch {
        /* swallow */
      }
    };
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, pollMs]);

  if (!data.game) return null;

  const ranked = data.players
    .map((p) => ({ player: p, score: data.scores[p.user_id] ?? 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  if (ranked.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p
        className="font-display font-semibold text-xs uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        Leaderboard
      </p>
      {ranked.map((r, i) => (
        <div
          key={r.player.user_id}
          className={`flex items-center justify-between p-3 ${SWATCH_BG[i % SWATCH_BG.length]} text-ink`}
        >
          <span
            className="font-display font-bold text-2xl uppercase truncate"
            style={{ letterSpacing: "0.05em" }}
          >
            {i + 1}. {r.player.display_name}
          </span>
          <span className="font-display font-bold text-2xl">{r.score}</span>
        </div>
      ))}
    </div>
  );
}
