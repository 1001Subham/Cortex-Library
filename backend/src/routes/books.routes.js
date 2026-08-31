import { Router } from 'express';
import {
  getBookContentHandler,
  getBookHandler,
  listBooksHandler,
} from '../controllers/books.controller.js';

const router = Router();

router.get('/', listBooksHandler);
router.get('/:id/content', getBookContentHandler);
router.get('/:id', getBookHandler);

export default router;
