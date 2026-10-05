import pool from '../config/database.js';

const ISSUE_BOOK_SELECT = `
  i.id,
  i.book_id,
  i.status,
  i.issued_at,
  i.due_at,
  i.returned_at,
  b.title,
  b.slug,
  b.cover_image_key,
  b.content_storage_key,
  b.content_format,
  b.estimated_reading_minutes,
  b.total_pages,
  rp.progress_percent,
  COALESCE(
    (
      SELECT SUM(s.duration_seconds)::int
      FROM reading_sessions s
      WHERE s.user_id = i.user_id AND s.book_id = i.book_id
    ),
    0
  ) AS reading_seconds,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', a.id,
          'displayName', a.display_name,
          'slug', a.slug
        )
        ORDER BY ba.author_order, a.display_name
      )
      FROM book_authors ba
      JOIN authors a ON a.id = ba.author_id
      WHERE ba.book_id = b.id
    ),
    '[]'::json
  ) AS authors
`;

export async function findIssueSummaryForUser(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_issues,
       COUNT(DISTINCT book_id)::int AS unique_books_issued,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_issues,
       COUNT(*) FILTER (WHERE status = 'returned')::int AS returned_issues,
       COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_issues
     FROM book_issues
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

export async function findCatalogEstimatesForUser(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS unique_books,
       COUNT(*) FILTER (WHERE estimated_reading_minutes IS NOT NULL)::int
         AS books_with_estimate,
       COALESCE(SUM(estimated_reading_minutes), 0)::int AS estimated_minutes,
       COUNT(*) FILTER (WHERE total_pages IS NOT NULL)::int AS books_with_pages,
       COALESCE(SUM(total_pages), 0)::int AS estimated_pages
     FROM (
       SELECT DISTINCT ON (i.book_id)
         b.estimated_reading_minutes,
         b.total_pages
       FROM book_issues i
       JOIN books b ON b.id = i.book_id
       WHERE i.user_id = $1
       ORDER BY i.book_id
     ) issued_books`,
    [userId]
  );

  return result.rows[0];
}

export async function findTokensSpentOnIssues(userId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(-amount), 0)::int AS tokens_spent
     FROM token_transactions
     WHERE user_id = $1
       AND transaction_type = 'book_issue'
       AND amount < 0`,
    [userId]
  );

  return result.rows[0].tokens_spent;
}

export async function findCategoryBreakdownForUser(userId) {
  const result = await pool.query(
    `SELECT
       c.name,
       c.slug,
       COUNT(DISTINCT i.book_id)::int AS book_count
     FROM book_issues i
     JOIN book_categories bc ON bc.book_id = i.book_id
     JOIN categories c ON c.id = bc.category_id
     WHERE i.user_id = $1
     GROUP BY c.id, c.name, c.slug
     ORDER BY book_count DESC, c.name ASC`,
    [userId]
  );

  return result.rows;
}

export async function listActiveIssuesForUser(userId, limit) {
  const result = await pool.query(
    `SELECT ${ISSUE_BOOK_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.user_id = $1 AND i.status = 'active'
     ORDER BY i.issued_at DESC, i.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

export async function listRecentIssuesForUser(userId, limit) {
  const result = await pool.query(
    `SELECT ${ISSUE_BOOK_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.user_id = $1
     ORDER BY i.issued_at DESC, i.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

export async function findReadingProgressSummaryForUser(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE progress_percent > 0)::int AS books_started,
       COUNT(*) FILTER (WHERE progress_percent >= 100)::int AS books_completed,
       COALESCE(
         AVG(progress_percent) FILTER (WHERE progress_percent > 0),
         0
       ) AS average_progress
     FROM reading_progress
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

export async function listReadingProgressBooksForUser(userId) {
  const result = await pool.query(
    `SELECT
       b.id AS book_id,
       b.title,
       b.slug,
       b.cover_image_key,
       rp.progress_percent,
       COALESCE(t.reading_seconds, 0)::int AS reading_seconds
     FROM (
       SELECT book_id FROM reading_progress WHERE user_id = $1
       UNION
       SELECT book_id FROM reading_sessions WHERE user_id = $1
     ) read_books
     JOIN books b ON b.id = read_books.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = $1 AND rp.book_id = b.id
     LEFT JOIN (
       SELECT book_id, SUM(duration_seconds)::int AS reading_seconds
       FROM reading_sessions
       WHERE user_id = $1
       GROUP BY book_id
     ) t ON t.book_id = b.id
     WHERE COALESCE(rp.progress_percent, 0) > 0
        OR COALESCE(t.reading_seconds, 0) > 0
     ORDER BY COALESCE(rp.updated_at, now()) DESC, b.title ASC`,
    [userId]
  );

  return result.rows;
}

export async function findReadingTimeSummaryForUser(userId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total_seconds
     FROM reading_sessions
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0].total_seconds;
}

export async function listRecentSessionsForUser(userId, limit) {
  const result = await pool.query(
    `SELECT
       s.id,
       s.book_id,
       b.title,
       s.started_at,
       s.ended_at,
       s.duration_seconds
     FROM reading_sessions s
     JOIN books b ON b.id = s.book_id
     WHERE s.user_id = $1
     ORDER BY COALESCE(s.ended_at, s.updated_at) DESC, s.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

export async function listRecentlyReturnedForUser(userId, limit) {
  const result = await pool.query(
    `SELECT ${ISSUE_BOOK_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.user_id = $1 AND i.status = 'returned'
     ORDER BY i.returned_at DESC NULLS LAST, i.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}
