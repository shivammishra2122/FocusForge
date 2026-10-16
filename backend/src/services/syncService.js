import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import TaskService from './taskService.js';
import SessionService from './sessionService.js';

export class SyncService {
  /**
   * Pushes client data to cloud database (atomic upsert)
   */
  static pushData(userId, payload) {
    if (!payload || typeof payload !== 'object') {
      throw new AppError('Invalid sync payload', 400);
    }

    const db = getDb();
    const nowIso = new Date().toISOString();

    // 1. Sync Profile & Stats
    const profile = payload.profile || {};
    const stats = payload.stats || {};

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    const updatedName = profile.name || currentUser.name;
    const updatedAvatar = profile.avatar !== undefined ? profile.avatar : currentUser.avatar;
    const updatedDailyGoal = profile.daily_goal_hours || profile.dailyGoalHours || currentUser.daily_goal_hours;
    const updatedXp = Math.max(currentUser.xp || 0, Number(stats.xp) || 0);
    const updatedStreak = Math.max(currentUser.streak || 0, Number(stats.streak) || 0);

    db.prepare(`
      UPDATE users 
      SET name = ?, avatar = ?, daily_goal_hours = ?, xp = ?, streak = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, updatedAvatar, updatedDailyGoal, updatedXp, updatedStreak, nowIso, userId);

    // 2. Sync Settings if provided
    const settings = payload.settings;
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

    // 3. Sync Tasks
    const rawTasks = payload.tasks?.list || payload.tasks;
    if (Array.isArray(rawTasks)) {
      TaskService.batchSyncTasks(userId, rawTasks);
    }

    // 4. Sync Sessions
    const rawSessions = payload.sessions?.list || payload.sessions;
    if (Array.isArray(rawSessions)) {
      SessionService.batchSyncSessions(userId, rawSessions);
    }

    // 5. Sync Achievements
    const rawAchievements = payload.achievements?.list || payload.achievements;
    if (Array.isArray(rawAchievements)) {
      const achStmt = db.prepare(`
        INSERT INTO achievements (id, user_id, unlocked_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id, user_id) DO NOTHING
      `);
      for (const ach of rawAchievements) {
        const achId = typeof ach === 'string' ? ach : ach.id;
        if (achId) {
          const unlockedAt = (typeof ach === 'object' && ach.unlocked_at) ? ach.unlocked_at : nowIso;
          achStmt.run(achId, userId, unlockedAt);
        }
      }
    }

    // 6. Sync Streaks Day-by-Day History
    const streaks = payload.streaks;
    if (streaks && typeof streaks === 'object') {
      const streakStmt = db.prepare(`
        INSERT INTO streak_history (user_id, date, minutes)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          minutes = MAX(streak_history.minutes, excluded.minutes)
      `);
      for (const [dateStr, minutes] of Object.entries(streaks)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          streakStmt.run(userId, dateStr, Number(minutes) || 0);
        }
      }
    }

    return {
      success: true,
      message: 'Cloud sync push successful',
      syncedAt: nowIso,
    };
  }

  /**
   * Pulls full cloud snapshot matching mobile AsyncStorage structure
   */
  static pullData(userId) {
    const db = getDb();
    const user = db.prepare('SELECT id, email, name, avatar, daily_goal_hours, xp, streak, created_at, updated_at FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Settings
    let settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
    if (!settings) {
      settings = {
        pomodoroWork: 25,
        pomodoroShortBreak: 5,
        pomodoroLongBreak: 15,
        pomodoroRounds: 4,
        dailyGoalHours: user.daily_goal_hours || 2.0,
        notifications: true,
        haptics: true,
        autoStartBreaks: false,
        autoStartWork: false,
        appBlockingEnabled: false,
      };
    } else {
      settings = {
        pomodoroWork: settings.pomodoro_work,
        pomodoroShortBreak: settings.pomodoro_short_break,
        pomodoroLongBreak: settings.pomodoro_long_break,
        pomodoroRounds: settings.pomodoro_rounds,
        dailyGoalHours: settings.daily_goal_hours,
        notifications: Boolean(settings.notifications),
        haptics: Boolean(settings.haptics),
        autoStartBreaks: Boolean(settings.auto_start_breaks),
        autoStartWork: Boolean(settings.auto_start_work),
        appBlockingEnabled: Boolean(settings.app_blocking_enabled),
      };
    }

    // Tasks
    const tasks = TaskService.getTasks(userId);

    // Sessions
    const sessions = SessionService.getSessions(userId, { limit: 500 });

    // Achievements
    const achRows = db.prepare('SELECT id FROM achievements WHERE user_id = ?').all(userId);
    const achievementsList = achRows.map((r) => r.id);

    // Streaks history
    const streakRows = db.prepare('SELECT date, minutes FROM streak_history WHERE user_id = ?').all(userId);
    const streaksMap = {};
    for (const r of streakRows) {
      streaksMap[r.date] = r.minutes;
    }

    // Aggregate stats
    const agg = db.prepare(`
      SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(duration_minutes), 0) as totalMinutes,
        MAX(CASE WHEN strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) < '08' THEN 1 ELSE 0 END) as hasEarlySession,
        MAX(CASE WHEN strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) >= '22' THEN 1 ELSE 0 END) as hasLateSession,
        MAX(date(timestamp / 1000, 'unixepoch', 'localtime')) as lastSessionDate
      FROM sessions WHERE user_id = ?
    `).get(userId);

    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1').get(userId);

    const stats = {
      totalMinutes: agg ? agg.totalMinutes : 0,
      totalSessions: agg ? agg.totalSessions : 0,
      tasksCompleted: taskCount ? taskCount.count : 0,
      xp: user.xp,
      streak: user.streak,
      hasEarlySession: Boolean(agg?.hasEarlySession),
      hasLateSession: Boolean(agg?.hasLateSession),
      lastSessionDate: agg?.lastSessionDate ? new Date(agg.lastSessionDate).toDateString() : null,
    };

    return {
      user_id: user.id,
      profile: {
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        daily_goal_hours: user.daily_goal_hours,
      },
      stats,
      tasks: { list: tasks },
      sessions: { list: sessions },
      achievements: { list: achievementsList },
      streaks: streaksMap,
      settings,
      updated_at: user.updated_at || new Date().toISOString(),
    };
  }
}

export default SyncService;
