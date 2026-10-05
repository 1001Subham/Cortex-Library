import config from '../config/index.js';
import pool from '../config/database.js';
import { HttpError } from '../middleware/httpError.js';
import { findPublishedBookById } from '../repositories/books.repository.js';
import {
  expireOverdueIssuesForUser,
  findActiveIssue,
  findIssueByIdForUser,
  insertActiveIssue,
  listIssuesForUser,
  markIssueReturned,
} from '../repositories/bookIssues.repository.js';
import {
  addWalletBalance,
  insertTokenTransaction,
  lockWalletForUser,
} from '../repositories/tokens.repository.js';
import { BOOK_ISSUE_TYPE, ensureWelcomeWallet } from './tokens.service.js';

export const DEFAULT_LOAN_DAYS = 14;

function toIssue(row) {
  return {
    id: row.id,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    returnedAt: row.returned_at,
    book: {
      id: row.book_id,
      title: row.title,
      slug: row.slug,
      coverImageKey: row.cover_image_key,
      authors: row.authors,
      contentAvailable: Boolean(row.content_storage_key && row.content_format),
    },
    progressPercent:
      row.progress_percent === null || row.progress_percent === undefined
        ? null
        : Number(row.progress_percent),
  };
}

export async function issuePublishedBook(userId, bookId) {
  const book = await findPublishedBookById(bookId);

  if (!book) {
    throw new HttpError(404, 'Book not found.');
  }

  await ensureWelcomeWallet(userId);

  const client = await pool.connect();
  const cost = config.tokens.bookIssueCost;

  try {
    await client.query('BEGIN');
    await expireOverdueIssuesForUser(userId, client);

    const existing = await findActiveIssue(userId, bookId, client);

    if (existing) {
      await client.query('ROLLBACK');
      throw new HttpError(409, 'This book is already in your library.');
    }

    const published = await client.query(
      `SELECT id
       FROM books
       WHERE id = $1 AND status = 'published'
       FOR SHARE`,
      [bookId]
    );

    if (!published.rows[0]) {
      await client.query('ROLLBACK');
      throw new HttpError(404, 'Book not found.');
    }

    const wallet = await lockWalletForUser(userId, client);

    if (!wallet) {
      await client.query('ROLLBACK');
      throw new HttpError(500, 'Token wallet is missing.');
    }

    const existingAfterLock = await findActiveIssue(userId, bookId, client);

    if (existingAfterLock) {
      await client.query('ROLLBACK');
      throw new HttpError(409, 'This book is already in your library.');
    }

    if (cost > 0 && wallet.balance < cost) {
      await client.query('ROLLBACK');
      throw new HttpError(402, 'Not enough tokens to issue this book.');
    }

    let deducted = wallet;

    if (cost > 0) {
      deducted = await addWalletBalance(userId, -cost, client);

      if (!deducted) {
        await client.query('ROLLBACK');
        throw new HttpError(402, 'Not enough tokens to issue this book.');
      }
    }

    const issueId = await insertActiveIssue(
      {
        userId,
        bookId,
        loanDays: DEFAULT_LOAN_DAYS,
      },
      client
    );

    if (cost > 0) {
      await insertTokenTransaction(
        {
          userId,
          amount: -cost,
          transactionType: BOOK_ISSUE_TYPE,
          description: `Issued book ${book.title}`,
          referenceId: issueId,
        },
        client
      );
    }

    const row = await findIssueByIdForUser(issueId, userId, client);
    await client.query('COMMIT');
    return toIssue(row);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Connection may already be rolled back.
    }

    if (error instanceof HttpError) {
      throw error;
    }

    if (error.code === '23505') {
      throw new HttpError(409, 'This book is already in your library.');
    }

    if (error.code === '23514') {
      throw new HttpError(402, 'Not enough tokens to issue this book.');
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function listUserLibrary(userId) {
  await expireOverdueIssuesForUser(userId);
  const rows = await listIssuesForUser(userId);
  return { issues: rows.map(toIssue) };
}

export async function returnUserIssue(userId, issueId) {
  // Returns do not refund tokens in this phase. A later product decision
  // can credit a token_transactions row if refunds are introduced.
  await expireOverdueIssuesForUser(userId);

  const existing = await findIssueByIdForUser(issueId, userId);

  if (!existing) {
    throw new HttpError(404, 'Issue not found.');
  }

  if (existing.status === 'returned') {
    throw new HttpError(409, 'This book has already been returned.');
  }

  if (existing.status !== 'active') {
    throw new HttpError(409, 'Only an active issue can be returned.');
  }

  const updated = await markIssueReturned(issueId, userId);

  if (!updated) {
    throw new HttpError(409, 'Only an active issue can be returned.');
  }

  const row = await findIssueByIdForUser(issueId, userId);
  return toIssue(row);
}
