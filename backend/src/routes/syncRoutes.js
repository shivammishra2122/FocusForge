import { Router } from 'express';
import SyncController from '../controllers/syncController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.post('/push', SyncController.pushData);
router.get('/pull', SyncController.pullData);

export default router;
