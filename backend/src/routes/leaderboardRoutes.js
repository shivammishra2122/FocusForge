import { Router } from 'express';
import LeaderboardController from '../controllers/leaderboardController.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getDb } from '../db/database.js';

const router = Router();

// Optional auth middleware so users can check leaderboard publicly or see their own standing if logged in
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      const db = getDb();
      const user = db.prepare('SELECT id, email, name, avatar, xp, streak FROM users WHERE id = ?').get(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (e) {
    // Optional auth, proceed unauthenticated
  }
  next();
}

router.get('/', optionalAuth, LeaderboardController.getLeaderboard);

export default router;
