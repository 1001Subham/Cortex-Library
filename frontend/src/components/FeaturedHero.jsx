import BookCover from './BookCover';
import { bookHash } from '../hooks/useHashRoute';

function FeaturedHero({ book }) {
  if (!book) {
    return null;
  }

  const authors = book.authors?.map((author) => author.displayName).join(', ');

  return (
    <section className="hero">
      <div className="hero__copy">
        <p className="eyebrow">Featured title</p>
        <h1>{book.title}</h1>
        {authors && <p className="hero__authors">{authors}</p>}
        {book.description && <p className="lede">{book.description}</p>}
        <div className="hero__actions">
          <a className="button button--primary" href={bookHash(book.id)}>
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
