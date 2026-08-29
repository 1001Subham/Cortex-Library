import { checkDatabaseConnection } from '../config/database.js';

export async function getHealthStatus() {
  let databaseStatus = 'disconnected';

  try {
    const isConnected = await checkDatabaseConnection();
    databaseStatus = isConnected ? 'connected' : 'disconnected';
  } catch {
    databaseStatus = 'disconnected';
  }

  return {
    status: databaseStatus === 'connected' ? 'ok' : 'degraded',
    service: 'cortex-library-backend',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  };
}
