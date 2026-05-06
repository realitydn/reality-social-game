"use client";

import { useCallback, useEffect, useState } from "react";
import BingoCard from "./BingoCard";
import BingoPendingClaims from "./BingoPendingClaims";
import TargetHuntView from "./TargetHuntView";
import SpeedPairView from "./SpeedPairView";
import QuizRoundView from "./QuizRoundView";
import type { BingoState } from "@/games/bingo/state";
import type { TargetHuntState } from "@/games/target-hunt/state";
import type { SpeedPairState } from "@/games/speed-pair/state";
import type { QuizRoundState } from "@/games/quiz-round/state";
import type { SessionPlayer } from "@/lib/sessions";
import type { Locale } from "@/i18n/locales";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type AnyGameState = BingoState | TargetHuntState | SpeedPairState | QuizRoundState;

type Dashboard = {
  session: { id: string; name: string; ends_at: number | null };
  players: SessionPlayer[];
  game: { id: string; type: string; status: string } | null;
  gameState: AnyGameState | null;
  scores: Record<string, number>;
  me: { user_id: string; code: string | null; display_name: string | null } | null;
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  locale: Locale;
  bingoLabels: Record<string, string>;
  targetHuntLabels: Record<string, string>;
  speedPairLabels: Record<string, string>;
  quizRoundLabels: Record<string, string>;
  pollMs?: number;
  noActiveGameMessage: string;
};

export default function GameView({
  sessionId,
  initial,
  locale,
  bingoLabels,
  targetHuntLabels,
  speedPairLabels,
  quizRoundLabels,
  pollMs = 5000,
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

  useRoomNotifications(sessionId, refresh);

  const postEvent = useCallback(
    async (body: unknown): Promise<{ ok: boolean; error?: string }> => {
      if (!data.game) return { ok: false, error: "no game" };
      const res = await fetch(`/api/games/${data.game.id}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: j.error ?? "Failed" };
      }
      await refresh();
      return { ok: true };
    },
    [data.game, refresh],
  );

  const handleBingoClaim = useCallback(
    (squareIdx: number, promptId: string, targetCode: string) =>
      postEvent({ kind: "bingo_claim", squareIdx, promptId, targetCode }),
    [postEvent],
  );

  const handleBingoResolve = useCallback(
    async (claimId: string, action: "confirm" | "deny") => {
      await postEvent({
        kind: action === "confirm" ? "bingo_confirm" : "bingo_deny",
        claimId,
      });
    },
    [postEvent],
  );

  const handleTag = useCallback(() => postEvent({ kind: "target_hunt_tag_claim" }), [postEvent]);

  const handleTagResolve = useCallback(
    async (claimId: string, action: "confirm" | "deny") => {
      await postEvent({
        kind: action === "confirm" ? "target_hunt_tag_confirm" : "target_hunt_tag_deny",
        claimId,
      });
    },
    [postEvent],
  );

  const handleSpeedPairDone = useCallback(
    () => postEvent({ kind: "speed_pair_done" }),
    [postEvent],
  );

  const handleQuizAnswer = useCallback(
    (value: unknown) => postEvent({ kind: "quiz_round_answer", value }),
    [postEvent],
  );

  if (!data.game || !data.gameState || !data.me) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {noActiveGameMessage}
      </div>
    );
  }

  if (data.game.type === "bingo") {
    const state = data.gameState as BingoState;
    const myFilled = state.filled[data.me.user_id] ?? [];
    const myPending = Object.values(state.pending).filter((c) => c.targetId === data.me!.user_id);
    return (
      <div className="flex flex-col gap-6">
        <BingoPendingClaims
          pending={myPending}
          players={data.players}
          locale={locale}
          labels={bingoLabels}
          onResolve={handleBingoResolve}
        />
        <BingoCard
          sessionId={data.session.id}
          gameId={data.game.id}
          userId={data.me.user_id}
          locale={locale}
          filled={myFilled}
          labels={bingoLabels}
          onClaim={handleBingoClaim}
        />
      </div>
    );
  }

  if (data.game.type === "target-hunt") {
    const state = data.gameState as TargetHuntState;
    return (
      <TargetHuntView
        state={state}
        meId={data.me.user_id}
        players={data.players}
        labels={targetHuntLabels}
        onTag={handleTag}
        onResolve={handleTagResolve}
      />
    );
  }

  if (data.game.type === "speed-pair") {
    const state = data.gameState as SpeedPairState;
    return (
      <SpeedPairView
        state={state}
        meId={data.me.user_id}
        players={data.players}
        labels={speedPairLabels}
        onDone={handleSpeedPairDone}
      />
    );
  }

  if (data.game.type === "quiz-round") {
    const state = data.gameState as QuizRoundState;
    return (
      <QuizRoundView
        state={state}
        meId={data.me.user_id}
        labels={quizRoundLabels}
        onAnswer={handleQuizAnswer}
      />
    );
  }

  return null;
}
