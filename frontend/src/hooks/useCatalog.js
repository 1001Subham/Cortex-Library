import { useCallback, useEffect, useMemo, useState } from 'react';
import { listBooks } from '../services/api';

const PAGE_SIZE = 8;

export function useCatalog() {
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [filterCategories, setFilterCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = queryInput.trim();
      setQuery((current) => {
        if (current !== nextQuery) {
          setPage(1);
        }
        return nextQuery;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    let cancelled = false;

    listBooks({ limit: 50 })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const unique = new Map();
        result.books.forEach((book) => {
          book.categories.forEach((item) => {
            unique.set(item.slug, item);
          });
        });

        setFilterCategories(
          [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFilterCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listBooks({
        page,
        limit: PAGE_SIZE,
        q: query,
        category,
        sort: 'title',
      });
      setBooks(result.books);
      setPagination(result.pagination);
    } catch (err) {
      setBooks([]);
      setError(err.message || 'Unable to load the catalog.');
    } finally {
      setLoading(false);
    }
  }, [page, query, category]);

  useEffect(() => {
    load();
  }, [load]);

  const empty = useMemo(
    () => !loading && !error && books.length === 0,
    [loading, error, books.length]
  );

  return {
    books,
    pagination,
    filterCategories,
    loading,
    error,
    empty,
    queryInput,
    setQueryInput,
    category,
    setCategory: (value) => {
      setCategory(value);
      setPage(1);
    },
    setPage,
    reload: load,
  };
}
