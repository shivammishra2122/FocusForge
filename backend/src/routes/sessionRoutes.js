import { Router } from 'express';
import SessionController from '../controllers/sessionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

router.post('/', SessionController.createSession);
router.get('/', SessionController.getSessions);
router.get('/stats', SessionController.getSessionStats);

export default router;
