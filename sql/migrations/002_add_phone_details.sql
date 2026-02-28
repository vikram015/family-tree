ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
-- Ensuring name column is used for display name
ALTER TABLE users ADD COLUMN IF NOT EXISTS villages TEXT[]; -- Just in case it's missing and needed by the app logic I saw
