-- Active reading time per authenticated user and book.
-- Duration is accumulated visible reading time, not catalog estimates or attention.
-- Forward-only; IF NOT EXISTS lets the migration be re-applied safely.

CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reading_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT reading_sessions_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE RESTRICT,
  CONSTRAINT reading_sessions_duration_chk CHECK (duration_seconds >= 0),
  CONSTRAINT reading_sessions_ended_chk CHECK (
    ended_at IS NULL OR ended_at >= started_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS reading_sessions_one_open_idx
  ON reading_sessions (user_id, book_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS reading_sessions_user_started_idx
  ON reading_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS reading_sessions_book_id_idx
  ON reading_sessions (book_id);
