"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionPlayer } from "@/lib/sessions";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Props = {
  sessionId: string;
  initial: SessionPlayer[];
  pollMs?: number;
  variant?: "default" | "big-screen";
};

export default function AttendeeList({
  sessionId,
  initial,
  pollMs = 5000,
  variant = "default",
}: Props) {
  const [players, setPlayers] = useState<SessionPlayer[]>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/players`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as { players: SessionPlayer[] };
      setPlayers(next.players);
    } catch {
      // Network blips are fine — try again next tick.
    }
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  useRoomNotifications(sessionId, refresh);

  if (variant === "big-screen") {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 w-full">
        {players.map((p) => (
          <div
            key={p.user_id}
            className="bg-cream text-ink p-3 font-display font-semibold text-sm uppercase truncate"
            style={{ letterSpacing: "0.05em" }}
            title={p.display_name}
          >
            {p.display_name}
          </div>
        ))}
        {players.length === 0 && (
          <div className="col-span-full text-center font-body text-cream/70 py-12">
            Waiting for the first player to scan in…
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 w-full">
      {players.map((p) => (
        <li
          key={p.user_id}
          className="flex items-center justify-between border-2 border-ink px-4 py-2 font-body"
        >
          <span className="font-display font-semibold uppercase" style={{ letterSpacing: "0.05em" }}>
            {p.display_name}
          </span>
          {p.is_guest && <span className="text-xs text-ink/50">guest</span>}
        </li>
      ))}
      {players.length === 0 && (
        <li className="text-center font-body text-ink/50 py-8">Waiting for the first player.</li>
      )}
    </ul>
  );
}
