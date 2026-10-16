import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getDb } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { getLevelInfo, getProgressToNextLevel } from '../constants/achievements.js';

export class AuthService {
  /**
   * Generates a JWT token for the given payload
   */
  static generateToken(payload) {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  }

  /**
   * Registers a new user and creates default settings
   */
  static async register({ email, password, name, avatar = null, dailyGoalHours = 2.0 }) {
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, config.bcryptSaltRounds);
    const nowIso = new Date().toISOString();

    // Insert user
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, avatar, daily_goal_hours, xp, streak, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);
    insertUser.run(userId, cleanEmail, hashedPassword, name.trim(), avatar, Number(dailyGoalHours) || 2.0, nowIso, nowIso);

    // Insert default settings
    const insertSettings = db.prepare(`
      INSERT INTO settings (user_id, pomodoro_work, pomodoro_short_break, pomodoro_long_break, pomodoro_rounds, daily_goal_hours, notifications, haptics, auto_start_breaks, auto_start_work, app_blocking_enabled)
      VALUES (?, 25, 5, 15, 4, ?, 1, 1, 0, 0, 0)
    `);
    insertSettings.run(userId, Number(dailyGoalHours) || 2.0);

    const user = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      avatar,
      daily_goal_hours: Number(dailyGoalHours) || 2.0,
      xp: 0,
      streak: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const token = this.generateToken({ id: user.id, email: user.email });

    return { user, token };
  }

  /**
   * Authenticates user with email and password
   */
  static async login({ email, password }) {
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Exclude password from returned user object
    const { password: _, ...sanitizedUser } = user;
    const token = this.generateToken({ id: sanitizedUser.id, email: sanitizedUser.email });

    return { user: sanitizedUser, token };
  }

  /**
   * Retrieves complete profile including settings and stats summary
   */
  static async getProfile(userId) {
    const db = getDb();
    const user = db.prepare('SELECT id, email, name, avatar, daily_goal_hours, xp, streak, created_at, updated_at FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    let settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
    if (!settings) {
      db.prepare(`
        INSERT INTO settings (user_id, pomodoro_work, pomodoro_short_break, pomodoro_long_break, pomodoro_rounds, daily_goal_hours, notifications, haptics, auto_start_breaks, auto_start_work, app_blocking_enabled)
        VALUES (?, 25, 5, 15, 4, ?, 1, 1, 0, 0, 0)
      `).run(userId, user.daily_goal_hours || 2.0);
      settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
    }

    // Compute basic session totals
    const sessionStats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM sessions WHERE user_id = ?
    `).get(userId);

    const completedTasksCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1').get(userId);

    const level = getLevelInfo(user.xp);
    const progressToNextLevel = getProgressToNextLevel(user.xp);

    return {
      ...user,
      user: {
        ...user,
        level: level.level,
        levelTitle: level.title,
        progressToNextLevel,
      },
      settings,
      stats: {
        totalMinutes: sessionStats ? sessionStats.total_minutes : 0,
        totalSessions: sessionStats ? sessionStats.total_sessions : 0,
        tasksCompleted: completedTasksCount ? completedTasksCount.count : 0,
        streak: user.streak,
        xp: user.xp,
      },
    };
  }

  /**
   * Updates user profile fields and settings
   */
  static async updateProfile(userId, { name, avatar, dailyGoalHours, settings }) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const nowIso = new Date().toISOString();
    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedAvatar = avatar !== undefined ? avatar : user.avatar;
    const updatedDailyGoal = dailyGoalHours !== undefined ? Number(dailyGoalHours) : user.daily_goal_hours;

    db.prepare(`
      UPDATE users 
      SET name = ?, avatar = ?, daily_goal_hours = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, updatedAvatar, updatedDailyGoal, nowIso, userId);

    if (settings && typeof settings === 'object') {
      db.prepare(`
        INSERT INTO settings (
          user_id, pomodoro_work, pomodoro_short_break, pomodoro_long_break, 
          pomodoro_rounds, daily_goal_hours, notifications, haptics, 
          auto_start_breaks, auto_start_work, app_blocking_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          pomodoro_work = excluded.pomodoro_work,
          pomodoro_short_break = excluded.pomodoro_short_break,
          pomodoro_long_break = excluded.pomodoro_long_break,
          pomodoro_rounds = excluded.pomodoro_rounds,
          daily_goal_hours = excluded.daily_goal_hours,
          notifications = excluded.notifications,
          haptics = excluded.haptics,
          auto_start_breaks = excluded.auto_start_breaks,
          auto_start_work = excluded.auto_start_work,
          app_blocking_enabled = excluded.app_blocking_enabled
      `).run(
        userId,
        settings.pomodoroWork ?? settings.pomodoro_work ?? 25,
        settings.pomodoroShortBreak ?? settings.pomodoro_short_break ?? 5,
        settings.pomodoroLongBreak ?? settings.pomodoro_long_break ?? 15,
        settings.pomodoroRounds ?? settings.pomodoro_rounds ?? 4,
        settings.dailyGoalHours ?? settings.daily_goal_hours ?? updatedDailyGoal,
        settings.notifications !== undefined ? (settings.notifications ? 1 : 0) : 1,
        settings.haptics !== undefined ? (settings.haptics ? 1 : 0) : 1,
        settings.autoStartBreaks !== undefined ? (settings.autoStartBreaks ? 1 : 0) : 0,
        settings.autoStartWork !== undefined ? (settings.autoStartWork ? 1 : 0) : 0,
        settings.appBlockingEnabled !== undefined ? (settings.appBlockingEnabled ? 1 : 0) : 0
      );
    }

    return this.getProfile(userId);
  }
}

export default AuthService;
