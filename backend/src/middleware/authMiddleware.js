import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getDb } from '../db/database.js';
import { AppError } from './errorHandler.js';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required: Bearer token missing', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Authentication required: Token missing', 401));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const db = getDb();
    const stmt = db.prepare('SELECT id, email, name, avatar, daily_goal_hours, xp, streak, created_at, updated_at FROM users WHERE id = ?');
    const user = stmt.get(decoded.id);

    if (!user) {
      return next(new AppError('User belonging to this token no longer exists', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error);
    }
    return next(new AppError(`Authentication failed: ${error.message}`, 401));
  }
}

export default authMiddleware;
