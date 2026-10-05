import { expireOverdueIssuesForUser } from '../repositories/bookIssues.repository.js';
import {
  findCatalogEstimatesForUser,
  findCategoryBreakdownForUser,
  findIssueSummaryForUser,
  findReadingProgressSummaryForUser,
  findReadingTimeSummaryForUser,
  findTokensSpentOnIssues,
  listActiveIssuesForUser,
  listReadingProgressBooksForUser,
  listRecentIssuesForUser,
  listRecentlyReturnedForUser,
  listRecentSessionsForUser,
} from '../repositories/analytics.repository.js';

const LIST_LIMIT = 8;

const UNAVAILABLE = {
  attention: {
    available: false,
    reason:
      'Attention and engagement measurements are not stored yet.',
  },
};

function toProgressPercent(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toAnalyticsBook(row) {
  return {
    issueId: row.id,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    returnedAt: row.returned_at,
    progressPercent: toProgressPercent(row.progress_percent),
    readingTimeSeconds: Number(row.reading_seconds || 0),
    book: {
      id: row.book_id,
      title: row.title,
      slug: row.slug,
      coverImageKey: row.cover_image_key,
      authors: row.authors,
      contentAvailable: Boolean(row.content_storage_key && row.content_format),
      catalogEstimatedReadingMinutes: row.estimated_reading_minutes,
      catalogTotalPages: row.total_pages,
    },
  };
}

export async function getReaderAnalytics(userId) {
  await expireOverdueIssuesForUser(userId);

  const [
    summary,
    estimates,
    tokensSpent,
    categories,
    currentlyReading,
    recentlyIssued,
    recentlyReturned,
    progressSummary,
    progressBooks,
    totalReadingSeconds,
    recentSessions,
  ] = await Promise.all([
    findIssueSummaryForUser(userId),
    findCatalogEstimatesForUser(userId),
    findTokensSpentOnIssues(userId),
    findCategoryBreakdownForUser(userId),
    listActiveIssuesForUser(userId, LIST_LIMIT),
    listRecentIssuesForUser(userId, LIST_LIMIT),
    listRecentlyReturnedForUser(userId, LIST_LIMIT),
    findReadingProgressSummaryForUser(userId),
    listReadingProgressBooksForUser(userId),
    findReadingTimeSummaryForUser(userId),
    listRecentSessionsForUser(userId, LIST_LIMIT),
  ]);

  const uniqueBooks = summary.unique_books_issued;
  const hasIssueHistory = summary.total_issues > 0;
  const booksStarted = progressSummary.books_started;
  const averageProgressPercent = booksStarted
    ? Math.round(Number(progressSummary.average_progress) * 100) / 100
    : 0;

  return {
    hasIssueHistory,
    summary: {
      totalIssues: summary.total_issues,
      uniqueBooksIssued: uniqueBooks,
      activeIssues: summary.active_issues,
      returnedIssues: summary.returned_issues,
      expiredIssues: summary.expired_issues,
      tokensSpentOnIssues: tokensSpent,
    },
    catalogEstimates: {
      available: hasIssueHistory && estimates.books_with_estimate > 0,
      uniqueBooksWithEstimate: estimates.books_with_estimate,
      totalEstimatedReadingMinutes: estimates.estimated_minutes,
      uniqueBooksWithPageCount: estimates.books_with_pages,
      totalCatalogPages: estimates.estimated_pages,
      note: hasIssueHistory
        ? 'Catalog estimated book length for titles you have issued. This is not measured reading time.'
        : 'Catalog length estimates appear after you issue a book.',
    },
    readingProgress: {
      available: true,
      booksStarted,
      booksCompleted: progressSummary.books_completed,
      averageProgressPercent,
      books: progressBooks.map((row) => ({
        bookId: row.book_id,
        title: row.title,
        slug: row.slug,
        coverImageKey: row.cover_image_key,
        progressPercent: toProgressPercent(row.progress_percent),
        readingTimeSeconds: Number(row.reading_seconds || 0),
      })),
    },
    readingTime: {
      available: true,
      totalSeconds: totalReadingSeconds,
      totalMinutes: Math.floor(totalReadingSeconds / 60),
      recentSessions: recentSessions.map((row) => ({
        id: row.id,
        bookId: row.book_id,
        title: row.title,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationSeconds: Number(row.duration_seconds),
      })),
    },
    categoryBreakdown: categories.map((row) => ({
      name: row.name,
      slug: row.slug,
      uniqueBooks: row.book_count,
    })),
    currentlyReading: currentlyReading.map(toAnalyticsBook),
    recentlyIssued: recentlyIssued.map(toAnalyticsBook),
    recentlyReturned: recentlyReturned.map(toAnalyticsBook),
    unavailable: UNAVAILABLE,
  };
}
