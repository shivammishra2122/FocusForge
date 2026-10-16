import { Router } from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', AnalyticsController.getOverview);

export default router;
