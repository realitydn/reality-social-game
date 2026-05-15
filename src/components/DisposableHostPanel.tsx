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
  game: { id: string; type: string; status: string } | null;
  gameState: DisposableCameraState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  gameId: string;
  initialState: DisposableCameraState;
  initialPlayers: SessionPlayer[];
};

export default function DisposableHostPanel({
  sessionId,
  gameId,
  initialState,
  initialPlayers,
}: Props) {
  const [state, setState] = useState<DisposableCameraState>(initialState);
  const [players, setPlayers] = useState<SessionPlayer[]>(initialPlayers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as Dashboard;
        if (j.gameState) setState(j.gameState);
        if (j.players) setPlayers(j.players);
      }
    } catch {
      /* swallow */
    }
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useRoomNotifications(sessionId, refresh);

  const post = useCallback(
    async (body: unknown) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/${gameId}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Action failed");
        } else {
          await refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [gameId, refresh],
  );

  const openVoting = () => {
    if (typeof window !== "undefined" && !window.confirm("Close capture and open voting?"))
      return;
    void post({ kind: "disposable_open_voting" });
  };
  const openReveal = () => {
    if (typeof window !== "undefined" && !window.confirm("Close voting and reveal?"))
      return;
    void post({ kind: "disposable_open_reveal" });
  };
  const endGame = () => {
    if (typeof window !== "undefined" && !window.confirm("End the game?")) return;
    void post({ kind: "disposable_end" });
  };
  const deletePhoto = (photoId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this photo?"))
      return;
    void post({ kind: "disposable_photo_delete", photoId });
  };

  const nameOf = (id: string) =>
    players.find((p) => p.user_id === id)?.display_name ?? "Unknown";

  const photoCount = state.photos.length;
  const ballotsCast = Object.keys(state.votes).filter(
    (v) => (state.votes[v] ?? []).length > 0,
  ).length;
  const counts = tallyVotes(state);
  const ranked: { photo: DisposablePhoto; count: number }[] = state.photos
    .map((photo) => ({ photo, count: counts.get(photo.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          Disposable Camera
        </span>
        <span
          className="font-display font-semibold text-xs uppercase text-ink/60 px-2 py-1 border-2 border-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          {state.phase}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 font-body text-sm text-ink/70">
        <span>
          Photos: <span className="font-display font-bold text-ink">{photoCount}</span>
        </span>
        <span>
          Ballots in:{" "}
          <span className="font-display font-bold text-ink">{ballotsCast}</span>
        </span>
        <span>
          Limit: <span className="font-display font-bold text-ink">{state.config.photosPerPlayer}</span>{" "}
          / player
        </span>
        <span>
          Votes: <span className="font-display font-bold text-ink">{state.config.votesPerPlayer}</span>{" "}
          / player
        </span>
        <span>
          Camera:{" "}
          <span className="font-display font-bold text-ink uppercase">
            {state.config.cameraDirection}
          </span>
        </span>
      </div>

      {error && <p className="font-body text-red text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {state.phase === "capturing" && (
          <button
            type="button"
            onClick={openVoting}
            disabled={busy || photoCount === 0}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Open voting →
          </button>
        )}
        {state.phase === "voting" && (
          <button
            type="button"
            onClick={openReveal}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Reveal results →
          </button>
        )}
        {state.phase === "revealed" && (
          <button
            type="button"
            onClick={endGame}
            disabled={busy}
            className="bg-yellow text-ink font-display font-bold uppercase px-5 py-3 border-2 border-ink disabled:opacity-50"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            End game
          </button>
        )}
        {state.phase !== "ended" && (
          <button
            type="button"
            onClick={endGame}
            disabled={busy}
            className="border-2 border-red text-red font-display font-bold uppercase px-5 py-3"
            style={{ letterSpacing: "0.05em" }}
          >
            End early
          </button>
        )}
      </div>

      {ranked.length > 0 && (
        <div>
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Photos {state.phase === "voting" || state.phase === "capturing" ? "(deletion is host-allowed in any phase)" : "(by votes)"}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ranked.map((r) => (
              <div key={r.photo.id} className="relative aspect-square border-2 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photo.url} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 bg-ink/80 text-cream text-[10px] px-1 font-body truncate max-w-[70%]">
                  {nameOf(r.photo.uploaderId)}
                </span>
                {r.count > 0 && (
                  <span className="absolute top-1 right-1 bg-yellow text-ink text-xs px-1 font-display font-bold">
                    {r.count}
                  </span>
                )}
                {state.phase === "capturing" && (
                  <button
                    type="button"
                    onClick={() => deletePhoto(r.photo.id)}
                    className="absolute bottom-1 right-1 bg-red text-cream w-6 h-6 font-display font-bold text-sm"
                    aria-label="Delete photo"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
