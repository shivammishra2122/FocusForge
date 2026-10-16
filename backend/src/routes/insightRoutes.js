import { Router } from 'express';
import InsightController from '../controllers/insightController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.get('/', InsightController.getFocusInsights);

export default router;
