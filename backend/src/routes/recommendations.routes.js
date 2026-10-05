import { Router } from 'express';
import { getRecommendationsHandler } from '../controllers/recommendations.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, getRecommendationsHandler);

export default router;
