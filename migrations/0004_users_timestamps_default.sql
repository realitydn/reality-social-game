-- The Auth.js D1 adapter's createUser inserts only (id, name, email,
-- emailVerified, image), so users.created_at / updated_at must not be NOT NULL
-- without a default or Google's first sign-in fails with a constraint error.
-- SQLite can't ALTER a column to add a default, so rebuild the table.
-- defer_foreign_keys lets us drop/rename while child tables (accounts, sessions,
-- session_players, photos) reference users; they re-validate at commit against
-- the identical ids we copy over.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  emailVerified INTEGER,
  image TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
  is_guest INTEGER NOT NULL DEFAULT 0,
  member_id TEXT,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

INSERT INTO users_new (id, name, email, emailVerified, image, locale, newsletter_opt_in, is_guest, member_id, created_at, updated_at)
  SELECT id, name, email, emailVerified, image, locale, newsletter_opt_in, is_guest, member_id, created_at, updated_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
