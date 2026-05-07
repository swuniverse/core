-- Hotfix: fehlende Admin-Spalte nachziehen
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false;

-- User Saboti zum Admin machen
UPDATE users
SET "isAdmin" = true
WHERE username = 'Saboti';

-- Kontrolle
SELECT id, username, "isAdmin"
FROM users
WHERE username = 'Saboti';
