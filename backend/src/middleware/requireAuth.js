import { asyncHandler, HttpError } from './httpError.js';
import { getAuthenticatedUser, verifyAccessToken } from '../services/auth.service.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required.');
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    throw new HttpError(401, 'Authentication required.');
  }

  const payload = verifyAccessToken(token);

  if (!payload?.sub) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  req.user = await getAuthenticatedUser(payload.sub);
  next();
});
