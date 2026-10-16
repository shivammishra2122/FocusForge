import { getDb } from '../db/database.js';
import { getLevelInfo } from '../constants/achievements.js';

export class LeaderboardService {
  /**
   * Retrieves top ranked operators by XP and total focus minutes
   */
  static getLeaderboard(currentUserId = null, limit = 20) {
    const db = getDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const rows = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.avatar,
        u.xp,
        u.streak,
        COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
        COUNT(s.id) as total_sessions
      FROM users u
      LEFT JOIN sessions s ON u.id = s.user_id
      GROUP BY u.id
      ORDER BY u.xp DESC, total_minutes DESC
      LIMIT ?
    `).all(safeLimit);

    let userRank = null;
    let userStats = null;

    const leaderboard = rows.map((row, index) => {
      const rank = index + 1;
      const level = getLevelInfo(row.xp);
      const isCurrentUser = currentUserId && row.id === currentUserId;

      const entry = {
        rank,
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        xp: row.xp,
        streak: row.streak,
        totalMinutes: row.total_minutes,
        totalHours: parseFloat((row.total_minutes / 60).toFixed(1)),
        totalSessions: row.total_sessions,
        level: level.level,
        levelTitle: level.title,
        isCurrentUser,
      };

      if (isCurrentUser) {
        userRank = rank;
        userStats = entry;
      }

      return entry;
    });

    // If current user is not in top limit, calculate their rank
    if (currentUserId && !userStats) {
      const allRows = db.prepare(`
        SELECT u.id, u.xp
        FROM users u
        ORDER BY u.xp DESC
      `).all();

      const rankIndex = allRows.findIndex((r) => r.id === currentUserId);
      if (rankIndex !== -1) {
        userRank = rankIndex + 1;
        const u = db.prepare('SELECT id, name, avatar, xp, streak FROM users WHERE id = ?').get(currentUserId);
        const minsRow = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM sessions WHERE user_id = ?').get(currentUserId);
        const level = getLevelInfo(u.xp);

        userStats = {
          rank: userRank,
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          xp: u.xp,
          streak: u.streak,
          totalMinutes: minsRow ? minsRow.mins : 0,
          totalHours: minsRow ? parseFloat((minsRow.mins / 60).toFixed(1)) : 0,
          level: level.level,
          levelTitle: level.title,
          isCurrentUser: true,
        };
      }
    }

    return {
      leaderboard,
      currentUserStanding: userStats,
    };
  }
}

export default LeaderboardService;
