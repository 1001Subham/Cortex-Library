import { Router } from 'express';
import {
  getBookHandler,
  listBooksHandler,
} from '../controllers/books.controller.js';

const router = Router();

router.get('/', listBooksHandler);
router.get('/:id', getBookHandler);

export default router;
