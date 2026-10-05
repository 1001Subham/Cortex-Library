import { asyncHandler } from '../middleware/httpError.js';
import { getRecommendations } from '../services/recommendations.service.js';

export const getRecommendationsHandler = asyncHandler(async (req, res) => {
  const recommendations = await getRecommendations(req.user.id);
  res.status(200).json(recommendations);
});
