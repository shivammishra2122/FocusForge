import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Animated, Alert, BackHandler, AppState, Platform,
  StatusBar, Modal, TextInput, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as KeepAwake from 'expo-keep-awake';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CATEGORIES, getCategoryById } from '../constants/categories';
import { SOUNDS, getSoundById } from '../constants/sounds';
import { getUserProfile, getSettings, addSessionToStats, saveFocusSession,
  addFocusMinutesToDate, getFocusSessionActive,
  setFocusSessionActive, clearFocusSession, penalizeStreak,
  getBlockedApps } from '../utils/storage';
import { getTodayKey } from '../utils/helpers';
import * as helpers from '../utils/helpers';
import { startBlocking, stopBlocking } from '../utils/appBlocker';

const { width } = Dimensions.get('window');

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

export default function DeepFocusScreen({ navigation, route }) {
  const durationMinutes = route?.params?.duration || 25;
  const mode = route?.params?.mode || 'pomodoro';
  const initialCategory = route?.params?.category || CATEGORIES[0].id;
  const soundId = route?.params?.soundId || 'NONE';

  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPenaltyWarning, setShowPenaltyWarning] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionNote, setReflectionNote] = useState('');
  const [sessionDataToSave, setSessionDataToSave] = useState(null);
  const [soundObject, setSoundObject] = useState(null);
  const [profile, setProfile] = useState({});

  const totalSeconds = durationMinutes * 60;
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    getUserProfile().then(p => setProfile(p || {}));
  }, []);

  // Auto-start or resume on mount
  useEffect(() => {
    const initSession = async () => {
      const active = await getFocusSessionActive();
      if (active && active.startedAt && active.durationMin) {
        const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
        const remainingSec = (active.durationMin * 60) - elapsedSec;
        
        if (remainingSec <= 0) {
          setSecondsLeft(0);
          handleSessionComplete();
        } else {
          setSecondsLeft(remainingSec);
          setIsRunning(true);
          KeepAwake.activateKeepAwakeAsync();
          startPulse();
          if (soundId !== 'NONE') loadAndPlaySound();
          
          try {
            const blockedApps = await getBlockedApps();
            const activeBlocked = blockedApps.filter(a => a.blocked).map(a => a.packageName);
            if (activeBlocked.length > 0) startBlocking(activeBlocked);
          } catch (e) {
            startBlocking([]);
          }
        }
      } else {
        startSession();
      }
    };
    initSession();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      KeepAwake.deactivateKeepAwake();
      stopBlocking();
      clearFocusSession();
      stopSound();
    };
  }, []);

  const stopSound = async () => {
    if (soundObject) {
      try {
        await soundObject.stopAsync();
        await soundObject.unloadAsync();
      } catch (e) {}
    }
  };

  const loadAndPlaySound = async () => {
    try {
      const s = getSoundById(soundId);
      if (!s || !s.url) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: s.url },
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      setSoundObject(sound);
    } catch (err) {}
  };

  useEffect(() => {
    const backAction = () => {
      if (isRunning) {
        setShowExitModal(true);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isRunning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active' && isRunning) {
        const active = await getFocusSessionActive();
        if (active && active.startedAt && active.durationMin) {
          const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
          const remainingSec = (active.durationMin * 60) - elapsedSec;
          if (remainingSec <= 0) {
            setSecondsLeft(0);
            handleSessionComplete();
          } else {
            setSecondsLeft(remainingSec);
          }
        }
      } else if (appState.current === 'active' && nextState.match(/inactive|background/) && isRunning) {
        if (Platform.OS === 'ios') setShowPenaltyWarning(true);
      }
      appState.current = nextState;
    });
    return () => subscription?.remove();
  }, [isRunning]);

  const startSession = async () => {
    setIsRunning(true);
    helpers.hapticMedium();
    KeepAwake.activateKeepAwakeAsync();

    await setFocusSessionActive({
      startedAt: Date.now(),
      durationMin: durationMinutes,
      mode,
    });

    startPulse();
    if (soundId !== 'NONE') loadAndPlaySound();

    try {
      const blockedApps = await getBlockedApps();
      const activeBlocked = blockedApps.filter(a => a.blocked).map(a => a.packageName);
      if (activeBlocked.length > 0) startBlocking(activeBlocked);
    } catch (e) {
      startBlocking([]);
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleSessionComplete = async () => {
    helpers.hapticSuccess();
    setIsRunning(false);
    KeepAwake.deactivateKeepAwake();
    stopBlocking();
    await clearFocusSession();
    stopSound();

    const elapsed = durationMinutes;
    const now = Date.now();
    
    setSessionDataToSave({
      id: now.toString(),
      mode,
      durationMinutes: elapsed,
      timestamp: now,
      deepFocus: true,
      category: initialCategory,
    });
    
    setShowReflectionModal(true);
  };

  const saveReflectionAndFinish = async () => {
    if (!sessionDataToSave) return;
    
    const { durationMinutes: elapsed } = sessionDataToSave;
    await addSessionToStats(elapsed);
    await addFocusMinutesToDate(getTodayKey(), elapsed);
    await saveFocusSession({ ...sessionDataToSave, note: reflectionNote.trim() });

    setShowReflectionModal(false);
    setReflectionNote('');

    const settings = await getSettings();
    if (settings.notifications) {
      await helpers.scheduleBreakReminder(settings.pomodoroShortBreak);
    }

    Alert.alert('Protocol Complete', `System recorded ${durationMinutes} minutes of absolute focus.`, [{ text: 'Done', onPress: () => navigation.goBack() }]);
  };

  const handleEarlyExit = async () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    KeepAwake.deactivateKeepAwake();
    stopBlocking();
    await clearFocusSession();
    await penalizeStreak();
    helpers.hapticLight();
    stopSound();
    
    const elapsedMin = Math.floor((totalSeconds - secondsLeft) / 60);
    if (elapsedMin > 0) await addFocusMinutesToDate(getTodayKey(), elapsedMin);

    setShowExitModal(false);
    navigation.goBack();
  };

  const handlePenaltyDismiss = async () => {
    setShowPenaltyWarning(false);
    await penalizeStreak();
  };

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(async () => {
        const active = await getFocusSessionActive();
        if (active && active.startedAt && active.durationMin) {
          const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
          const remainingSec = (active.durationMin * 60) - elapsedSec;
          
          if (remainingSec <= 0) {
            clearInterval(intervalRef.current);
            setSecondsLeft(0);
            handleSessionComplete();
          } else {
            setSecondsLeft(remainingSec);
          }
        }
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const elapsedMinutes = Math.floor((totalSeconds - secondsLeft) / 60);
  const progressRatio = Math.min((totalSeconds - secondsLeft) / totalSeconds, 1);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

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

      <View style={styles.mainContent}>
        {/* Animated Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconCenter} />
        </Animated.View>

        <Text style={styles.mainTitle}>FOCUS MODE{'\n'}ACTIVE</Text>
        <Text style={styles.mainDesc}>
          The path to excellence is paved with silence. Your current objective requires absolute presence.
        </Text>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>SYSTEM UPTIME</Text>
          <View style={styles.uptimeRow}>
            <Text style={styles.uptimeVal}>{elapsedMinutes}</Text>
            <Text style={styles.uptimeUnit}>MIN</Text>
          </View>
          
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${progressRatio * 100}%` }]} />
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterLeft}>DEEP WORK SESSION</Text>
            <Text style={styles.cardFooterRight}>GOAL: {durationMinutes}M</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.8} onPress={() => {}}>
          <LinearGradient colors={[Theme.secondary, Theme.primaryVariant]} style={styles.continueGrad} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={styles.continueText}>CONTINUE FOCUS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exitBtn} onPress={() => setShowExitModal(true)}>
          <Text style={styles.exitText}>EXIT SYSTEM</Text>
          <MaterialCommunityIcons name="login-variant" size={14} color={Theme.onSurfaceVariant} style={{ transform: [{ rotate: '180deg'}] }} />
        </TouchableOpacity>
      </View>

      {/* Reflection Modal */}
      <Modal visible={showReflectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
             <MaterialCommunityIcons name="check-circle-outline" size={48} color={Theme.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Protocol Complete</Text>
            <Text style={styles.modalBody}>Log your execution summary to append this sequence to your system record.</Text>
            
            <View style={styles.reflectionContainer}>
              <Text style={styles.reflectionCategory}>
                <MaterialCommunityIcons name={getCategoryById(initialCategory).icon} size={12} /> {getCategoryById(initialCategory).label}
              </Text>
              <TextInput
                style={styles.reflectionInput}
                placeholder="Execution log..."
                placeholderTextColor={Theme.onSurfaceVariant}
                autoFocus
                multiline
                numberOfLines={3}
                value={reflectionNote}
                onChangeText={setReflectionNote}
              />
            </View>

            <TouchableOpacity style={styles.modalActionBtn} onPress={saveReflectionAndFinish}>
              <Text style={styles.modalActionText}>APPEND TO RECORD</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.skipBtn} onPress={() => { setReflectionNote(''); saveReflectionAndFinish(); }}>
              <Text style={styles.skipBtnText}>BYPASS LOG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exit confirmation modal */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="alert-rhombus-outline" size={48} color={Theme.error} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitleError}>Abort Sequence?</Text>
            <Text style={styles.modalBody}>
              Exiting active focus protocols will permanently downgrade your streak progression.
            </Text>
            <TouchableOpacity style={styles.modalDangerBtn} onPress={handleEarlyExit}>
              <Text style={styles.modalDangerText}>FORCE EXIT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowExitModal(false)}>
              <Text style={styles.modalCancelText}>MAINTAIN FOCUS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* iOS penalty warning */}
      <Modal visible={showPenaltyWarning} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
             <MaterialCommunityIcons name="shield-alert-outline" size={48} color={Theme.error} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitleError}>System Breach</Text>
            <Text style={styles.modalBody}>
              You navigated away from the active protocol. Your streak parameter has been penalized.
            </Text>
            <TouchableOpacity style={styles.modalActionBtn} onPress={handlePenaltyDismiss}>
              <Text style={styles.modalActionText}>ACKNOWLEDGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '300', letterSpacing: 4 },
  profileBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.surfaceHighest, borderWidth: 1, borderColor: 'rgba(71,70,74,0.3)', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },

  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  iconWrap: { width: 100, height: 100, borderRadius: 24, backgroundColor: Theme.surfaceHigh, alignItems: 'center', justifyContent: 'center', marginBottom: 40, borderWidth: 1, borderColor: Theme.border },
  iconCenter: { width: 30, height: 30, borderRadius: 15, backgroundColor: Theme.primary, borderWidth: 6, borderColor: Theme.bg },

  mainTitle: { fontSize: 36, fontWeight: '800', color: Theme.onSurface, textAlign: 'center', letterSpacing: -1, lineHeight: 38, marginBottom: 16 },
  mainDesc: { fontSize: 13, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 48, paddingHorizontal: 10 },

  statsCard: { width: '100%', backgroundColor: Theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Theme.border, marginBottom: 40 },
  statsLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  uptimeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginBottom: 24 },
  uptimeVal: { fontSize: 48, fontWeight: '300', color: Theme.primary, lineHeight: 52 },
  uptimeUnit: { fontSize: 16, color: Theme.onSurfaceVariant, fontWeight: '600', paddingBottom: 8 },
  
  barBg: { height: 3, backgroundColor: Theme.surfaceHigh, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  barFill: { height: '100%', backgroundColor: Theme.primaryVariant },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardFooterLeft: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1 },
  cardFooterRight: { fontSize: 9, color: Theme.primaryVariant, fontWeight: '800', letterSpacing: 1 },

  continueBtn: { width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 24 },
  continueGrad: { paddingVertical: 16, alignItems: 'center' },
  continueText: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 2 },

  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  exitText: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.surface, borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Theme.border },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Theme.onSurface, marginBottom: 12 },
  modalTitleError: { fontSize: 22, fontWeight: '700', color: Theme.error, marginBottom: 12 },
  modalBody: { fontSize: 13, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  
  modalActionBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, backgroundColor: Theme.surfaceHigh, borderWidth: 1, borderColor: Theme.border, alignItems: 'center', marginBottom: 12 },
  modalActionText: { color: Theme.primary, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },
  
  modalDangerBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, backgroundColor: 'rgba(255, 180, 171, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 180, 171, 0.3)', alignItems: 'center', marginBottom: 12 },
  modalDangerText: { color: Theme.error, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },
  
  modalCancelBtn: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  modalCancelText: { color: Theme.onSurfaceVariant, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },

  reflectionContainer: { width: '100%', marginBottom: 24 },
  reflectionCategory: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' },
  reflectionInput: { backgroundColor: Theme.surfaceHigh, borderRadius: 12, padding: 16, color: Theme.onSurface, fontSize: 14, textAlignVertical: 'top', minHeight: 90, borderWidth: 1, borderColor: Theme.border },
  
  skipBtn: { paddingVertical: 12 },
  skipBtnText: { color: Theme.onSurfaceVariant, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
});
