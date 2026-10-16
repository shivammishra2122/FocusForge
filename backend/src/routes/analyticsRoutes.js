import { Router } from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get('/overview', AnalyticsController.getOverview);

export default router;
