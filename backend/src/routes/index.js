import { Router } from 'express';
import healthRoutes from './health.routes.js';
import booksRoutes from './books.routes.js';
import authRoutes from './auth.routes.js';
import libraryRoutes from './library.routes.js';
import tokensRoutes from './tokens.routes.js';
import analyticsRoutes from './analytics.routes.js';
import recommendationsRoutes from './recommendations.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/books', booksRoutes);
router.use('/library', libraryRoutes);
router.use('/tokens', tokensRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/recommendations', recommendationsRoutes);

export default router;
