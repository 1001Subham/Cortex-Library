-- Digital book issues (authenticated loans). Forward-only; IF NOT EXISTS
-- lets the migration be re-applied safely on an existing development database.

CREATE TABLE IF NOT EXISTS book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_issues_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT book_issues_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE RESTRICT,
  CONSTRAINT book_issues_status_check CHECK (
    status IN ('active', 'returned', 'expired')
  ),
  CONSTRAINT book_issues_due_after_issued_check CHECK (due_at > issued_at),
  CONSTRAINT book_issues_returned_consistency_check CHECK (
    (status = 'returned' AND returned_at IS NOT NULL)
    OR (status IN ('active', 'expired') AND returned_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS book_issues_one_active_per_user_book_idx
  ON book_issues (user_id, book_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS book_issues_user_issued_idx
  ON book_issues (user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS book_issues_book_id_idx ON book_issues (book_id);
