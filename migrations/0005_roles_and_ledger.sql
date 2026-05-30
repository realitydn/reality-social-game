-- Staff roles: replaces the binary ADMIN_EMAILS env gate with a managed table.
-- Keyed by email (people are identified by their Google email) so staff can be
-- pre-authorized before they first sign in. ADMIN_EMAILS stays as a bootstrap
-- seed so you can't lock yourself out. role: 'admin' (everything) | 'host'
-- (assignable to run host-driven games + award points, without full admin).
CREATE TABLE IF NOT EXISTS staff_roles (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Append-only points ledger: the single source for persistent leaderboards
-- (overall + per game type) and host-awarded points. finalizeGame writes
-- reason='game' rows; host awards write reason='quiz_winner' | 'karaoke_dare' |
-- 'paparazzi' | ... . session_players.score stays for the in-session cumulative.
CREATE TABLE IF NOT EXISTS score_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  game_id TEXT,
  game_type TEXT,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'game',
  awarded_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON score_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON score_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_ledger_gametype ON score_ledger(game_type, created_at);
