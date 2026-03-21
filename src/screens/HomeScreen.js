import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getStats, getUserProfile, getTasks, getSettings, getStreakData, getUnlockedAchievements } from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo } from '../constants/achievements';
import { formatMinutes, getTodayKey, getLastNDays, hapticLight } from '../utils/helpers';
import { getDailyQuote } from '../constants/quotes';

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const quote = getDailyQuote();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    const [p, s, t, sett, streakData, unlockedIds] = await Promise.all([
      getUserProfile(),
      getStats(),
      getTasks(),
      getSettings(),
      getStreakData(),
      getUnlockedAchievements(),
    ]);
    setProfile(p);
    setStats(s);
    setTasks(t);
    setSettings(sett);
    setTodayMinutes(streakData[getTodayKey()] || 0);

    for (const a of ACHIEVEMENTS) {
      if (!unlockedIds.includes(a.id) && a.condition(s)) {
        const { unlockAchievement, saveStats } = require('../utils/storage');
        await unlockAchievement(a.id);
        if (s) { s.xp = (s.xp || 0) + a.xp; await saveStats(s); }
      }
    }
  };

  if (!stats || !settings) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const goalMinutes = (settings.dailyGoalHours || 2) * 60;
  const goalProgress = Math.min(todayMinutes / goalMinutes, 1);
  const activeTasks = tasks.filter((t) => !t.completed);
  const highPriorityTasks = activeTasks.filter((t) => t.priority === 'HIGH').slice(0, 3);

  const getHour = () => new Date().getHours();

  const last7 = getLastNDays(7);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getHour() < 12 ? 'Good morning' : getHour() < 17 ? 'Good afternoon' : 'Good evening'},
            </Text>
            <Text style={styles.name}>{profile?.name || 'Student'}</Text>
          </View>
          <TouchableOpacity
            style={styles.levelBadge}
            onPress={() => navigation.navigate('Achievements')}
          >
            <Text style={styles.levelBadgeText}>Lv.{levelInfo.level}</Text>
          </TouchableOpacity>
        </View>

        {/* Goal Card */}
        <View style={styles.goalCard}>
          <View style={styles.goalTop}>
            <View>
              <Text style={styles.goalLabel}>TODAY'S GOAL</Text>
              <Text style={styles.goalTime}>{formatMinutes(todayMinutes)} / {formatMinutes(goalMinutes)}</Text>
            </View>
            <View style={styles.streakCol}>
              <Text style={styles.streakNum}>{stats.streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>
          <View style={styles.goalBarBg}>
            <View style={[styles.goalBarFill, { width: `${goalProgress * 100}%` }]} />
          </View>
          <Text style={styles.goalPercent}>{Math.round(goalProgress * 100)}% complete</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => { hapticLight(); navigation.navigate('Timer'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Colors.gradientPrimary} style={styles.startBtnGrad}>
              <Text style={styles.startBtnIcon}>▶</Text>
              <Text style={styles.startBtnText}>Start Focus</Text>
              <Text style={styles.startBtnSub}>25 min Pomodoro</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.quickCol}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => { hapticLight(); navigation.navigate('Tasks'); }}
            >
              <Text style={styles.quickCardLabel}>Tasks</Text>
              <Text style={styles.quickCardValue}>{activeTasks.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => { hapticLight(); navigation.navigate('Analytics'); }}
            >
              <Text style={styles.quickCardLabel}>Analytics</Text>
              <Text style={styles.quickCardValue}>{stats.totalSessions}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Streak */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Streak</Text>
          <View style={styles.streakDays}>
            {last7.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  i < stats.streak && stats.streak > 0 && styles.streakDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{formatMinutes(stats.totalMinutes)}</Text>
            <Text style={styles.statLabel}>Total Focus</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
        </View>

        {/* Priority Tasks */}
        {highPriorityTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Priority Tasks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.taskList}>
              {highPriorityTasks.map((task, idx) => (
                <View
                  key={task.id}
                  style={[styles.taskRow, idx < highPriorityTasks.length - 1 && styles.taskRowBorder]}
                >
                  <View style={styles.taskDot} />
                  <Text style={styles.taskName} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskBadge}>HIGH</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quote */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteAccent} />
          <View style={styles.quoteContent}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 64 : 48 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { fontSize: 13, color: Colors.textMuted, fontWeight: '500', letterSpacing: 0.2 },
  name: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginTop: 4, letterSpacing: -0.5 },
  levelBadge: { backgroundColor: Colors.primarySubtle, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.borderActive },
  levelBadgeText: { color: Colors.primary, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Goal Card
  goalCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  goalLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  goalTime: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  streakCol: { alignItems: 'flex-end' },
  streakNum: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  streakLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: 4 },
  goalBarBg: { height: 4, backgroundColor: Colors.bgHighlight, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  goalBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  goalPercent: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  // Quick Actions
  quickRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  startBtn: { flex: 1.6, borderRadius: 20, overflow: 'hidden' },
  startBtnGrad: { padding: 24, minHeight: 148, justifyContent: 'flex-end' },
  startBtnIcon: { fontSize: 22, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  startBtnText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  startBtnSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  quickCol: { flex: 1, gap: 14 },
  quickCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, justifyContent: 'space-between' },
  quickCardLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  quickCardValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Streak
  streakDays: { flexDirection: 'row', gap: 8, marginTop: 14 },
  streakDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.bgHighlight },
  streakDotActive: { backgroundColor: Colors.primary },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 18, marginBottom: 28, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },

  // Task List
  taskList: { backgroundColor: Colors.bgCard, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.danger },
  taskName: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  taskBadge: { fontSize: 10, color: Colors.danger, fontWeight: '700', letterSpacing: 0.8, backgroundColor: Colors.dangerSubtle, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },

  // Quote
  quoteCard: { flexDirection: 'row', gap: 16, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  quoteAccent: { width: 3, borderRadius: 2, backgroundColor: Colors.primary, alignSelf: 'stretch' },
  quoteContent: { flex: 1 },
  quoteText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 22 },
  quoteAuthor: { fontSize: 12, color: Colors.textMuted, marginTop: 10, fontWeight: '600' },
});
