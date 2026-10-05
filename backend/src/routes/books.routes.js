import { Router } from 'express';
import { issueBookHandler } from '../controllers/bookIssues.controller.js';
import {
  getBookContentHandler,
  getBookHandler,
  listBooksHandler,
} from '../controllers/books.controller.js';
import {
  getBookProgressHandler,
  updateBookProgressHandler,
} from '../controllers/readingProgress.controller.js';
import {
  heartbeatReadingSessionHandler,
  startReadingSessionHandler,
  stopReadingSessionHandler,
} from '../controllers/readingSessions.controller.js';
import {
  getVisualCueSummaryHandler,
  recordVisualCueHandler,
} from '../controllers/readingAttention.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', listBooksHandler);
router.post('/:id/issue', requireAuth, issueBookHandler);
router.get('/:id/content', requireAuth, getBookContentHandler);
router.get('/:id/progress', requireAuth, getBookProgressHandler);
router.put('/:id/progress', requireAuth, updateBookProgressHandler);
router.post(
  '/:id/reading-sessions/start',
  requireAuth,
  startReadingSessionHandler
);
router.post(
  '/:id/reading-sessions/heartbeat',
  requireAuth,
  heartbeatReadingSessionHandler
);
router.post(
  '/:id/reading-sessions/stop',
  requireAuth,
  stopReadingSessionHandler
);
router.post(
  '/:id/reading-sessions/:sessionId/visual-cues',
  requireAuth,
  recordVisualCueHandler
);
router.get(
  '/:id/reading-sessions/:sessionId/visual-cues',
  requireAuth,
  getVisualCueSummaryHandler
);
router.get('/:id', getBookHandler);

export default router;
