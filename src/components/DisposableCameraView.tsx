"use client";

import { useRef, useState } from "react";
import type {
  DisposableCameraState,
  DisposablePhoto,
} from "@/games/disposable-camera/state";
import { tallyVotes } from "@/games/disposable-camera/state";
import type { SessionPlayer } from "@/lib/sessions";
import { resizeImage } from "@/lib/image-resize";

type Props = {
  state: DisposableCameraState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  sessionId: string;
  gameId: string;
  /** POSTs disposable_photo_delete via the events API. */
  onDeletePhoto: (photoId: string) => Promise<{ ok: boolean; error?: string }>;
  /** POSTs disposable_photo_upload after client-side upload completes. */
  onUploadConfirm: (
    photoId: string,
    url: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** POSTs disposable_vote with the full ballot. */
  onVote: (photoIds: string[]) => Promise<{ ok: boolean; error?: string }>;
};

export default function DisposableCameraView({
  state,
  meId,
  players,
  labels,
  sessionId,
  gameId,
  onDeletePhoto,
  onUploadConfirm,
  onVote,
}: Props) {
  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }
  if (state.phase === "ended") {
    return <RevealPhase state={state} meId={meId} players={players} labels={labels} ended />;
  }
  if (state.phase === "revealed") {
    return <RevealPhase state={state} meId={meId} players={players} labels={labels} ended={false} />;
  }
  if (state.phase === "voting") {
    return (
      <VotePhase
        state={state}
        meId={meId}
        players={players}
        labels={labels}
        onVote={onVote}
      />
    );
  }
  // capturing
  return (
    <CapturePhase
      state={state}
      meId={meId}
      labels={labels}
      sessionId={sessionId}
      gameId={gameId}
      onDeletePhoto={onDeletePhoto}
      onUploadConfirm={onUploadConfirm}
    />
  );
}

