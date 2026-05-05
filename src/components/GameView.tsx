"use client";

import { useCallback, useEffect, useState } from "react";
import BingoCard from "./BingoCard";
import BingoPendingClaims from "./BingoPendingClaims";
import type { BingoState } from "@/games/bingo/state";
import type { SessionPlayer } from "@/lib/sessions";
import type { Locale } from "@/i18n/locales";

type Dashboard = {
  session: { id: string; name: string; ends_at: number | null };
  players: SessionPlayer[];
  game: { id: string; type: string; status: string } | null;
  gameState: BingoState | null;
  scores: Record<string, number>;
  me: { user_id: string; code: string | null; display_name: string | null } | null;
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  locale: Locale;
  bingoLabels: Record<string, string>;
  pollMs?: number;
  noActiveGameMessage: string;
};

export default function GameView({
  sessionId,
  initial,
  locale,
  bingoLabels,
  pollMs = 2500,
  noActiveGameMessage,
}: Props) {
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
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const handleClaim = useCallback(
    async (
      squareIdx: number,
      promptId: string,
      targetCode: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!data.game || !data.me) return { ok: false, error: "no game" };
      const res = await fetch(`/api/games/${data.game.id}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "bingo_claim", squareIdx, promptId, targetCode }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? "Failed" };
      }
      await refresh();
      return { ok: true };
    },
    [data.game, data.me, refresh],
  );

  const handleResolve = useCallback(
    async (claimId: string, action: "confirm" | "deny") => {
      if (!data.game) return;
      await fetch(`/api/games/${data.game.id}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: action === "confirm" ? "bingo_confirm" : "bingo_deny",
          claimId,
        }),
      });
      await refresh();
    },
    [data.game, refresh],
  );

  if (!data.game || !data.gameState || !data.me) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {noActiveGameMessage}
      </div>
    );
  }

  if (data.game.type === "bingo") {
    const myFilled = data.gameState.filled[data.me.user_id] ?? [];
    const myPending = Object.values(data.gameState.pending).filter(
      (c) => c.targetId === data.me!.user_id,
    );
    return (
      <div className="flex flex-col gap-6">
        <BingoPendingClaims
          pending={myPending}
          players={data.players}
          locale={locale}
          labels={bingoLabels}
          onResolve={handleResolve}
        />
        <BingoCard
          sessionId={data.session.id}
          gameId={data.game.id}
          userId={data.me.user_id}
          locale={locale}
          filled={myFilled}
          labels={bingoLabels}
          onClaim={handleClaim}
        />
      </div>
    );
  }

  return null;
}
