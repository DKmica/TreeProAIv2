-- Add password_hash column for local authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;
