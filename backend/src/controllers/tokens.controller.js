import { asyncHandler } from '../middleware/httpError.js';
import { getUserTokenAccount } from '../services/tokens.service.js';

export const getTokensHandler = asyncHandler(async (req, res) => {
  const account = await getUserTokenAccount(req.user.id);
  res.status(200).json(account);
});

