"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import LiveBadge from "@/components/LiveBadge";
import { QuizScoreboardGame } from "@/games/quiz-scoreboard";
import {
  clampScore,
  standings,
  type QuizScoreboardState,
} from "@/games/quiz-scoreboard/state";
import { type Locale } from "@/i18n/locales";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  gameState: QuizScoreboardState | null;
};

type Props = {
  sessionId: string;
  gameId: string;
  initialState: QuizScoreboardState;
  locale?: Locale;
};

const QUICK_DELTAS = [-5, -1, 1, 5] as const;

export default function QuizScoreboardHostPanel({
  sessionId,
  gameId,
  initialState,
  locale = "en",
}: Props) {
  const labels = QuizScoreboardGame.prompts(locale);
  const [state, setState] = useState<QuizScoreboardState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  // Inline edit (name + exact score) for one team at a time. Kept in local
  // state so the 2s poll refresh doesn't clobber an edit-in-progress.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editScore, setEditScore] = useState("0");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as Dashboard;
        if (j.gameState) setState(j.gameState);
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

  // Fire-and-forget POST (no busy freeze) — for the quick +/- taps where we've
  // already updated local state optimistically. The poll / ping reconciles.
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
          await refresh();
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

  const addTeam = async () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    await post({ kind: "quiz_scoreboard_add_team", name });
  };

  // Optimistic quick-adjust: bump local score immediately, then POST the delta.
  const adjust = (teamId: string, delta: number) => {
    setState((s) => ({
      ...s,
      teams: s.teams.map((t) =>
        t.id === teamId ? { ...t, score: clampScore(t.score + delta) } : t,
      ),
    }));
    void send({ kind: "quiz_scoreboard_adjust_score", teamId, delta });
  };

  const startEdit = (id: string, name: string, score: number) => {
    setEditingId(id);
    setEditName(name);
    setEditScore(String(score));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditScore("0");
  };
  const saveEdit = async (id: string, currentName: string, currentScore: number) => {
    const name = editName.trim();
    const nextScore = clampScore(parseInt(editScore || "0", 10) || 0);
    setEditingId(null);
    if (name && name !== currentName) {
      await post({ kind: "quiz_scoreboard_rename_team", teamId: id, name });
    }
    if (nextScore !== currentScore) {
      await post({ kind: "quiz_scoreboard_set_score", teamId: id, score: nextScore });
    }
  };

  const removeTeam = async () => {
    if (!confirmRemoveId) return;
    await post({ kind: "quiz_scoreboard_remove_team", teamId: confirmRemoveId });
    setConfirmRemoveId(null);
  };
  const endBoard = async () => {
    await post({ kind: "quiz_scoreboard_end" });
    setConfirmEnd(false);
  };

  // Standings (sorted) drive the rank badge; the editable list stays in entry
  // order so rows don't jump around under the host's finger while scoring.
  const rankById = new Map(standings(state).map((t, i) => [t.id, i + 1]));
  const removeTarget = confirmRemoveId
    ? state.teams.find((t) => t.id === confirmRemoveId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="font-display font-bold text-3xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.title}
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

      {!state.ended && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTeam();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
            placeholder={labels.teamNamePlaceholder}
            className="border-2 border-ink px-3 py-2 font-body text-base flex-1 min-w-0 focus:outline-none focus:bg-yellow"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="bg-ink text-cream font-display font-bold uppercase px-5 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.add}
          </button>
        </form>
      )}

      {state.teams.length === 0 ? (
        <p className="font-body text-ink/60 italic">{labels.noTeamsHost}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.teams.map((team) => {
            const isEditing = editingId === team.id;
            const rank = rankById.get(team.id) ?? 0;
            return (
              <li
                key={team.id}
                className={`border-2 p-3 flex flex-col gap-2 ${
                  rank === 1 ? "border-yellow bg-yellow/10" : "border-ink"
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={40}
                      autoFocus
                      className="border-2 border-ink px-2 py-1 font-body text-base flex-1 min-w-[8rem]"
                    />
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(e.target.value)}
                      className="border-2 border-ink px-2 py-1 w-24 font-display font-bold text-center"
                      aria-label="Score"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEdit(team.id, team.name, team.score)}
                      disabled={busy}
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
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-xl tabular-nums w-8 text-right text-ink/40">
                        {rank}
                      </span>
                      <p
                        className="font-display font-bold text-lg uppercase truncate flex-1"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {team.name}
                      </p>
                      <span className="font-display font-bold text-3xl tabular-nums">
                        {team.score}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {QUICK_DELTAS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => adjust(team.id, d)}
                          disabled={state.ended}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-2 border-2 border-ink font-display font-bold text-base disabled:opacity-30 hover:bg-yellow transition"
                        >
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => startEdit(team.id, team.name, team.score)}
                        disabled={busy || state.ended}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-xl border-2 border-ink disabled:opacity-30 ml-auto"
                        aria-label={labels.rename}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(team.id)}
                        disabled={busy || state.ended}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-2xl leading-none border-2 border-red text-red disabled:opacity-30"
                        aria-label={labels.remove}
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!state.ended && (
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          disabled={busy}
          className="border-2 border-red text-red font-display font-bold uppercase px-5 py-3 self-start disabled:opacity-50"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.endBoard}
        </button>
      )}

      <ConfirmModal
        open={!!confirmRemoveId}
        title={labels.removeTitle}
        body={removeTarget ? `${removeTarget.name}. ${labels.removeBody}` : labels.removeBody}
        confirmLabel={labels.removeConfirm}
        cancelLabel={labels.cancel}
        tone="danger"
        busy={busy}
        onConfirm={() => void removeTeam()}
        onCancel={() => setConfirmRemoveId(null)}
      />

      <ConfirmModal
        open={confirmEnd}
        title={labels.endTitle}
        body={labels.endBody}
        confirmLabel={labels.endConfirm}
        cancelLabel={labels.cancel}
        tone="danger"
        busy={busy}
        onConfirm={() => void endBoard()}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
