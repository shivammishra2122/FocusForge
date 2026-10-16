import { Router } from 'express';
import SyncController from '../controllers/syncController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/push', SyncController.pushData);
router.get('/pull', SyncController.pullData);

export default router;
