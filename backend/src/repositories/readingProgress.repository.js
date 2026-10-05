import pool from '../config/database.js';

function toProgress(row) {
  if (!row) {
    return null;
  }

  return {
    bookId: row.book_id,
    progressPercent: Number(row.progress_percent),
    updatedAt: row.updated_at,
  };
}

export async function findProgressForUserBook(userId, bookId) {
  const result = await pool.query(
    `SELECT book_id, progress_percent, updated_at
     FROM reading_progress
     WHERE user_id = $1 AND book_id = $2
     LIMIT 1`,
    [userId, bookId]
  );

  return toProgress(result.rows[0] ?? null);
}

export async function upsertProgressForUserBook(userId, bookId, progressPercent) {
  const result = await pool.query(
    `INSERT INTO reading_progress (user_id, book_id, progress_percent)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET
       progress_percent = EXCLUDED.progress_percent,
       updated_at = now()
     RETURNING book_id, progress_percent, updated_at`,
    [userId, bookId, progressPercent]
  );

  return toProgress(result.rows[0]);
}
