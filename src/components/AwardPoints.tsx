"use client";

import { useState } from "react";
import type { SessionPlayer } from "@/lib/sessions";

type Props = {
  sessionId: string;
  players: SessionPlayer[];
  reason: string; // 'quiz_winner' | 'karaoke_dare' | ...
  title: string;
  defaultPoints?: number;
};

// Host control to grant bonus points to a player (Sam's quiz winners, karaoke
// dares). Writes to the score ledger via /api/sessions/[id]/award. Staff-facing,
// so English to match the other host controls.
export default function AwardPoints({ sessionId, players, reason, title, defaultPoints = 5 }: Props) {
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(defaultPoints);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function award() {
    if (!userId || !points) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/award`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, points, reason }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not award points");
      }
      const name = players.find((p) => p.user_id === userId)?.display_name ?? "player";
      setMsg(`✓ ${points > 0 ? "+" : ""}${points} to ${name}`);
      setUserId("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not award points");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-ink p-4 flex flex-col gap-3">
      <p
        className="font-display font-semibold text-xs uppercase text-ink/60"
        style={{ letterSpacing: "0.05em" }}
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-2 items-stretch">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border-2 border-ink bg-cream px-2 py-2 font-body text-sm flex-1 min-w-[8rem]"
        >
          <option value="">Pick a player…</option>
          {players.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value || "0", 10) || 0)}
          className="border-2 border-ink bg-cream px-2 py-2 w-20 font-display font-bold text-center"
          aria-label="Points"
        />
        <button
          type="button"
          onClick={award}
          disabled={busy || !userId || !points}
          className="bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
          style={{ letterSpacing: "0.05em" }}
        >
          {busy ? "…" : "Award"}
        </button>
      </div>
      {msg && <p className="font-body text-xs text-ink/70">{msg}</p>}
    </div>
  );
}
