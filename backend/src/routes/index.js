import { Router } from 'express';
import healthRoutes from './health.routes.js';
import booksRoutes from './books.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/books', booksRoutes);

export default router;
