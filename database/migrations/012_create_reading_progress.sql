-- Saved reading position per authenticated user and book.
-- This is scroll position in the HTML reader, not attention, time, or pages.
-- Forward-only; IF NOT EXISTS lets the migration be re-applied safely.

CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  progress_percent NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reading_progress_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT reading_progress_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE RESTRICT,
  CONSTRAINT reading_progress_user_book_unique UNIQUE (user_id, book_id),
  CONSTRAINT reading_progress_percent_chk CHECK (
    progress_percent >= 0 AND progress_percent <= 100
  )
);

CREATE INDEX IF NOT EXISTS reading_progress_book_id_idx
  ON reading_progress (book_id);

CREATE INDEX IF NOT EXISTS reading_progress_user_updated_idx
  ON reading_progress (user_id, updated_at DESC);
