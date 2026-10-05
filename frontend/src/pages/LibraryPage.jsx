import { useCallback, useEffect, useState } from 'react';
import BookCover from '../components/BookCover';
import { useAuth } from '../context/AuthContext';
import {
  analyticsHash,
  bookHash,
  catalogHash,
  loginHash,
  readerHash,
} from '../hooks/useHashRoute';
import { listLibrary, returnIssue } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { progressStatusLabel } from '../utils/readingProgress';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}

function LibraryPage() {
  const { user, ready } = useAuth();
  const { balance, issueCost } = useTokens();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [returningId, setReturningId] = useState(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listLibrary();
      setIssues(data.issues || []);
    } catch (err) {
      setError(err.message || 'Unable to load My Library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !user) {
      setIssues([]);
      setLoading(false);
      return;
    }

    loadLibrary();
  }, [loadLibrary, ready, user]);

  async function handleReturn(issueId) {
    setNotice(null);
    setError(null);
    setReturningId(issueId);

    try {
      const data = await returnIssue(issueId);
      setIssues((current) =>
        current.map((issue) => (issue.id === issueId ? data.issue : issue))
      );
      setNotice('Book returned.');
    } catch (err) {
      setError(err.message || 'Unable to return this book.');
    } finally {
      setReturningId(null);
    }
  }

  if (!ready) {
    return (
      <main className="page page--library">
        <p className="status">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page page--library">
        <header className="page__header">
          <p className="eyebrow">My Library</p>
          <h1>Issued books</h1>
          <p className="lede">
            Sign in to issue published titles from the public catalog and keep
            them on your shelf.
          </p>
        </header>
        <div className="banner banner--error" role="status">
          <p>Log in to view and manage your issued books.</p>
        </div>
        <a className="button button--primary" href={loginHash('/library')}>
          Log in
        </a>
      </main>
    );
  }

  const activeIssues = issues.filter((issue) => issue.status === 'active');
  const pastIssues = issues.filter((issue) => issue.status !== 'active');

  return (
    <main className="page page--library">
      <header className="page__header">
        <p className="eyebrow">My Library</p>
        <h1>Issued books</h1>
        <p className="lede">
          These titles are issued to {user.email}. Returning a book does not
          refund tokens. The public catalog and reader remain available to
          everyone; this shelf is only yours.
        </p>
        <p className="library-tokens">
          Tokens: {balance === null ? '—' : balance}
          {issueCost !== null
            ? ` · Issue cost: ${issueCost} token${issueCost === 1 ? '' : 's'}`
            : ''}
        </p>
        <div className="hero__actions">
          <a className="button button--ghost" href={analyticsHash()}>
            Reading analytics
          </a>
        </div>
      </header>

      {loading && <p className="status">Loading your library…</p>}

      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadLibrary}>
            Try again
          </button>
        </div>
      )}

      {notice && (
        <div className="banner banner--success" role="status">
          <p>{notice}</p>
        </div>
      )}

      {!loading && !error && issues.length === 0 && (
        <div className="empty-library">
          <p>You have not issued any books yet.</p>
          <a className="button button--primary" href={catalogHash()}>
            Browse the catalog
          </a>
        </div>
      )}

      {activeIssues.length > 0 && (
        <section className="library-section">
          <h2>On loan</h2>
          <ul className="library-list">
            {activeIssues.map((issue) => (
              <LibraryItem
                key={issue.id}
                issue={issue}
                returning={returningId === issue.id}
                onReturn={handleReturn}
              />
            ))}
          </ul>
        </section>
      )}

      {pastIssues.length > 0 && (
        <section className="library-section">
          <h2>Previously issued</h2>
          <ul className="library-list">
            {pastIssues.map((issue) => (
              <LibraryItem
                key={issue.id}
                issue={issue}
                returning={returningId === issue.id}
                onReturn={handleReturn}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function LibraryItem({ issue, returning, onReturn }) {
  const authors =
    issue.book.authors?.map((author) => author.displayName).join(', ') ||
    'Unknown author';
  const canRead = issue.book.contentAvailable;
  const isActive = issue.status === 'active';

  return (
    <li className="library-item">
      <BookCover
        className="book-cover--library"
        title={issue.book.title}
        coverImageKey={issue.book.coverImageKey}
      />
      <div className="library-item__body">
        <p className="library-item__status">{issue.status}</p>
        <h3>
          <a href={bookHash(issue.book.id)}>{issue.book.title}</a>
        </h3>
        <p>{authors}</p>
        <p className="library-item__dates">
          Issued {formatDate(issue.issuedAt)} · Due {formatDate(issue.dueAt)}
          {issue.returnedAt ? ` · Returned ${formatDate(issue.returnedAt)}` : ''}
        </p>
        {isActive ? (
          <p className="library-item__progress">
            {progressStatusLabel(issue.progressPercent)}
          </p>
        ) : null}
        <div className="hero__actions">
          {isActive && canRead ? (
            <a className="button button--primary button--small" href={readerHash(issue.book.id)}>
              {typeof issue.progressPercent === 'number' && issue.progressPercent > 0
                ? 'Continue reading'
                : 'Read'}
            </a>
          ) : null}
          {isActive ? (
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => onReturn(issue.id)}
              disabled={returning}
            >
              {returning ? 'Returning…' : 'Return book'}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default LibraryPage;
