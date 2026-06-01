import { getDB } from "./db";

// Lightweight per-actor rate limit for game event POSTs. Counts how many events
// this actor has appended to this game in the recent window, reusing the
// append-only game_events log — no extra binding/infra. It throttles *valid*
// event spam (claim farming, vote stuffing); raw request flooding is Cloudflare
// edge territory. Generous enough for fast human play (tapping, swiping), far
// below what a bot would push.
const MAX_EVENTS = 40;
const WINDOW_MS = 10_000;

export async function withinEventRateLimit(
  gameId: string,
  actorId: string,
): Promise<boolean> {
  const db = await getDB();
  const since = Date.now() - WINDOW_MS;
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM game_events WHERE game_id = ? AND actor_id = ? AND created_at > ?",
    )
    .bind(gameId, actorId, since)
    .first<{ c: number }>();
  return (row?.c ?? 0) < MAX_EVENTS;
}
