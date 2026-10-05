import { useEffect, useState } from 'react';
import BookCover from '../components/BookCover';
import { useAuth } from '../context/AuthContext';
import { useTokens } from '../context/TokenContext';
import {
  catalogHash,
  libraryHash,
  loginHash,
  readerHash,
} from '../hooks/useHashRoute';
import { getBook, issueBook, listLibrary } from '../services/api';

function BookDetailsPage({ bookId }) {
  const { user, ready } = useAuth();
  const { balance, issueCost, refreshTokens } = useTokens();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [issueLookupReady, setIssueLookupReady] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState(null);
  const [issueSuccess, setIssueSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBook(null);
    setActiveIssue(null);
    setIssueError(null);
    setIssueSuccess(null);

    getBook(bookId)
      .then((data) => {
        if (!cancelled) {
          setBook(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.status === 404
              ? 'This book is not in the catalog.'
              : err.message || 'Unable to load book details.'
          );
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
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return undefined;
    }

    if (!user) {
      setActiveIssue(null);
      setIssueLookupReady(true);
      return undefined;
    }

    setIssueLookupReady(false);

    listLibrary()
      .then((data) => {
        if (cancelled) {
          return;
        }

        const match = (data.issues || []).find(
          (issue) => issue.book.id === bookId && issue.status === 'active'
        );
        setActiveIssue(match || null);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveIssue(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIssueLookupReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, ready, user]);

  async function handleIssue() {
    setIssueError(null);
    setIssueSuccess(null);
    setIssueLoading(true);

    try {
      const data = await issueBook(bookId);
      setActiveIssue(data.issue);
      setIssueSuccess('Issued to My Library.');
      await refreshTokens();
    } catch (err) {
      if (err.status === 409) {
        try {
          const library = await listLibrary();
          const match = (library.issues || []).find(
            (issue) => issue.book.id === bookId && issue.status === 'active'
          );
          if (match) {
            setActiveIssue(match);
          }
        } catch {
          // Keep the API error message if the library refresh fails.
        }
      }

      setIssueError(err.message || 'Unable to issue this book.');
    } finally {
      setIssueLoading(false);
    }
  }

  const canRead = book?.content?.available && book.content.format === 'html';
  const tokensReady = !user || issueCost !== null;
  const hasEnoughTokens =
    balance !== null && issueCost !== null && balance >= issueCost;

  return (
    <main className="page page--detail">
      <a className="back-link" href={catalogHash()}>
        Back to catalog
      </a>

      {loading && <p className="status">Loading book…</p>}

      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {book && (
        <article className="book-detail">
          <BookCover
            className="book-cover--large"
            title={book.title}
            coverImageKey={book.coverImageKey}
          />
          <div>
            <p className="eyebrow">Title details</p>
            <h1>{book.title}</h1>
            <p className="book-detail__authors">
              {book.authors?.map((author) => author.displayName).join(', ')}
            </p>
            <p className="book-detail__categories">
              {book.categories?.map((category) => category.name).join(' · ')}
            </p>
            <p className="lede">{book.description}</p>
            <dl className="meta-list">
              <div>
                <dt>Published</dt>
                <dd>{book.publicationYear || '—'}</dd>
              </div>
              <div>
                <dt>Publisher</dt>
                <dd>{book.publisher || '—'}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{book.languageCode}</dd>
              </div>
              <div>
                <dt>Catalog access</dt>
                <dd>Public browse</dd>
              </div>
              <div>
                <dt>Issue cost</dt>
                <dd>
                  {issueCost === null
                    ? user
                      ? 'Loading…'
                      : 'Sign in to issue'
                    : `${issueCost} token${issueCost === 1 ? '' : 's'}`}
                </dd>
              </div>
              <div>
                <dt>My Library</dt>
                <dd>
                  {!ready || !user
                    ? 'Sign in to issue this title to your account'
                    : activeIssue
                      ? `Issued · due ${new Date(activeIssue.dueAt).toLocaleDateString()}`
                      : 'Not issued to your account'}
                </dd>
              </div>
              {book.content?.available && (
                <div>
                  <dt>Reading time</dt>
                  <dd>
                    About {book.content.estimatedReadingMinutes} min ·{' '}
                    {book.content.totalPages} pages
                  </dd>
                </div>
              )}
            </dl>

            {issueError && (
              <div className="banner banner--error" role="alert">
                <p>{issueError}</p>
              </div>
            )}

            {issueSuccess && (
              <div className="banner banner--success" role="status">
                <p>{issueSuccess}</p>
              </div>
            )}

            <div className="hero__actions">
              {ready && !user ? (
                <a
                  className="button button--primary"
                  href={loginHash(`/books/${book.id}`)}
                >
                  Log in to issue
                </a>
              ) : null}

              {ready && user && issueLookupReady && tokensReady && !activeIssue ? (
                hasEnoughTokens ? (
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleIssue}
                    disabled={issueLoading}
                  >
                    {issueLoading
                      ? 'Issuing…'
                      : `Issue for ${issueCost} token${issueCost === 1 ? '' : 's'}`}
                  </button>
                ) : (
                  <button type="button" className="button button--ghost" disabled>
                    Not enough tokens
                  </button>
                )
              ) : null}

              {activeIssue ? (
                <>
                  {canRead ? (
                    <a className="button button--primary" href={readerHash(book.id)}>
                      Read book
                    </a>
                  ) : null}
                  <a className="button button--ghost" href={libraryHash()}>
                    Already in My Library
                  </a>
                </>
              ) : null}

              <a className="button button--ghost" href={catalogHash()}>
                View catalog
              </a>
            </div>
          </div>
        </article>
      )}
    </main>
  );
}

export default BookDetailsPage;
