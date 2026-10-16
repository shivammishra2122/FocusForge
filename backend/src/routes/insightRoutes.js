import { Router } from 'express';
import InsightController from '../controllers/insightController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', InsightController.getFocusInsights);

export default router;
