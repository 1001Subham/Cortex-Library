import { asyncHandler, HttpError } from '../middleware/httpError.js';
import {
  getReadingVisualCueSummary,
  recordVisualCueSample,
} from '../services/readingAttention.service.js';
import { parseBookId } from '../validators/books.validator.js';

function ids(req, res) {
  const book = parseBookId(req.params.id);
  if (book.error) {
    res.status(400).json({ status: 'error', message: book.error });
    return null;
  }
  const sessionId = req.params.sessionId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    res.status(400).json({ status: 'error', message: 'A valid session id is required.' });
    return null;
  }
  return { bookId: book.value, sessionId };
}

export const recordVisualCueHandler = asyncHandler(async (req, res) => {
  const parsed = ids(req, res);
  if (!parsed) return;
  if (typeof req.body?.frame !== 'string') {
    throw new HttpError(400, 'A JPEG frame is required.');
  }
  const result = await recordVisualCueSample({
    ...parsed,
    userId: req.user.id,
    frame: req.body.frame,
  });
  res.status(201).json({ visualCue: result.cue, summary: result.summary });
});

export const getVisualCueSummaryHandler = asyncHandler(async (req, res) => {
  const parsed = ids(req, res);
  if (!parsed) return;
  const summary = await getReadingVisualCueSummary({
    ...parsed,
    userId: req.user.id,
  });
  res.status(200).json({ summary });
});
