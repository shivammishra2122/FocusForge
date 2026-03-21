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
import { formatTime, formatMinutes, hapticLight, hapticMedium, hapticSuccess, scheduleBreakReminder, getTodayKey } from '../utils/helpers';
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

const MODE_LABELS = {
  pomodoro: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
  custom: 'Custom',
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

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
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
    await saveFocusSession({ id: now.toString(), mode, durationMinutes: durationMin, timestamp: now, round: pomodoroRound });
    if (settings?.notifications) {
      await scheduleBreakReminder(mode === TIMER_MODES.POMODORO ? settings?.pomodoroShortBreak : 0);
    }
    if (mode === TIMER_MODES.POMODORO) {
      const nextRound = pomodoroRound + 1;
      if (nextRound > (settings?.pomodoroRounds || 4)) {
        setPomodoroRound(1);
        Alert.alert('Cycle Complete', "Full Pomodoro cycle complete. Take a long break.", [
          { text: 'Long Break', onPress: () => switchMode(TIMER_MODES.LONG_BREAK) },
          { text: 'Start Over', onPress: () => switchMode(TIMER_MODES.POMODORO) },
        ]);
      } else {
        setPomodoroRound(nextRound);
        Alert.alert('Session Done', `Round ${pomodoroRound} complete. Take a short break.`, [
          { text: 'Short Break', onPress: () => switchMode(TIMER_MODES.SHORT_BREAK) },
          { text: 'Continue', onPress: () => switchMode(TIMER_MODES.POMODORO) },
        ]);
      }
    } else {
      Alert.alert('Break Over', "Ready to get back to work?", [
        { text: "Start Focus", onPress: () => switchMode(TIMER_MODES.POMODORO) },
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
    Animated.timing(progressAnim, { toValue: progress, duration: 300, useNativeDriver: false }).start();
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

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FocusForge</Text>
          <Text style={styles.headerSub}>Round {pomodoroRound} / {settings?.pomodoroRounds || 4}</Text>
        </View>
        <TouchableOpacity
          style={styles.deepFocusBtn}
          onPress={() => { hapticLight(); navigation.navigate('DeepFocus', { duration: totalSeconds / 60, mode }); }}
        >
          <Text style={styles.deepFocusBtnText}>Deep Focus</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll} contentContainerStyle={styles.modeScrollContent}>
        {Object.values(TIMER_MODES).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => { switchMode(m); hapticLight(); }}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {MODE_LABELS[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Timer Circle */}
      <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
            stroke={Colors.bgHighlight} strokeWidth={8} fill="transparent"
          />
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
            stroke={Colors.primary} strokeWidth={8} fill="transparent"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" rotation="-90" origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.timerInner}>
          <Text style={styles.timerModeLabel}>{MODE_LABELS[mode].toUpperCase()}</Text>
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.timerStatus}>
            {isRunning ? 'In progress' : isPaused ? 'Paused' : 'Ready'}
          </Text>
        </View>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={reset}>
          <Text style={styles.ctrlBtnText}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={isRunning ? pause : start} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.playBtn}>
            <Text style={styles.playBtnText}>{isRunning ? '⏸' : '▶'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => { if (mode === TIMER_MODES.CUSTOM) setShowCustomModal(true); else { hapticLight(); switchMode(TIMER_MODES.POMODORO); } }}
        >
          <Text style={styles.ctrlBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Elapsed */}
      {(isRunning || isPaused) && sessionElapsed > 0 && (
        <View style={styles.elapsedBadge}>
          <Text style={styles.elapsedText}>+{formatMinutes(Math.floor(sessionElapsed / 60))} this session</Text>
        </View>
      )}

      {/* Quote */}
      <View style={styles.quoteCard}>
        <View style={styles.quoteBar} />
        <Text style={styles.quoteText}>{quote.text}</Text>
      </View>

      {/* Custom Duration Modal */}
      <Modal visible={showCustomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Duration</Text>
            <Text style={styles.modalSub}>Choose session length</Text>
            <View style={styles.minuteGrid}>
              {[15, 20, 25, 30, 45, 60, 90, 120].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.minuteBtn, customMinutes === min && styles.minuteBtnActive]}
                  onPress={() => { setCustomMinutes(min); hapticLight(); }}
                >
                  <Text style={[styles.minuteBtnText, customMinutes === min && styles.minuteBtnTextActive]}>{min}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => { setShowCustomModal(false); updateDuration(TIMER_MODES.CUSTOM, settings, customMinutes); hapticMedium(); }}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.confirmGrad}>
                <Text style={styles.confirmText}>Set Timer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: '500' },
  deepFocusBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  deepFocusBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  modeScroll: { maxHeight: 52 },
  modeScrollContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  modeBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  modeBtnActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.borderActive },
  modeBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  timerWrapper: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 28, width: CIRCLE_SIZE, height: CIRCLE_SIZE },
  timerInner: { position: 'absolute', alignItems: 'center' },
  timerModeLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2.5, marginBottom: 8 },
  timerText: { fontSize: width * 0.175, fontWeight: '700', letterSpacing: -4, color: Colors.textPrimary },
  timerStatus: { color: Colors.textMuted, fontSize: 13, marginTop: 12, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 4 },
  ctrlBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnText: { fontSize: 20, color: Colors.textSecondary },
  playBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { fontSize: 28, color: '#fff' },
  elapsedBadge: { alignSelf: 'center', marginTop: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: Colors.primarySubtle, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderActive },
  elapsedText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  quoteCard: { position: 'absolute', bottom: 40, left: 24, right: 24, flexDirection: 'row', gap: 14, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.border },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: Colors.primary, alignSelf: 'stretch' },
  quoteText: { flex: 1, color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgElevated, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 52, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  modalSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 28 },
  minuteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 28 },
  minuteBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  minuteBtnActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.borderActive },
  minuteBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  minuteBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  confirmBtn: { borderRadius: 16, overflow: 'hidden' },
  confirmGrad: { paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
