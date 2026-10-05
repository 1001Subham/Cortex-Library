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
import { findVisualCueAggregateForUser } from '../repositories/readingAttention.repository.js';

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
    visualCueAggregate,
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
    findVisualCueAggregateForUser(userId),
  ]);

  const uniqueBooks = summary.unique_books_issued;
  const hasIssueHistory = summary.total_issues > 0;
  const booksStarted = progressSummary.books_started;
  const averageProgressPercent = booksStarted
    ? Math.round(Number(progressSummary.average_progress) * 100) / 100
    : 0;
  const visualCues = {
    available: Number(visualCueAggregate.samples) > 0,
    sessionsMeasured: Number(visualCueAggregate.sessions),
    samples: Number(visualCueAggregate.samples),
    faceDetected: Number(visualCueAggregate.face_detected),
    facingForward: Number(visualCueAggregate.forward_facing),
    turnedAway: Number(visualCueAggregate.turned_away),
    noFaceDetected: Number(visualCueAggregate.no_face_detected),
    lastSampledAt: visualCueAggregate.last_sampled_at,
    note: 'These are camera-based face visibility and approximate head-direction cues, not a measure of attention, understanding, emotion, or engagement.',
  };

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
    visualCues,
    categoryBreakdown: categories.map((row) => ({
      name: row.name,
      slug: row.slug,
      uniqueBooks: row.book_count,
    })),
    currentlyReading: currentlyReading.map(toAnalyticsBook),
    recentlyIssued: recentlyIssued.map(toAnalyticsBook),
    recentlyReturned: recentlyReturned.map(toAnalyticsBook),
    unavailable: {
      ...UNAVAILABLE,
      attention: visualCues.available
        ? { available: true, reason: null }
        : UNAVAILABLE.attention,
    },
  };
}
