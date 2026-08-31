import { useEffect, useMemo, useState } from 'react';
import { bookHash, catalogHash } from '../hooks/useHashRoute';
import { getBook, getBookContent } from '../services/api';
import { extractReadableHtml } from '../utils/readableHtml';

function ReaderPage({ bookId }) {
  const [book, setBook] = useState(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missingContent, setMissingContent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setMissingContent(false);
      setBook(null);
      setHtml('');

      try {
        const details = await getBook(bookId);

        if (cancelled) {
          return;
        }

        setBook(details);

        if (!details.content?.available || details.content.format !== 'html') {
          setMissingContent(true);
          return;
        }

        const content = await getBookContent(bookId);

        if (cancelled) {
          return;
        }

        if (!extractReadableHtml(content)) {
          setMissingContent(true);
          return;
        }

        setHtml(content);
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err.status === 404) {
          setError(
            err.message === 'Book not found.'
              ? 'This book is not in the catalog.'
              : 'This book has no readable content in the library.'
          );
        } else {
          setError(err.message || 'Unable to open the reader.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const readableHtml = useMemo(() => extractReadableHtml(html), [html]);
  const authors = book?.authors?.map((author) => author.displayName).join(', ');

  return (
    <main className="page page--reader">
      <div className="reader-toolbar">
        {book ? (
          <a className="back-link" href={bookHash(book.id)}>
            Back to details
          </a>
        ) : (
          <a className="back-link" href={catalogHash()}>
            Back to catalog
          </a>
        )}
        <a className="back-link" href={catalogHash()}>
          Library
        </a>
      </div>

      {loading && <p className="status">Opening book...</p>}

      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {missingContent && (
        <div className="banner banner--error" role="alert">
          <p>This title does not have in-library HTML content yet.</p>
        </div>
      )}

      {book && !loading && (
        <header className="reader-header">
          <p className="eyebrow">In-library reader</p>
          <h1>{book.title}</h1>
          {authors && <p className="book-detail__authors">{authors}</p>}
        </header>
      )}

      {readableHtml && (
        <article
          className="reader-content"
          dangerouslySetInnerHTML={{ __html: readableHtml }}
        />
      )}
    </main>
  );
}

export default ReaderPage;
