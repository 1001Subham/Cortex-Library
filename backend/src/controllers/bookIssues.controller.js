import { asyncHandler } from '../middleware/httpError.js';
import {
  issuePublishedBook,
  listUserLibrary,
  returnUserIssue,
} from '../services/bookIssues.service.js';
import { parseBookId } from '../validators/books.validator.js';
import { parseIssueId } from '../validators/library.validator.js';

export const issueBookHandler = asyncHandler(async (req, res) => {
  const parsed = parseBookId(req.params.id);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const issue = await issuePublishedBook(req.user.id, parsed.value);
  res.status(201).json({ issue });
});

export const listLibraryHandler = asyncHandler(async (req, res) => {
  const result = await listUserLibrary(req.user.id);
  res.status(200).json(result);
});

export const returnIssueHandler = asyncHandler(async (req, res) => {
  const parsed = parseIssueId(req.params.issueId);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const issue = await returnUserIssue(req.user.id, parsed.value);
  res.status(200).json({ issue });
});
