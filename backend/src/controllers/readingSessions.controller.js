import { asyncHandler } from '../middleware/httpError.js';
import {
  heartbeatReadingSession,
  startReadingSession,
  stopReadingSession,
} from '../services/readingSessions.service.js';
import { parseBookId } from '../validators/books.validator.js';
import { parseElapsedBody } from '../validators/readingSession.validator.js';

function sendBookIdError(res, parsedId) {
  return res.status(400).json({
    status: 'error',
    message: parsedId.error,
  });
}

export const startReadingSessionHandler = asyncHandler(async (req, res) => {
  const parsedId = parseBookId(req.params.id);

  if (parsedId.error) {
    return sendBookIdError(res, parsedId);
  }

  const session = await startReadingSession(req.user.id, parsedId.value);
  res.status(200).json({ session });
});

export const heartbeatReadingSessionHandler = asyncHandler(async (req, res) => {
  const parsedId = parseBookId(req.params.id);

  if (parsedId.error) {
    return sendBookIdError(res, parsedId);
  }

  const parsedBody = parseElapsedBody(req.body, { required: true });

  if (parsedBody.error) {
    return res.status(400).json({
      status: 'error',
      message: parsedBody.error,
    });
  }

  const session = await heartbeatReadingSession(
    req.user.id,
    parsedId.value,
    parsedBody.value.elapsedSeconds
  );
  res.status(200).json({ session });
});

export const stopReadingSessionHandler = asyncHandler(async (req, res) => {
  const parsedId = parseBookId(req.params.id);

  if (parsedId.error) {
    return sendBookIdError(res, parsedId);
  }

  const parsedBody = parseElapsedBody(req.body, { required: false });

  if (parsedBody.error) {
    return res.status(400).json({
      status: 'error',
      message: parsedBody.error,
    });
  }

  const session = await stopReadingSession(
    req.user.id,
    parsedId.value,
    parsedBody.value.elapsedSeconds
  );
  res.status(200).json({ session });
});
