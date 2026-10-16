import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getStats,
  getUserProfile,
  getTasks,
  getSettings,
  getStreakData,
  getUnlockedAchievements,
  saveUnlockedAchievements,
  saveStats,
  saveTasks,
} from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo } from '../constants/achievements';
import { formatMinutes, getTodayKey, getLastNDays, getDayLabel, hapticLight } from '../utils/helpers';
import { Theme } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekData, setWeekData] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

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
    setTasks(t || []);
    setSettings(sett);

    const today = getTodayKey();
    setTodayMinutes(streakData[today] || 0);

    const weekDays = getLastNDays(7);
    const wd = weekDays.map((d) => ({
      date: d,
      minutes: streakData[d] || 0,
    }));
    setWeekData(wd);

    // Batch achievement auto-unlocking
    if (s) {
      let newlyEarnedXp = 0;
      let hasNewUnlocks = false;
      const currentUnlocked = [...(unlockedIds || [])];

      for (const a of ACHIEVEMENTS) {
        if (!currentUnlocked.includes(a.id) && typeof a.condition === 'function' && a.condition(s)) {
          currentUnlocked.push(a.id);
          newlyEarnedXp += a.xp || 0;
          hasNewUnlocks = true;
        }
      }

      if (hasNewUnlocks) {
        await saveUnlockedAchievements(currentUnlocked);
        if (newlyEarnedXp > 0) {
          s.xp = (s.xp || 0) + newlyEarnedXp;
          await saveStats(s);
          setStats({ ...s });
        }
      }
    }
  };

  if (!stats || !settings) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const goalMinutes = (settings.dailyGoalHours || 2) * 60;
  const goalProgress = Math.min(todayMinutes / (goalMinutes || 1), 1);
  const activeTasks = tasks.filter((t) => !t.completed);
  const topTask = activeTasks.length > 0 ? activeTasks[0] : null;

  const h = Math.floor(todayMinutes / 60);
  const m = todayMinutes % 60;

  const quickNav = (screenName, params) => {
    hapticLight();
    setMenuVisible(false);
    navigation.navigate(screenName, params);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => {
              hapticLight();
              setMenuVisible(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="menu" size={26} color={Theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OBSIDIAN</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => {
            hapticLight();
            navigation.navigate('Profile');
          }}
        >
          <Image
            source={{
              uri:
                profile?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            }}
            style={styles.profileImg}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Action Sheet Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetDragBar} />
              <Text style={styles.sheetTitle}>NAVIGATION PROTOCOL</Text>
            </View>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => quickNav('Profile')}
            >
              <MaterialCommunityIcons name="account-cog-outline" size={22} color={Theme.primary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Profile & Operator Settings</Text>
                <Text style={styles.sheetItemSub}>Configure temporal parameters & credentials</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => quickNav('Tasks')}
            >
              <MaterialCommunityIcons name="format-list-checks" size={22} color={Theme.secondary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Protocol Objectives (Tasks)</Text>
                <Text style={styles.sheetItemSub}>Manage active queues and mission tasks</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => quickNav('Achievements')}
            >
              <MaterialCommunityIcons name="trophy-outline" size={22} color={Theme.tertiary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Achievements Gallery</Text>
                <Text style={styles.sheetItemSub}>Review unlocked honors and system rank</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => quickNav('BlockedApps')}
            >
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color={Theme.primaryVariant} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Deep Work App Shield</Text>
                <Text style={styles.sheetItemSub}>Control blocked endpoints and distractions</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => quickNav('Analytics')}
            >
              <MaterialCommunityIcons name="chart-box-outline" size={22} color={Theme.onSurface} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Telemetry & Focus Analytics</Text>
                <Text style={styles.sheetItemSub}>Examine deep work session distributions</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.sheetCloseText}>CLOSE MENU</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Today's Focus Section */}
        <View style={styles.focusSection}>
          <Text style={styles.focusLabel}>TODAY'S FOCUS TIME</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeVal}>{h}</Text>
            <Text style={styles.timeUnit}>h</Text>
            <Text style={[styles.timeVal, { marginLeft: 8 }]}>{m}</Text>
            <Text style={styles.timeUnit}>m</Text>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[Theme.secondary, Theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${goalProgress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(goalProgress * 100)}% OF GOAL</Text>
          </View>
        </View>

        {/* 1000 HR CORE QUEST */}
        <TouchableOpacity
          style={styles.questCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Analytics')}
        >
          <LinearGradient
            colors={['rgba(192,193,255,0.05)', 'rgba(192,193,255,0.02)']}
            style={styles.questGrad}
          >
            <View style={styles.questHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color={Theme.primary} />
              <Text style={styles.questLabel}>PRIMARY PROTOCOL: OBSIDIAN LORD</Text>
              <Text style={styles.questGoal}>1000 HR MISSION</Text>
            </View>
            <View style={styles.questProgressRow}>
              <Text style={styles.questProgressVal}>{Math.floor(stats.totalMinutes / 60)} / 1000 hrs</Text>
              <Text style={styles.questPercent}>
                {Math.min((stats.totalMinutes / 60000) * 100, 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.questBarBg}>
              <View
                style={[
                  styles.questBarFill,
                  { width: `${Math.min((stats.totalMinutes / 60000) * 100, 100)}%` },
                ]}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.ctaOuter}
          activeOpacity={0.85}
          onPress={() => {
            hapticLight();
            navigation.navigate('Timer');
          }}
        >
          <LinearGradient
            colors={[Theme.primary, Theme.primaryVariant]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBorder}
          >
            <View style={styles.ctaInner}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={32}
                color={Theme.primary}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.ctaTitle}>Forge Focus</Text>
              <Text style={styles.ctaSub}>INITIALIZE DEEP WORK SESSION</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Active Project Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>ACTIVE PROJECT</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
              <Text style={styles.viewTasksText}>ALL PROTOCOLS →</Text>
            </TouchableOpacity>
          </View>

          {topTask ? (
            <View style={styles.projectCard}>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={async () => {
                  const updated = tasks.map((t) =>
                    t.id === topTask.id ? { ...t, completed: true, completedAt: Date.now() } : t
                  );
                  setTasks(updated);
                  await saveTasks(updated);
                  hapticLight();
                }}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={24} color={Theme.primary} />
              </TouchableOpacity>

              <View style={styles.projectRow}>
                <View style={styles.projectIconWrapper}>
                  <MaterialCommunityIcons name="google-circles-extended" size={24} color={Theme.tertiary} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {topTask.title}
                  </Text>
                  <Text style={styles.projectDesc} numberOfLines={2}>
                    {topTask.notes || 'Priority execution protocol active.'}
                  </Text>

                  <View style={styles.projectProgressCont}>
                    <View style={styles.projectProgressRow}>
                      <Text style={styles.projectProgressLabel}>XP PROGRESS</Text>
                      <Text style={styles.projectProgressVal}>
                        {stats.xp} / {levelInfo.nextXp || 2000} XP
                      </Text>
                    </View>
                    <View style={styles.projBarBg}>
                      <LinearGradient
                        colors={[Theme.tertiary, Theme.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.projBarFill,
                          {
                            width: `${Math.min((stats.xp / (levelInfo.nextXp || 2000)) * 100, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyProjectCard}
              activeOpacity={0.8}
              onPress={() => {
                hapticLight();
                navigation.navigate('Tasks');
              }}
            >
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="plus" size={24} color={Theme.primary} />
              </View>
              <View style={styles.emptyProjectInfo}>
                <Text style={styles.emptyProjectTitle}>+ Initialize Protocol</Text>
                <Text style={styles.emptyProjectSub}>
                  No active tasks queued. Tap to create your primary objective.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="fire"
              size={28}
              color="rgba(255, 180, 171, 0.8)"
              style={{ marginBottom: 4 }}
            />
            <Text style={styles.statVal}>{stats.streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="star-circle"
              size={28}
              color={Theme.secondary}
              style={{ marginBottom: 4 }}
            />
            <Text style={styles.statVal}>LVL {levelInfo.level}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {levelInfo.title || 'Digital Architect'}
            </Text>
          </View>
        </View>

        {/* Focus Analytics */}
        <View style={styles.section}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.sectionLabel}>FOCUS ANALYTICS</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>7-DAY TELEMETRY</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {weekData.map((day, idx) => {
                const barHeight = Math.max(0.1, Math.min(day.minutes / (goalMinutes || 60), 1));
                const isToday = idx === weekData.length - 1;
                const dayLabelChar = day.date ? getDayLabel(day.date).slice(0, 1) : '';
                return (
                  <View key={idx} style={styles.chartCol}>
                    <View style={styles.chartBarWrapper}>
                      {isToday ? (
                        <LinearGradient
                          colors={['rgba(192,193,255,0.4)', Theme.primary]}
                          style={[styles.chartBar, { height: `${barHeight * 100}%` }]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.chartBar,
                            { height: `${barHeight * 100}%`, backgroundColor: Theme.surfaceHighest },
                          ]}
                        />
                      )}
                    </View>
                    <Text style={[styles.chartDay, isToday && styles.chartDayActive]}>
                      {dayLabelChar}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#0A0A0B',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '300', letterSpacing: 4 },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.surfaceHighest,
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.3)',
    overflow: 'hidden',
  },
  profileImg: { width: '100%', height: '100%' },

  // Action Sheet Modal
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: Theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  sheetHeader: { alignItems: 'center', marginBottom: 20 },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.surfaceHighest,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 11,
    color: Theme.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 70, 74, 0.1)',
    gap: 16,
  },
  sheetItemTextWrap: { flex: 1 },
  sheetItemTitle: { fontSize: 14, color: Theme.onSurface, fontWeight: '600' },
  sheetItemSub: { fontSize: 11, color: Theme.onSurfaceVariant, marginTop: 2 },
  sheetCloseBtn: {
    marginTop: 18,
    paddingVertical: 14,
    backgroundColor: Theme.surfaceHigh,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  sheetCloseText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.onSurfaceVariant,
    letterSpacing: 1.5,
  },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  // Today's Focus
  focusSection: { alignItems: 'center', marginBottom: 40 },
  focusLabel: {
    fontSize: 10,
    color: Theme.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  timeVal: { fontSize: 60, fontWeight: '800', color: Theme.onSurface, letterSpacing: -2, lineHeight: 64 },
  timeUnit: { fontSize: 60, fontWeight: '800', color: Theme.primary, opacity: 0.8, letterSpacing: -2, lineHeight: 64 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  progressBarBg: { height: 6, width: 120, backgroundColor: '#0e0e10', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, color: 'rgba(192,193,255,0.8)', fontWeight: '500', letterSpacing: 0.5 },

  // CTA
  ctaOuter: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 40,
    shadowColor: 'rgba(4,0,81,0.25)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 10,
  },
  ctaBorder: { padding: 1, borderRadius: 12 },
  ctaInner: {
    backgroundColor: Theme.surfaceHigh,
    borderRadius: 11,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: Theme.onSurface, letterSpacing: -0.5 },
  ctaSub: { fontSize: 10, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4, opacity: 0.6 },

  // Quest Card
  questCard: { width: '100%', borderRadius: 12, marginBottom: 40, overflow: 'hidden', borderWidth: 1, borderColor: Theme.border },
  questGrad: { padding: 16 },
  questHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  questLabel: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1, flex: 1 },
  questGoal: { fontSize: 8, color: Theme.primary, fontWeight: '800' },
  questProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  questProgressVal: { fontSize: 16, color: Theme.onSurface, fontWeight: '700', letterSpacing: -0.5 },
  questPercent: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '600' },
  questBarBg: { height: 4, width: '100%', backgroundColor: Theme.bg, borderRadius: 2, overflow: 'hidden' },
  questBarFill: { height: '100%', backgroundColor: Theme.primaryVariant, borderRadius: 2 },

  // Active Project
  section: { marginBottom: 40 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 10,
    color: Theme.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '500',
  },
  viewTasksText: {
    fontSize: 10,
    color: Theme.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  projectCard: {
    backgroundColor: 'rgba(42, 42, 44, 0.6)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.1)',
    overflow: 'hidden',
  },
  emptyProjectCard: {
    backgroundColor: 'rgba(42, 42, 44, 0.4)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.2)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProjectInfo: { flex: 1 },
  emptyProjectTitle: { fontSize: 15, fontWeight: '700', color: Theme.onSurface, marginBottom: 2 },
  emptyProjectSub: { fontSize: 12, color: Theme.onSurfaceVariant, lineHeight: 16 },
  moreBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  projectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  projectIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Theme.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.2)',
  },
  projectInfo: { flex: 1 },
  projectTitle: { fontSize: 20, fontWeight: '700', color: Theme.onSurface, letterSpacing: -0.5 },
  projectDesc: { fontSize: 14, color: Theme.onSurfaceVariant, marginTop: 6, lineHeight: 20 },
  projectProgressCont: { marginTop: 24 },
  projectProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  projectProgressLabel: { fontSize: 10, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  projectProgressVal: { fontSize: 12, color: Theme.primary, fontWeight: '700' },
  projBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#0e0e10',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.05)',
  },
  projBarFill: { height: '100%', borderRadius: 4 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  statBox: {
    flex: 1,
    backgroundColor: Theme.surfaceHigh,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71,70,74,0.1)',
  },
  statVal: { fontSize: 24, fontWeight: '800', color: Theme.onSurface, marginBottom: 2 },
  statLabel: { fontSize: 9, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },

  // Chart
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  badge: { backgroundColor: 'rgba(192,193,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, color: Theme.primary, fontWeight: '600' },
  chartCard: { backgroundColor: Theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(71,70,74,0.1)' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, gap: 8 },
  chartCol: { flex: 1, alignItems: 'center', gap: 12, height: '100%' },
  chartBarWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  chartDay: { fontSize: 9, color: Theme.onSurfaceVariant },
  chartDayActive: { color: Theme.primary, fontWeight: '700' },
});
