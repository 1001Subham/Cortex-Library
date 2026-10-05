-- Reader profile display name on the existing users table.
-- Email remains the unique login identity. display_name is optional until set.

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_display_name_chk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_display_name_chk
      CHECK (
        display_name IS NULL
        OR (display_name = btrim(display_name) AND display_name <> '')
      );
  END IF;
END $$;
