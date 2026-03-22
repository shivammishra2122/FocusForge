import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  BackHandler,
  AppState,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as KeepAwake from 'expo-keep-awake';
import { Audio } from 'expo-av';
import { Colors } from '../constants/colors';
import { CATEGORIES, getCategoryById } from '../constants/categories';
import { SOUNDS, getSoundById } from '../constants/sounds';
import { formatTime, hapticMedium, hapticSuccess, hapticLight, scheduleBreakReminder, getTodayKey } from '../utils/helpers';
import {
  getSettings,
  addSessionToStats,
  saveFocusSession,
  addFocusMinutesToDate,
  setFocusSessionActive,
  clearFocusSession,
  penalizeStreak,
} from '../utils/storage';
import { startBlocking, stopBlocking } from '../utils/appBlocker';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.78;
const RADIUS = (CIRCLE_SIZE - 16) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  const totalSeconds = durationMinutes * 60;
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  // Auto-start on mount
  useEffect(() => {
    startSession();
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
    } catch (err) {
      console.log('Deep Focus sound error:', err);
    }
  };

  // Block back button on Android
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

  // Detect app going to background (iOS fallback)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/) && isRunning) {
        setShowPenaltyWarning(true);
      }
      appState.current = nextState;
    });
    return () => subscription?.remove();
  }, [isRunning]);

  const startSession = async () => {
    setIsRunning(true);
    hapticMedium();
    KeepAwake.activateKeepAwakeAsync();

    await setFocusSessionActive({
      startedAt: Date.now(),
      durationMin: durationMinutes,
      mode,
    });

    startBlocking();
    startPulse();
    if (soundId !== 'NONE') loadAndPlaySound();
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleSessionComplete = async () => {
    hapticSuccess();
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
    await saveFocusSession({
      ...sessionDataToSave,
      note: reflectionNote.trim(),
    });

    setShowReflectionModal(false);
    setReflectionNote('');

    const settings = await getSettings();
    if (settings.notifications) {
      await scheduleBreakReminder(settings.pomodoroShortBreak);
    }

    Alert.alert(
      '🏆 Session Complete',
      `You focused for ${durationMinutes} minutes. Outstanding discipline.`,
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  const handleEarlyExit = async () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    KeepAwake.deactivateKeepAwake();
    stopBlocking();
    await clearFocusSession();

    // Penalize streak
    await penalizeStreak();
    hapticLight();
    stopSound();
    
    const elapsedMin = Math.floor((totalSeconds - secondsLeft) / 60);
    if (elapsedMin > 0) {
      // still log partial session with halved XP
      await addFocusMinutesToDate(getTodayKey(), elapsedMin);
    }

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

  // Update progress arc
  useEffect(() => {
    const progress = 1 - secondsLeft / totalSeconds;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Status label */}
      <View style={styles.statusRow}>
        <View style={styles.liveIndicator} />
        <Text style={styles.statusText}>
          DEEP FOCUS: {getCategoryById(initialCategory).label.toUpperCase()} 
          {soundId !== 'NONE' ? ` · ${getSoundById(soundId).icon}` : ''}
        </Text>
      </View>

      {/* Timer ring */}
      <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={Colors.bgHighlight}
            strokeWidth={8}
            fill="transparent"
          />
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={Colors.primary}
            strokeWidth={8}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>

        <View style={styles.timerInner}>
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.timerSub}>{Math.round(progress)}% complete</Text>
        </View>
      </Animated.View>

      {/* Message */}
      <Text style={styles.message}>Stay present. Your future self is watching.</Text>

      {/* End button */}
      <TouchableOpacity
        style={styles.endBtn}
        onPress={() => setShowExitModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.endBtnText}>End Session Early</Text>
      </TouchableOpacity>

      {/* Reflection Modal */}
      <Modal visible={showReflectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.reflectionIcon}>✨</Text>
            <Text style={styles.modalTitle}>Session Complete!</Text>
            <Text style={styles.modalSub}>What did you focus on during this deep session?</Text>
            
            <View style={styles.reflectionContainer}>
              <Text style={styles.reflectionCategory}>
                Tag: {getCategoryById(initialCategory).icon} {getCategoryById(initialCategory).label}
              </Text>
              <TextInput
                style={styles.reflectionInput}
                placeholder="Briefly describe your work..."
                placeholderTextColor={Colors.textMuted}
                autoFocus
                multiline
                numberOfLines={3}
                value={reflectionNote}
                onChangeText={setReflectionNote}
              />
            </View>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={saveReflectionAndFinish}>
              <Text style={styles.modalCancelText}>Save & Continue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.skipBtn} 
              onPress={() => { setReflectionNote(''); saveReflectionAndFinish(); }}
            >
              <Text style={styles.skipBtnText}>Skip reflection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exit confirmation modal */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>End Session?</Text>
            <Text style={styles.modalBody}>
              Leaving early will penalize your streak. Are you sure?
            </Text>
            <TouchableOpacity style={styles.modalDangerBtn} onPress={handleEarlyExit}>
              <Text style={styles.modalDangerText}>End & Lose Streak</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowExitModal(false)}>
              <Text style={styles.modalCancelText}>Keep Focusing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* iOS penalty warning */}
      <Modal visible={showPenaltyWarning} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>🔥</Text>
            <Text style={styles.modalTitle}>Streak Penalty</Text>
            <Text style={styles.modalBody}>
              You left the app during a focus session. Your streak has been reduced.
            </Text>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={handlePenaltyDismiss}>
              <Text style={styles.modalCancelText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    top: 60,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  statusText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  timerWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: width * 0.18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  timerSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  message: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 32,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 48,
    lineHeight: 22,
  },
  endBtn: {
    position: 'absolute',
    bottom: 60,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  endBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    padding: 32,
    width: width * 0.82,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalIcon: { fontSize: 40, marginBottom: 16 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalDangerBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.danger + '20',
    borderWidth: 1,
    borderColor: Colors.danger + '60',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDangerText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  reflectionIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  reflectionContainer: { marginBottom: 24, width: '100%' },
  reflectionCategory: { fontSize: 12, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  reflectionInput: { backgroundColor: Colors.bgHighlight, borderRadius: 16, padding: 18, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top', minHeight: 100 },
  skipBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
});
