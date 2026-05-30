import { getDB } from "./db";

// Append-only points ledger. The single source for persistent leaderboards
// (overall + per game type) and host-awarded points. Written by finalizeGame
// (reason='game' / 'paparazzi') and, later, host award actions.
export type LedgerEntry = {
  userId: string;
  sessionId: string;
  gameId: string | null;
  gameType: string | null;
  points: number;
  reason: string; // 'game' | 'paparazzi' | 'quiz_winner' | 'karaoke_dare' | ...
  awardedBy?: string | null;
};

export async function recordLedger(entries: LedgerEntry[]): Promise<void> {
  const valid = entries.filter((e) => e.points);
  if (valid.length === 0) return;
  const db = await getDB();
  const now = Date.now();
  await db.batch(
    valid.map((e) =>
      db
        .prepare(
          `INSERT INTO score_ledger
             (id, user_id, session_id, game_id, game_type, points, reason, awarded_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          e.userId,
          e.sessionId,
          e.gameId,
          e.gameType,
          e.points,
          e.reason,
          e.awardedBy ?? null,
          now,
        ),
    ),
  );
}
