import { useEffect, useState } from 'react';
import BookCover from '../components/BookCover';
import { useAuth } from '../context/AuthContext';
import {
  bookHash,
  catalogHash,
  libraryHash,
  loginHash,
  readerHash,
} from '../hooks/useHashRoute';
import { getAnalytics } from '../services/api';
import {
  displayProgressPercent,
  progressStatusLabel,
} from '../utils/readingProgress';

function progressTableLabel(percent) {
  const shown = displayProgressPercent(percent);

  if (shown === null || shown <= 0) {
    return 'Not started';
  }

  if (shown >= 100) {
    return 'Completed';
  }

  return `${shown}%`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}

function formatMinutes(minutes) {
  if (!minutes) {
    return '0 min';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatTrackedDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));

  if (total === 0) {
    return '0 min';
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return remainder ? `${minutes} min ${remainder}s` : `${minutes} min`;
  }

  return `${remainder}s`;
}

function AnalyticsPage() {
  const { user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready || !user) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAnalytics()
      .then((report) => {
        if (!cancelled) {
          setData(report);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Unable to load reading analytics.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, reloadKey]);

  if (!ready) {
    return (
      <main className="page page--analytics">
        <p className="status">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page page--analytics">
        <header className="page__header">
          <p className="eyebrow">Reading analytics</p>
          <h1>Your reading report</h1>
          <p className="lede">
            Sign in to see saved progress, measured reading time, issued titles,
            and token activity for your account only.
          </p>
        </header>
        <div className="banner banner--error" role="status">
          <p>Log in to view your reading analytics.</p>
        </div>
        <a className="button button--primary" href={loginHash('/analytics')}>
          Log in
        </a>
      </main>
    );
  }

  const maxCategory = data?.categoryBreakdown?.reduce(
    (max, item) => Math.max(max, item.uniqueBooks),
    0
  );
  const readingProgress = data?.readingProgress;
  const readingProgressBooks = Array.isArray(readingProgress?.books)
    ? readingProgress.books
    : [];
  const hasReadingProgress =
    Boolean(readingProgress && Array.isArray(readingProgress.books));
  const hasRecordedTime = (data?.readingTime?.totalSeconds || 0) > 0;

  return (
    <main className="page page--analytics">
      <header className="page__header">
        <p className="eyebrow">Reading analytics</p>
        <h1>Your reading report</h1>
        <p className="lede">
          Activity for {user.email}. Progress comes from your saved reader
          position. Reading time is measured only while the reader is active
          and visible.
        </p>
        <div className="hero__actions">
          <a className="button button--ghost" href={libraryHash()}>
            My Library
          </a>
          <a className="button button--ghost" href={catalogHash()}>
            Catalog
          </a>
        </div>
      </header>

      {loading && <p className="status">Loading your analytics…</p>}

      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && !data.hasIssueHistory && (
        <div className="empty-library">
          <p>
            You have no reading history yet. Issue a title from the catalog to
            start a personal report.
          </p>
          <a className="button button--primary" href={catalogHash()}>
            Browse the catalog
          </a>
        </div>
      )}

      {!loading && !error && data?.hasIssueHistory && (
        <>
          <section className="analytics-grid" aria-label="Issue summary">
            <StatCard
              label="Books issued"
              value={data.summary.uniqueBooksIssued}
              hint="Unique titles on your account"
            />
            <StatCard
              label="Total loans"
              value={data.summary.totalIssues}
              hint="Including re-issues after a return"
            />
            <StatCard
              label="Currently issued"
              value={data.summary.activeIssues}
              hint="Active loans in My Library"
            />
            <StatCard
              label="Returned"
              value={data.summary.returnedIssues}
              hint="Loans you have returned"
            />
            <StatCard
              label="Expired"
              value={data.summary.expiredIssues}
              hint="Loans past due that were marked expired"
            />
            <StatCard
              label="Tokens spent"
              value={data.summary.tokensSpentOnIssues}
              hint="Spent issuing books; returns do not refund"
            />
          </section>

          <section className="analytics-panel">
            <h2>Reading Progress</h2>
            {!hasReadingProgress ? (
              <p className="analytics-note" role="status">
                Saved reading progress is unavailable from the analytics
                service right now. Other available report data is shown below.
              </p>
            ) : (
              <>
                <section className="analytics-grid" aria-label="Reading progress">
                  <StatCard
                    label="Books started"
                    value={readingProgress?.booksStarted ?? '—'}
                    hint="Titles with saved progress above 0%"
                  />
                  <StatCard
                    label="Books completed"
                    value={readingProgress?.booksCompleted ?? '—'}
                    hint="Titles saved at 100%"
                  />
                  <StatCard
                    label="Average progress"
                    value={
                      Number.isFinite(readingProgress?.averageProgressPercent)
                        ? `${Math.round(readingProgress.averageProgressPercent)}%`
                        : '—'
                    }
                    hint="Across books you have started"
                  />
                </section>
                {readingProgressBooks.length === 0 ? (
                  <p className="analytics-note">
                    No saved reader progress yet. Open an issued book to start
                    tracking.
                  </p>
                ) : (
                  <ul className="analytics-progress-list">
                    <li
                      className="analytics-progress-list__head"
                      aria-hidden="true"
                    >
                      <span>Book</span>
                      <span>Progress</span>
                      <span>Reading Time</span>
                    </li>
                    {readingProgressBooks.map((book) => (
                      <li key={book.bookId}>
                        <a href={bookHash(book.bookId)}>{book.title}</a>
                        <span>{progressTableLabel(book.progressPercent)}</span>
                        <span>
                          {formatTrackedDuration(book.readingTimeSeconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className="analytics-panel">
            <h2>Total Reading Time</h2>
            <p className="analytics-time">
              {formatTrackedDuration(data.readingTime.totalSeconds)}
            </p>
            <p className="analytics-note">
              {hasRecordedTime
                ? 'Measured while the in-app reader was visible and active. This is not catalog estimated length.'
                : 'No reading time recorded yet.'}
            </p>
          </section>

          <section className="analytics-panel">
            <h2>Catalog estimates</h2>
            {data.catalogEstimates.available ? (
              <>
                <p className="analytics-note">{data.catalogEstimates.note}</p>
                <dl className="analytics-estimates">
                  <div>
                    <dt>Estimated book length</dt>
                    <dd>
                      {formatMinutes(
                        data.catalogEstimates.totalEstimatedReadingMinutes
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Catalog page count</dt>
                    <dd>{data.catalogEstimates.totalCatalogPages} pages</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="analytics-note">
                Catalog page and length estimates are not available for your
                issued titles.
              </p>
            )}
          </section>

          {data.categoryBreakdown.length > 0 && (
            <section className="analytics-panel">
              <h2>Issued by category</h2>
              <ul className="analytics-bars">
                {data.categoryBreakdown.map((category) => (
                  <li key={category.slug}>
                    <div className="analytics-bars__meta">
                      <span>{category.name}</span>
                      <span>
                        {category.uniqueBooks} title
                        {category.uniqueBooks === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="analytics-bars__track" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.round(
                            (category.uniqueBooks / maxCategory) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <BookRow
            title="Currently reading"
            empty="You have no active issues."
            items={data.currentlyReading}
            showRead
            showProgress
          />
          <BookRow
            title="Recently issued"
            empty="No recent issues."
            items={data.recentlyIssued}
          />
          <BookRow
            title="Recently returned"
            empty="You have not returned any books yet."
            items={data.recentlyReturned}
          />
        </>
      )}

      {!loading && !error && data && (
        <section className="analytics-panel" aria-label="Camera visual cues">
          <h2>Optional camera visual cues</h2>
          {data.visualCues?.available ? (
            <>
              <ul className="analytics-unavailable">
                <li>{data.visualCues.sessionsMeasured} reading sessions sampled across {data.visualCues.samples} frames.</li>
                <li>{data.visualCues.faceDetected} samples with a face visible; {data.visualCues.noFaceDetected} with no face detected.</li>
                <li>{data.visualCues.facingForward} generally forward-facing samples; {data.visualCues.turnedAway} turned-away samples.</li>
              </ul>
              <p className="analytics-note">{data.visualCues.note} Raw camera frames are not retained.</p>
            </>
          ) : (
            <p className="analytics-note">
              No optional camera samples are recorded. Enable visual cues in the Reader to collect per-session face visibility and approximate head-direction signals.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <article className="analytics-stat">
      <p className="analytics-stat__label">{label}</p>
      <p className="analytics-stat__value">{value}</p>
      <p className="analytics-stat__hint">{hint}</p>
    </article>
  );
}

function BookRow({ title, empty, items, showRead = false, showProgress = false }) {
  return (
    <section className="analytics-panel">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="analytics-note">{empty}</p>
      ) : (
        <ul className="analytics-books">
          {items.map((item) => {
            const authors =
              item.book.authors?.map((author) => author.displayName).join(', ') ||
              'Unknown author';

            return (
              <li key={item.issueId} className="analytics-book">
                <BookCover
                  className="book-cover--library"
                  title={item.book.title}
                  coverImageKey={item.book.coverImageKey}
                />
                <div className="library-item__body">
                  <p className="library-item__status">{item.status}</p>
                  <h3>
                    <a href={bookHash(item.book.id)}>{item.book.title}</a>
                  </h3>
                  <p>{authors}</p>
                  <p className="library-item__dates">
                    Issued {formatDate(item.issuedAt)}
                    {item.returnedAt
                      ? ` · Returned ${formatDate(item.returnedAt)}`
                      : ` · Due ${formatDate(item.dueAt)}`}
                  </p>
                  {showProgress ? (
                    <p className="library-item__progress">
                      {progressStatusLabel(item.progressPercent)}
                      {item.readingTimeSeconds
                        ? ` · ${formatTrackedDuration(item.readingTimeSeconds)}`
                        : ''}
                    </p>
                  ) : null}
                  <div className="hero__actions">
                    {showRead && item.status === 'active' && item.book.contentAvailable ? (
                      <a
                        className="button button--primary button--small"
                        href={readerHash(item.book.id)}
                      >
                        Continue reading
                      </a>
                    ) : null}
                    <a className="button button--ghost button--small" href={bookHash(item.book.id)}>
                      Details
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AnalyticsPage;
