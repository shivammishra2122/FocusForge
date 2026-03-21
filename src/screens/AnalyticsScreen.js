import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { getStats, getFocusSessions, getSettings, getStreakData } from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo, getProgressToNextLevel } from '../constants/achievements';
import { formatMinutes, formatHours, getLastNDays, getDayLabel } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 120;

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    const [s, sess, sett, streakData] = await Promise.all([
      getStats(),
      getFocusSessions(),
      getSettings(),
      getStreakData(),
    ]);
    setStats(s);
    setSessions(sess);
    setSettings(sett);

    const days = getLastNDays(7);
    const data = days.map((d) => ({
      key: d,
      label: getDayLabel(d),
      minutes: streakData[d] || 0,
    }));
    setWeekData(data);

    // Count unlocked achievements
    const { getUnlockedAchievements } = require('../utils/storage');
    const unlocked = await getUnlockedAchievements();
    setUnlockedCount(unlocked.length);
  };

  if (!stats) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const levelProgress = getProgressToNextLevel(stats.xp);
  const goalMinutes = (settings?.dailyGoalHours || 2) * 60;

  const todayKey = new Date().toISOString().split('T')[0];
  const todayMinutes = weekData.find((d) => d.key === todayKey)?.minutes || 0;
  const todayProgress = Math.min(todayMinutes / goalMinutes, 1);

  const maxWeekMin = Math.max(...weekData.map((d) => d.minutes), 1);
  const barWidth = (CHART_WIDTH - (weekData.length - 1) * 10) / weekData.length;
  const avgDailyMin = weekData.reduce((s, d) => s + d.minutes, 0) / 7;

  // Recent sessions
  const recentSessions = sessions.slice(0, 5);

  const StatCard = ({ label, value, sub, color, emoji }) => (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Your focus journey</Text>
        </View>

        {/* Level Card */}
        <LinearGradient colors={Colors.gradientCard} style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelBadge}>Level {levelInfo.level}</Text>
              <Text style={styles.levelTitle}>{levelInfo.title}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpValue}>{stats.xp} XP</Text>
            </View>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${levelProgress * 100}%` }]} />
          </View>
          <Text style={styles.levelBarLabel}>
            {levelInfo.maxXP === Infinity ? 'Max Level!' : `${Math.round(levelProgress * 100)}% to Level ${levelInfo.level + 1}`}
          </Text>
        </LinearGradient>

        {/* Today's Goal */}
        <View style={styles.todayCard}>
          <View style={styles.todayTop}>
            <Text style={styles.sectionTitle}>Today's Goal</Text>
            <Text style={styles.todayGoalText}>{formatMinutes(todayMinutes)} / {formatMinutes(goalMinutes)}</Text>
          </View>
          <View style={styles.goalBarBg}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.goalBarFill, { width: `${todayProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.goalBarLabel}>{Math.round(todayProgress * 100)}% complete</Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard emoji="🔥" label="Streak" value={`${stats.streak}d`} color={Colors.danger} />
          <StatCard emoji="⏱" label="Total Time" value={formatHours(stats.totalMinutes)} color={Colors.primary} />
          <StatCard emoji="🎯" label="Sessions" value={stats.totalSessions} color={Colors.accent} />
          <StatCard emoji="🏆" label="Achievements" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} color={Colors.accentWarm} />
        </View>

        {/* Weekly Chart */}
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartCard}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 28}>
            {weekData.map((d, i) => {
              const barH = Math.max((d.minutes / maxWeekMin) * CHART_HEIGHT, 4);
              const x = i * (barWidth + 10);
              const y = CHART_HEIGHT - barH;
              const isToday = d.key === todayKey;
              return (
                <React.Fragment key={d.key}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={6}
                    fill={isToday ? Colors.primary : Colors.bgHighlight}
                    opacity={d.minutes > 0 ? 1 : 0.4}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
          <View style={styles.chartLabels}>
            {weekData.map((d) => (
              <View key={d.key} style={{ width: barWidth, alignItems: 'center' }}>
                <Text style={[styles.chartLabel, d.key === todayKey && { color: Colors.primary }]}>{d.label}</Text>
                <Text style={styles.chartMin}>{d.minutes > 0 ? formatMinutes(d.minutes) : '-'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartAvg}>Daily avg: {formatMinutes(Math.round(avgDailyMin))}</Text>
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <View style={styles.sessionsList}>
              {recentSessions.map((s) => {
                const date = new Date(s.timestamp);
                const modeLabel = s.mode === 'pomodoro' ? '🧠 Focus' : s.mode === 'short_break' ? '☕ Break' : s.mode === 'long_break' ? '🌿 Rest' : '⚙️ Custom';
                return (
                  <View key={s.id} style={styles.sessionItem}>
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionMode}>{modeLabel}</Text>
                      <Text style={styles.sessionDate}>
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.sessionDur}>{formatMinutes(s.durationMinutes)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  scroll: { paddingHorizontal: 24 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  levelCard: { borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: Colors.glassBorder },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  levelBadge: { fontSize: 12, color: Colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  levelTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  xpBadge: { backgroundColor: Colors.primary + '25', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary + '40' },
  xpValue: { color: Colors.primary, fontWeight: '900', fontSize: 18 },
  levelBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  levelBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5 },
  levelBarLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  todayCard: { backgroundColor: Colors.glass, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.glassBorder },
  todayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  todayGoalText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  goalBarBg: { height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  goalBarFill: { height: '100%', borderRadius: 6 },
  goalBarLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.glass, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center' },
  statEmoji: { fontSize: 28, marginBottom: 10 },
  statValue: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 6 },
  statLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  statSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  chartCard: { backgroundColor: Colors.glass, borderRadius: 24, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: Colors.glassBorder },
  chartLabels: { flexDirection: 'row', gap: 10, marginTop: 12 },
  chartLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  chartMin: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  chartFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: Colors.glassBorder },
  chartAvg: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  sessionsList: { gap: 12, marginBottom: 12 },
  sessionItem: { backgroundColor: Colors.glass, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  sessionLeft: {},
  sessionMode: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sessionDate: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  sessionDur: { fontSize: 18, fontWeight: '900', color: Colors.primary },
});
