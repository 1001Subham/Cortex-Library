import pool from '../config/database.js';

export async function findActiveOwnedSession(userId, bookId, sessionId) {
  const result = await pool.query(
    `SELECT s.id
     FROM reading_sessions s
     JOIN book_issues i ON i.user_id = s.user_id AND i.book_id = s.book_id
     WHERE s.id = $1 AND s.user_id = $2 AND s.book_id = $3
       AND s.ended_at IS NULL AND i.status = 'active'
     LIMIT 1`,
    [sessionId, userId, bookId]
  );

  return result.rows[0] ?? null;
}

export async function addVisualCueSample(userId, bookId, sessionId, cue) {
  const result = await pool.query(
    `INSERT INTO reading_attention
       (user_id, book_id, session_id, sample_count, face_detected_count,
        forward_facing_count, turned_away_count, no_face_count)
     SELECT $1, $2, s.id, 1, $4, $5, $6, $7
     FROM reading_sessions s
     JOIN book_issues i ON i.user_id = s.user_id AND i.book_id = s.book_id
     WHERE s.id = $3 AND s.user_id = $1 AND s.book_id = $2
       AND s.ended_at IS NULL AND i.status = 'active'
     ON CONFLICT (session_id) DO UPDATE SET
       sample_count = reading_attention.sample_count + 1,
       face_detected_count = reading_attention.face_detected_count + EXCLUDED.face_detected_count,
       forward_facing_count = reading_attention.forward_facing_count + EXCLUDED.forward_facing_count,
       turned_away_count = reading_attention.turned_away_count + EXCLUDED.turned_away_count,
       no_face_count = reading_attention.no_face_count + EXCLUDED.no_face_count,
       updated_at = now()
     WHERE reading_attention.user_id = EXCLUDED.user_id
       AND reading_attention.book_id = EXCLUDED.book_id
     RETURNING session_id, sample_count, face_detected_count,
       forward_facing_count, turned_away_count, no_face_count, updated_at`,
    [
      userId,
      bookId,
      sessionId,
      cue.faceDetected ? 1 : 0,
      cue.headOrientation === 'forward' ? 1 : 0,
      cue.headOrientation === 'turned_away' ? 1 : 0,
      cue.faceDetected ? 0 : 1,
    ]
  );

  return result.rows[0] ?? null;
}

export async function getVisualCueSummary(userId, bookId, sessionId) {
  const result = await pool.query(
    `SELECT session_id, sample_count, face_detected_count,
       forward_facing_count, turned_away_count, no_face_count, updated_at
     FROM reading_attention
     WHERE user_id = $1 AND book_id = $2 AND session_id = $3`,
    [userId, bookId, sessionId]
  );

  return result.rows[0] ?? null;
}

export async function findOwnedSession(userId, bookId, sessionId) {
  const result = await pool.query(
    `SELECT id FROM reading_sessions
     WHERE id = $1 AND user_id = $2 AND book_id = $3 LIMIT 1`,
    [sessionId, userId, bookId]
  );
  return result.rows[0] ?? null;
}

export async function findVisualCueAggregateForUser(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS sessions,
       COALESCE(SUM(sample_count), 0) AS samples,
       COALESCE(SUM(face_detected_count), 0) AS face_detected,
       COALESCE(SUM(forward_facing_count), 0) AS forward_facing,
       COALESCE(SUM(turned_away_count), 0) AS turned_away,
       COALESCE(SUM(no_face_count), 0) AS no_face_detected,
       MAX(updated_at) AS last_sampled_at
     FROM reading_attention WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}
