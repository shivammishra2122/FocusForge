import { getDb } from '../db/database.js';
import { getLevelInfo } from '../constants/achievements.js';

export class InsightService {
  /**
   * Generates dynamic coaching analysis, fatigue alerts, and productivity recommendations
   */
  static getFocusInsights(userId) {
    const db = getDb();
    const user = db.prepare('SELECT id, name, xp, streak, daily_goal_hours FROM users WHERE id = ?').get(userId);

    const level = getLevelInfo(user ? user.xp : 0);

    // Fetch recent 30 sessions for behavioral pattern analysis
    const recentSessions = db.prepare(`
      SELECT 
        duration_minutes,
        timestamp,
        efficiency,
        focus_index,
        deep_focus,
        category,
        CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour
      FROM sessions
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 30
    `).all(userId);

    // 1. Calculate Peak Focus Windows
    const hourAggregates = {};
    for (const s of recentSessions) {
      if (!hourAggregates[s.hour]) {
        hourAggregates[s.hour] = { totalMinutes: 0, totalEfficiency: 0, count: 0 };
      }
      hourAggregates[s.hour].totalMinutes += s.duration_minutes;
      hourAggregates[s.hour].totalEfficiency += s.efficiency;
      hourAggregates[s.hour].count += 1;
    }

    let optimalHour = 9; // default 9 AM
    let maxScore = -1;
    for (const [hour, data] of Object.entries(hourAggregates)) {
      const avgEff = data.totalEfficiency / data.count;
      const score = data.totalMinutes * 0.4 + avgEff * 0.6;
      if (score > maxScore) {
        maxScore = score;
        optimalHour = parseInt(hour, 10);
      }
    }

    const formatHourWindow = (hr) => {
      const start = hr % 12 === 0 ? 12 : hr % 12;
      const startAmPm = hr < 12 ? 'AM' : 'PM';
      const nextHr = (hr + 2) % 24;
      const end = nextHr % 12 === 0 ? 12 : nextHr % 12;
      const endAmPm = nextHr < 12 ? 'AM' : 'PM';
      return `${start}:00 ${startAmPm} - ${end}:00 ${endAmPm}`;
    };

    const optimalFocusWindow = {
      recommendedStartHour: optimalHour,
      timeframe: formatHourWindow(optimalHour),
      confidence: recentSessions.length >= 5 ? 88 : 65,
      insight: `Your cognitive efficiency peaks between ${formatHourWindow(optimalHour)}. Prioritize deep architectural and high-complexity tasks during this window.`,
    };

    // 2. Fatigue Analysis & Alert
    let fatigueAlert = {
      level: 'LOW',
      fatigued: false,
      message: 'Optimal cognitive energy. Ready for deep execution.',
      recommendedBreakMinutes: 5,
    };

    if (recentSessions.length > 0) {
      // Check last session timestamp
      const lastSession = recentSessions[0];
      const now = Date.now();
      const minutesSinceLast = (now - lastSession.timestamp) / (1000 * 60);

      // Check sum of minutes in last 4 hours
      const recent4HoursMins = recentSessions
        .filter((s) => (now - s.timestamp) < 4 * 3600 * 1000)
        .reduce((sum, s) => sum + s.duration_minutes, 0);

      if (recent4HoursMins >= 180) {
        fatigueAlert = {
          level: 'HIGH',
          fatigued: true,
          message: `High cognitive exertion detected (${recent4HoursMins} min in last 4h). Diminishing returns imminent. Take a 20-30 min walk or non-screen recharge.`,
          recommendedBreakMinutes: 25,
        };
      } else if (recent4HoursMins >= 120 || (lastSession.duration_minutes >= 60 && minutesSinceLast < 15)) {
        fatigueAlert = {
          level: 'MODERATE',
          fatigued: true,
          message: 'Moderate mental load accumulated. Step away for 10-15 minutes to reset neuro-fatigue.',
          recommendedBreakMinutes: 15,
        };
      }
    }

    // 3. Streak Momentum Score (0-100)
    const streak = user ? user.streak : 0;
    const baseMomentum = Math.min(streak * 10, 50); // up to 50 from streak

    // Last 7 days consistency check
    const sevenDaysSessions = db.prepare(`
      SELECT COUNT(DISTINCT date(timestamp / 1000, 'unixepoch', 'localtime')) as activeDays
      FROM sessions
      WHERE user_id = ? AND timestamp >= ?
    `).get(userId, Date.now() - 7 * 24 * 3600 * 1000);

    const activeDays = sevenDaysSessions ? sevenDaysSessions.activeDays : 0;
    const consistencyScore = Math.round((activeDays / 7) * 40); // up to 40
    const levelBonus = Math.min((level.level || 1) * 2, 10); // up to 10

    const momentumScore = Math.min(100, baseMomentum + consistencyScore + levelBonus);

    // 4. Recommended Pomodoro Rhythm
    const avgDuration = recentSessions.length > 0
      ? recentSessions.reduce((acc, s) => acc + s.duration_minutes, 0) / recentSessions.length
      : 25;

    let recommendedProtocol = {
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      roundsBeforeLongBreak: 4,
      profileName: 'Standard Pomodoro',
    };

    if (avgDuration >= 45) {
      recommendedProtocol = {
        workDuration: 50,
        shortBreak: 10,
        longBreak: 25,
        roundsBeforeLongBreak: 3,
        profileName: 'Deep Flow Protocol',
      };
    } else if (avgDuration >= 35) {
      recommendedProtocol = {
        workDuration: 40,
        shortBreak: 8,
        longBreak: 20,
        roundsBeforeLongBreak: 4,
        profileName: 'Hyper Focus Protocol',
      };
    }

    // 5. Tactical Recommendations
    const tacticalTips = [
      'Protect your first 90 minutes of the morning: zero notifications, pure deep execution.',
      'Hydrate before every focus sprint; dehydration reduces cognitive focus index by up to 12%.',
      'Use 40Hz binaural beats during intense logic and debugging sessions for faster flow-state induction.',
      'Batch administrative and low-priority tasks into a single 30-minute block at the end of the day.',
    ];

    return {
      operator: {
        name: user ? user.name : 'Operator',
        level: level.level,
        title: level.title,
      },
      momentumScore,
      momentumStatus: momentumScore >= 80 ? 'HYPERDRIVE' : momentumScore >= 50 ? 'ACCELERATING' : 'BUILDING_BASE',
      optimalFocusWindow,
      fatigueAlert,
      recommendedProtocol,
      tacticalTips,
    };
  }
}

export default InsightService;
