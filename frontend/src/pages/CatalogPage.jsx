import BookCard from '../components/BookCard';
import BookShelf from '../components/BookShelf';
import CatalogToolbar from '../components/CatalogToolbar';
import FeaturedHero from '../components/FeaturedHero';
import Pagination from '../components/Pagination';
import { useCatalog } from '../hooks/useCatalog';

function shelvesFrom(books) {
  const groups = new Map();

  books.forEach((book) => {
    (book.categories || []).forEach((category) => {
      const key = category.slug || category.name;
      if (!groups.has(key)) {
        groups.set(key, { title: category.name, books: [] });
      }

      const group = groups.get(key);
      if (!group.books.some((item) => item.id === book.id)) {
        group.books.push(book);
      }
    });
  });

  return [...groups.values()].filter((group) => group.books.length >= 2);
}

function CatalogPage() {
  const catalog = useCatalog();
  const featured = catalog.books[0];
  const categoryShelves = shelvesFrom(catalog.books);

  return (
    <main className="page page--catalog">
      {!catalog.loading && !catalog.error && featured && (
        <FeaturedHero book={featured} />
      )}

      <CatalogToolbar
        queryInput={catalog.queryInput}
        onQueryChange={catalog.setQueryInput}
        category={catalog.category}
        onCategoryChange={catalog.setCategory}
        categories={catalog.filterCategories}
      />

      {catalog.loading && <p className="status">Loading catalog…</p>}

      {catalog.error && (
        <div className="banner banner--error" role="alert">
          <p>{catalog.error}</p>
          <button type="button" onClick={catalog.reload}>
            Try again
          </button>
        </div>
      )}

      {catalog.empty && (
        <p className="status">No books match your search or filter.</p>
      )}

      {!catalog.loading && !catalog.error && catalog.books.length > 0 && (
        <>
          <p className="result-count">
            {catalog.pagination.total} title
            {catalog.pagination.total === 1 ? '' : 's'} in the collection
          </p>

          <BookShelf title="On this shelf" books={catalog.books} />

          {categoryShelves.map((shelf) => (
            <BookShelf
              key={shelf.title}
              title={shelf.title}
              books={shelf.books}
            />
          ))}

          <section className="catalog-grid-section">
            <header className="book-shelf__header">
              <h2>Browse titles</h2>
            </header>
            <div className="book-grid">
              {catalog.books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>

          <Pagination
            page={catalog.pagination.page}
            totalPages={catalog.pagination.totalPages}
            onPageChange={catalog.setPage}
          />
        </>
      )}
    </main>
  );
}

export default CatalogPage;
