import { getDb } from '../db/database.js';
import { getLevelInfo, getProgressToNextLevel } from '../constants/achievements.js';

export class AnalyticsService {
  /**
   * Generates a comprehensive analytics overview for the user
   */
  static getOverview(userId) {
    const db = getDb();
    const user = db.prepare('SELECT streak, xp, daily_goal_hours FROM users WHERE id = ?').get(userId);
    const dailyGoalMinutes = ((user ? user.daily_goal_hours : 2.0) || 2.0) * 60;

    // Total focus stats
    const totalStats = db.prepare(`
      SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(duration_minutes), 0) as totalMinutes,
        COALESCE(SUM(CASE WHEN deep_focus = 1 THEN duration_minutes ELSE 0 END), 0) as deepFocusMinutes,
        COALESCE(AVG(efficiency), 0) as avgEfficiency
      FROM sessions WHERE user_id = ?
    `).get(userId);

    const tasksCompleted = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1').get(userId);

    // 7-Day Performance Breakdown
    const sevenDayBreakdown = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      const daySession = db.prepare(`
        SELECT 
          COUNT(*) as sessionCount,
          COALESCE(SUM(duration_minutes), 0) as minutes
        FROM sessions 
        WHERE user_id = ? AND date(timestamp / 1000, 'unixepoch', 'localtime') = ?
      `).get(userId, dateStr);

      // Also check streak_history for recorded minutes
      const streakRecord = db.prepare('SELECT minutes FROM streak_history WHERE user_id = ? AND date = ?').get(userId, dateStr);
      const minutes = Math.max(daySession ? daySession.minutes : 0, streakRecord ? streakRecord.minutes : 0);

      sevenDayBreakdown.push({
        date: dateStr,
        dayName,
        minutes,
        sessionCount: daySession ? daySession.sessionCount : 0,
        goalMinutes: dailyGoalMinutes,
        goalMet: minutes >= dailyGoalMinutes,
      });
    }

    // Hourly Distribution (0 to 23 hours)
    const hourlyCounts = new Array(24).fill(0);
    const hourlyRows = db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
        SUM(duration_minutes) as minutes
      FROM sessions 
      WHERE user_id = ?
      GROUP BY hour
    `).all(userId);

    for (const row of hourlyRows) {
      if (row.hour >= 0 && row.hour < 24) {
        hourlyCounts[row.hour] = row.minutes;
      }
    }

    // Category Breakdown
    const catRows = db.prepare(`
      SELECT 
        category,
        COUNT(*) as sessionCount,
        SUM(duration_minutes) as minutes
      FROM sessions
      WHERE user_id = ?
      GROUP BY category
      ORDER BY minutes DESC
    `).all(userId);

    const totalMinutes = totalStats ? totalStats.totalMinutes : 0;
    const categoryBreakdown = catRows.map((cat) => ({
      category: cat.category,
      minutes: cat.minutes,
      sessionCount: cat.sessionCount,
      percentage: totalMinutes > 0 ? Math.round((cat.minutes / totalMinutes) * 100) : 0,
    }));

    const userXp = user ? user.xp : 0;
    const level = getLevelInfo(userXp);
    const progressToNextLevel = getProgressToNextLevel(userXp);

    const deepFocusMinutes = totalStats ? totalStats.deepFocusMinutes : 0;
    const deepFocusRatio = totalMinutes > 0 ? Math.round((deepFocusMinutes / totalMinutes) * 100) : 0;

    return {
      totalMinutes,
      totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
      totalSessions: totalStats ? totalStats.totalSessions : 0,
      tasksCompleted: tasksCompleted ? tasksCompleted.count : 0,
      streak: user ? user.streak : 0,
      xp: userXp,
      level: {
        number: level.level,
        title: level.title,
        minXP: level.minXP,
        maxXP: level.maxXP === Infinity ? null : level.maxXP,
        progress: progressToNextLevel,
      },
      averageEfficiency: totalStats ? Math.round(totalStats.avgEfficiency) : 0,
      deepFocusMinutes,
      deepFocusRatio,
      sevenDayBreakdown,
      hourlyDistribution: hourlyCounts,
      categoryBreakdown,
    };
  }
}

export default AnalyticsService;
