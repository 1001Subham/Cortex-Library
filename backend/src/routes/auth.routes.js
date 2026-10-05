import { Router } from 'express';
import {
  getProfileHandler,
  googleHandler,
  loginHandler,
  meHandler,
  registerHandler,
  updateProfileHandler,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/google', googleHandler);
router.get('/me', requireAuth, meHandler);
router.get('/profile', requireAuth, getProfileHandler);
router.put('/profile', requireAuth, updateProfileHandler);

export default router;
