import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, validateRegister, AuthController.register);
router.post('/login', authRateLimiter, validateLogin, AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.put('/profile', authMiddleware, AuthController.updateProfile);

export default router;
