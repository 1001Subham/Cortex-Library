import BookCover from './BookCover';
import { bookHash } from '../hooks/useHashRoute';

function authorsOf(book) {
  return book.authors?.map((author) => author.displayName).join(', ');
}

function BookCard({ book, compact = false }) {
  const authors = authorsOf(book);

  return (
    <article className={`book-card${compact ? ' book-card--compact' : ''}`}>
      <a className="book-card__cover" href={bookHash(book.id)}>
        <BookCover title={book.title} coverImageKey={book.coverImageKey} />
      </a>
      <div className="book-card__body">
        <h2 className="book-card__title">
          <a href={bookHash(book.id)}>{book.title}</a>
        </h2>
        <p className="book-card__meta">{authors || 'Unknown author'}</p>
        {!compact && book.categories?.length > 0 && (
          <ul className="book-card__tags">
            {book.categories.map((category) => (
              <li key={category.slug || category.name}>{category.name}</li>
            ))}
          </ul>
        )}
        <div className="book-card__actions">
          <a className="button button--primary button--small" href={bookHash(book.id)}>
            View details
          </a>
        </div>
      </div>
    </article>
  );
}

export default BookCard;
