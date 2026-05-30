import { getDB } from "./db";

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_score: number;
  sessions_played: number;
  is_guest: boolean;
};

export type LeaderboardWindow = "tonight" | "week" | "all";

const DAY = 24 * 60 * 60 * 1000;
// Đà Nẵng is UTC+7 year-round (no DST); Workers run in UTC.
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

function tonightCutoff(): number {
  const nowMs = Date.now();
  const ictNow = nowMs + ICT_OFFSET_MS;
  const ictMidnight = Math.floor(ictNow / DAY) * DAY;
  let cutoffIct = ictMidnight + 14 * 60 * 60 * 1000; // 14:00 ICT
  if (cutoffIct > ictNow) cutoffIct -= DAY; // before 14:00 → yesterday's
  return cutoffIct - ICT_OFFSET_MS;
}

// Persistent leaderboard from the score ledger. `window` sets the time floor;
// `gameType` filters to one game type (undefined/null = everything). Guests
// appear on the nightly board (they were physically here) but not week/all-time.
export async function getLeaderboard(
  window: LeaderboardWindow,
  gameType?: string | null,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const sinceMs =
    window === "tonight" ? tonightCutoff() : window === "week" ? Date.now() - 7 * DAY : 0;
  const includeGuests = window === "tonight";

  const db = await getDB();
  const conds = ["sl.created_at >= ?"];
  const binds: (string | number)[] = [sinceMs];
  if (gameType) {
    conds.push("sl.game_type = ?");
    binds.push(gameType);
  }
  if (!includeGuests) conds.push("u.is_guest = 0");
  binds.push(limit);

  const result = await db
    .prepare(
      `SELECT u.id AS user_id, u.name AS display_name, u.is_guest AS is_guest,
              SUM(sl.points) AS total_score,
              COUNT(DISTINCT sl.session_id) AS sessions_played
       FROM score_ledger sl
       JOIN users u ON u.id = sl.user_id
       WHERE ${conds.join(" AND ")}
       GROUP BY u.id
       HAVING SUM(sl.points) > 0
       ORDER BY total_score DESC, sessions_played DESC
       LIMIT ?`,
    )
    .bind(...binds)
    .all<{
      user_id: string;
      display_name: string | null;
      is_guest: number;
      total_score: number;
      sessions_played: number;
    }>();

  return (result.results ?? []).map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name ?? "Guest",
    total_score: r.total_score,
    sessions_played: r.sessions_played,
    is_guest: r.is_guest === 1,
  }));
}
