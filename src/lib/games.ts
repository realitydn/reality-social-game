import { getDB } from "./db";
import { shortId } from "./short-id";
import { listEvents, appendEvent } from "./events";
import { listPlayers } from "./sessions";
import { notifySession } from "./realtime";
import { getGameType } from "@/games/registry";
import type { GameType } from "@/games/types";

export type GameRow = {
  id: string;
  session_id: string;
  type: string;
  config: string;
  status: "pending" | "running" | "ended";
  started_at: number | null;
  ended_at: number | null;
  created_at: number;
};

// Compute the game's final per-player scores and add them to session_players.score.
// Called when a game is explicitly ended OR when a new game starts in the same session
// (the previous running game gets finalized first).
async function finalizeGame(game: GameRow): Promise<void> {
  const db = await getDB();
  // Compare-and-swap the status FIRST. Only the caller that actually flips
  // running→ended applies the score deltas. Previously scores were added before
  // the flip, so two racing finalizes (a double-tapped "end", or "end" racing
  // the auto-finalize when the next game starts) both credited the same points.
  const flip = await db
    .prepare("UPDATE games SET status = 'ended', ended_at = ? WHERE id = ? AND status = 'running'")
    .bind(Date.now(), game.id)
    .run();
  if (flip.meta.changes !== 1) return; // already finalized by a concurrent caller
  const scores = await getScores(game);
  for (const [userId, points] of Object.entries(scores)) {
    if (!points) continue;
    await db
      .prepare(
        "UPDATE session_players SET score = score + ? WHERE session_id = ? AND user_id = ?",
      )
      .bind(points, game.session_id, userId)
      .run();
  }
}

export type StartGameOptions = {
  /** Persisted on the games row as games.config (JSON). Use for things like
   *  pointing a quiz-round at a package id. */
  config?: unknown;
  /** Passed opaquely to the GameType's onStart() as its third argument. The
   *  orchestration layer (e.g. an admin server action) uses this to hand
   *  pre-resolved data — like a package's questions snapshot — into the
   *  seed event without the GameType needing DB access. */
  seedData?: unknown;
};

export async function startGame(
  sessionId: string,
  type: string,
  options: StartGameOptions = {},
): Promise<GameRow> {
  const gt = getGameType(type);
  if (!gt) throw new Error(`Unknown game type: ${type}`);
  const db = await getDB();

  // Games that are unplayable below a floor of participants. Checked before we
  // finalize the prior game, so a rejected start doesn't tear down what's
  // running. Host-driven games (quiz/karaoke/disposable) intentionally have no
  // minimum — players trickle in after the host opens them.
  const MIN_PLAYERS: Record<string, number> = { "speed-pair": 2, "target-hunt": 2 };
  const minPlayers = MIN_PLAYERS[type] ?? 0;
  // Load the roster once if either the minimum check or onStart needs it.
  const roster = minPlayers > 0 || gt.onStart ? await listPlayers(sessionId) : null;
  if (minPlayers > 0 && (roster?.length ?? 0) < minPlayers)
    throw new Error(`${type} needs at least ${minPlayers} players to start.`);

  // Finalize any currently-running game in this session (persists its scores).
  const prior = await getActiveGame(sessionId);
  if (prior) await finalizeGame(prior);

  const id = shortId(8);
  const now = Date.now();
  const configJson = options.config !== undefined ? JSON.stringify(options.config) : "{}";
  await db
    .prepare(
      `INSERT INTO games (id, session_id, type, config, status, started_at, ended_at, created_at)
       VALUES (?, ?, ?, ?, 'running', ?, NULL, ?)`,
    )
    .bind(id, sessionId, type, configJson, now, now)
    .run();

  // Optional onStart hook: seed events that depend on the current roster
  // and/or upstream data passed in via seedData.
  if (gt.onStart) {
    const players = roster ?? (await listPlayers(sessionId));
    const seedEvents = gt.onStart(
      { gameId: id, sessionId },
      players.map((p) => p.user_id),
      options.seedData,
    );
    for (const e of seedEvents) {
      await appendEvent({
        id: crypto.randomUUID(),
        gameId: id,
        kind: e.kind,
        actorId: null,
        targetId: null,
        payload: e.payload,
      });
    }
  }

  await notifySession(sessionId, "game_started");

  return {
    id,
    session_id: sessionId,
    type,
    config: configJson,
    status: "running",
    started_at: now,
    ended_at: null,
    created_at: now,
  };
}

export async function endGame(gameId: string): Promise<void> {
  const game = await getGame(gameId);
  if (!game || game.status !== "running") return;
  await finalizeGame(game);
  await notifySession(game.session_id, "game_ended");
}

export async function getActiveGame(sessionId: string): Promise<GameRow | null> {
  const db = await getDB();
  return db
    .prepare(
      `SELECT id, session_id, type, config, status, started_at, ended_at, created_at
       FROM games WHERE session_id = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`,
    )
    .bind(sessionId)
    .first<GameRow>();
}

export async function getGame(gameId: string): Promise<GameRow | null> {
  const db = await getDB();
  return db
    .prepare(
      `SELECT id, session_id, type, config, status, started_at, ended_at, created_at
       FROM games WHERE id = ?`,
    )
    .bind(gameId)
    .first<GameRow>();
}

export async function getGameState<S>(game: GameRow): Promise<S> {
  const gt = getGameType(game.type) as GameType<S, unknown> | null;
  if (!gt) throw new Error(`Unknown game type: ${game.type}`);
  const ctx = { gameId: game.id, sessionId: game.session_id };
  let state = gt.init(ctx);
  const events = await listEvents(game.id);
  for (const row of events) {
    const event = { kind: row.kind, ...JSON.parse(row.payload) };
    state = gt.reduce(state, event, ctx);
  }
  return state;
}

export async function getScores(game: GameRow): Promise<Record<string, number>> {
  const gt = getGameType(game.type);
  if (!gt) return {};
  const ctx = { gameId: game.id, sessionId: game.session_id };
  const state = await getGameState(game);
  return gt.score(state, ctx);
}
