import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { getStats, getFocusSessions, getSettings, getStreakData } from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo, getProgressToNextLevel } from '../constants/achievements';
import { formatMinutes, formatHours, getLastNDays, getDayLabel } from '../utils/helpers';

const { width } = require('react-native').Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 100;

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  const load = async () => {
    const [s, sess, sett, streakData] = await Promise.all([
      getStats(), getFocusSessions(), getSettings(), getStreakData(),
    ]);
    setStats(s);
    setSessions(sess);
    setSettings(sett);
    const days = getLastNDays(7);
    setWeekData(days.map((d) => ({ key: d, label: getDayLabel(d), minutes: streakData[d] || 0 })));
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
  const barW = (CHART_WIDTH - (weekData.length - 1) * 8) / weekData.length;
  const avgDailyMin = weekData.reduce((s, d) => s + d.minutes, 0) / 7;
  const recentSessions = sessions.slice(0, 5);

  const StatCard = ({ label, value, accent }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent && { color: Colors.primary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Your focus journey</Text>
        </View>

        {/* Level Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelHead}>
            <View>
              <Text style={styles.levelTag}>LEVEL {levelInfo.level}</Text>
              <Text style={styles.levelTitle}>{levelInfo.title}</Text>
            </View>
            <View style={styles.xpPill}>
              <Text style={styles.xpText}>{stats.xp} XP</Text>
            </View>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${levelProgress * 100}%` }]} />
          </View>
          <Text style={styles.barLabel}>
            {levelInfo.maxXP === Infinity ? 'Max level reached' : `${Math.round(levelProgress * 100)}% to Level ${levelInfo.level + 1}`}
          </Text>
        </View>

        {/* Today's Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHead}>
            <Text style={styles.sectionLabel}>TODAY'S GOAL</Text>
            <Text style={styles.goalVal}>{formatMinutes(todayMinutes)} / {formatMinutes(goalMinutes)}</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${todayProgress * 100}%`, backgroundColor: Colors.primary }]} />
          </View>
          <Text style={styles.barLabel}>{Math.round(todayProgress * 100)}% complete</Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Streak" value={`${stats.streak}d`} />
          <StatCard label="Total Time" value={formatHours(stats.totalMinutes)} accent />
          <StatCard label="Sessions" value={stats.totalSessions} />
          <StatCard label="Achievements" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} />
        </View>

        {/* Chart */}
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartCard}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 28}>
            {weekData.map((d, i) => {
              const barH = Math.max((d.minutes / maxWeekMin) * CHART_HEIGHT, 4);
              const x = i * (barW + 8);
              const y = CHART_HEIGHT - barH;
              return (
                <Rect
                  key={d.key} x={x} y={y} width={barW} height={barH} rx={5}
                  fill={d.key === todayKey ? Colors.primary : Colors.bgHighlight}
                  opacity={d.minutes > 0 ? 1 : 0.5}
                />
              );
            })}
          </Svg>
          <View style={styles.chartLabels}>
            {weekData.map((d) => (
              <View key={d.key} style={{ width: barW, alignItems: 'center' }}>
                <Text style={[styles.chartLabel, d.key === todayKey && { color: Colors.primary }]}>{d.label}</Text>
                <Text style={styles.chartMin}>{d.minutes > 0 ? formatMinutes(d.minutes) : '–'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartAvg}>7-day avg · {formatMinutes(Math.round(avgDailyMin))}</Text>
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <View style={styles.sessionList}>
              {recentSessions.map((s, idx) => {
                const date = new Date(s.timestamp);
                const modeLabel = s.mode === 'pomodoro' ? 'Focus' : s.mode === 'short_break' ? 'Short Break' : s.mode === 'long_break' ? 'Long Break' : 'Custom';
                return (
                  <View key={s.id} style={[styles.sessionRow, idx < recentSessions.length - 1 && styles.sessionRowBorder]}>
                    <View>
                      <Text style={styles.sessionMode}>{modeLabel}</Text>
                      <Text style={styles.sessionDate}>
                        {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.sessionDur}>{formatMinutes(s.durationMinutes)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 64 : 48 },
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -1 },
  headerSub: { fontSize: 14, color: Colors.textMuted, marginTop: 6, fontWeight: '500' },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 },
  levelCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 22, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  levelTag: { fontSize: 11, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  levelTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  xpPill: { backgroundColor: Colors.primarySubtle, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.borderActive },
  xpText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  barBg: { height: 4, backgroundColor: Colors.bgHighlight, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  barLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  goalCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 22, marginBottom: 28, borderWidth: 1, borderColor: Colors.border },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  goalVal: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: Colors.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  statLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  chartCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: Colors.border },
  chartLabels: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chartLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  chartMin: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  chartFooter: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: Colors.borderSubtle },
  chartAvg: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  sessionList: { backgroundColor: Colors.bgCard, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  sessionRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  sessionMode: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  sessionDate: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  sessionDur: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
