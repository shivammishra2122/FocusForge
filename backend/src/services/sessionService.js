import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { getLevelInfo, getProgressToNextLevel } from '../constants/achievements.js';
import AchievementService from './achievementService.js';

/**
 * Calculates focus efficiency matching Obsidian Protocol
 */
export function calculateEfficiency(durationMinutes, deepFocus = false) {
  const elapsedSeconds = durationMinutes * 60;
  if (elapsedSeconds <= 0) return 92;

  // Fatigue decay: -1% for every 10 minutes
  const fatigueDecay = (elapsedSeconds / 600) * 1;
  const deepFocusBonus = deepFocus ? 5 : 0;
  const consistencyBoost = Math.min(elapsedSeconds / 1800, 1) * 3;

  const result = 92 - fatigueDecay + deepFocusBonus + consistencyBoost;
  return Math.min(100, Math.max(65, Math.round(result)));
}

/**
 * Calculates mental focus immersion index (0.00 - 1.20)
 */
export function calculateFocusIndex(durationMinutes) {
  const elapsedSeconds = durationMinutes * 60;
  const baseIndex = 0.85;
  const immersionProgress = Math.min(elapsedSeconds / 900, 1);
  const immersionBoost = immersionProgress * 0.15;
  const brainJitter = Math.sin(elapsedSeconds / 30) * 0.02;

  const index = baseIndex + immersionBoost + brainJitter;
  return parseFloat(index.toFixed(2));
}

export class SessionService {
  /**
   * Records a focus session, updates streak, adds XP, and checks achievements
   */
  static createSession(userId, sessionData) {
    const db = getDb();
    const durationMinutes = Number(sessionData.duration_minutes ?? sessionData.durationMinutes) || 0;
    if (durationMinutes <= 0) {
      throw new AppError('duration_minutes must be greater than 0', 400);
    }

    const sessionId = sessionData.id || crypto.randomUUID();
    const mode = (sessionData.mode || 'POMODORO').toUpperCase();
    const timestamp = Number(sessionData.timestamp) || Date.now();
    const isDeepFocus = Boolean(sessionData.deep_focus ?? sessionData.deepFocus);
    const category = sessionData.category || 'Focus';
    const soundId = sessionData.sound_id || sessionData.soundId || 'none';
    const note = (sessionData.note || sessionData.notes || '').trim();

    const efficiency = sessionData.efficiency !== undefined 
      ? Number(sessionData.efficiency) 
      : calculateEfficiency(durationMinutes, isDeepFocus);

    const focusIndex = sessionData.focus_index !== undefined 
      ? Number(sessionData.focus_index) 
      : calculateFocusIndex(durationMinutes);

    const nowIso = new Date().toISOString();

    // Insert session
    db.prepare(`
      INSERT INTO sessions (
        id, user_id, mode, duration_minutes, timestamp, 
        deep_focus, category, sound_id, efficiency, focus_index, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      userId,
      mode,
      durationMinutes,
      timestamp,
      isDeepFocus ? 1 : 0,
      category,
      soundId,
      efficiency,
      focusIndex,
      note,
      nowIso
    );

    // Calculate Streak & Date History
    const sessionDate = new Date(timestamp).toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const todayStr = new Date().toISOString().split('T')[0];

    // Update streak_history table
    db.prepare(`
      INSERT INTO streak_history (user_id, date, minutes)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        minutes = streak_history.minutes + excluded.minutes
    `).run(userId, sessionDate, durationMinutes);

    // Fetch user current streak and last streak date
    const user = db.prepare('SELECT streak, xp FROM users WHERE id = ?').get(userId);
    const lastSessionRow = db.prepare(`
      SELECT date FROM streak_history 
      WHERE user_id = ? AND date < ? 
      ORDER BY date DESC LIMIT 1
    `).get(userId, sessionDate);

    let newStreak = user.streak || 0;

    if (!lastSessionRow) {
      // First session ever
      newStreak = 1;
    } else {
      const lastDate = new Date(lastSessionRow.date);
      const currDate = new Date(sessionDate);
      const diffTime = currDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (diffDays === 0) {
        // Same day, streak intact
        if (newStreak === 0) newStreak = 1;
      } else if (diffDays > 1) {
        // Streak broken
        newStreak = 1;
      }
    }

    // Award XP: 2 XP per minute + 50 XP if deep focus
    const xpEarned = Math.floor(durationMinutes * 2) + (isDeepFocus ? 50 : 0);

    db.prepare(`
      UPDATE users 
      SET streak = ?, xp = xp + ?, updated_at = ?
      WHERE id = ?
    `).run(newStreak, xpEarned, nowIso, userId);

    const updatedUser = db.prepare('SELECT xp, streak FROM users WHERE id = ?').get(userId);

    // Evaluate Achievements
    const newlyUnlocked = AchievementService.evaluateAchievements(userId);

    const level = getLevelInfo(updatedUser.xp);
    const progressToNextLevel = getProgressToNextLevel(updatedUser.xp);

    const createdSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

    return {
      session: this.formatSession(createdSession),
      xpEarned,
      newTotalXp: updatedUser.xp,
      streak: updatedUser.streak,
      level: level.level,
      levelTitle: level.title,
      progressToNextLevel,
      unlockedAchievements: newlyUnlocked,
    };
  }

  /**
   * Retrieves user sessions with pagination and filters
   */
  static getSessions(userId, options = {}) {
    const db = getDb();
    let query = 'SELECT * FROM sessions WHERE user_id = ?';
    const params = [userId];

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options.mode) {
      query += ' AND mode = ?';
      params.push(options.mode.toUpperCase());
    }

    query += ' ORDER BY timestamp DESC';

    const limit = Math.min(Number(options.limit) || 100, 500);
    const offset = Math.max(Number(options.offset) || 0, 0);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    return rows.map(this.formatSession);
  }

  /**
   * Aggregates session statistics for user
   */
  static getSessionStats(userId) {
    const db = getDb();
    const user = db.prepare('SELECT streak, xp, daily_goal_hours FROM users WHERE id = ?').get(userId);

    const agg = db.prepare(`
      SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(duration_minutes), 0) as totalMinutes,
        COALESCE(SUM(CASE WHEN deep_focus = 1 THEN duration_minutes ELSE 0 END), 0) as deepFocusMinutes,
        COALESCE(AVG(efficiency), 0) as avgEfficiency,
        COALESCE(AVG(focus_index), 0) as avgFocusIndex
      FROM sessions WHERE user_id = ?
    `).get(userId);

    const topCatRow = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(duration_minutes) as minutes
      FROM sessions WHERE user_id = ?
      GROUP BY category
      ORDER BY minutes DESC LIMIT 1
    `).get(userId);

