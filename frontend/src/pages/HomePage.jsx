import { useEffect, useState } from 'react';
import { getBackendHealth } from '../services/api';

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
    <main style={styles.main}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Cortex Library</h1>
          <p style={styles.subtitle}>
            AI-powered digital library and adaptive reading ecosystem
          </p>
        </header>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>System Status</h2>

          {loading && <p style={styles.muted}>Checking backend connection...</p>}

          {error && (
            <div style={styles.error}>
              <strong>Backend unreachable</strong>
              <p style={styles.muted}>{error}</p>
            </div>
          )}

          {health && (
            <dl style={styles.statusList}>
              <div style={styles.statusItem}>
                <dt style={styles.label}>Service</dt>
                <dd style={styles.value}>{health.service}</dd>
              </div>
              <div style={styles.statusItem}>
                <dt style={styles.label}>Status</dt>
                <dd style={styles.value}>
                  <span
                    style={{
                      ...styles.badge,
                      background:
                        health.status === 'ok' ? '#d4edda' : '#fff3cd',
                      color: health.status === 'ok' ? '#155724' : '#856404',
                    }}
                  >
                    {health.status}
                  </span>
                </dd>
              </div>
              <div style={styles.statusItem}>
                <dt style={styles.label}>Database</dt>
                <dd style={styles.value}>
                  <span
                    style={{
                      ...styles.badge,
                      background:
                        health.database === 'connected' ? '#d4edda' : '#f8d7da',
                      color:
                        health.database === 'connected' ? '#155724' : '#721c24',
                    }}
                  >
                    {health.database}
                  </span>
                </dd>
              </div>
              <div style={styles.statusItem}>
                <dt style={styles.label}>Timestamp</dt>
                <dd style={styles.value}>{health.timestamp}</dd>
              </div>
            </dl>
          )}
        </section>

        <footer style={styles.footer}>
          <p style={styles.muted}>Foundation phase — development environment</p>
        </footer>
      </div>
    </main>
  );
}

const styles = {
  main: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
  },
  container: {
    width: '100%',
    maxWidth: '560px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    margin: 0,
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#16213e',
  },
  subtitle: {
    margin: '0.5rem 0 0',
    color: '#4a5568',
    fontSize: '1rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  cardTitle: {
    margin: '0 0 1rem',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#16213e',
  },
  statusList: {
    margin: 0,
    display: 'grid',
    gap: '0.75rem',
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #edf2f7',
  },
  label: {
    margin: 0,
    fontWeight: 500,
    color: '#4a5568',
    fontSize: '0.875rem',
  },
  value: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#1a1a2e',
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  error: {
    padding: '0.75rem',
    background: '#f8d7da',
    borderRadius: '8px',
    color: '#721c24',
  },
  muted: {
    margin: '0.25rem 0 0',
    color: '#718096',
    fontSize: '0.875rem',
  },
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
  },
};

export default HomePage;
