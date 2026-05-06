-- Phase 8a: Quiz packages.
--
-- A package is content authored in the host CMS and slotted into a game
-- session as a quiz-round game. Multimedia refs (image URLs from the
-- existing photos pipeline; future video URLs) live inside the JSON content
-- blob so question shapes can evolve without migrations.

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,                              -- 'quiz-round' for now
  author_id TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',                    -- JSON: scoring/timer/leaderboard knobs
  content TEXT NOT NULL DEFAULT '{"questions":[]}',     -- JSON: { questions: Question[] }
  status TEXT NOT NULL DEFAULT 'draft',                 -- draft | published | archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packages_author ON packages(author_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_packages_game_type ON packages(game_type);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status, updated_at);