function CapturePhase({
  state,
  meId,
  labels,
  sessionId,
  gameId,
  onDeletePhoto,
  onUploadConfirm,
}: {
  state: DisposableCameraState;
  meId: string;
  labels: Record<string, string>;
  sessionId: string;
  gameId: string;
  onDeletePhoto: Props["onDeletePhoto"];
  onUploadConfirm: Props["onUploadConfirm"];
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const eitherInputRef = useRef<HTMLInputElement>(null);

  const myPhotos = state.photos.filter((p) => p.uploaderId === meId);
  const usedCount = myPhotos.length;
  const limit = state.config.photosPerPlayer;
  const remaining = limit - usedCount;
  const atLimit = remaining <= 0;

  async function uploadFile(file: File) {
    if (atLimit) return;
    setUploading(true);
    setUploadError(null);
    try {
      const resized = await resizeImage(file, {
        maxSize: 2048,
        mimeType: "image/jpeg",
        quality: 0.9,
      });
      const fd = new FormData();
      fd.append(
        "file",
        new File([resized], "shot.jpg", { type: "image/jpeg" }),
      );
      fd.append("purpose", "disposable");
      fd.append("session_id", sessionId);
      fd.append("game_id", gameId);
      const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(j.error ?? "Upload failed");
        return;
      }
      const j = (await res.json()) as { id: string; url: string };
      const r = await onUploadConfirm(j.id, j.url);
      if (!r.ok) setUploadError(r.error ?? "Could not register photo");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const handlePick = (input: HTMLInputElement | null) => () => input?.click();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2
          className="font-display font-bold text-2xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.captureHeading}
        </h2>
        <span className="font-body text-sm text-ink/60">
          {labels.photosUsed}:{" "}
          <span className="font-display font-bold text-ink">
            {usedCount} / {limit}
          </span>
        </span>
      </div>

      {atLimit ? (
        <div className="border-2 border-dashed border-ink/30 p-4 text-center font-body text-sm text-ink/50">
          {labels.photoLimitReached}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(state.config.cameraDirection === "front" ||
            state.config.cameraDirection === "either") && (
            <>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={handlePick(frontInputRef.current)}
                disabled={uploading}
                className="bg-ink text-cream font-display font-bold uppercase px-5 py-3 transition hover:translate-y-0.5 disabled:opacity-50"
                style={{
                  letterSpacing: "0.05em",
                  boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                }}
              >
                {uploading ? "…" : labels.captureSelfie}
              </button>
            </>
          )}
          {(state.config.cameraDirection === "back" ||
            state.config.cameraDirection === "either") && (
            <>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={handlePick(backInputRef.current)}
                disabled={uploading}
                className="bg-ink text-cream font-display font-bold uppercase px-5 py-3 transition hover:translate-y-0.5 disabled:opacity-50"
                style={{
                  letterSpacing: "0.05em",
                  boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                }}
              >
                {uploading ? "…" : labels.captureRoom}
              </button>
            </>
          )}
          {/* Fallback "library" picker — useful if the user wants to upload an
              existing photo even with a host-set direction. */}
          <input
            ref={eitherInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={handlePick(eitherInputRef.current)}
            disabled={uploading}
            className="border-2 border-ink text-ink font-display font-bold uppercase px-5 py-3 transition hover:bg-yellow disabled:opacity-50"
            style={{ letterSpacing: "0.05em" }}
          >
            {uploading ? "…" : "From library"}
          </button>
        </div>
      )}

      {uploadError && (
        <p className="font-body text-red text-sm">{uploadError}</p>
      )}

      {myPhotos.length > 0 && (
        <div>
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            Your shots
          </p>
          <div className="grid grid-cols-3 gap-2">
            {myPhotos.map((p) => (
              <div key={p.id} className="relative aspect-square border-2 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => void onDeletePhoto(p.id)}
                  className="absolute top-1 right-1 bg-red text-cream w-6 h-6 font-display font-bold text-sm"
                  aria-label={labels.deletePhoto}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="font-body text-xs text-ink/40 italic">
        {labels.waitingForVoting}
      </p>
    </div>
  );
}

function VotePhase({
  state,
  meId,
  players,
  labels,
  onVote,
}: {
  state: DisposableCameraState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  onVote: Props["onVote"];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myBallot = state.votes[meId] ?? [];
  const limit = state.config.votesPerPlayer;
  const used = myBallot.length;

  const toggle = async (photoId: string) => {
    if (busy) return;
    const photo = state.photos.find((p) => p.id === photoId);
    if (!photo) return;
    if (photo.uploaderId === meId) {
      setError(labels.cantVoteOwn);
      return;
    }
    let next: string[];
    if (myBallot.includes(photoId)) {
      next = myBallot.filter((id) => id !== photoId);
    } else {
      if (used >= limit) {
        setError(labels.voteLimitReached);
        return;
      }
      next = [...myBallot, photoId];
    }
    setBusy(true);
    setError(null);
    const r = await onVote(next);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Vote failed");
  };

  const nameOf = (id: string) =>
    players.find((p) => p.user_id === id)?.display_name ?? "Someone";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2
          className="font-display font-bold text-2xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.votingHeading}
        </h2>
        <span className="font-body text-sm text-ink/60">
          {labels.votesUsed}:{" "}
          <span className="font-display font-bold text-ink">
            {used} / {limit}
          </span>
        </span>
      </div>
      {error && <p className="font-body text-red text-sm">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.photos.map((p) => {
          const voted = myBallot.includes(p.id);
          const isOwn = p.uploaderId === meId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => void toggle(p.id)}
              disabled={busy || isOwn}
              className={`relative aspect-square border-4 transition disabled:cursor-not-allowed ${
                voted
                  ? "border-yellow"
                  : isOwn
                    ? "border-ink/20 opacity-60"
                    : "border-ink hover:border-yellow"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              {voted && (
                <span className="absolute top-1 right-1 bg-yellow text-ink font-display font-bold text-sm w-6 h-6 flex items-center justify-center">
                  ✓
                </span>
              )}
              {isOwn && (
                <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-cream text-[10px] py-0.5 font-display uppercase tracking-wider text-center">
                  yours
                </span>
              )}
              <span className="absolute top-1 left-1 bg-ink/70 text-cream text-[10px] px-1 font-body truncate max-w-[60%]">
                {nameOf(p.uploaderId)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RevealPhase({
  state,
  meId,
  players,
  labels,
  ended,
}: {
  state: DisposableCameraState;
  meId: string;
  players: SessionPlayer[];
  labels: Record<string, string>;
  ended: boolean;
}) {
  const counts = tallyVotes(state);
  const ranked: { photo: DisposablePhoto; count: number }[] = state.photos
    .map((photo) => ({ photo, count: counts.get(photo.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const top = ranked.filter((r) => r.count > 0).slice(0, 5);
  const nameOf = (id: string) =>
    players.find((p) => p.user_id === id)?.display_name ?? "Someone";
  const myWins = ranked.filter((r) => r.photo.uploaderId === meId && r.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <h2
        className="font-display font-bold text-2xl uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.revealHeading}
      </h2>
      {ended && (
        <p className="font-body text-sm text-ink/60 italic">{labels.gameEnded}</p>
      )}
      {top.length === 0 ? (
        <p className="font-body text-ink/50 italic">{labels.noVotes}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {top.map((r, i) => (
            <li
              key={r.photo.id}
              className={`flex items-center gap-3 border-2 p-2 ${
                i === 0 ? "bg-yellow border-yellow" : "border-ink"
              }`}
            >
              <span className="font-display font-bold text-2xl tabular-nums w-8 text-right">
                {i + 1}.
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.photo.url}
                alt=""
                className="w-16 h-16 object-cover border border-ink"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="font-display font-bold uppercase truncate"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {nameOf(r.photo.uploaderId)}
                </p>
                <p className="font-body text-xs text-ink/60">
                  {r.count} vote{r.count === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {myWins.length > 0 && (
        <p className="font-body text-sm text-ink italic">
          You picked up {myWins.reduce((s, r) => s + r.count, 0)} vote
          {myWins.reduce((s, r) => s + r.count, 0) === 1 ? "" : "s"} across{" "}
          {myWins.length} photo{myWins.length === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
