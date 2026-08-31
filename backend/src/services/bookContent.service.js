import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import { HttpError } from '../middleware/httpError.js';
import { findPublishedBookById } from '../repositories/books.repository.js';

const CONTENT_UNAVAILABLE = 'Book content is not available.';

export function resolveHtmlContentPath(bookId, contentStorageKey, storageRoot) {
  if (typeof bookId !== 'string' || typeof contentStorageKey !== 'string') {
    throw new HttpError(404, CONTENT_UNAVAILABLE);
  }

  const expectedKey = `storage/books/${bookId}/content.html`;

  if (contentStorageKey.toLowerCase() !== expectedKey.toLowerCase()) {
    throw new HttpError(404, CONTENT_UNAVAILABLE);
  }

  const booksRoot = path.resolve(storageRoot, 'books');
  const filePath = path.resolve(booksRoot, bookId.toLowerCase(), 'content.html');
  const relative = path.relative(booksRoot, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new HttpError(404, CONTENT_UNAVAILABLE);
  }

  return filePath;
}

export async function getPublishedHtmlContentPath(id) {
  const row = await findPublishedBookById(id);

  if (!row) {
    throw new HttpError(404, 'Book not found.');
  }

  if (row.content_format !== 'html' || !row.content_storage_key) {
    throw new HttpError(404, CONTENT_UNAVAILABLE);
  }

  const filePath = resolveHtmlContentPath(
    row.id,
    row.content_storage_key,
    config.bookStorageRoot
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new HttpError(404, CONTENT_UNAVAILABLE);
  }

  return filePath;
}
