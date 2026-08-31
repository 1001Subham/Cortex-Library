import { Router } from 'express';
import {
  loginHandler,
  meHandler,
  registerHandler,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', requireAuth, meHandler);

export default router;
