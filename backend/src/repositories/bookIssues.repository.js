import pool from '../config/database.js';

const ISSUE_SELECT = `
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
  rp.progress_percent,
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

function db(client) {
  return client || pool;
}

export async function expireOverdueIssuesForUser(userId, client) {
  await db(client).query(
    `UPDATE book_issues
     SET status = 'expired', updated_at = now()
     WHERE user_id = $1
       AND status = 'active'
       AND due_at < now()`,
    [userId]
  );
}

export async function findActiveIssue(userId, bookId, client) {
  const result = await db(client).query(
    `SELECT ${ISSUE_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.user_id = $1 AND i.book_id = $2 AND i.status = 'active'
     LIMIT 1`,
    [userId, bookId]
  );

  return result.rows[0] ?? null;
}

export async function insertActiveIssue({ userId, bookId, loanDays }, client) {
  const result = await db(client).query(
    `INSERT INTO book_issues (user_id, book_id, status, due_at)
     VALUES ($1, $2, 'active', now() + ($3::int * interval '1 day'))
     RETURNING id`,
    [userId, bookId, loanDays]
  );

  return result.rows[0].id;
}

export async function findIssueByIdForUser(issueId, userId, client) {
  const result = await db(client).query(
    `SELECT ${ISSUE_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.id = $1 AND i.user_id = $2
     LIMIT 1`,
    [issueId, userId]
  );

  return result.rows[0] ?? null;
}

export async function markIssueReturned(issueId, userId) {
  const result = await pool.query(
    `UPDATE book_issues
     SET status = 'returned', returned_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     RETURNING id`,
    [issueId, userId]
  );

  return result.rows[0] ?? null;
}

export async function listIssuesForUser(userId) {
  const result = await pool.query(
    `SELECT ${ISSUE_SELECT}
     FROM book_issues i
     JOIN books b ON b.id = i.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = i.user_id AND rp.book_id = i.book_id
     WHERE i.user_id = $1
     ORDER BY i.issued_at DESC, i.id DESC`,
    [userId]
  );

  return result.rows;
}
