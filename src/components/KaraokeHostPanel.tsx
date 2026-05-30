"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import LiveBadge from "@/components/LiveBadge";
import { KaraokeQueueGame } from "@/games/karaoke-queue";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import { type Locale } from "@/i18n/locales";
import type { SessionPlayer } from "@/lib/sessions";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  game: { id: string; type: string; status: string } | null;
  gameState: KaraokeQueueState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  gameId: string;
  initialState: KaraokeQueueState;
  initialPlayers: SessionPlayer[];
  locale?: Locale;
};

export default function KaraokeHostPanel({
  sessionId,
  gameId,
  initialState,
  initialPlayers,
  locale = "en",
}: Props) {
  const labels = KaraokeQueueGame.prompts(locale);
  const [state, setState] = useState<KaraokeQueueState>(initialState);
  const [players, setPlayers] = useState<SessionPlayer[]>(initialPlayers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  // Confirm dialogs for the irreversible actions (replacing window.confirm).
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

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

  const { connected } = useRoomNotifications(sessionId, refresh);

  // Fire-and-forget POST that does NOT flip `busy` — used for optimistic
  // actions (reorder) where we've already updated local state and don't want to
  // freeze the whole panel between taps. The 2s poll / realtime ping reconciles.
  const send = useCallback(
    async (body: unknown) => {
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
          await refresh(); // resync local state back to the server's truth
        }
      } catch {
        setError("Action failed");
        await refresh();
      }
    },
    [gameId, refresh],
  );

  const post = useCallback(
    async (body: unknown) => {
      setBusy(true);
      try {
        await send(body);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [send, refresh],
  );

  // Optimistic reorder: swap in local state immediately, then POST the new
  // order. Taps feel instant and don't block each other.
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= state.queue.length) return;
    const next = [...state.queue];
    [next[idx], next[target]] = [next[target], next[idx]];
    setState((s) => ({ ...s, queue: next }));
    void send({
      kind: "karaoke_reorder",
      orderedIds: next.map((r) => r.id),
    });
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditTitle(current);
  };
  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    void post({ kind: "karaoke_edit", requestId: editingId, songTitle: editTitle.trim() });
    setEditingId(null);
    setEditTitle("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const complete = (id: string) =>
    void post({ kind: "karaoke_complete", requestId: id });

  const removeRequest = async () => {
    if (!confirmRemoveId) return;
    await post({ kind: "karaoke_delete", requestId: confirmRemoveId });
    setConfirmRemoveId(null);
  };
  const closeQueue = async () => {
    await post({ kind: "karaoke_end" });
    setConfirmClose(false);
  };

  const nameOf = (id: string) =>
    players.find((p) => p.user_id === id)?.display_name ?? labels.someone;

  const removeTarget = confirmRemoveId
    ? state.queue.find((r) => r.id === confirmRemoveId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {state.ended
            ? labels.queueClosed
            : `${state.queue.length} ${labels.inQueueSuffix}`}
        </span>
        {state.ended && (
          <span
            className="font-display font-semibold text-xs uppercase text-ink/60 px-2 py-1 border-2 border-ink"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.ended}
          </span>
        )}
        <LiveBadge connected={connected} className="ml-auto" />
      </div>

      {error && <p className="font-body text-red text-sm">{error}</p>}

      {state.queue.length === 0 ? (
        <p className="font-body text-ink/60 italic">{labels.queueEmptyHost}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {state.queue.map((r, i) => {
            const isEditing = editingId === r.id;
            return (
              <li
                key={r.id}
                className={`border-2 p-3 flex items-center gap-2 ${
                  i === 0 ? "border-yellow bg-yellow/10" : "border-ink"
                }`}
              >
                <span className="font-display font-bold text-2xl tabular-nums w-8 text-right">
                  {i + 1}.
                </span>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={200}
                      autoFocus
                      className="border-2 border-ink px-2 py-1 font-body text-base flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={busy || !editTitle.trim()}
                      className="bg-ink text-cream font-display font-bold uppercase px-4 min-h-[44px] text-sm disabled:opacity-50"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      {labels.save}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="font-body text-sm text-ink/60 px-3 min-h-[44px]"
                    >
                      {labels.cancel}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-display font-bold text-lg uppercase truncate"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {r.songTitle}
                      </p>
                      <p className="font-body text-xs text-ink/60 truncate">
                        {nameOf(r.playerId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xl border-2 border-ink disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === state.queue.length - 1}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xl border-2 border-ink disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(r.id, r.songTitle)}
                        disabled={busy}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xl border-2 border-ink disabled:opacity-30"
                        aria-label="Edit title"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => complete(r.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xl border-2 border-yellow bg-yellow text-ink font-display font-bold disabled:opacity-30"
                        aria-label="Mark performed"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(r.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-2xl leading-none border-2 border-red text-red disabled:opacity-30 ml-auto"
                        aria-label="Delete request"
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!state.ended && (
        <button
          type="button"
          onClick={() => setConfirmClose(true)}
          disabled={busy}
          className="border-2 border-red text-red font-display font-bold uppercase px-5 py-3 self-start disabled:opacity-50"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.closeQueue}
        </button>
      )}

      {state.completed.length > 0 && (
        <details className="border border-ink/20 p-3">
          <summary
            className="font-display font-semibold text-xs uppercase text-ink/60 cursor-pointer"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.completed} ({state.completed.length})
          </summary>
          <ul className="flex flex-col gap-1 mt-2">
            {state.completed.slice().reverse().map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 font-body text-sm text-ink/70"
              >
                <span className="truncate flex-1">{r.songTitle}</span>
                <span className="truncate max-w-[40%] text-ink/50">
                  {nameOf(r.playerId)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmModal
        open={!!confirmRemoveId}
        title={labels.removeTitle}
        body={
          removeTarget
            ? `${removeTarget.songTitle} — ${nameOf(removeTarget.playerId)}. ${labels.removeBody}`
            : labels.removeBody
        }
        confirmLabel={labels.removeConfirm}
        cancelLabel={labels.cancel}
        tone="danger"
        busy={busy}
        onConfirm={() => void removeRequest()}
        onCancel={() => setConfirmRemoveId(null)}
      />

      <ConfirmModal
        open={confirmClose}
        title={labels.closeQueueTitle}
        body={`${state.queue.length} ${labels.inQueueSuffix}. ${labels.closeQueueBody}`}
        confirmLabel={labels.closeQueueConfirm}
        cancelLabel={labels.cancel}
        tone="danger"
        busy={busy}
        onConfirm={() => void closeQueue()}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
