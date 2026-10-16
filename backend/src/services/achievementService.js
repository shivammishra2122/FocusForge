import { getDb } from '../db/database.js';
import { ACHIEVEMENTS } from '../constants/achievements.js';

export class AchievementService {
  /**
   * Evaluates user stats and unlocks newly earned achievements.
   * Returns an array of newly unlocked achievement objects.
   */
  static evaluateAchievements(userId) {
    const db = getDb();

    // Fetch existing unlocked achievements
    const unlockedRows = db.prepare('SELECT id FROM achievements WHERE user_id = ?').all(userId);
    const unlockedSet = new Set(unlockedRows.map((r) => r.id));

    // Gather user stats
    const user = db.prepare('SELECT streak, xp FROM users WHERE id = ?').get(userId);
    if (!user) return [];

    const sessionStats = db.prepare(`
      SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(duration_minutes), 0) as totalMinutes,
        MAX(CASE WHEN strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) < '08' THEN 1 ELSE 0 END) as hasEarlySession,
        MAX(CASE WHEN strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) >= '22' THEN 1 ELSE 0 END) as hasLateSession
      FROM sessions WHERE user_id = ?
    `).get(userId);

    const taskStats = db.prepare('SELECT COUNT(*) as tasksCompleted FROM tasks WHERE user_id = ? AND completed = 1').get(userId);

    const stats = {
      streak: user.streak || 0,
      xp: user.xp || 0,
      totalSessions: sessionStats ? sessionStats.totalSessions : 0,
      totalMinutes: sessionStats ? sessionStats.totalMinutes : 0,
      hasEarlySession: sessionStats ? Boolean(sessionStats.hasEarlySession) : false,
      hasLateSession: sessionStats ? Boolean(sessionStats.hasLateSession) : false,
      tasksCompleted: taskStats ? taskStats.tasksCompleted : 0,
    };

    const newlyUnlocked = [];
    let bonusXp = 0;
    const nowIso = new Date().toISOString();

    for (const ach of ACHIEVEMENTS) {
      if (!unlockedSet.has(ach.id) && ach.condition(stats)) {
        db.prepare('INSERT INTO achievements (id, user_id, unlocked_at) VALUES (?, ?, ?)').run(ach.id, userId, nowIso);
        unlockedSet.add(ach.id);
        newlyUnlocked.push(ach);
        bonusXp += ach.xp;
      }
    }

    if (bonusXp > 0) {
      db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(bonusXp, userId);
    }

    return newlyUnlocked;
  }

  /**
   * Get all unlocked achievements for a user
   */
  static getUnlockedAchievements(userId) {
    const db = getDb();
    const rows = db.prepare('SELECT id, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC').all(userId);
    const unlockedMap = new Map(rows.map((r) => [r.id, r.unlocked_at]));

    return ACHIEVEMENTS.map((ach) => ({
      ...ach,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null,
    }));
  }
}

export default AchievementService;
