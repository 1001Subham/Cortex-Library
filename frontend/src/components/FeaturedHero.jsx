import BookCover from './BookCover';
import { bookHash, readerHash } from '../hooks/useHashRoute';

function FeaturedHero({ book }) {
  if (!book) {
    return null;
  }

  const authors = book.authors?.map((author) => author.displayName).join(', ');
  const canRead = Boolean(book.contentAvailable);

  return (
    <section className="hero">
      <div className="hero__copy">
        <p className="eyebrow">Featured title</p>
        <h1>{book.title}</h1>
        {authors && <p className="hero__authors">{authors}</p>}
        {book.description && <p className="lede">{book.description}</p>}
        <div className="hero__actions">
          {canRead ? (
            <a className="button button--primary" href={readerHash(book.id)}>
              Read
            </a>
          ) : null}
          <a className="button button--ghost" href={bookHash(book.id)}>
            View details
          </a>
        </div>
      </div>
      <a className="hero__cover" href={bookHash(book.id)}>
        <BookCover
          className="book-cover--hero"
          title={book.title}
          coverImageKey={book.coverImageKey}
        />
      </a>
    </section>
  );
}

export default FeaturedHero;
