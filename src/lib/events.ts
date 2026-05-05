import { getDB } from "./db";
import type { GameEventRow } from "@/games/types";

export async function listEvents(gameId: string): Promise<GameEventRow[]> {
  const db = await getDB();
  const result = await db
    .prepare(
      `SELECT id, game_id, kind, actor_id, target_id, payload, created_at
       FROM game_events WHERE game_id = ? ORDER BY created_at ASC, id ASC`,
    )
    .bind(gameId)
    .all<GameEventRow>();
  return result.results ?? [];
}

export async function appendEvent(input: {
  id: string;
  gameId: string;
  kind: string;
  actorId: string | null;
  targetId: string | null;
  payload: unknown;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO game_events (id, game_id, kind, actor_id, target_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.gameId,
      input.kind,
      input.actorId,
      input.targetId,
      JSON.stringify(input.payload ?? {}),
      Date.now(),
    )
    .run();
}
