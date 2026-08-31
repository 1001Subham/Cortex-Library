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
    <main className="reader">
      <header className="reader__chrome">
        <div className="reader__chrome-inner">
          {book ? (
            <a className="reader__nav" href={bookHash(book.id)}>
              Details
            </a>
          ) : (
            <a className="reader__nav" href={catalogHash()}>
              Catalog
            </a>
          )}
          <div className="reader__chrome-title">
            {book && (
              <>
                <p className="eyebrow">Now reading</p>
                <h1>{book.title}</h1>
                {authors && <p>{authors}</p>}
              </>
            )}
          </div>
          <a className="reader__nav" href={catalogHash()}>
            Library
          </a>
        </div>
      </header>

      <div className="reader__stage">
        {loading && <p className="status">Opening book…</p>}

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

        {readableHtml && (
          <article
            className="reader__page"
            dangerouslySetInnerHTML={{ __html: readableHtml }}
          />
        )}
      </div>
    </main>
  );
}

export default ReaderPage;
