import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('[database] Unexpected pool error:', {
    code: error.code,
    message: error.message,
  });
});

function logConnectionTarget() {
  console.log('[database] Connection target:', {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
  });
}

export async function checkDatabaseConnection() {
  let client;

  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    if (config.nodeEnv === 'development') {
      logConnectionTarget();
      console.error('[database] Connection check failed:', {
        code: error.code,
        message: error.message,
      });
    }

    return false;
  } finally {
    client?.release();
  }
}

export async function closeDatabasePool() {
  await pool.end();
}

export default pool;