    const level = getLevelInfo(user ? user.xp : 0);

    return {
      totalSessions: agg ? agg.totalSessions : 0,
      totalMinutes: agg ? agg.totalMinutes : 0,
      totalHours: agg ? parseFloat((agg.totalMinutes / 60).toFixed(1)) : 0,
      deepFocusMinutes: agg ? agg.deepFocusMinutes : 0,
      averageEfficiency: agg ? Math.round(agg.avgEfficiency) : 0,
      averageFocusIndex: agg ? parseFloat(agg.avgFocusIndex.toFixed(2)) : 0,
      topCategory: topCatRow ? topCatRow.category : 'Focus',
      streak: user ? user.streak : 0,
      xp: user ? user.xp : 0,
      level: level.level,
      levelTitle: level.title,
    };
  }

  /**
   * Batch sync sessions from mobile app
   */
  static batchSyncSessions(userId, sessionsList = []) {
    if (!Array.isArray(sessionsList)) {
      throw new AppError('Sessions must be an array', 400);
    }

    const db = getDb();
    const upsertStmt = db.prepare(`
      INSERT INTO sessions (
        id, user_id, mode, duration_minutes, timestamp, 
        deep_focus, category, sound_id, efficiency, focus_index, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        mode = excluded.mode,
        duration_minutes = excluded.duration_minutes,
        timestamp = excluded.timestamp,
        deep_focus = excluded.deep_focus,
        category = excluded.category,
        sound_id = excluded.sound_id,
        efficiency = excluded.efficiency,
        focus_index = excluded.focus_index,
        note = excluded.note
    `);

    for (const s of sessionsList) {
      const sessionId = s.id ? String(s.id) : crypto.randomUUID();
      const mode = (s.mode || 'POMODORO').toUpperCase();
      const durationMinutes = Number(s.duration_minutes ?? s.durationMinutes) || 0;
      const timestamp = Number(s.timestamp) || Date.now();
      const deepFocus = Boolean(s.deep_focus ?? s.deepFocus) ? 1 : 0;
      const category = s.category || 'Focus';
      const soundId = s.sound_id || s.soundId || 'none';
      const efficiency = Number(s.efficiency) || calculateEfficiency(durationMinutes, Boolean(deepFocus));
      const focusIndex = Number(s.focus_index ?? s.focusIndex) || calculateFocusIndex(durationMinutes);
      const note = s.note || s.notes || '';
      const createdAt = s.createdAt || s.created_at || new Date(timestamp).toISOString();

      upsertStmt.run(sessionId, userId, mode, durationMinutes, timestamp, deepFocus, category, soundId, efficiency, focusIndex, note, createdAt);
    }

    return this.getSessions(userId, { limit: 100 });
  }

  /**
   * Helper to format database session row to standard JSON object
   */
  static formatSession(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      durationMinutes: row.duration_minutes,
      duration_minutes: row.duration_minutes,
      timestamp: row.timestamp,
      deepFocus: Boolean(row.deep_focus),
      deep_focus: Boolean(row.deep_focus),
      category: row.category,
      soundId: row.sound_id,
      sound_id: row.sound_id,
      efficiency: row.efficiency,
      focusIndex: row.focus_index,
      focus_index: row.focus_index,
      note: row.note,
      createdAt: row.created_at,
    };
  }
}

export default SessionService;
