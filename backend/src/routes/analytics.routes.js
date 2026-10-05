import { Router } from 'express';
import { getAnalyticsHandler } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, getAnalyticsHandler);

export default router;
