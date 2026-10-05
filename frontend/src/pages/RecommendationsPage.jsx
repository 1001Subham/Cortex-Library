import { useEffect, useState } from 'react';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import {
  catalogHash,
  libraryHash,
  loginHash,
} from '../hooks/useHashRoute';
import { getRecommendations } from '../services/api';

function RecommendationsPage() {
  const { user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready || !user) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getRecommendations()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Unable to load recommendations.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, reloadKey]);

  if (!ready) {
    return <main className="page page--recommendations"><p className="status">Checking your session…</p></main>;
  }

  if (!user) {
    return (
      <main className="page page--recommendations">
        <header className="page__header">
          <p className="eyebrow">Made for your reading</p>
          <h1>Recommendations</h1>
          <p className="lede">Sign in to see book suggestions based on your own library activity.</p>
        </header>
        <a className="button button--primary" href={loginHash('/recommendations')}>Log in</a>
      </main>
    );
  }

  return (
    <main className="page page--recommendations">
      <header className="page__header">
        <p className="eyebrow">Made for your reading</p>
        <h1>Recommendations</h1>
        <p className="lede">Suggestions use the categories and authors in books you have issued, along with your saved reading progress. Reading time is supporting activity, not a measure of whether you liked a book.</p>
        <div className="hero__actions">
          <a className="button button--ghost" href={libraryHash()}>My Library</a>
          <a className="button button--ghost" href={catalogHash()}>Browse catalog</a>
        </div>
      </header>

      {loading && <p className="status">Finding books for you…</p>}
      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
          <button className="button button--ghost button--small" type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
        </div>
      )}

      {!loading && !error && data?.personalized && data.recommendations?.length > 0 && (
        <section className="recommendations-list" aria-label="Personalized book recommendations">
          {data.recommendations.map((item) => (
            <article className="recommendation" key={item.book.id}>
              <BookCard book={item.book} />
              <p className="recommendation__reason">{item.reason}</p>
            </article>
          ))}
        </section>
      )}

      {!loading && !error && data && !data.personalized && (
        <section className="recommendations-empty">
          <h2>Let your reading history build your list</h2>
          <p>{data.message}</p>
          <a className="button button--primary" href={catalogHash()}>Explore the catalog</a>
        </section>
      )}
    </main>
  );
}

export default RecommendationsPage;
