import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getUserProfile, getSettings, saveSettings, getStats, saveStats, saveUserProfile } from '../utils/storage';
import { getLevelInfo, getProgressToNextLevel } from '../constants/achievements';
import { formatMinutes, hapticLight, hapticMedium } from '../utils/helpers';
import { getDailyQuote } from '../constants/quotes';

const SettingRow = ({ label, sub, value, onChange, type = 'switch', options }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <Text style={styles.settingLabel}>{label}</Text>
      {sub && <Text style={styles.settingSub}>{sub}</Text>}
    </View>
    {type === 'switch' && (
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.bgHighlight, true: Colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor={Colors.bgHighlight}
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    const [p, s, st] = await Promise.all([getUserProfile(), getSettings(), getStats()]);
    setProfile(p || { name: 'Focused Student', goalHours: 2 });
    setSettings(s);
    setStats(st);
  };

  const updateSetting = async (key, value) => {
    hapticLight();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const updateProfile = async (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    await saveUserProfile(updated);
    if (key === 'goalHours') {
      await updateSetting('dailyGoalHours', value);
    }
  };

  const handleReset = () => {
    Alert.alert(
      '⚠️ Reset All Data',
      'This will permanently erase all your progress, stats, and achievements. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            hapticMedium();
            await saveStats({ totalMinutes: 0, totalSessions: 0, tasksCompleted: 0, xp: 0, streak: 0, hasEarlySession: false, hasLateSession: false, lastSessionDate: null });
            Alert.alert('Done', 'All data has been reset.');
            load();
          },
        },
      ]
    );
  };

  if (!settings || !stats) return null;

  const levelInfo = getLevelInfo(stats.xp);
  const levelProgress = getProgressToNextLevel(stats.xp);
  const quote = getDailyQuote();

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <LinearGradient colors={Colors.gradientCard} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧠</Text>
            </LinearGradient>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Lv.{levelInfo.level}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileLevel}>{levelInfo.title}</Text>
          <View style={styles.profileLevelBar}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.profileLevelFill, { width: `${levelProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.profileXP}>{stats.xp} XP • {Math.round(levelProgress * 100)}% to next level</Text>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{stats.streak}</Text>
            <Text style={styles.quickStatLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{stats.totalSessions}</Text>
            <Text style={styles.quickStatLabel}>🎯 Sessions</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{formatMinutes(stats.totalMinutes)}</Text>
            <Text style={styles.quickStatLabel}>⏱ Total</Text>
          </View>
        </View>

        {/* Daily Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>"</Text>
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>

        {/* Goal Setting */}
        <Text style={styles.sectionTitle}>Daily Goal</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            label="Daily Focus Goal"
            sub="Hours you want to focus each day"
            value={profile.goalHours}
            onChange={(v) => updateProfile('goalHours', v)}
            type="stepper"
          />
        </View>

        {/* Timer Settings */}
        <Text style={styles.sectionTitle}>Timer Settings</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            label="Work Duration (min)"
            sub="Length of each focus session"
            value={settings.pomodoroWork}
            onChange={(v) => updateSetting('pomodoroWork', v)}
            type="stepper"
          />
          <View style={styles.settingDivider} />
          <SettingRow
            label="Short Break (min)"
            sub="Break between sessions"
            value={settings.pomodoroShortBreak}
            onChange={(v) => updateSetting('pomodoroShortBreak', v)}
            type="stepper"
          />
          <View style={styles.settingDivider} />
          <SettingRow
            label="Long Break (min)"
            sub="Break after full cycle"
            value={settings.pomodoroLongBreak}
            onChange={(v) => updateSetting('pomodoroLongBreak', v)}
            type="stepper"
          />
          <View style={styles.settingDivider} />
          <SettingRow
            label="Sessions per Cycle"
            sub="Before a long break"
            value={settings.pomodoroRounds}
            onChange={(v) => updateSetting('pomodoroRounds', Math.max(1, v))}
            type="stepper"
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            label="Notifications"
            sub="Session & break reminders"
            value={settings.notifications}
            onChange={(v) => updateSetting('notifications', v)}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            label="Haptic Feedback"
            sub="Vibrations on interaction"
            value={settings.haptics}
            onChange={(v) => updateSetting('haptics', v)}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            label="Auto-start Breaks"
            sub="Automatically start break timer"
            value={settings.autoStartBreaks}
            onChange={(v) => updateSetting('autoStartBreaks', v)}
          />
        </View>

        {/* App Blocking */}
        <Text style={styles.sectionTitle}>App Blocking</Text>
        <View style={styles.settingsSection}>
          <SettingRow
            label="Enable App Blocking"
            sub="Block distracting apps during focus"
            value={settings.appBlockingEnabled}
            onChange={(v) => updateSetting('appBlockingEnabled', v)}
          />
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('BlockedApps')}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Manage Blocked Apps</Text>
              <Text style={styles.settingSub}>Choose which apps to block</Text>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.85}>
          <Text style={styles.resetBtnText}>🗑 Reset All Progress</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FocusForge v1.0.0</Text>
          <Text style={styles.footerSubText}>Built to help you forge focus habits 🧠</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  scroll: { paddingHorizontal: 24 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  profileCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 36 },
  levelPill: { position: 'absolute', bottom: -4, right: -8, backgroundColor: Colors.bgHighlight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: Colors.bg },
  levelPillText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  profileLevel: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginBottom: 16 },
  profileLevelBar: { width: '100%', height: 6, backgroundColor: Colors.bgHighlight, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  profileLevelFill: { height: '100%', borderRadius: 3 },
  profileXP: { fontSize: 12, color: Colors.textMuted },
  quickStats: { backgroundColor: Colors.bgCard, borderRadius: 16, flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  quickStat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  quickStatDivider: { width: 1, backgroundColor: Colors.border },
  quickStatValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  quickStatLabel: { fontSize: 12, color: Colors.textMuted },
  quoteCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  quoteMark: { fontSize: 40, color: Colors.primary, lineHeight: 36, marginBottom: 4 },
  quoteText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 22, marginBottom: 10 },
  quoteAuthor: { fontSize: 12, color: Colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  settingsSection: { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 24, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingLeft: { flex: 1 },
  settingLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  settingSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bgElevated, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 18 },
  stepValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  resetBtn: { backgroundColor: Colors.danger + '15', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.danger + '40', marginBottom: 24 },
  resetBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  footer: { alignItems: 'center', paddingBottom: 16 },
  footerText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  footerSubText: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
});
