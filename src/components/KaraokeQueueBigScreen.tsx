"use client";

import { useCallback, useEffect, useState } from "react";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { SessionPlayer } from "@/lib/sessions";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  gameState: KaraokeQueueState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  initial: Dashboard;
};

export default function KaraokeQueueBigScreen({ sessionId, initial }: Props) {
  const [data, setData] = useState<Dashboard>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as Dashboard);
    } catch {
      /* swallow */
    }
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useRoomNotifications(sessionId, refresh);

  const state = data.gameState;
  if (!state) return null;

  const nameOf = (id: string) =>
    data.players.find((p) => p.user_id === id)?.display_name ?? "Someone";

  if (state.ended) {
    return (
      <div className="flex-1 flex items-center justify-center px-12">
        <p
          className="font-display font-bold text-6xl uppercase text-yellow text-center"
          style={{ letterSpacing: "0.05em" }}
        >
          Karaoke
          <br />
          <span className="text-cream/70 text-3xl">Queue closed</span>
        </p>
      </div>
    );
  }

  const current = state.queue[0];
  const upcoming = state.queue.slice(1, 6);
  const recent = state.completed.slice(-4).reverse();

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-8">
      {current ? (
        <div className="flex flex-col gap-2">
          <p
            className="font-display font-semibold text-xl uppercase text-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Now up
          </p>
          <p
            className="font-display font-bold text-7xl uppercase text-cream leading-tight break-words"
            style={{ letterSpacing: "0.05em" }}
          >
            {current.songTitle}
          </p>
          <p
            className="font-display font-semibold text-3xl uppercase text-cream/70"
            style={{ letterSpacing: "0.05em" }}
          >
            {nameOf(current.playerId)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p
            className="font-display font-bold text-5xl uppercase text-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Karaoke Queue
          </p>
          <p
            className="font-display font-semibold text-2xl uppercase text-cream/70"
            style={{ letterSpacing: "0.05em" }}
          >
            Submit a song from your phone
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p
            className="font-display font-semibold text-base uppercase text-cream/60"
            style={{ letterSpacing: "0.05em" }}
          >
            Up next
          </p>
          <ol className="flex flex-col gap-1">
            {upcoming.map((r, i) => (
              <li
                key={r.id}
                className="flex items-baseline gap-3 border-b border-cream/10 py-2"
              >
                <span className="font-display font-bold text-2xl text-yellow tabular-nums w-8">
                  {i + 2}.
                </span>
                <span
                  className="font-display font-bold text-2xl text-cream uppercase truncate flex-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {r.songTitle}
                </span>
                <span className="font-body text-lg text-cream/60 truncate max-w-[40%]">
                  {nameOf(r.playerId)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recent.length > 0 && (
        <div className="flex flex-col gap-2 mt-auto">
          <p
            className="font-display font-semibold text-xs uppercase text-cream/40"
            style={{ letterSpacing: "0.05em" }}
          >
            Already performed
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {recent.map((r) => (
              <span
                key={r.id}
                className="font-body text-sm text-cream/50 truncate max-w-[28ch]"
              >
                {r.songTitle} <span className="text-cream/30">— {nameOf(r.playerId)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
