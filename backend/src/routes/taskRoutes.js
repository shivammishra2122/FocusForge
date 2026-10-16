import { Router } from 'express';
import TaskController from '../controllers/taskController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRequired } from '../middleware/validate.js';

const router = Router();

router.use(authMiddleware);

router.get('/', TaskController.getTasks);
router.post('/', validateRequired(['title']), TaskController.createTask);
router.post('/batch', TaskController.batchSyncTasks);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);
router.patch('/:id/toggle', TaskController.toggleTask);

export default router;
