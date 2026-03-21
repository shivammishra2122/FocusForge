import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { ACHIEVEMENTS, getLevelInfo } from '../constants/achievements';
import { getStats, getUnlockedAchievements } from '../utils/storage';
import { hapticLight } from '../utils/helpers';

export default function AchievementsScreen() {
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    const [unlocked, s] = await Promise.all([getUnlockedAchievements(), getStats()]);
    setUnlockedIds(unlocked);
    setStats(s);
  };

  const levelInfo = stats ? getLevelInfo(stats.xp) : { level: 1, title: 'Initiate' };

  const filters = ['All', 'Unlocked', 'Locked'];
  const filtered = ACHIEVEMENTS.filter((a) => {
    if (activeFilter === 'Unlocked') return unlockedIds.includes(a.id);
    if (activeFilter === 'Locked') return !unlockedIds.includes(a.id);
    return true;
  });

  const AchievementCard = ({ achievement }) => {
    const isUnlocked = unlockedIds.includes(achievement.id);
    return (
      <View style={[styles.card, isUnlocked && styles.cardUnlocked]}>
        {isUnlocked && (
          <LinearGradient
            colors={[Colors.primary + '20', Colors.accent + '10']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.iconContainer, isUnlocked && { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '15' }]}>
          <Text style={styles.icon}>{achievement.icon}</Text>
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !isUnlocked && styles.lockedText]}>{achievement.title}</Text>
          <Text style={[styles.cardDesc, !isUnlocked && styles.lockedText]}>{achievement.description}</Text>
          <View style={styles.xpRow}>
            <Text style={[styles.xpText, isUnlocked ? { color: Colors.accentWarm } : { color: Colors.textMuted }]}>
              +{achievement.xp} XP
            </Text>
            {isUnlocked && <Text style={styles.unlockedLabel}>UNLOCKED</Text>}
          </View>
        </View>
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSub}>
            {unlockedIds.length} / {ACHIEVEMENTS.length} unlocked
          </Text>
        </View>

        {/* Level Banner */}
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.levelBanner}
        >
          <View>
            <Text style={styles.bannerLevel}>Level {levelInfo.level}</Text>
            <Text style={styles.bannerTitle}>{levelInfo.title}</Text>
          </View>
          <View style={styles.bannerStats}>
            <Text style={styles.bannerXp}>{stats?.xp || 0} XP</Text>
            <Text style={styles.bannerStreak}>🔥 {stats?.streak || 0} day streak</Text>
          </View>
        </LinearGradient>

        {/* Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Achievement Progress</Text>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={Colors.gradientAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${(unlockedIds.length / ACHIEVEMENTS.length) * 100}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>{Math.round((unlockedIds.length / ACHIEVEMENTS.length) * 100)}% complete</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, activeFilter === f && { backgroundColor: Colors.primary + '25', borderColor: Colors.primary }]}
              onPress={() => { setActiveFilter(f); hapticLight(); }}
            >
              <Text style={[styles.filterText, activeFilter === f && { color: Colors.primary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Achievement Grid */}
        <View style={styles.grid}>
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  levelBanner: { marginHorizontal: 24, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bannerLevel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerStats: { alignItems: 'flex-end' },
  bannerXp: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  bannerStreak: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  progressCard: { marginHorizontal: 24, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  progressTitle: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600', marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: Colors.bgHighlight, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: Colors.textMuted },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  filterText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  grid: { paddingHorizontal: 24, gap: 12 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', alignItems: 'center' },
  cardUnlocked: { borderColor: Colors.primary + '50' },
  iconContainer: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgElevated, position: 'relative' },
  icon: { fontSize: 26 },
  unlockedBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  unlockedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  lockedText: { opacity: 0.5 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpText: { fontSize: 13, fontWeight: '700' },
  unlockedLabel: { fontSize: 10, color: Colors.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, backgroundColor: Colors.accent + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  lockOverlay: { },
  lockIcon: { fontSize: 18, opacity: 0.4 },
});
