-- Phase 0 schema for REALITY Social Game.
-- Auth.js v5 with @auth/d1-adapter expects: users, accounts, sessions, verification_tokens.
-- Game state tables (game_sessions, session_players, games, game_events) are namespaced
-- to avoid clashing with Auth.js's `sessions` table.

-- ─── Auth.js + REALITY user fields ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  -- Auth.js conventional fields (populated from Google profile on sign-in):
  name TEXT,
  email TEXT,
  emailVerified INTEGER,
  image TEXT,
  -- REALITY-specific extensions:
  locale TEXT NOT NULL DEFAULT 'en',
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
  is_guest INTEGER NOT NULL DEFAULT 0,
  member_id TEXT,                  -- Nullable FK to REALITY Membership; linked later.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  oauth_token_secret TEXT,
  oauth_token TEXT,
  UNIQUE(provider, providerAccountId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires INTEGER NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ─── Game state ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL DEFAULT 'reality-dn',
  name TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_players (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  left_at INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,                       -- 'bingo', 'target-hunt', 'speed-pair', etc.
  config TEXT NOT NULL DEFAULT '{}',        -- JSON
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | running | ended
  started_at INTEGER,
  ended_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- Append-only event log. Game state for any game type is reduced from these events.
-- Adding a new game type doesn't require schema changes; new event kinds slot in here.
CREATE TABLE IF NOT EXISTS game_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_id TEXT,
  target_id TEXT,
  payload TEXT NOT NULL DEFAULT '{}',       -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_players_user ON session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_games_session ON games(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game ON game_events(game_id, created_at);
