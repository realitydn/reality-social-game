"use client";

import { useCallback, useEffect, useState } from "react";
import BingoCard from "./BingoCard";
import BingoPendingClaims from "./BingoPendingClaims";
import TargetHuntView from "./TargetHuntView";
import SpeedPairView from "./SpeedPairView";
import QuizRoundView from "./QuizRoundView";
import QuizScoreboardView from "./QuizScoreboardView";
import KaraokeQueueView from "./KaraokeQueueView";
import DisposableCameraView from "./DisposableCameraView";
import type { BingoState } from "@/games/bingo/state";
import type { TargetHuntState } from "@/games/target-hunt/state";
import type { SpeedPairState } from "@/games/speed-pair/state";
import type { QuizRoundState } from "@/games/quiz-round/state";
import type { QuizScoreboardState } from "@/games/quiz-scoreboard/state";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { DisposableCameraState } from "@/games/disposable-camera/state";
import type { SessionPlayer } from "@/lib/sessions";
import type { Locale } from "@/i18n/locales";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type AnyGameState =
  | BingoState
  | TargetHuntState
  | SpeedPairState
  | QuizRoundState
  | QuizScoreboardState
  | KaraokeQueueState
  | DisposableCameraState;

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
  quizScoreboardLabels: Record<string, string>;
  karaokeQueueLabels: Record<string, string>;
  disposableCameraLabels: Record<string, string>;
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
  quizScoreboardLabels,
  karaokeQueueLabels,
  disposableCameraLabels,
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
    (claimId: string, action: "confirm" | "deny") =>
      postEvent({
        kind: action === "confirm" ? "bingo_confirm" : "bingo_deny",
        claimId,
      }),
    [postEvent],
  );

  const handleTag = useCallback(() => postEvent({ kind: "target_hunt_tag_claim" }), [postEvent]);

  const handleTagResolve = useCallback(
    (claimId: string, action: "confirm" | "deny") =>
      postEvent({
        kind: action === "confirm" ? "target_hunt_tag_confirm" : "target_hunt_tag_deny",
        claimId,
      }),
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

  const handleQuizCreateTeam = useCallback(
    (name: string) => postEvent({ kind: "quiz_create_team", name }),
    [postEvent],
  );

  const handleQuizJoinTeam = useCallback(
    (teamId: string) => postEvent({ kind: "quiz_join_team", teamId }),
    [postEvent],
  );

  const handleKaraokeSubmit = useCallback(
    (songTitle: string) => postEvent({ kind: "karaoke_submit", songTitle }),
    [postEvent],
  );

  const handleDisposableUploadConfirm = useCallback(
    (photoId: string, url: string) =>
      postEvent({ kind: "disposable_photo_upload", photoId, url }),
    [postEvent],
  );

  const handleDisposableDelete = useCallback(
    (photoId: string) => postEvent({ kind: "disposable_photo_delete", photoId }),
    [postEvent],
  );

  const handleDisposableVote = useCallback(
    (photoIds: string[]) => postEvent({ kind: "disposable_vote", photoIds }),
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
        onCreateTeam={handleQuizCreateTeam}
        onJoinTeam={handleQuizJoinTeam}
      />
    );
  }

  if (data.game.type === "quiz-scoreboard") {
    const state = data.gameState as QuizScoreboardState;
    return <QuizScoreboardView state={state} labels={quizScoreboardLabels} />;
  }

  if (data.game.type === "karaoke-queue") {
    const state = data.gameState as KaraokeQueueState;
    return (
      <KaraokeQueueView
        state={state}
        meId={data.me.user_id}
        players={data.players}
        labels={karaokeQueueLabels}
        onSubmit={handleKaraokeSubmit}
      />
    );
  }

  if (data.game.type === "disposable-camera") {
    const state = data.gameState as DisposableCameraState;
    return (
      <DisposableCameraView
        state={state}
        meId={data.me.user_id}
        players={data.players}
        labels={disposableCameraLabels}
        sessionId={sessionId}
        gameId={data.game.id}
        onDeletePhoto={handleDisposableDelete}
        onUploadConfirm={handleDisposableUploadConfirm}
        onVote={handleDisposableVote}
      />
    );
  }

  return null;
}
