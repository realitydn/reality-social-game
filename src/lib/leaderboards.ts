import { getDB } from "./db";

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_score: number;
  sessions_played: number;
  is_guest: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

// Sums session_players.score across the time window. Excludes guests from
// the all-time and weekly boards (they're session-only by design); the
// nightly board includes them since they were physically present.
async function leaderboard(
  sinceMs: number,
  includeGuests: boolean,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const db = await getDB();
  const guestFilter = includeGuests ? "" : "AND u.is_guest = 0";
  const result = await db
    .prepare(
      `SELECT u.id AS user_id,
              u.name AS display_name,
              u.is_guest AS is_guest,
              SUM(sp.score) AS total_score,
              COUNT(DISTINCT sp.session_id) AS sessions_played
       FROM session_players sp
       JOIN game_sessions gs ON gs.id = sp.session_id
       JOIN users u ON u.id = sp.user_id
       WHERE gs.starts_at >= ? ${guestFilter}
       GROUP BY u.id
       HAVING SUM(sp.score) > 0
       ORDER BY total_score DESC, sessions_played DESC
       LIMIT ?`,
    )
    .bind(sinceMs, limit)
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

// Đà Nẵng is UTC+7 year-round (no DST). Workers run in UTC, so we compute the
// "tonight" boundary in ICT explicitly rather than via Date.setHours (which
// would anchor to the Worker's UTC clock — 14:00 UTC is 21:00 in Đà Nẵng, so an
// early-evening session wouldn't count as "tonight" until 9pm local).
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

export async function tonightLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // Tonight = sessions started since 14:00 ICT today (covers a typical bar night).
  const nowMs = Date.now();
  const ictNow = nowMs + ICT_OFFSET_MS; // shift into ICT wall-clock
  const ictMidnight = Math.floor(ictNow / DAY) * DAY; // 00:00 ICT (shifted ms)
  let cutoffIct = ictMidnight + 14 * 60 * 60 * 1000; // 14:00 ICT
  if (cutoffIct > ictNow) cutoffIct -= DAY; // before 14:00 ICT → use yesterday's
  return leaderboard(cutoffIct - ICT_OFFSET_MS, true, limit); // back to UTC epoch
}

export async function weekLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  return leaderboard(Date.now() - 7 * DAY, false, limit);
}

export async function allTimeLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  return leaderboard(0, false, limit);
}
