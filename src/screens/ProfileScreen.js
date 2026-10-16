import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform, Image, Modal, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserProfile, getSettings, saveSettings, getStats, saveStats, saveUserProfile } from '../utils/storage';
import { getLevelInfo } from '../constants/achievements';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/helpers';
import { supabase } from '../config/supabase';
import apiClient from '../utils/apiClient';
import { pushLocalDataToCloud, pullCloudDataToLocal, getActiveCloudProvider } from '../utils/cloudSync';
import { Theme } from '../constants/colors';

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
  const [profile, setProfile] = useState({ name: 'Operator', goalHours: 2 });
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [syncProvider, setSyncProvider] = useState('none');

  // Edit Profile Modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGoalHours, setEditGoalHours] = useState('2');

  // Quick Menu Modal state
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const [p, s, st] = await Promise.all([getUserProfile(), getSettings(), getStats()]);
    setProfile(p || { name: 'Operator', goalHours: 2 });
    setSettings(s);
    setStats(st);
    
    const provider = await getActiveCloudProvider();
    setIsSyncActive(provider !== 'none');
    setSyncProvider(provider);
  };

  const updateSetting = async (key, value) => {
    hapticLight();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const openEditProfile = () => {
    hapticLight();
    setEditName(profile?.name || 'Operator');
    setEditGoalHours(String(profile?.goalHours || settings?.dailyGoalHours || 2));
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim() || 'Operator';
    const hours = Math.max(1, Math.min(24, parseFloat(editGoalHours) || 2));
    const updatedProfile = { ...profile, name: trimmedName, goalHours: hours };
    setProfile(updatedProfile);
    await saveUserProfile(updatedProfile);
    if (settings) {
      const updatedSettings = { ...settings, dailyGoalHours: hours };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
    }
    hapticSuccess();
    setShowEditProfileModal(false);
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

  const handleAuthAction = async (isSignUp) => {
    if (!authEmail || !authPassword) {
      Alert.alert('Error', 'Please provide an identifier and passphrase.');
      return;
    }

    if (authPassword.length < 6) {
      Alert.alert('Security Policy', 'Passphrase must be at least 6 characters long.');
      return;
    }

    setIsLoadingAuth(true);
    let authenticated = false;
    let usedProvider = 'backend';
    let authError = null;

    // 1. Primary: Custom FocusForge Backend API
    try {
      if (isSignUp) {
        await apiClient.register(authEmail.trim(), authPassword, profile?.name || 'Operator', {
          dailyGoalHours: profile?.goalHours || 2,
        });
      } else {
        await apiClient.login(authEmail.trim(), authPassword);
      }
      authenticated = true;
      usedProvider = 'backend';
    } catch (backendErr) {
      authError = backendErr;
      console.warn('[ProfileScreen] Backend auth failed:', backendErr.message);

      // Fallback to Supabase if backend is unreachable or returns server error
      if (supabase && (backendErr.status === 0 || backendErr.status >= 500 || backendErr.status === 404)) {
        try {
          if (isSignUp) {
            const resp = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
            if (resp.error) throw resp.error;
          } else {
            const resp = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
            if (resp.error) throw resp.error;
          }
          authenticated = true;
          usedProvider = 'supabase';
          authError = null;
        } catch (supabaseErr) {
          authError = supabaseErr;
        }
      }
    }

    setIsLoadingAuth(false);

    if (!authenticated) {
      Alert.alert('Authentication Failed', authError?.message || 'Check connection.');
      hapticLight();
    } else {
      setIsSyncActive(true);
      setSyncProvider(usedProvider);
      setShowAuthModal(false);
      
      if (isSignUp) {
        await pushLocalDataToCloud();
      } else {
        await pullCloudDataToLocal();
        await load();
      }

      hapticSuccess();
      Alert.alert(
        'Link Established',
        usedProvider === 'backend'
          ? 'Terminal synchronized with FocusForge cloud backend API.'
          : 'Terminal synchronized with Supabase cloud layer.'
      );
    }
  };

  const handleSignOut = async () => {
    await apiClient.logout();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore signout error
      }
    }
    setIsSyncActive(false);
    setSyncProvider('none');
    hapticLight();
  };

  const quickNav = (screenName, params) => {
    hapticLight();
    setMenuVisible(false);
    navigation.navigate(screenName, params);
  };

  if (!settings || !stats) return null;

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
        <TouchableOpacity style={styles.profileBtn} onPress={openEditProfile}>
          <Image
            source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
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

            <TouchableOpacity style={styles.sheetItem} onPress={() => quickNav('Home')}>
              <MaterialCommunityIcons name="home-outline" size={22} color={Theme.primary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Home Command Center</Text>
                <Text style={styles.sheetItemSub}>Overview of current focus and daily quests</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => quickNav('Tasks')}>
              <MaterialCommunityIcons name="format-list-checks" size={22} color={Theme.secondary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Protocol Objectives (Tasks)</Text>
                <Text style={styles.sheetItemSub}>Manage active queues and mission tasks</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => quickNav('Achievements')}>
              <MaterialCommunityIcons name="trophy-outline" size={22} color={Theme.tertiary} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Achievements Gallery</Text>
                <Text style={styles.sheetItemSub}>Review unlocked honors and system rank</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => quickNav('BlockedApps')}>
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color={Theme.primaryVariant} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Deep Work App Shield</Text>
                <Text style={styles.sheetItemSub}>Control blocked endpoints and distractions</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={() => quickNav('Analytics')}>
              <MaterialCommunityIcons name="chart-box-outline" size={22} color={Theme.onSurface} />
              <View style={styles.sheetItemTextWrap}>
                <Text style={styles.sheetItemTitle}>Telemetry & Focus Analytics</Text>
                <Text style={styles.sheetItemSub}>Examine deep work session distributions</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setMenuVisible(false)}>
              <Text style={styles.sheetCloseText}>CLOSE MENU</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showEditProfileModal}
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="account-edit-outline" size={48} color={Theme.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Edit Protocol Profile</Text>
            <Text style={styles.modalBody}>Update your operator identifier and daily focus target.</Text>

            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={styles.editInputLabel}>OPERATOR IDENTIFIER</Text>
              <View style={styles.authInputWrapper}>
                <TextInput
                  style={styles.authInput}
                  placeholder="Operator Name"
                  placeholderTextColor={Theme.onSurfaceVariant}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={[styles.editInputLabel, { marginTop: 12 }]}>DAILY FOCUS TARGET (HOURS)</Text>
              <View style={styles.hoursRow}>
                {['1', '2', '3', '4', '5', '6', '8'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourBtn,
                      editGoalHours === h && { backgroundColor: Theme.primaryVariant, borderColor: Theme.primary },
                    ]}
                    onPress={() => {
                      hapticLight();
                      setEditGoalHours(h);
                    }}
                  >
                    <Text style={[styles.hourBtnText, editGoalHours === h && { color: '#000', fontWeight: '800' }]}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.modalActionBtn} onPress={handleSaveProfile}>
              <Text style={styles.modalActionText}>COMMIT CHANGES</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditProfileModal(false)}>
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Screen Title */}
        <View style={styles.titleArea}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>SYSTEM CONFIGURATION & USER PROTOCOL.</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardTop}>
            <Image
              source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
              style={styles.cardAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile.name || 'Operator'}</Text>
              <Text style={styles.userID}>Protocol ID: {stats.xp}-X • Target: {profile.goalHours || 2}h/day</Text>
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
            <TouchableOpacity style={styles.editBtn} onPress={openEditProfile} activeOpacity={0.7}>
              <Text style={styles.editBtnText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auth Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAuthModal}
          onRequestClose={() => setShowAuthModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <MaterialCommunityIcons name="cloud-lock-outline" size={48} color={Theme.primary} style={{ marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Authenticate</Text>
              <Text style={styles.modalBody}>Link your terminal to the cloud database to preserve your configurations and protocols.</Text>
              
              <View style={{ width: '100%', marginBottom: 24 }}>
                <View style={styles.authInputWrapper}>
                  <TextInput
                    style={styles.authInput}
                    placeholder="IDENTIFIER (EMAIL)"
                    placeholderTextColor={Theme.onSurfaceVariant}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.authInputWrapper}>
                  <TextInput
                    style={styles.authInput}
                    placeholder="PASSPHRASE"
                    placeholderTextColor={Theme.onSurfaceVariant}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={{ width: '100%', marginBottom: 12 }}>
                <TouchableOpacity 
                  style={[styles.modalActionBtn, isLoadingAuth && { opacity: 0.5 }]} 
                  onPress={() => handleAuthAction(false)}
                  disabled={isLoadingAuth}
                >
                  <Text style={styles.modalActionText}>{isLoadingAuth ? "PROCESSING..." : "INITIALIZE LINK"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalActionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Theme.primaryVariant }, isLoadingAuth && { opacity: 0.5 }]} 
                  onPress={() => handleAuthAction(true)}
                  disabled={isLoadingAuth}
                >
                  <Text style={[styles.modalActionText, { color: Theme.primaryVariant }]}>CREATE NEW LINK</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAuthModal(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cloud Sync Status */}
        <View style={styles.membershipSection}>
          <View style={styles.memHeader}>
            <MaterialCommunityIcons name={isSyncActive ? "cloud-check" : "cloud-off-outline"} size={14} color={isSyncActive ? Theme.primary : Theme.onSurfaceVariant} />
            <Text style={styles.memHeaderTitle}>CLOUD SYNC LAYER</Text>
          </View>
          <Text style={styles.memTitle}>
            {isSyncActive
              ? (syncProvider === 'backend' ? "FocusForge Cloud API" : "Supabase Cloud")
              : "Offline"}
          </Text>
          <Text style={styles.memSub}>
            {isSyncActive
              ? "Real-time encrypted synchronization active across devices."
              : "Local storage only. Device failure risks data loss."}
          </Text>
          <View style={styles.memBarBg}>
            <View style={[styles.memBarFill, { width: '100%' }]} />
          </View>
          <Text style={styles.memProgress}>
            {isSyncActive
              ? (syncProvider === 'backend' ? "FORGE CLOUD LINKED" : "SUPABASE LINKED")
              : "SYNC DISABLED"}
          </Text>
          <TouchableOpacity 
            style={styles.manageBtn} 
            onPress={() => {
              if (isSyncActive) {
                handleSignOut();
              } else {
                setShowAuthModal(true);
              }
            }}
          >
            <LinearGradient colors={isSyncActive ? [Theme.surfaceHigh, Theme.surfaceHigh] : [Theme.primaryVariant, Theme.primary]} style={styles.manageBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={[styles.manageBtnText, isSyncActive && { color: Theme.error }]}>{isSyncActive ? "DISCONNECT CLOUD" : "CONNECT CLOUD"}</Text>
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

  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },

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

  // Edit Profile and Auth Modals
  editInputLabel: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.border,
    backgroundColor: Theme.surfaceHigh,
  },
  hourBtnText: { color: Theme.onSurface, fontWeight: '600', fontSize: 13 },

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

  // Common Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.surface, borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Theme.border },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Theme.onSurface, marginBottom: 12 },
  modalBody: { fontSize: 13, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  authInputWrapper: { width: '100%', backgroundColor: Theme.surfaceHigh, borderRadius: 12, borderWidth: 1, borderColor: Theme.border, marginBottom: 12 },
  authInput: { color: Theme.onSurface, padding: 16, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  modalActionBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, backgroundColor: Theme.primaryVariant, alignItems: 'center', marginBottom: 12 },
  modalActionText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
  modalCancelBtn: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { color: Theme.onSurfaceVariant, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },

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
});
