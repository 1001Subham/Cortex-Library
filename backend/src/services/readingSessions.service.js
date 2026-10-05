import { HttpError } from '../middleware/httpError.js';
import { requireActiveIssuedBook } from './bookContent.service.js';
import {
  addSessionDuration,
  findLatestSessionForUserBook,
  findOpenSessionForUserBook,
  insertOpenSession,
} from '../repositories/readingSessions.repository.js';

function emptySession(bookId) {
  return {
    id: null,
    bookId,
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
  };
}

async function ensureOpenSession(userId, bookId) {
  const existing = await findOpenSessionForUserBook(userId, bookId);

  if (existing) {
    return existing;
  }

  try {
    return await insertOpenSession(userId, bookId);
  } catch (error) {
    if (error.code === '23505') {
      const raced = await findOpenSessionForUserBook(userId, bookId);
      if (raced) {
        return raced;
      }
    }

    throw error;
  }
}

export async function startReadingSession(userId, bookId) {
  await requireActiveIssuedBook(userId, bookId);
  return ensureOpenSession(userId, bookId);
}

export async function heartbeatReadingSession(userId, bookId, elapsedSeconds) {
  await requireActiveIssuedBook(userId, bookId);
  const session = await ensureOpenSession(userId, bookId);
  const updated = await addSessionDuration(
    session.id,
    userId,
    elapsedSeconds,
    false
  );

  if (!updated) {
    throw new HttpError(500, 'Unable to update reading session.');
  }

  return updated;
}

export async function stopReadingSession(userId, bookId, elapsedSeconds) {
  await requireActiveIssuedBook(userId, bookId);
  const open = await findOpenSessionForUserBook(userId, bookId);

  if (!open) {
    return (await findLatestSessionForUserBook(userId, bookId)) || emptySession(bookId);
  }

  const updated = await addSessionDuration(
    open.id,
    userId,
    elapsedSeconds,
    true
  );

  if (!updated) {
    return (await findLatestSessionForUserBook(userId, bookId)) || emptySession(bookId);
  }

  return updated;
}
