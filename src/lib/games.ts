import { getDB } from "./db";
import { shortId } from "./short-id";
import { listEvents } from "./events";
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

export async function startGame(sessionId: string, type: string): Promise<GameRow> {
  if (!getGameType(type)) throw new Error(`Unknown game type: ${type}`);
  const db = await getDB();
  // Only one running game per session at a time. End any existing running game.
  await db
    .prepare("UPDATE games SET status = 'ended', ended_at = ? WHERE session_id = ? AND status = 'running'")
    .bind(Date.now(), sessionId)
    .run();
  const id = shortId(8);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO games (id, session_id, type, config, status, started_at, ended_at, created_at)
       VALUES (?, ?, ?, '{}', 'running', ?, NULL, ?)`,
    )
    .bind(id, sessionId, type, now, now)
    .run();
  return {
    id,
    session_id: sessionId,
    type,
    config: "{}",
    status: "running",
    started_at: now,
    ended_at: null,
    created_at: now,
  };
}

export async function endGame(gameId: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare("UPDATE games SET status = 'ended', ended_at = ? WHERE id = ? AND status = 'running'")
    .bind(Date.now(), gameId)
    .run();
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

// Replays all events through the registered game type's reducer to produce current state.
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
