import { asyncHandler } from '../middleware/httpError.js';
import { getReaderAnalytics } from '../services/analytics.service.js';

export const getAnalyticsHandler = asyncHandler(async (req, res) => {
  const analytics = await getReaderAnalytics(req.user.id);
  res.status(200).json(analytics);
});
