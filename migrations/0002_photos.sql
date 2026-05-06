-- Photo pipeline. Stores metadata for any image uploaded by a user; the
-- bytes themselves live in R2 (PHOTOS bucket) under r2_key.
--
-- `purpose` segments uploads so future game types can reuse the table:
--   'avatar'        — profile selfie (one-per-user, latest wins)
--   'photo-bingo'   — proof-of-square photo (planned)
--   'disposable'    — unrestricted shots for the night's slideshow (planned)

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,                   -- nullable; avatars aren't session-scoped
  game_id TEXT,                      -- nullable; for game-specific uploads
  purpose TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_purpose ON photos(purpose, created_at);
