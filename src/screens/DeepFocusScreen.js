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
import {
  getUserProfile, getSettings, addSessionToStats, saveFocusSession,
  addFocusMinutesToDate, getFocusSessionActive,
  setFocusSessionActive, clearFocusSession, penalizeStreak,
  getBlockedApps
} from '../utils/storage';
import { getTodayKey } from '../utils/helpers';
import * as helpers from '../utils/helpers';
import { startBlocking, stopBlocking } from '../utils/appBlocker';
import { calculateFocusEfficiency, calculateFocusIndex } from '../utils/focusMetrics';
import { Theme } from '../constants/colors';

const { width } = Dimensions.get('window');

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
  const soundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [profile, setProfile] = useState({});

  const totalSeconds = durationMinutes * 60;
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    getUserProfile().then(p => setProfile(p || {}));
  }, []);

  const configureAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (e) {
      // Audio mode config failure is non-fatal
    }
  };

  const stopSound = useCallback(async () => {
    const currentSound = soundRef.current;
    soundRef.current = null;
    setSoundObject(null);
    if (currentSound) {
      try {
        const status = await currentSound.getStatusAsync().catch(() => null);
        if (status && status.isLoaded) {
          await currentSound.stopAsync().catch(() => {});
          await currentSound.unloadAsync().catch(() => {});
        } else if (status) {
          await currentSound.unloadAsync().catch(() => {});
        }
      } catch (e) {
        // Safe catch prevents unhandled promise rejections
      }
    }
  }, []);

  const loadAndPlaySound = async () => {
    await configureAudioMode();

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
      } catch (_) {}
      soundRef.current = null;
      setSoundObject(null);
    }

    try {
      const s = getSoundById(soundId);
      if (!s || !s.url) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: s.url },
        { shouldPlay: true, isLooping: true, volume: isMuted ? 0 : 0.5 }
      );
      soundRef.current = sound;
      setSoundObject(sound);
    } catch (err) {
      console.warn('Deep focus sound playback unavailable:', err?.message || err);
      // Timer continues running smoothly even if audio stream fails
    }
  };

  const toggleMute = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    helpers.hapticLight();
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync().catch(() => null);
        if (status && status.isLoaded) {
          await soundRef.current.setVolumeAsync(nextMute ? 0 : 0.5).catch(() => {});
        }
      } catch (e) {}
    }
  };

  // Auto-start or resume on mount
  useEffect(() => {
    const initSession = async () => {
      const active = await getFocusSessionActive();
      let initSeconds;
      
      if (active && active.startedAt && active.durationMin) {
        const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
        const remainingSec = (active.durationMin * 60) - elapsedSec;
        initSeconds = Math.max(0, remainingSec);
      } else {
        initSeconds = durationMinutes * 60;
        await setFocusSessionActive({
          startedAt: Date.now(),
          durationMin: durationMinutes,
          mode,
        });
      }

      setSecondsLeft(initSeconds);
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
    };
    initSession();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      KeepAwake.deactivateKeepAwake();
      stopBlocking();
      clearFocusSession();
      stopSound();
    };
  }, [stopSound]);

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

  // Local timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Professional focus metrics
  const elapsedSeconds = totalSeconds - secondsLeft;
  const progressRatio = Math.min(elapsedSeconds / totalSeconds, 1);
  const efficiency = calculateFocusEfficiency(elapsedSeconds, totalSeconds, true);
  const focusIndex = calculateFocusIndex(elapsedSeconds, totalSeconds);

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header with Focused Action Buttons */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <MaterialCommunityIcons name="shield-lock-outline" size={14} color={Theme.primary} />
          <Text style={styles.headerBadgeText}>DEEP WORK PROTOCOL</Text>
        </View>

        <View style={styles.headerActions}>
          {soundId !== 'NONE' && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={toggleMute}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={isMuted ? 'volume-off' : 'volume-high'}
                size={18}
                color={isMuted ? Theme.onSurfaceVariant : Theme.primary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerCloseBtn}
            onPress={() => {
              helpers.hapticLight();
              setShowExitModal(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={20} color={Theme.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Centered Timer / Icon */}
        <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.remainingText}>{formatMMSS(secondsLeft)}</Text>
          <Text style={styles.remainingLabel}>PROTOCOL REMAINING</Text>
        </Animated.View>

        <Text style={styles.mainTitle}>FOCUS MODE ACTIVE</Text>
        <Text style={styles.mainDesc}>
          Architecture requires focus. System is locked to optimize performance.
        </Text>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${progressRatio * 100}%` }]} />
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerStat}>
              <Text style={styles.footerLabel}>EFFICIENCY</Text>
              <Text style={styles.footerVal}>{efficiency}%</Text>
            </View>
            <View style={styles.footerStat}>
              <Text style={styles.footerLabel}>FOCUS INDEX</Text>
              <Text style={styles.footerVal}>{focusIndex}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={() => {
            helpers.hapticLight();
          }}
        >
          <LinearGradient colors={[Theme.secondary, Theme.primaryVariant]} style={styles.continueGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.continueText}>LOCK IN / CONTINUE FOCUS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exitBtn} onPress={() => setShowExitModal(true)}>
          <Text style={styles.exitText}>EXIT SYSTEM</Text>
          <MaterialCommunityIcons name="login-variant" size={14} color={Theme.onSurfaceVariant} style={{ transform: [{ rotate: '180deg' }] }} />
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

  // Focused State Header
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(192, 193, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.15)',
  },
  headerBadgeText: {
    fontSize: 10,
    color: Theme.primary,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },

  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(27, 27, 29, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  remainingText: { fontSize: 52, fontWeight: '100', color: Theme.primary, letterSpacing: -2 },
  remainingLabel: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  mainTitle: { fontSize: 24, fontWeight: '700', color: Theme.onSurface, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  mainDesc: { fontSize: 13, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 20 },

  statsCard: { width: '100%', backgroundColor: Theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Theme.border, marginBottom: 32 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerStat: { alignItems: 'center' },
  footerLabel: { fontSize: 8, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  footerVal: { fontSize: 14, color: Theme.primary, fontWeight: '700' },

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
