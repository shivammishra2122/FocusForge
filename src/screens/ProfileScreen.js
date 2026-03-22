import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserProfile, getSettings, saveSettings, getStats, saveStats, saveUserProfile } from '../utils/storage';
import { getLevelInfo } from '../constants/achievements';
import { hapticLight, hapticMedium } from '../utils/helpers';

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

const SettingSwitch = ({ label, sub, value, onChange }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <Text style={styles.settingLabel}>{label}</Text>
      {sub && <Text style={styles.settingSub}>{sub}</Text>}
    </View>
    <Switch
      value={value} onValueChange={onChange}
      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Theme.primary }}
      thumbColor="#fff" ios_backgroundColor="rgba(255,255,255,0.1)"
    />
  </View>
);

const SettingStepper = ({ label, value, onChange }) => (
  <View style={styles.stepperCard}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperControl}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(1, value - 1))}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({ name: '', goalHours: 2 });
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const [p, s, st] = await Promise.all([getUserProfile(), getSettings(), getStats()]);
    setProfile(p || { name: 'Operator', goalHours: 2 });
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
    Alert.alert('Erase System Record', 'This will permanently purge all protocol data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase', style: 'destructive', onPress: async () => {
          hapticMedium();
          await saveStats({ totalMinutes: 0, totalSessions: 0, tasksCompleted: 0, xp: 0, streak: 0, hasEarlySession: false, hasLateSession: false, lastSessionDate: null });
          Alert.alert('Protocol Purged', 'System record has been erased.');
          load();
        },
      },
    ]);
  };

  if (!settings || !stats) return null;

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
        
        {/* Screen Title */}
        <View style={styles.titleArea}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>SYSTEM CONFIGURATION & USER PROTOCOL.</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardTop}>
             <Image source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.cardAvatar} />
             <View style={styles.userInfo}>
               <Text style={styles.userName}>{profile.name || 'Operator'}</Text>
               <Text style={styles.userID}>Protocol ID: {stats.xp}-X</Text>
               <View style={styles.userStats}>
                 <View style={styles.statPill}>
                   <Text style={styles.statPillLabel}>STREAK</Text>
                   <Text style={styles.statPillValue}>{stats.streak}</Text>
                 </View>
                 <View style={styles.statPill}>
                   <Text style={styles.statPillLabel}>SESSIONS</Text>
                   <Text style={styles.statPillValue}>{stats.totalSessions}</Text>
                 </View>
               </View>
             </View>
          </View>
          <View style={styles.userCardBottom}>
            <View>
              <Text style={styles.activeLabel}>ACTIVE SINCE</Text>
              <Text style={styles.activeDate}>System Init</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Membership Status Placeholder */}
        <View style={styles.membershipSection}>
          <View style={styles.memHeader}>
            <MaterialCommunityIcons name="lock" size={12} color={Theme.primary} />
            <Text style={styles.memHeaderTitle}>MEMBERSHIP STATUS</Text>
          </View>
          <Text style={styles.memTitle}>Obsidian Pro</Text>
          <Text style={styles.memSub}>Lifetime License</Text>
          <View style={styles.memBarBg}>
            <View style={[styles.memBarFill, { width: '100%' }]} />
          </View>
          <Text style={styles.memProgress}>SYNC SECURED</Text>
          <TouchableOpacity style={styles.manageBtn}>
            <LinearGradient colors={[Theme.primaryVariant, Theme.primary]} style={styles.manageBtnGrad} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={styles.manageBtnText}>MANAGE PLAN</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Preferences / Atmospheric Engine */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Atmospheric Engine</Text>
        </View>
        <View style={styles.settingsGroup}>
          <SettingSwitch
            label="Neural Reminders"
            sub="Session & break notifications"
            value={settings.notifications}
            onChange={(v) => updateSetting('notifications', v)}
          />
          <View style={styles.divider} />
          <SettingSwitch
            label="Kinetic Feedback"
            sub="Subtle vibrations on interaction"
            value={settings.haptics}
            onChange={(v) => updateSetting('haptics', v)}
          />
          <View style={styles.divider} />
          <SettingSwitch
            label="Auto-Flow"
            sub="Automatically bridge sequences"
            value={settings.autoStartBreaks}
            onChange={(v) => updateSetting('autoStartBreaks', v)}
          />
        </View>

        {/* Temporal Parameters */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Temporal Parameters</Text>
        </View>
        <View style={styles.stepperGrid}>
          <SettingStepper label="WORK CYCLE" value={settings.pomodoroWork} onChange={(v) => updateSetting('pomodoroWork', v)} />
          <SettingStepper label="REST PHASE" value={settings.pomodoroShortBreak} onChange={(v) => updateSetting('pomodoroShortBreak', v)} />
          <SettingStepper label="DEEP REST" value={settings.pomodoroLongBreak} onChange={(v) => updateSetting('pomodoroLongBreak', v)} />
          <SettingStepper label="CYCLES" value={settings.pomodoroRounds} onChange={(v) => updateSetting('pomodoroRounds', Math.max(1, v))} />
        </View>

        {/* Blocked Destinations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Blocked Destinations</Text>
        </View>
        <View style={styles.settingsGroup}>
          <SettingSwitch
            label="Focus Shield"
            sub="Block configured destinations"
            value={settings.appBlockingEnabled}
            onChange={(v) => updateSetting('appBlockingEnabled', v)}
          />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('BlockedApps')}>
            <View>
              <Text style={styles.navTitle}>Access Exclusions</Text>
              <Text style={styles.navSub}>Configure blacklisted endpoints</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Terminal Action */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleError}>Terminal Action</Text>
        </View>
        <Text style={styles.dangerSub}>This will permanently purge all protocol data and memories.</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
          <Text style={styles.dangerBtnText}>ERASE SYSTEM RECORD</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: 'rgba(19, 19, 21, 0.8)', zIndex: 10, borderBottomWidth: 1, borderBottomColor: Theme.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '300', letterSpacing: 4 },
  profileBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.surfaceHighest, borderWidth: 1, borderColor: 'rgba(71,70,74,0.3)', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  titleArea: { marginBottom: 32 },
  pageTitle: { fontSize: 36, fontWeight: '700', color: Theme.onSurface, letterSpacing: -1, marginBottom: 4 },
  pageSubtitle: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  userCard: { backgroundColor: Theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Theme.border, marginBottom: 40 },
  userCardTop: { flexDirection: 'row', gap: 16, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: Theme.border, paddingBottom: 20 },
  cardAvatar: { width: 70, height: 70, borderRadius: 12 },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 18, color: Theme.onSurface, fontWeight: '700', marginBottom: 2 },
  userID: { fontSize: 11, color: Theme.onSurfaceVariant, marginBottom: 12 },
  userStats: { flexDirection: 'row', gap: 8 },
  statPill: { backgroundColor: Theme.surfaceHigh, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(71,70,74,0.3)' },
  statPillLabel: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '600' },
  statPillValue: { fontSize: 10, color: Theme.primary, fontWeight: '700' },
  userCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  activeDate: { fontSize: 13, color: Theme.onSurface, fontWeight: '500' },
  editBtn: { backgroundColor: Theme.surfaceHigh, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Theme.border },
  editBtnText: { color: Theme.onSurface, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  membershipSection: { marginBottom: 40 },
  memHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  memHeaderTitle: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5 },
  memTitle: { fontSize: 22, color: Theme.onSurface, fontWeight: '600', marginBottom: 4 },
  memSub: { fontSize: 12, color: Theme.onSurfaceVariant, marginBottom: 16 },
  memBarBg: { width: '100%', height: 4, backgroundColor: Theme.surfaceHigh, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  memBarFill: { height: '100%', backgroundColor: Theme.primary, borderRadius: 2 },
  memProgress: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1, alignSelf: 'flex-end', marginBottom: 16 },
  manageBtn: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  manageBtnGrad: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  manageBtnText: { color: '#000', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, color: Theme.onSurface, fontWeight: '600', letterSpacing: 0.5 },
  sectionTitleError: { fontSize: 14, color: Theme.error, fontWeight: '600', letterSpacing: 0.5 },
  settingsGroup: { backgroundColor: Theme.surface, borderRadius: 16, borderWidth: 1, borderColor: Theme.border, marginBottom: 32, overflow: 'hidden' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  settingLeft: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 14, color: Theme.onSurface, fontWeight: '600', marginBottom: 4 },
  settingSub: { fontSize: 11, color: Theme.onSurfaceVariant, lineHeight: 16 },
  divider: { height: 1, backgroundColor: Theme.surfaceHigh, marginHorizontal: 18 },

  stepperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  stepperCard: { width: '48%', backgroundColor: Theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Theme.border },
  stepperLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  stepperControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 32, height: 32, backgroundColor: Theme.surfaceHigh, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: Theme.onSurfaceVariant, fontSize: 16, fontWeight: '600' },
  stepValue: { fontSize: 18, color: Theme.onSurface, fontWeight: '600' },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  navTitle: { fontSize: 14, color: Theme.onSurface, fontWeight: '600', marginBottom: 4 },
  navSub: { fontSize: 11, color: Theme.onSurfaceVariant },

  dangerSub: { fontSize: 12, color: Theme.onSurfaceVariant, marginBottom: 16 },
  dangerBtn: { width: '100%', backgroundColor: 'transparent', borderRadius: 8, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 180, 171, 0.3)' },
  dangerBtnText: { color: Theme.error, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
