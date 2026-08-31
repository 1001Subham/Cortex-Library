import { useEffect, useState } from 'react';
import { getBackendHealth } from '../services/api';

function badgeClass(kind, okValue) {
  return kind === okValue ? 'badge badge--ok' : 'badge badge--error';
}

function HomePage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBackendHealth()
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setHealth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page page--status">
      <header className="status-page__header page__header">
        <p className="eyebrow">Operations</p>
        <h1>System status</h1>
        <p className="lede">
          Live health of the Cortex Library API and database for this
          development environment.
        </p>
      </header>

      <section className="status-card">
        <h2>Backend connection</h2>

        {loading && <p className="status">Checking backend connection…</p>}

        {error && (
          <div className="banner banner--error" role="alert">
            <p>
              <strong>Backend unreachable.</strong> {error}
            </p>
          </div>
        )}

        {health && (
          <dl className="status-list">
            <div className="status-item">
              <dt>Service</dt>
              <dd>{health.service}</dd>
            </div>
            <div className="status-item">
              <dt>Status</dt>
              <dd>
                <span className={badgeClass(health.status, 'ok')}>
                  {health.status}
                </span>
              </dd>
            </div>
            <div className="status-item">
              <dt>Database</dt>
              <dd>
                <span className={badgeClass(health.database, 'connected')}>
                  {health.database}
                </span>
              </dd>
            </div>
            <div className="status-item">
              <dt>Timestamp</dt>
              <dd>{health.timestamp}</dd>
            </div>
          </dl>
        )}
      </section>

      <p className="status-page__footer">
        Foundation phase — development environment
      </p>
    </main>
  );
}

export default HomePage;
