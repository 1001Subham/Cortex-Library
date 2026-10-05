import { asyncHandler } from '../middleware/httpError.js';
import { getIssuedHtmlContentPath } from '../services/bookContent.service.js';
import { getBookById, listBooks } from '../services/books.service.js';
import {
  parseBookId,
  parseBookListQuery,
} from '../validators/books.validator.js';

export const listBooksHandler = asyncHandler(async (req, res) => {
  const parsed = parseBookListQuery(req.query);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const result = await listBooks(parsed.value);
  res.status(200).json(result);
});

export const getBookHandler = asyncHandler(async (req, res) => {
  const parsed = parseBookId(req.params.id);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const book = await getBookById(parsed.value);
  res.status(200).json(book);
});

export const getBookContentHandler = asyncHandler(async (req, res, next) => {
  const parsed = parseBookId(req.params.id);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const filePath = await getIssuedHtmlContentPath(req.user.id, parsed.value);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath, (error) => {
    if (error) {
      next(error);
    }
  });
});
