import { getHealthStatus } from '../services/health.service.js';

export async function getHealth(req, res) {
  const health = await getHealthStatus();
  const statusCode = health.database === 'connected' ? 200 : 503;

  res.status(statusCode).json(health);
}
