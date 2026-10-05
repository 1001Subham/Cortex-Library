import { HttpError } from '../middleware/httpError.js';
import { requireActiveIssuedBook } from './bookContent.service.js';
import {
  findProgressForUserBook,
  upsertProgressForUserBook,
} from '../repositories/readingProgress.repository.js';

function emptyProgress(bookId) {
  return {
    bookId,
    progressPercent: null,
    updatedAt: null,
  };
}

export async function getBookProgress(userId, bookId) {
  await requireActiveIssuedBook(userId, bookId);
  const progress = await findProgressForUserBook(userId, bookId);
  return progress || emptyProgress(bookId);
}

export async function saveBookProgress(userId, bookId, progressPercent) {
  await requireActiveIssuedBook(userId, bookId);
  const progress = await upsertProgressForUserBook(
    userId,
    bookId,
    progressPercent
  );

  if (!progress) {
    throw new HttpError(500, 'Unable to save reading progress.');
  }

  return progress;
}
