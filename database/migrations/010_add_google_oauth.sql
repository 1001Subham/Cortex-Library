-- Google OAuth identity on the existing users table.
-- Email/password accounts keep a password hash. OAuth-only accounts
-- store google_sub and leave password_hash NULL.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_method_chk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_method_chk
      CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_google_sub_not_blank_chk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_google_sub_not_blank_chk
      CHECK (google_sub IS NULL OR google_sub <> '');
  END IF;
END $$;
