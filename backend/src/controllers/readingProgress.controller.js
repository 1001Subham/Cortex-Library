import { asyncHandler } from '../middleware/httpError.js';
import {
  getBookProgress,
  saveBookProgress,
} from '../services/readingProgress.service.js';
import { parseBookId } from '../validators/books.validator.js';
import { parseProgressBody } from '../validators/progress.validator.js';

export const getBookProgressHandler = asyncHandler(async (req, res) => {
  const parsed = parseBookId(req.params.id);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const progress = await getBookProgress(req.user.id, parsed.value);
  res.status(200).json({ progress });
});

export const updateBookProgressHandler = asyncHandler(async (req, res) => {
  const parsedId = parseBookId(req.params.id);

  if (parsedId.error) {
    return res.status(400).json({
      status: 'error',
      message: parsedId.error,
    });
  }

  const parsedBody = parseProgressBody(req.body);

  if (parsedBody.error) {
    return res.status(400).json({
      status: 'error',
      message: parsedBody.error,
    });
  }

  const progress = await saveBookProgress(
    req.user.id,
    parsedId.value,
    parsedBody.value.progressPercent
  );
  res.status(200).json({ progress });
});
