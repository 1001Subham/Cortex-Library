const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SORT_VALUES = new Set(['title', 'published_at', 'publication_year']);

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function parseBookId(value) {
  if (!isUuid(value)) {
    return { error: 'Book id must be a valid UUID.' };
  }

  return { value };
}

export function parseBookListQuery(query) {
  const pageRaw = query.page === undefined ? '1' : String(query.page);
  const limitRaw = query.limit === undefined ? '10' : String(query.limit);
  const page = Number.parseInt(pageRaw, 10);
  const limit = Number.parseInt(limitRaw, 10);

  if (!Number.isInteger(page) || page < 1) {
    return { error: 'page must be a positive integer.' };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return { error: 'limit must be an integer between 1 and 50.' };
  }

  let q = null;
  if (query.q !== undefined && String(query.q).trim() !== '') {
    q = String(query.q).trim();
    if (q.length > 200) {
      return { error: 'q must be 200 characters or fewer.' };
    }
  }

  let category = null;
  if (query.category !== undefined && String(query.category).trim() !== '') {
    category = String(query.category).trim();
    if (!isUuid(category) && !SLUG_PATTERN.test(category)) {
      return { error: 'category must be a UUID or a slug.' };
    }
  }

  const sort = query.sort === undefined ? 'title' : String(query.sort);
  if (!SORT_VALUES.has(sort)) {
    return {
      error: 'sort must be one of: title, published_at, publication_year.',
    };
  }

  return { value: { page, limit, q, category, sort } };
}

export function escapeIlike(value) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
