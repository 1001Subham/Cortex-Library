import pool from '../config/database.js';
import { escapeIlike, isUuid } from '../validators/books.validator.js';

const SORT_SQL = {
  title: 'b.title ASC, b.id ASC',
  published_at: 'b.published_at DESC NULLS LAST, b.title ASC, b.id ASC',
  publication_year:
    'b.publication_year DESC NULLS LAST, b.title ASC, b.id ASC',
};

const BOOK_JSON_SELECT = `
  b.id,
  b.title,
  b.slug,
  b.description,
  b.isbn,
  b.publication_year,
  b.publisher,
  b.language_code,
  b.cover_image_key,
  b.content_storage_key,
  b.content_format,
  b.content_byte_size,
  b.total_pages,
  b.estimated_reading_minutes,
  b.status,
  b.published_at,
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
  ) AS authors,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'parentId', c.parent_id
        )
        ORDER BY c.name
      )
      FROM book_categories bc
      JOIN categories c ON c.id = bc.category_id
      WHERE bc.book_id = b.id
    ),
    '[]'::json
  ) AS categories
`;

export async function findCategoryId(category) {
  const column = isUuid(category) ? 'id' : 'slug';
  const result = await pool.query(
    `SELECT id FROM categories WHERE ${column} = $1 LIMIT 1`,
    [category]
  );

  return result.rows[0]?.id ?? null;
}

export async function listPublishedBooks({ page, limit, q, categoryId, sort }) {
  const where = ['b.status = \'published\''];
  const params = [];

  if (q) {
    params.push(`%${escapeIlike(q)}%`);
    where.push(`b.title ILIKE $${params.length} ESCAPE '\\'`);
  }

  if (categoryId) {
    params.push(categoryId);
    where.push(`EXISTS (
      SELECT 1
      FROM book_categories bc
      WHERE bc.book_id = b.id
        AND bc.category_id IN (
          WITH RECURSIVE cat_tree AS (
            SELECT id FROM categories WHERE id = $${params.length}
            UNION ALL
            SELECT c.id
            FROM categories c
            JOIN cat_tree t ON c.parent_id = t.id
          )
          SELECT id FROM cat_tree
        )
    )`);
  }

  const whereSql = where.join(' AND ');
  const orderSql = SORT_SQL[sort] || SORT_SQL.title;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM books b WHERE ${whereSql}`,
    params
  );

  const offset = (page - 1) * limit;
  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const listResult = await pool.query(
    `SELECT ${BOOK_JSON_SELECT}
     FROM books b
     WHERE ${whereSql}
     ORDER BY ${orderSql}
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0].total,
  };
}

export async function findPublishedBookById(id) {
  const result = await pool.query(
    `SELECT ${BOOK_JSON_SELECT}
     FROM books b
     WHERE b.id = $1 AND b.status = 'published'
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}
