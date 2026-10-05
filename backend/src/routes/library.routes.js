import { Router } from 'express';
import {
  listLibraryHandler,
  returnIssueHandler,
} from '../controllers/bookIssues.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, listLibraryHandler);
router.post('/:issueId/return', requireAuth, returnIssueHandler);

export default router;
