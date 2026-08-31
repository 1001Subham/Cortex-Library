import { HttpError } from '../middleware/httpError.js';
import {
  findCategoryId,
  findPublishedBookById,
  listPublishedBooks,
} from '../repositories/books.repository.js';

function contentAvailability(row) {
  const available = Boolean(row.content_storage_key) && Boolean(row.content_format);

  return {
    available,
    format: row.content_format,
    totalPages: row.total_pages,
    estimatedReadingMinutes: row.estimated_reading_minutes,
    byteSize: row.content_byte_size,
  };
}

function toListItem(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    publicationYear: row.publication_year,
    languageCode: row.language_code,
    coverImageKey: row.cover_image_key,
    authors: row.authors,
    categories: row.categories.map(({ id, name, slug }) => ({ id, name, slug })),
    contentAvailable: contentAvailability(row).available,
  };
}

function toDetail(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    isbn: row.isbn,
    publicationYear: row.publication_year,
    publisher: row.publisher,
    languageCode: row.language_code,
    coverImageKey: row.cover_image_key,
    status: row.status,
    publishedAt: row.published_at,
    authors: row.authors,
    categories: row.categories,
    content: contentAvailability(row),
  };
}

export async function listBooks(filters) {
  let categoryId = null;

  if (filters.category) {
    categoryId = await findCategoryId(filters.category);
    if (!categoryId) {
      return {
        books: [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  const { rows, total } = await listPublishedBooks({
    page: filters.page,
    limit: filters.limit,
    q: filters.q,
    categoryId,
    sort: filters.sort,
  });

  return {
    books: rows.map(toListItem),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
    },
  };
}

export async function getBookById(id) {
  const row = await findPublishedBookById(id);

  if (!row) {
    throw new HttpError(404, 'Book not found.');
  }

  return toDetail(row);
}
