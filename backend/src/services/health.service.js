import { checkDatabaseConnection } from '../config/database.js';

export async function getHealthStatus() {
  const isConnected = await checkDatabaseConnection();
  const databaseStatus = isConnected ? 'connected' : 'disconnected';

  return {
    status: databaseStatus === 'connected' ? 'ok' : 'degraded',
    service: 'cortex-library-backend',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  };
}
