import { useEffect, useState } from 'react';
import BookCover from '../components/BookCover';
import { catalogHash } from '../hooks/useHashRoute';
import { getBook } from '../services/api';

function BookDetailsPage({ bookId }) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBook(null);

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
            <p className="eyebrow">Book details</p>
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
                <dt>In-library content</dt>
                <dd>
                  {book.content?.available
                    ? `Available (${book.content.format})`
                    : 'Not yet available'}
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
          </div>
        </article>
      )}
    </main>
  );
}

export default BookDetailsPage;
