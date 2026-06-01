-- Fine-grained staff capabilities, layered on top of the coarse staff_roles
-- enum (admin/host). The role stays coarse; capabilities express specific
-- powers, so e.g. Sam (a host) can be granted 'create:session' +
-- 'start:quiz-scoreboard' to run Pub Quiz on his own — without making him an
-- admin. Admins implicitly hold every capability (enforced in code), so this
-- table only ever holds host grants. Keyed by email to match staff_roles
-- (staff can be pre-authorized before they first sign in).
CREATE TABLE IF NOT EXISTS staff_capabilities (
  email TEXT NOT NULL,
  capability TEXT NOT NULL,         -- e.g. 'create:session', 'start:quiz-round'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (email, capability)
);

-- Session ownership. NULL for legacy / admin-created sessions. Lets a non-admin
-- host who created a session also end it (and end games within it) without
-- granting blanket admin. Admins can manage any session regardless.
ALTER TABLE game_sessions ADD COLUMN created_by TEXT;
