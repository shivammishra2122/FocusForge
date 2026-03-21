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
import { Colors } from '../constants/colors';
import { getStats, getUserProfile, getTasks, getSettings, getStreakData, getUnlockedAchievements } from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo } from '../constants/achievements';
import { formatMinutes, getTodayKey, getLastNDays, hapticLight } from '../utils/helpers';
import { getDailyQuote } from '../constants/quotes';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [newAchievements, setNewAchievements] = useState([]);

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

    // Check for new achievements
    const newUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (!unlockedIds.includes(a.id) && a.condition(s)) {
        newUnlocked.push(a);
        const { unlockAchievement } = require('../utils/storage');
        await unlockAchievement(a.id);
        // Award XP
        if (s) {
          const { saveStats } = require('../utils/storage');
          s.xp = (s.xp || 0) + a.xp;
          await saveStats(s);
        }
      }
    }
    setNewAchievements(newUnlocked);
  };

  if (!stats || !settings) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const goalMinutes = (settings.dailyGoalHours || 2) * 60;
  const goalProgress = Math.min(todayMinutes / goalMinutes, 1);
  const activeTasks = tasks.filter((t) => !t.completed);
  const highPriorityTasks = activeTasks.filter((t) => t.priority === 'HIGH').slice(0, 3);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅 Good morning';
    if (h < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  const StreakDay = ({ active }) => (
    <View style={[styles.streakDay, active && { backgroundColor: Colors.danger, borderColor: Colors.danger }]}>
      {active && <Text style={styles.streakDayFire}>🔥</Text>}
    </View>
  );

  const last7 = getLastNDays(7);

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{profile?.name || 'Student'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.levelBadge}
            onPress={() => navigation.navigate('Achievements')}
          >
            <Text style={styles.levelBadgeEmoji}>⚡</Text>
            <Text style={styles.levelBadgeText}>Lv.{levelInfo.level}</Text>
          </TouchableOpacity>
        </View>

        {/* New achievement banners */}
        {newAchievements.map((a) => (
          <View key={a.id} style={styles.achievementBanner}>
            <Text style={styles.achievementBannerEmoji}>{a.icon}</Text>
            <View style={styles.achievementBannerContent}>
              <Text style={styles.achievementBannerTitle}>Achievement Unlocked!</Text>
              <Text style={styles.achievementBannerName}>{a.title} (+{a.xp} XP)</Text>
            </View>
          </View>
        ))}

        {/* Today's Goal */}
        <LinearGradient colors={Colors.gradientGlass} style={styles.goalCard}>
          <View style={styles.goalTop}>
            <View>
              <Text style={styles.goalLabel}>TODAY'S GOAL</Text>
              <Text style={styles.goalTime}>{formatMinutes(todayMinutes)} / {formatMinutes(goalMinutes)}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNum}>{stats.streak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>
          <View style={styles.goalBarBg}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.goalBarFill, { width: `${goalProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.goalPercent}>{Math.round(goalProgress * 100)}% of daily goal complete</Text>
        </LinearGradient>


        {/* Quick Start */}
        <View style={styles.quickStartRow}>
          <TouchableOpacity
            style={styles.quickStartMain}
            onPress={() => { hapticLight(); navigation.navigate('Timer'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Colors.gradientPrimary} style={styles.quickStartGrad}>
              <Text style={styles.quickStartEmoji}>▶</Text>
              <Text style={styles.quickStartText}>Start Focus</Text>
              <Text style={styles.quickStartSub}>25 min Pomodoro</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.quickStartCol}>
            <TouchableOpacity
              style={StyleSheet.flatten([styles.quickStartSmall, { borderColor: Colors.accent + '50', backgroundColor: Colors.accent + '10' }])}
              onPress={() => { hapticLight(); navigation.navigate('Tasks'); }}
            >
              <Text style={styles.quickStartSmallEmoji}>📋</Text>
              <Text style={styles.quickStartSmallText}>Tasks</Text>
              <Text style={styles.quickStartSmallBadge}>{activeTasks.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={StyleSheet.flatten([styles.quickStartSmall, { borderColor: Colors.accentWarm + '50', backgroundColor: Colors.accentWarm + '10' }])}
              onPress={() => { hapticLight(); navigation.navigate('Analytics'); }}
            >
              <Text style={styles.quickStartSmallEmoji}>📊</Text>
              <Text style={styles.quickStartSmallText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Row */}
        <View style={styles.streakRow}>
          <Text style={styles.sectionTitle}>Weekly Streak</Text>
          <View style={styles.streakDays}>
            {last7.map((_, i) => (
              <StreakDay key={i} active={i < stats.streak && stats.streak > 0} />
            ))}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statMini}>
            <Text style={styles.statMiniValue}>{stats.totalSessions}</Text>
            <Text style={styles.statMiniLabel}>Sessions</Text>
          </View>
          <View style={[styles.statMini, styles.statMiniMid]}>
            <Text style={[styles.statMiniValue, { color: Colors.primary }]}>{formatMinutes(stats.totalMinutes)}</Text>
            <Text style={styles.statMiniLabel}>Total Focus</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={[styles.statMiniValue, { color: Colors.accentWarm }]}>{stats.xp}</Text>
            <Text style={styles.statMiniLabel}>XP Earned</Text>
          </View>
        </View>

        {/* Priority Tasks */}
        {highPriorityTasks.length > 0 && (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.sectionTitle}>Priority Tasks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tasksList}>
              {highPriorityTasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <View style={[styles.taskDot, { backgroundColor: Colors.danger }]} />
                  <Text style={styles.taskName} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskPri}>HIGH</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteLabel}>💡 DAILY QUOTE</Text>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>

        {/* App blocking reminder */}
        <View style={styles.blockCard}>
          <Text style={styles.blockEmoji}>🚫</Text>
          <View style={styles.blockContent}>
            <Text style={styles.blockTitle}>Stay Focused</Text>
            <Text style={styles.blockSub}>During a session, resist the urge to open Instagram or TikTok. Your future self will thank you. 💪</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  scroll: { paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  name: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '30', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary + '50' },
  levelBadgeEmoji: { fontSize: 14 },
  levelBadgeText: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  achievementBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.accentWarm + '15', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.accentWarm + '40' },
  achievementBannerEmoji: { fontSize: 28 },
  achievementBannerContent: {},
  achievementBannerTitle: { fontSize: 11, color: Colors.accentWarm, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  achievementBannerName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  goalCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  goalTime: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  streakBadge: { alignItems: 'center' },
  streakFire: { fontSize: 24 },
  streakNum: { fontSize: 22, fontWeight: '800', color: Colors.danger },
  streakLabel: { fontSize: 11, color: Colors.textMuted },
  goalBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  goalBarFill: { height: '100%', borderRadius: 5 },
  goalPercent: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  quickStartRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickStartMain: { flex: 1.5, borderRadius: 24, overflow: 'hidden' },
  quickStartGrad: { padding: 24, justifyContent: 'center', minHeight: 150 },
  quickStartEmoji: { fontSize: 32, color: '#fff', marginBottom: 10 },
  quickStartText: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  quickStartSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  quickStartCol: { flex: 1, gap: 12 },
  quickStartSmall: { flex: 1, borderRadius: 20, padding: 14, borderWidth: 1, alignItems: 'flex-start', justifyContent: 'space-between' },
  quickStartSmallEmoji: { fontSize: 22, marginBottom: 6 },
  quickStartSmallText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  quickStartSmallBadge: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  streakRow: { marginBottom: 20 },
  streakDays: { flexDirection: 'row', gap: 8, marginTop: 12 },
  streakDay: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass, alignItems: 'center', justifyContent: 'center' },
  streakDayFire: { fontSize: 18 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.glass, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden' },
  statMini: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statMiniMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.glassBorder },
  statMiniValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statMiniLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 1.2 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  tasksList: { backgroundColor: Colors.glass, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 24, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskName: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  taskPri: { fontSize: 10, color: Colors.danger, fontWeight: '800', letterSpacing: 0.5, backgroundColor: Colors.danger + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  quoteCard: { backgroundColor: Colors.glass, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.glassBorder },
  quoteLabel: { fontSize: 10, color: Colors.accentWarm, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  quoteText: { fontSize: 15, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 24, marginBottom: 10 },
  quoteAuthor: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  blockCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.danger + '10', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.danger + '30', marginBottom: 12 },
  blockEmoji: { fontSize: 28 },
  blockContent: { flex: 1 },
  blockTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  blockSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, fontWeight: '500' },
});
