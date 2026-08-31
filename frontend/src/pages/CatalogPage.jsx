import BookCard from '../components/BookCard';
import CatalogToolbar from '../components/CatalogToolbar';
import Pagination from '../components/Pagination';
import { useCatalog } from '../hooks/useCatalog';

function CatalogPage() {
  const catalog = useCatalog();

  return (
    <main className="page">
      <header className="page__header">
        <p className="eyebrow">Cortex Library</p>
        <h1>Digital library</h1>
        <p className="lede">
          Browse public-domain titles hosted inside Cortex Library.
        </p>
      </header>

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
            {catalog.pagination.total === 1 ? '' : 's'}
          </p>
          <section className="book-grid">
            {catalog.books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
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
