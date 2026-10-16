import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';
import { authRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply rate limiter to all auth routes
router.use(apiRateLimiter);

router.post('/register', authRateLimiter, validateRegister, AuthController.register);
router.post('/login', authRateLimiter, validateLogin, AuthController.login);
router.get('/me', authRateLimiter, authMiddleware, AuthController.me);
router.put('/profile', authRateLimiter, authMiddleware, AuthController.updateProfile);

export default router;
