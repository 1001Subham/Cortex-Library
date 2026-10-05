-- Per-session visual cue aggregates only. Camera frames are never persisted.
-- Forward-only; safe to apply repeatedly.

CREATE TABLE IF NOT EXISTS reading_attention (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  face_detected_count INTEGER NOT NULL DEFAULT 0,
  forward_facing_count INTEGER NOT NULL DEFAULT 0,
  turned_away_count INTEGER NOT NULL DEFAULT 0,
  no_face_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reading_attention_session_fk
    FOREIGN KEY (session_id) REFERENCES reading_sessions (id) ON DELETE CASCADE,
  CONSTRAINT reading_attention_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT reading_attention_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE RESTRICT,
  CONSTRAINT reading_attention_counts_chk CHECK (
    sample_count >= 0 AND face_detected_count >= 0
    AND forward_facing_count >= 0 AND turned_away_count >= 0
    AND no_face_count >= 0
    AND face_detected_count + no_face_count <= sample_count
    AND forward_facing_count + turned_away_count <= face_detected_count
  )
);

CREATE INDEX IF NOT EXISTS reading_attention_user_updated_idx
  ON reading_attention (user_id, updated_at DESC);
