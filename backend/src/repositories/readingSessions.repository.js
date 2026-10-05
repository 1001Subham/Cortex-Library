import pool from '../config/database.js';

function toSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    bookId: row.book_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: Number(row.duration_seconds),
  };
}

export async function findOpenSessionForUserBook(userId, bookId) {
  const result = await pool.query(
    `SELECT id, book_id, started_at, ended_at, duration_seconds
     FROM reading_sessions
     WHERE user_id = $1 AND book_id = $2 AND ended_at IS NULL
     LIMIT 1`,
    [userId, bookId]
  );

  return toSession(result.rows[0] ?? null);
}

export async function findLatestSessionForUserBook(userId, bookId) {
  const result = await pool.query(
    `SELECT id, book_id, started_at, ended_at, duration_seconds
     FROM reading_sessions
     WHERE user_id = $1 AND book_id = $2
     ORDER BY started_at DESC, id DESC
     LIMIT 1`,
    [userId, bookId]
  );

  return toSession(result.rows[0] ?? null);
}

export async function insertOpenSession(userId, bookId) {
  const result = await pool.query(
    `INSERT INTO reading_sessions (user_id, book_id)
     VALUES ($1, $2)
     RETURNING id, book_id, started_at, ended_at, duration_seconds`,
    [userId, bookId]
  );

  return toSession(result.rows[0]);
}

export async function addSessionDuration(sessionId, userId, elapsedSeconds, endSession) {
  const result = await pool.query(
    `UPDATE reading_sessions
     SET duration_seconds = duration_seconds + $3,
         ended_at = CASE WHEN $4 THEN now() ELSE ended_at END,
         updated_at = now()
     WHERE id = $1
       AND user_id = $2
       AND ended_at IS NULL
     RETURNING id, book_id, started_at, ended_at, duration_seconds`,
    [sessionId, userId, elapsedSeconds, endSession]
  );

  return toSession(result.rows[0] ?? null);
}
