-- In-room presence for a player within a session. Tiers:
--   0 = none    — joined only (e.g. from the logged-in menu)
--   1 = venue   — scanned a STATIC printed QR somewhere in the space (reusable)
--   2 = session — scanned the SESSION-SPECIFIC dynamic QR (e.g. on the projector)
-- A game declares a minimum tier; the event API requires player level >= tier.
-- `verified_at` stamps the last time presence was raised (for future decay).
ALTER TABLE session_players ADD COLUMN presence_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_players ADD COLUMN verified_at INTEGER;
