import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as KeepAwake from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { formatTime, formatMinutes, hapticLight, hapticMedium, hapticHeavy, hapticSuccess, scheduleBreakReminder, getTodayKey } from '../utils/helpers';
import { getSettings, addSessionToStats, saveFocusSession, addFocusMinutesToDate } from '../utils/storage';
import { getDailyQuote } from '../constants/quotes';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.72;
const RADIUS = (CIRCLE_SIZE - 20) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIMER_MODES = {
  POMODORO: 'pomodoro',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
  CUSTOM: 'custom',
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TimerScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState(TIMER_MODES.POMODORO);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pomodoroRound, setPomodoroRound] = useState(1);
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quote = getDailyQuote();

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
    if (mode === TIMER_MODES.POMODORO) updateDuration(TIMER_MODES.POMODORO, s);
  };

  const getModeSeconds = (m, s) => {
    if (!s) return 25 * 60;
    switch (m) {
      case TIMER_MODES.POMODORO: return s.pomodoroWork * 60;
      case TIMER_MODES.SHORT_BREAK: return s.pomodoroShortBreak * 60;
      case TIMER_MODES.LONG_BREAK: return s.pomodoroLongBreak * 60;
      case TIMER_MODES.CUSTOM: return customMinutes * 60;
      default: return 25 * 60;
    }
  };

  const updateDuration = (m, s = settings, cMin = customMinutes) => {
    const secs = m === TIMER_MODES.CUSTOM ? cMin * 60 : getModeSeconds(m, s);
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    progressAnim.setValue(0);
  };

  const getModeColor = () => {
    switch (mode) {
      case TIMER_MODES.POMODORO: return Colors.primary;
      case TIMER_MODES.SHORT_BREAK: return Colors.accent;
      case TIMER_MODES.LONG_BREAK: return Colors.accentWarm;
      case TIMER_MODES.CUSTOM: return Colors.secondary;
      default: return Colors.primary;
    }
  };

  const getModeGradient = () => {
    switch (mode) {
      case TIMER_MODES.POMODORO: return Colors.gradientPrimary;
      case TIMER_MODES.SHORT_BREAK: return Colors.gradientAccent;
      case TIMER_MODES.LONG_BREAK: return Colors.gradientWarm;
      case TIMER_MODES.CUSTOM: return Colors.gradientDanger;
      default: return Colors.gradientPrimary;
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const start = () => {
    setIsRunning(true);
    setIsPaused(false);
    hapticMedium();
    startPulse();
    KeepAwake.activateKeepAwakeAsync();
  };

  const pause = () => {
    setIsRunning(false);
    setIsPaused(true);
    hapticLight();
    stopPulse();
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const reset = () => {
    setIsRunning(false);
    setIsPaused(false);
    hapticLight();
    stopPulse();
    if (intervalRef.current) clearInterval(intervalRef.current);
    updateDuration(mode);
    setSessionElapsed(0);
    KeepAwake.deactivateKeepAwake();
  };

  const handleSessionComplete = async () => {
    hapticSuccess();
    KeepAwake.deactivateKeepAwake();
    setIsRunning(false);

    const durationMin = Math.floor(totalSeconds / 60);
    const now = Date.now();

    await addSessionToStats(durationMin);
    await addFocusMinutesToDate(getTodayKey(), durationMin);
    await saveFocusSession({
      id: now.toString(),
      mode,
      durationMinutes: durationMin,
      timestamp: now,
      round: pomodoroRound,
    });

    if (settings?.notifications) {
      await scheduleBreakReminder(mode === TIMER_MODES.POMODORO ? settings?.pomodoroShortBreak : 0);
    }

    // Advance pomodoro round
    if (mode === TIMER_MODES.POMODORO) {
      const nextRound = pomodoroRound + 1;
      if (nextRound > (settings?.pomodoroRounds || 4)) {
        setPomodoroRound(1);
        Alert.alert('🏆 Cycle Complete!', "You've completed a full Pomodoro cycle! Take a long break — you've earned it.", [
          { text: 'Take Long Break', onPress: () => switchMode(TIMER_MODES.LONG_BREAK) },
          { text: 'Start Over', onPress: () => switchMode(TIMER_MODES.POMODORO) },
        ]);
      } else {
        setPomodoroRound(nextRound);
        Alert.alert('✅ Session Done!', `Round ${pomodoroRound} complete! Time for a short break.`, [
          { text: 'Take Break', onPress: () => switchMode(TIMER_MODES.SHORT_BREAK) },
          { text: 'Keep Going', onPress: () => switchMode(TIMER_MODES.POMODORO) },
        ]);
      }
    } else {
      Alert.alert('☕ Break Over!', "Feeling refreshed? Let's get back to work!", [
        { text: "Let's Go! 🚀", onPress: () => switchMode(TIMER_MODES.POMODORO) },
      ]);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    updateDuration(newMode);
    setIsRunning(false);
    setIsPaused(false);
    stopPulse();
    setSessionElapsed(0);
  };

  useEffect(() => {
    const progress = 1 - secondsLeft / totalSeconds;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft, totalSeconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleSessionComplete();
            return 0;
          }
          setSessionElapsed((e) => e + 1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const modeColor = getModeColor();
  const modeGradient = getModeGradient();

  const ModeButton = ({ m, label, emoji }) => (
    <TouchableOpacity
      style={[styles.modeBtn, mode === m && { backgroundColor: modeColor + '25', borderColor: modeColor }]}
      onPress={() => { switchMode(m); hapticLight(); }}
    >
      <Text style={styles.modeBtnEmoji}>{emoji}</Text>
      <Text style={[styles.modeBtnText, mode === m && { color: modeColor }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FocusForge</Text>
          <Text style={styles.headerSub}>Round {pomodoroRound} / {settings?.pomodoroRounds || 4}</Text>
        </View>
        <TouchableOpacity
          style={[styles.deepFocusBtn]}
          onPress={() => {
            hapticLight();
            navigation.navigate('DeepFocus', {
              duration: totalSeconds / 60,
              mode: mode,
            });
          }}
        >
          <Text style={styles.deepFocusText}>Deep Focus →</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      {!isDeepFocus && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll} contentContainerStyle={styles.modeScrollContent}>
          <ModeButton m={TIMER_MODES.POMODORO} label="Focus" emoji="🧠" />
          <ModeButton m={TIMER_MODES.SHORT_BREAK} label="Short Break" emoji="☕" />
          <ModeButton m={TIMER_MODES.LONG_BREAK} label="Long Break" emoji="🌿" />
          <ModeButton m={TIMER_MODES.CUSTOM} label="Custom" emoji="⚙️" />
        </ScrollView>
      )}

      {/* Timer Circle */}
      <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background track */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={Colors.bgHighlight}
            strokeWidth={10}
            fill="transparent"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={modeColor}
            strokeWidth={10}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>

        {/* Inner content */}
        <View style={styles.timerInner}>
          <Text style={styles.timerMode}>
            {mode === TIMER_MODES.POMODORO ? '🧠 FOCUS' :
             mode === TIMER_MODES.SHORT_BREAK ? '☕ BREAK' :
             mode === TIMER_MODES.LONG_BREAK ? '🌿 REST' : '⚙️ CUSTOM'}
          </Text>
          <Text style={[styles.timerText, { color: modeColor }]}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.timerSub}>
            {isRunning ? 'Forging Focus...' : isPaused ? 'Paused' : 'Ready to Start'}
          </Text>
        </View>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtnSecondary} onPress={reset}>
          <Text style={styles.controlBtnSecondaryText}>↺</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={isRunning ? pause : start} activeOpacity={0.85}>
          <LinearGradient colors={modeGradient} style={styles.playBtn}>
            <Text style={styles.playBtnText}>{isRunning ? '⏸' : '▶'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtnSecondary}
          onPress={() => {
            if (mode === TIMER_MODES.CUSTOM) {
              setShowCustomModal(true);
            } else {
              hapticLight();
              switchMode(TIMER_MODES.POMODORO);
            }
          }}
        >
          <Text style={styles.controlBtnSecondaryText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Session elapsed */}
      {(isRunning || isPaused) && sessionElapsed > 0 && (
        <View style={styles.elapsedBadge}>
          <Text style={styles.elapsedText}>+{formatMinutes(Math.floor(sessionElapsed / 60))} this session</Text>
        </View>
      )}

      {/* Daily Quote */}
      {!isDeepFocus && (
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      )}

      {/* Custom Duration Modal */}
      <Modal visible={showCustomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Duration</Text>
            <Text style={styles.modalSub}>Select your session length</Text>
            <View style={styles.customMinuteGrid}>
              {[15, 20, 25, 30, 45, 60, 90, 120].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.minuteBtn, customMinutes === min && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                  onPress={() => { setCustomMinutes(min); hapticLight(); }}
                >
                  <Text style={[styles.minuteBtnText, customMinutes === min && { color: '#fff' }]}>{min}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => {
                setShowCustomModal(false);
                updateDuration(TIMER_MODES.CUSTOM, settings, customMinutes);
                hapticMedium();
              }}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.modalConfirmGrad}>
                <Text style={styles.modalConfirmText}>Set Timer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Warning modal if trying to leave deep focus */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  deepFocusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass },
  deepFocusText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  modeScroll: { maxHeight: 65 },
  modeScrollContent: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  modeBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBtnEmoji: { fontSize: 16 },
  modeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  timerWrapper: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 30, width: CIRCLE_SIZE, height: CIRCLE_SIZE },
  timerInner: { position: 'absolute', alignItems: 'center' },
  timerMode: { color: Colors.textMuted, fontSize: 14, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
  timerText: { fontSize: width * 0.18, fontWeight: '900', letterSpacing: -3, color: Colors.textPrimary },
  timerSub: { color: Colors.textMuted, fontSize: 14, marginTop: 10, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 10 },
  controlBtnSecondary: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  controlBtnSecondaryText: { fontSize: 22, color: Colors.textSecondary },
  playBtn: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', elevation: 12, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
  playBtnText: { fontSize: 32, color: '#fff' },
  elapsedBadge: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: Colors.primary + '20', borderRadius: 20, borderWidth: 1, borderColor: Colors.primary + '40' },
  elapsedText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  quoteCard: { position: 'absolute', bottom: 48, left: 24, right: 24, backgroundColor: Colors.glass, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.glassBorder },
  quoteText: { color: Colors.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  quoteAuthor: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 56, borderWidth: 1, borderColor: Colors.glassBorder },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  customMinuteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 36 },
  minuteBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass },
  minuteBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 16 },
  modalConfirmBtn: { borderRadius: 20, overflow: 'hidden' },
  modalConfirmGrad: { paddingVertical: 18, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
