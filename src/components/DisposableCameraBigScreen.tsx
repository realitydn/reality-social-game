"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DisposableCameraState,
  DisposablePhoto,
} from "@/games/disposable-camera/state";
import { tallyVotes } from "@/games/disposable-camera/state";
import type { SessionPlayer } from "@/lib/sessions";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  gameState: DisposableCameraState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  initial: Dashboard;
};

export default function DisposableCameraBigScreen({ sessionId, initial }: Props) {
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

  if (state.phase === "capturing") {
    return <CapturingScreen state={state} nameOf={nameOf} />;
  }
  if (state.phase === "voting") {
    return <VotingScreen state={state} nameOf={nameOf} />;
  }
  // revealed | ended
  return <RevealScreen state={state} nameOf={nameOf} ended={state.phase === "ended"} />;
}

function CapturingScreen({
  state,
  nameOf,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
}) {
  const photoCount = state.photos.length;
  const photographerCount = new Set(state.photos.map((p) => p.uploaderId)).size;
  const recent = state.photos.slice(-12).reverse();

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6">
      <div className="flex items-baseline justify-between">
        <p
          className="font-display font-bold text-5xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          Disposable Camera
        </p>
        <p
          className="font-display font-semibold text-2xl text-cream/70 tabular-nums"
        >
          {photoCount} shots · {photographerCount} photographers
        </p>
      </div>
      <p
        className="font-display font-semibold text-xl uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        Up to {state.config.photosPerPlayer} shots each — take some.
      </p>
      {recent.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-display font-bold text-3xl text-cream/30 uppercase" style={{ letterSpacing: "0.05em" }}>
            Waiting for the first shot…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          {recent.map((p) => (
            <div key={p.id} className="aspect-square border-2 border-cream/30 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-cream text-[10px] py-0.5 px-1 font-body truncate text-center">
                {nameOf(p.uploaderId)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VotingScreen({
  state,
  nameOf,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
}) {
  const ballotsCast = Object.keys(state.votes).filter(
    (v) => (state.votes[v] ?? []).length > 0,
  ).length;

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6">
      <div className="flex items-baseline justify-between">
        <p
          className="font-display font-bold text-5xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          Vote on your phone
        </p>
        <p className="font-display font-semibold text-2xl text-cream/70 tabular-nums">
          {ballotsCast} ballots in
        </p>
      </div>
      <p
        className="font-display font-semibold text-xl uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        Pick {state.config.votesPerPlayer} favourite{state.config.votesPerPlayer === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 flex-1 overflow-hidden">
        {state.photos.map((p) => (
          <div key={p.id} className="aspect-square border-2 border-cream/40 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-cream text-[10px] py-0.5 px-1 font-body truncate text-center">
              {nameOf(p.uploaderId)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealScreen({
  state,
  nameOf,
  ended,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
  ended: boolean;
}) {
  const counts = tallyVotes(state);
  const ranked: { photo: DisposablePhoto; count: number }[] = state.photos
    .map((photo) => ({ photo, count: counts.get(photo.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const top = ranked.slice(0, 5);
  const winner = top[0];
  const rest = top.slice(1);

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6">
      <p
        className="font-display font-bold text-6xl uppercase text-yellow"
        style={{ letterSpacing: "0.05em" }}
      >
        Photographers of the Night
      </p>
      {ended && (
        <p className="font-display font-semibold text-xl uppercase text-cream/60" style={{ letterSpacing: "0.05em" }}>
          Final results
        </p>
      )}
      {!winner ? (
        <p className="font-body text-2xl text-cream/40 italic">No votes were cast.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 flex-1 min-h-0">
          {/* Winner blown up */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 border-4 border-yellow min-h-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={winner.photo.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline justify-between">
              <p
                className="font-display font-bold text-4xl uppercase text-yellow"
                style={{ letterSpacing: "0.05em" }}
              >
                {nameOf(winner.photo.uploaderId)}
              </p>
              <p className="font-display font-bold text-3xl text-cream tabular-nums">
                {winner.count} vote{winner.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {/* Runners-up */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {rest.map((r, i) => (
              <div
                key={r.photo.id}
                className="flex items-center gap-3 border-2 border-cream/30 p-2"
              >
                <span className="font-display font-bold text-2xl tabular-nums text-yellow w-6 text-right">
                  {i + 2}.
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.photo.url}
                  alt=""
                  className="w-16 h-16 object-cover border border-cream/30"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-display font-bold uppercase text-cream truncate"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {nameOf(r.photo.uploaderId)}
                  </p>
                  <p className="font-body text-xs text-cream/60">
                    {r.count} vote{r.count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
