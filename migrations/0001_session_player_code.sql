-- Per-session 4-character player code, shown on a player's screen so other
-- players can identify them when claiming a Bingo match. Unique within a session.

ALTER TABLE session_players ADD COLUMN code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_players_code ON session_players(session_id, code);
