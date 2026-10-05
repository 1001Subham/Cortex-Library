import pool from '../config/database.js';

export async function listRecommendationHistory(userId) {
  const result = await pool.query(
    `SELECT
       b.id,
       b.title,
       COALESCE(rp.progress_percent, 0)::numeric AS progress_percent,
       COALESCE(session_totals.duration_seconds, 0)::int AS reading_seconds,
       COALESCE(
         (
           SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ORDER BY c.name)
           FROM book_categories bc
           JOIN categories c ON c.id = bc.category_id
           WHERE bc.book_id = b.id
         ),
         '[]'::json
       ) AS categories,
       COALESCE(
         (
           SELECT json_agg(json_build_object('id', a.id, 'displayName', a.display_name, 'slug', a.slug) ORDER BY ba.author_order, a.display_name)
           FROM book_authors ba
           JOIN authors a ON a.id = ba.author_id
           WHERE ba.book_id = b.id
         ),
         '[]'::json
       ) AS authors
     FROM (
       SELECT DISTINCT book_id FROM book_issues WHERE user_id = $1
     ) issued
     JOIN books b ON b.id = issued.book_id
     LEFT JOIN reading_progress rp
       ON rp.user_id = $1 AND rp.book_id = b.id
     LEFT JOIN LATERAL (
       SELECT SUM(duration_seconds)::int AS duration_seconds
       FROM reading_sessions
       WHERE user_id = $1 AND book_id = b.id
     ) session_totals ON TRUE
     ORDER BY b.title, b.id`,
    [userId]
  );

  return result.rows;
}

export async function listRecommendationCandidates(userId) {
  const result = await pool.query(
    `SELECT
       b.id,
       b.title,
       b.slug,
       b.description,
       b.publication_year,
       b.language_code,
       b.cover_image_key,
       b.estimated_reading_minutes,
       b.total_pages,
       COALESCE(
         (
           SELECT json_agg(json_build_object('id', a.id, 'displayName', a.display_name, 'slug', a.slug) ORDER BY ba.author_order, a.display_name)
           FROM book_authors ba
           JOIN authors a ON a.id = ba.author_id
           WHERE ba.book_id = b.id
         ),
         '[]'::json
       ) AS authors,
       COALESCE(
         (
           SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ORDER BY c.name)
           FROM book_categories bc
           JOIN categories c ON c.id = bc.category_id
           WHERE bc.book_id = b.id
         ),
         '[]'::json
       ) AS categories
     FROM books b
     WHERE b.status = 'published'
       AND b.content_storage_key IS NOT NULL
       AND b.content_format IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM book_issues i
         WHERE i.user_id = $1 AND i.book_id = b.id
       )
     ORDER BY b.title, b.id`,
    [userId]
  );

  return result.rows;
}
