import { Router } from 'express';
import { getTokensHandler } from '../controllers/tokens.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, getTokensHandler);

export default router;
