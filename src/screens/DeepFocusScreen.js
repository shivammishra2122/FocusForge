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
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as KeepAwake from 'expo-keep-awake';
import { Colors } from '../constants/colors';
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

  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPenaltyWarning, setShowPenaltyWarning] = useState(false);

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
    };
  }, []);

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

    const elapsed = durationMinutes;
    await addSessionToStats(elapsed);
    await addFocusMinutesToDate(getTodayKey(), elapsed);
    await saveFocusSession({
      id: Date.now().toString(),
      mode,
      durationMinutes: elapsed,
      timestamp: Date.now(),
      deepFocus: true,
    });

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
        <Text style={styles.statusText}>DEEP FOCUS ACTIVE</Text>
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
    borderRadius: 14,
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
    borderRadius: 14,
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
    borderRadius: 14,
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
});
