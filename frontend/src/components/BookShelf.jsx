import BookCard from './BookCard';

function BookShelf({ title, books }) {
  if (!books?.length) {
    return null;
  }

  return (
    <section className="book-shelf">
      <header className="book-shelf__header">
        <h2>{title}</h2>
      </header>
      <div className="book-shelf__track">
        {books.map((book) => (
          <BookCard key={book.id} book={book} compact />
        ))}
      </div>
    </section>
  );
}

export default BookShelf;
