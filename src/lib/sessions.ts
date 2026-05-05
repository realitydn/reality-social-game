import { getDB } from "./db";
import { shortId } from "./short-id";

export type GameSession = {
  id: string;
  venue_id: string;
  name: string;
  starts_at: number;
  ends_at: number | null;
  created_at: number;
};

export type SessionPlayer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_guest: boolean;
  joined_at: number;
  score: number;
};

export async function createSession(name: string, startsAt: number = Date.now()): Promise<GameSession> {
  const db = await getDB();
  const id = shortId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO game_sessions (id, venue_id, name, starts_at, ends_at, created_at)
       VALUES (?, 'reality-dn', ?, ?, NULL, ?)`,
    )
    .bind(id, name, startsAt, now)
    .run();
  return { id, venue_id: "reality-dn", name, starts_at: startsAt, ends_at: null, created_at: now };
}

export async function getSession(id: string): Promise<GameSession | null> {
  const db = await getDB();
  return db
    .prepare("SELECT id, venue_id, name, starts_at, ends_at, created_at FROM game_sessions WHERE id = ?")
    .bind(id)
    .first<GameSession>();
}

export async function endSession(id: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare("UPDATE game_sessions SET ends_at = ? WHERE id = ? AND ends_at IS NULL")
    .bind(Date.now(), id)
    .run();
}

export async function listActiveSessions(): Promise<GameSession[]> {
  const db = await getDB();
  const result = await db
    .prepare(
      "SELECT id, venue_id, name, starts_at, ends_at, created_at FROM game_sessions WHERE ends_at IS NULL ORDER BY starts_at DESC LIMIT 50",
    )
    .all<GameSession>();
  return result.results ?? [];
}

export async function joinSession(sessionId: string, userId: string): Promise<void> {
  const db = await getDB();
  // INSERT … ON CONFLICT (session_id, user_id) DO NOTHING — idempotent join.
  await db
    .prepare(
      `INSERT INTO session_players (session_id, user_id, joined_at, score)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(session_id, user_id) DO NOTHING`,
    )
    .bind(sessionId, userId, Date.now())
    .run();
}

export async function listPlayers(sessionId: string): Promise<SessionPlayer[]> {
  const db = await getDB();
  const result = await db
    .prepare(
      `SELECT sp.user_id, sp.joined_at, sp.score, u.name AS display_name, u.image AS avatar_url, u.is_guest
       FROM session_players sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.session_id = ? AND sp.left_at IS NULL
       ORDER BY sp.joined_at ASC`,
    )
    .bind(sessionId)
    .all<{
      user_id: string;
      joined_at: number;
      score: number;
      display_name: string | null;
      avatar_url: string | null;
      is_guest: number;
    }>();
  return (result.results ?? []).map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name ?? "Guest",
    avatar_url: r.avatar_url,
    is_guest: r.is_guest === 1,
    joined_at: r.joined_at,
    score: r.score,
  }));
}
