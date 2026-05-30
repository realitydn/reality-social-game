import { getDB } from "./db";
import type { GameEventRow } from "@/games/types";

export async function listEvents(gameId: string): Promise<GameEventRow[]> {
  const db = await getDB();
  // Order by the implicit SQLite rowid, which is assigned monotonically in
  // insertion order. The previous `ORDER BY created_at, id` was non-deterministic
  // within a millisecond because `id` is a random UUID — two events stamped the
  // same ms could replay in either order, breaking the "state is a pure fold of
  // the log" guarantee for order-sensitive games (Speed Pair re-pairing, Target
  // Hunt inheritance). rowid is the true append order and never ties.
  const result = await db
    .prepare(
      `SELECT id, game_id, kind, actor_id, target_id, payload, created_at
       FROM game_events WHERE game_id = ? ORDER BY rowid ASC`,
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
