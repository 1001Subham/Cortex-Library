import BookCover from './BookCover';
import { bookHash } from '../hooks/useHashRoute';

function BookCard({ book }) {
  const authors = book.authors?.map((author) => author.displayName).join(', ');
  const categories = book.categories?.map((category) => category.name).join(' · ');

  return (
    <a className="book-card" href={bookHash(book.id)}>
      <BookCover title={book.title} coverImageKey={book.coverImageKey} />
      <div className="book-card__body">
        <h2 className="book-card__title">{book.title}</h2>
        <p className="book-card__meta">{authors || 'Unknown author'}</p>
        {categories && <p className="book-card__categories">{categories}</p>}
        <p className="book-card__description">{book.description}</p>
      </div>
    </a>
  );
}

export default BookCard;
