function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Catalog pages">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="pagination__status">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
