import { Router } from 'express';
import authRoutes from './authRoutes.js';
import taskRoutes from './taskRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import syncRoutes from './syncRoutes.js';
import insightRoutes from './insightRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/sessions', sessionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/sync', syncRoutes);
router.use('/insights', insightRoutes);
router.use('/health', healthRoutes);

export default router;
