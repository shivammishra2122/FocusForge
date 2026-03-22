import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getUserProfile, getSettings, saveSettings, getStats, saveStats, saveUserProfile } from '../utils/storage';
import { getLevelInfo, getProgressToNextLevel } from '../constants/achievements';
import { formatMinutes, hapticLight, hapticMedium } from '../utils/helpers';
import { getDailyQuote } from '../constants/quotes';

const SettingRow = ({ label, sub, value, onChange, type = 'switch' }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <Text style={styles.settingLabel}>{label}</Text>
      {sub && <Text style={styles.settingSub}>{sub}</Text>}
    </View>
    {type === 'switch' && (
      <Switch
        value={value} onValueChange={onChange}
        trackColor={{ false: Colors.bgHighlight, true: Colors.primary }}
        thumbColor="#fff" ios_backgroundColor={Colors.bgHighlight}
      />
    )}
    {type === 'stepper' && (
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(1, value - 1))}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({ name: '', goalHours: 2 });
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const [p, s, st] = await Promise.all([getUserProfile(), getSettings(), getStats()]);
    setProfile(p || { name: 'Focused Student', goalHours: 2 });
    setSettings(s); setStats(st);
  };

  const updateSetting = async (key, value) => {
    hapticLight();
    const updated = { ...settings, [key]: value };
    setSettings(updated); await saveSettings(updated);
  };

  const updateProfile = async (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated); await saveUserProfile(updated);
    if (key === 'goalHours') await updateSetting('dailyGoalHours', value);
  };

  const handleReset = () => {
    Alert.alert('Reset All Data', 'This will permanently erase all progress, stats, and achievements.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: async () => {
          hapticMedium();
          await saveStats({ totalMinutes: 0, totalSessions: 0, tasksCompleted: 0, xp: 0, streak: 0, hasEarlySession: false, hasLateSession: false, lastSessionDate: null });
          Alert.alert('Done', 'All data has been reset.');
          load();
        },
      },
    ]);
  };

  if (!settings || !stats) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const levelProgress = getProgressToNextLevel(stats.xp);
  const quote = getDailyQuote();
  const initials = (profile.name || 'F').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillTxt}>Lv.{levelInfo.level}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileLevel}>{levelInfo.title}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${levelProgress * 100}%` }]} />
          </View>
          <Text style={styles.profileXP}>{stats.xp} XP · {Math.round(levelProgress * 100)}% to next level</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{formatMinutes(stats.totalMinutes)}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteBar} />
          <View style={styles.quoteContent}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        </View>

        {/* Settings sections */}
        <Text style={styles.sectionTitle}>Daily Goal</Text>
        <View style={styles.section}>
          <SettingRow label="Focus Goal" sub="Hours per day" value={profile.goalHours} onChange={(v) => updateProfile('goalHours', v)} type="stepper" />
        </View>

        <Text style={styles.sectionTitle}>Timer</Text>
        <View style={styles.section}>
          <SettingRow label="Work Duration (min)" sub="Length of each session" value={settings.pomodoroWork} onChange={(v) => updateSetting('pomodoroWork', v)} type="stepper" />
          <View style={styles.divider} />
          <SettingRow label="Short Break (min)" sub="Between sessions" value={settings.pomodoroShortBreak} onChange={(v) => updateSetting('pomodoroShortBreak', v)} type="stepper" />
          <View style={styles.divider} />
          <SettingRow label="Long Break (min)" sub="After full cycle" value={settings.pomodoroLongBreak} onChange={(v) => updateSetting('pomodoroLongBreak', v)} type="stepper" />
          <View style={styles.divider} />
          <SettingRow label="Sessions per Cycle" sub="Before long break" value={settings.pomodoroRounds} onChange={(v) => updateSetting('pomodoroRounds', Math.max(1, v))} type="stepper" />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <SettingRow label="Notifications" sub="Session & break reminders" value={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
          <View style={styles.divider} />
          <SettingRow label="Haptic Feedback" sub="Vibrations on interaction" value={settings.haptics} onChange={(v) => updateSetting('haptics', v)} />
          <View style={styles.divider} />
          <SettingRow label="Auto-start Breaks" sub="Automatically start break timer" value={settings.autoStartBreaks} onChange={(v) => updateSetting('autoStartBreaks', v)} />
        </View>

        <Text style={styles.sectionTitle}>App Blocking</Text>
        <View style={styles.section}>
          <SettingRow label="Enable App Blocking" sub="Block distracting apps during focus" value={settings.appBlockingEnabled} onChange={(v) => updateSetting('appBlockingEnabled', v)} />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('BlockedApps')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Manage Blocked Apps</Text>
              <Text style={styles.settingSub}>Choose which apps to block</Text>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.85}>
          <Text style={styles.resetBtnText}>Reset All Progress</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FocusForge v1.0.0</Text>
        </View>
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
  profileCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  levelPill: { position: 'absolute', bottom: -4, right: -10, backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: Colors.border },
  levelPillTxt: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, letterSpacing: -0.3 },
  profileLevel: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginBottom: 16 },
  barBg: { width: '100%', height: 4, backgroundColor: Colors.bgHighlight, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  profileXP: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statDiv: { width: 1, height: 28, backgroundColor: Colors.border },
  statVal: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 5 },
  statLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  quoteCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.bgCard, borderRadius: 24, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: Colors.primary, alignSelf: 'stretch' },
  quoteContent: { flex: 1 },
  quoteText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 22 },
  quoteAuthor: { fontSize: 12, color: Colors.textMuted, marginTop: 10, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  section: { backgroundColor: Colors.bgCard, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, marginBottom: 28, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  settingLeft: { flex: 1 },
  settingLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  settingSub: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  divider: { height: 1, backgroundColor: Colors.borderSubtle, marginHorizontal: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bgHighlight, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 18 },
  stepValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  resetBtn: { backgroundColor: Colors.dangerSubtle, borderRadius: 24, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 28 },
  resetBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  footer: { alignItems: 'center', paddingBottom: 10 },
  footerText: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
});
