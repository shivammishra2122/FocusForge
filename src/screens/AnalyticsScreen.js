import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { getStats, getFocusSessions, getSettings, getStreakData, getUserProfile } from '../utils/storage';
import { ACHIEVEMENTS, getLevelInfo, getProgressToNextLevel } from '../constants/achievements';
import { formatMinutes, getLastNDays, getDayLabel } from '../utils/helpers';

const { width } = require('react-native').Dimensions.get('window');
const CHART_WIDTH = width - 88; // Accounting for paddings
const CHART_HEIGHT = 100;

// Obsidian Theme tokens
const Theme = {
  bg: '#131315',
  surface: '#1b1b1d',
  surfaceHigh: '#2a2a2c',
  surfaceHighest: '#353437',
  onSurface: '#e5e1e4',
  onSurfaceVariant: '#c8c6ca',
  primary: '#c0c1ff',
  primaryVariant: '#696df8',
  tertiary: '#d0bcff',
  secondary: '#c4c1fb',
  error: '#ffb4ab',
  border: 'rgba(71, 70, 74, 0.15)',
};

export default function AnalyticsScreen({ navigation }) {
  const [profile, setProfile] = useState({});
  const [stats, setStats] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  const load = async () => {
    const [p, s, streakData] = await Promise.all([
      getUserProfile(), getStats(), getStreakData(),
    ]);
    setProfile(p || {});
    setStats(s || { xp: 0, streak: 0, totalMinutes: 0 });
    
    const days = getLastNDays(7);
    setWeekData(days.map((d) => ({ key: d, label: getDayLabel(d), minutes: streakData[d] || 0 })));
    
    const { getUnlockedAchievements } = require('../utils/storage');
    const unlocked = await getUnlockedAchievements();
    setUnlockedAchievements(unlocked);
  };

  if (!stats) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const maxXP = levelInfo.maxXP === Infinity ? stats.xp : levelInfo.maxXP;
  const levelProgress = levelInfo.maxXP === Infinity ? 1 : Math.min(stats.xp / maxXP, 1);
  const todayKey = new Date().toISOString().split('T')[0];
  const maxWeekMin = Math.max(...weekData.map((d) => d.minutes), 1);
  const barW = Math.max((CHART_WIDTH - (weekData.length - 1) * 8) / weekData.length, 10);
  
  const totalHours = Math.floor(stats.totalMinutes / 60);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer && navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={26} color={Theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OBSIDIAN</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
           <Image source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.profileImg} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* System Status Banner */}
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>SYSTEM STATUS: EVOLUTIONARY</Text>
          <Text style={styles.levelText}>Level {levelInfo.level}</Text>
          <Text style={styles.titleText}>{levelInfo.title}</Text>
          
          <View style={styles.hoursRow}>
            <Text style={styles.hoursValue}>{totalHours.toLocaleString()}</Text>
            <Text style={styles.hoursLabel}>TOTAL PRODUCTIVE HOURS</Text>
          </View>
          
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>XP PROGRESS</Text>
            <Text style={styles.progressValue}>{stats.xp.toLocaleString()} | {maxXP.toLocaleString()} XP</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${levelProgress * 100}%` }]} />
          </View>
        </View>

        {/* Active Milestone Card */}
        <View style={styles.milestoneCard}>
          <MaterialCommunityIcons name="medal-outline" size={100} color="rgba(255,255,255,0.03)" style={styles.milestoneBgIcon} />
          <Text style={styles.milestoneTag}>ACTIVE MILESTONE</Text>
          <Text style={styles.milestoneTitle}>Deep Focus Mastery</Text>
          <Text style={styles.milestoneDesc}>
            Maintain your system operation sequence to unlock consecutive cycle achievements and increase protocol efficiency.
          </Text>
          
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={styles.streakValue}>{stats.streak}d | {Math.max(stats.streak, 7)}d</Text>
          </View>
          <View style={styles.streakBarBg}>
            <View style={[styles.streakBarFill, { width: `${Math.min(stats.streak / Math.max(stats.streak, 7), 1) * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.reqBtn}>
            <Text style={styles.reqBtnText}>VIEW REQUIREMENTS</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Performance */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <View>
              <Text style={styles.weeklyTitle}>Weekly Performance</Text>
              <Text style={styles.weeklyDesc}>Architecture output across{'\n'}focus sessions</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>FOCUS{'\n'}QUANTUM</Text>
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              {weekData.map((d, i) => {
                const barH = Math.max((d.minutes / maxWeekMin) * CHART_HEIGHT, 4);
                const x = i * (barW + 8);
                const y = CHART_HEIGHT - barH;
                const isToday = d.key === todayKey;
                return (
                  <Rect
                    key={d.key} x={x} y={y} width={barW} height={barH} rx={4}
                    fill={isToday ? Theme.primary : Theme.surfaceHigh}
                    opacity={1}
                  />
                );
              })}
            </Svg>
            <View style={styles.chartLabels}>
              {weekData.map((d) => (
                <View key={d.key} style={{ width: barW }}>
                  <Text style={[styles.chartDay, d.key === todayKey && { color: Theme.onSurface }]}>
                    {d.label.slice(0, 3)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Achievement Gallery */}
        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>ACHIEVEMENT{'\n'}GALLERY</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
            <Text style={styles.viewAllText}>View All{'\n'}Artifacts</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.slice(0, 4).map((ach) => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            return (
              <View key={ach.id} style={styles.achCard}>
                <View style={[styles.achIconWrap, !isUnlocked && styles.achIconLocked]}>
                  <MaterialCommunityIcons name={ach.icon} size={28} color={isUnlocked ? Theme.primary : Theme.onSurfaceVariant} />
                </View>
                <Text style={[styles.achTitle, !isUnlocked && { color: Theme.onSurfaceVariant }]} numberOfLines={2} textAlign="center">
                  {ach.title}
                </Text>
                <Text style={styles.achStatus}>
                  {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: 'rgba(19, 19, 21, 0.8)', zIndex: 10, borderBottomWidth: 1, borderBottomColor: Theme.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '300', letterSpacing: 4 },
  profileBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.surfaceHighest, borderWidth: 1, borderColor: 'rgba(71,70,74,0.3)', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  statusSection: { marginBottom: 36 },
  statusLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  levelText: { fontSize: 32, color: Theme.onSurface, fontWeight: '300', fontStyle: 'italic', letterSpacing: -1, marginBottom: -4 },
  titleText: { fontSize: 36, color: Theme.onSurface, fontWeight: '800', fontStyle: 'italic', letterSpacing: -1, marginBottom: 16 },
  
  hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 28 },
  hoursValue: { fontSize: 28, color: Theme.primary, fontWeight: '300', lineHeight: 32 },
  hoursLabel: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1, paddingBottom: 6 },
  
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1 },
  progressValue: { fontSize: 10, color: Theme.primary, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: Theme.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Theme.primaryVariant, borderRadius: 3 },

  milestoneCard: { backgroundColor: Theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Theme.border, marginBottom: 24, position: 'relative', overflow: 'hidden' },
  milestoneBgIcon: { position: 'absolute', top: 20, right: -20 },
  milestoneTag: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  milestoneTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '600', marginBottom: 8 },
  milestoneDesc: { fontSize: 12, color: Theme.onSurfaceVariant, lineHeight: 18, marginBottom: 24, paddingRight: 40 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  streakLabel: { fontSize: 10, color: Theme.onSurface, fontWeight: '500' },
  streakValue: { fontSize: 10, color: Theme.onSurface, fontWeight: '700' },
  streakBarBg: { height: 4, backgroundColor: Theme.surfaceHigh, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  streakBarFill: { height: '100%', backgroundColor: Theme.onSurface, borderRadius: 2 },
  reqBtn: { backgroundColor: Theme.surfaceHigh, paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Theme.border },
  reqBtnText: { color: Theme.onSurface, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  weeklyCard: { backgroundColor: Theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Theme.border, marginBottom: 36 },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  weeklyTitle: { fontSize: 18, color: Theme.onSurface, fontWeight: '600', marginBottom: 4 },
  weeklyDesc: { fontSize: 11, color: Theme.onSurfaceVariant, lineHeight: 16 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.primary },
  legendText: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '600', letterSpacing: 1 },
  
  chartContainer: { alignItems: 'center' },
  chartLabels: { flexDirection: 'row', gap: 8, marginTop: 16, width: CHART_WIDTH },
  chartDay: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '600', letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' },

  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  galleryTitle: { fontSize: 14, color: Theme.onSurface, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', lineHeight: 18 },
  viewAllText: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '600', textDecorationLine: 'underline', textAlign: 'right', lineHeight: 14 },
  
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  achCard: { width: '47%', backgroundColor: Theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Theme.border, alignItems: 'center', marginBottom: 16 },
  achIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: Theme.surfaceHigh, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: Theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  achIconLocked: { backgroundColor: Theme.bg, shadowOpacity: 0 },
  achTitle: { fontSize: 13, color: Theme.onSurface, fontWeight: '600', textAlign: 'center', marginBottom: 8, height: 36 },
  achStatus: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1 },
});
