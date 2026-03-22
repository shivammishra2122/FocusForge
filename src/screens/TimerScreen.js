import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated,
  Alert, TextInput, Modal, ScrollView, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as KeepAwake from 'expo-keep-awake';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getStats, getUserProfile, getSettings, addSessionToStats, saveFocusSession, addFocusMinutesToDate, getFocusSessionActive } from '../utils/storage';
import { formatTime, formatMinutes, hapticLight, hapticMedium, hapticSuccess, scheduleBreakReminder, getTodayKey } from '../utils/helpers';
import { CATEGORIES, getCategoryById } from '../constants/categories';
import { SOUNDS, getSoundById } from '../constants/sounds';

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

const TIMER_MODES = { POMODORO: 'pomodoro', SHORT_BREAK: 'short_break', LONG_BREAK: 'long_break', CUSTOM: 'custom' };
const MODE_LABELS = { pomodoro: 'Focus', short_break: 'Short Break', long_break: 'Long Break', custom: 'Custom' };

export default function TimerScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState(TIMER_MODES.POMODORO);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pomodoroRound, setPomodoroRound] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionNote, setReflectionNote] = useState('');
  const [sessionDataToSave, setSessionDataToSave] = useState(null);
  
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0].id);
  const [soundObject, setSoundObject] = useState(null);
  
  const intervalRef = useRef(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const active = await getFocusSessionActive();
    if (active && active.startedAt && active.durationMin) {
      const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
      const remainingSec = (active.durationMin * 60) - elapsedSec;
      if (remainingSec > 0) {
        navigation.navigate('DeepFocus', {
          duration: active.durationMin,
          mode: active.mode,
          category: CATEGORIES[0].id,
        });
        return;
      }
    }
    
    const [p, s] = await Promise.all([getUserProfile(), getSettings()]);
    setProfile(p);
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
  };

  const loadAndPlaySound = async (soundId = selectedSound) => {
    try {
      if (soundObject) { await soundObject.unloadAsync(); setSoundObject(null); }
      const s = getSoundById(soundId);
      if (!s || !s.url) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri: s.url }, { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      setSoundObject(sound);
    } catch (err) {}
  };

  const stopSound = async () => {
    if (soundObject) {
      try { await soundObject.stopAsync(); await soundObject.unloadAsync(); setSoundObject(null); } catch (e) {}
    }
  };

  const toggleSoundPlay = async (play) => {
    if (soundObject) {
      try { if (play) await soundObject.playAsync(); else await soundObject.pauseAsync(); } catch (e) {}
    } else if (play && selectedSound !== 'NONE') {
      await loadAndPlaySound();
    }
  };

  useEffect(() => { return () => { stopSound(); }; }, []);

  const start = () => {
    if (mode === TIMER_MODES.POMODORO || mode === TIMER_MODES.CUSTOM) {
      hapticMedium();
      const durationMins = mode === TIMER_MODES.CUSTOM ? customMinutes : getModeSeconds(mode, settings) / 60;
      navigation.navigate('DeepFocus', {
        duration: durationMins,
        mode: mode,
        category: selectedCategory,
        soundId: selectedSound
      });
    } else {
      setIsRunning(true); setIsPaused(false); hapticMedium();
      toggleSoundPlay(true);
      KeepAwake.activateKeepAwakeAsync();
    }
  };

  const pause = () => {
    setIsRunning(false); setIsPaused(true); hapticLight();
    toggleSoundPlay(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const reset = () => {
    setIsRunning(false); setIsPaused(false); hapticLight();
    stopSound();
    if (intervalRef.current) clearInterval(intervalRef.current);
    updateDuration(mode);
    setSessionElapsed(0);
    KeepAwake.deactivateKeepAwake();
  };

  const handleSessionComplete = async () => {
    hapticSuccess(); KeepAwake.deactivateKeepAwake();
    setIsRunning(false); stopSound();
    const durationMin = Math.floor(totalSeconds / 60);
    const now = Date.now();
    setSessionDataToSave({ id: now.toString(), mode, durationMinutes: durationMin, timestamp: now, round: pomodoroRound, category: selectedCategory });
    setShowReflectionModal(true);
  };

  const saveReflectionAndFinish = async () => {
    if (!sessionDataToSave) return;
    const { durationMinutes: durationMin, mode: sMode } = sessionDataToSave;
    await addSessionToStats(durationMin);
    await addFocusMinutesToDate(getTodayKey(), durationMin);
    await saveFocusSession({ ...sessionDataToSave, note: reflectionNote.trim() });
    setShowReflectionModal(false); setReflectionNote('');

    if (settings?.notifications) { await scheduleBreakReminder(sMode === TIMER_MODES.POMODORO ? settings?.pomodoroShortBreak : 0); }
    
    if (sMode === TIMER_MODES.POMODORO) {
      const nextRound = pomodoroRound + 1;
      if (nextRound > (settings?.pomodoroRounds || 4)) {
        setPomodoroRound(1);
        Alert.alert('Cycle Complete', "Take a long break.", [{ text: 'Long Break', onPress: () => switchMode(TIMER_MODES.LONG_BREAK) }, { text: 'Start Over', onPress: () => switchMode(TIMER_MODES.POMODORO) }]);
      } else {
        setPomodoroRound(nextRound);
        Alert.alert('Session Done', `Round ${pomodoroRound} complete.`, [{ text: 'Short Break', onPress: () => switchMode(TIMER_MODES.SHORT_BREAK) }, { text: 'Continue', onPress: () => switchMode(TIMER_MODES.POMODORO) }]);
      }
    } else {
      Alert.alert('Break Over', "Ready to get back to work?", [{ text: "Start Focus", onPress: () => switchMode(TIMER_MODES.POMODORO) }]);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode); updateDuration(newMode); setIsRunning(false); setIsPaused(false); setSessionElapsed(0);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) { clearInterval(intervalRef.current); handleSessionComplete(); return 0; }
          setSessionElapsed((e) => e + 1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Pseudorandom stats for active session (based on round/elapsed)
  const effScore = Math.min(100, Math.max(82, 94 - Math.floor(sessionElapsed / 600) + (pomodoroRound * 2)));
  const focusIndex = (0.82 + (pomodoroRound * 0.05) - (Math.floor(sessionElapsed / 1200) * 0.02)).toFixed(2);

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
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
           <Image source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.profileImg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Current Mission */}
        <View style={styles.missionWrapper}>
          <Text style={styles.labelMuted}>CURRENT MISSION</Text>
          <Text style={styles.missionTitle}>{getCategoryById(selectedCategory).label} Module</Text>
        </View>

        {/* Main Timer Card */}
        <View style={styles.timerCard}>
          <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isRunning ? Theme.primary : isPaused ? Theme.error : Theme.onSurfaceVariant }]} />
            <Text style={styles.statusText}>
              {isRunning ? 'DEEP WORK ACTIVE' : isPaused ? 'NEXUS PAUSED' : 'SYSTEM READY'}
            </Text>
          </View>

          {/* Dynamic Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>EFFICIENCY</Text>
              <View style={styles.statValRow}>
                <Text style={styles.statVal}>{effScore}%</Text>
                <MaterialCommunityIcons name="trending-up" size={16} color={Theme.primary} />
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>FOCUS INDEX</Text>
              <View style={styles.statValRow}>
                <Text style={styles.statVal}>{focusIndex}</Text>
                <Text style={styles.statUnit}>PKL</Text>
              </View>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={isRunning ? pause : isPaused ? start : start}
          >
            <LinearGradient
              colors={isRunning ? [Theme.tertiary, Theme.primary] : [Theme.primaryVariant, Theme.primary]}
              start={{x: 0, y: 0}} end={{x: 1, y: 1}}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>
                {isRunning ? 'Pause Session' : isPaused ? 'Resume Session' : 'Start Sequence'}
                <MaterialCommunityIcons name="arrow-right" size={16} style={{ marginLeft: 8 }} />
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Action */}
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={isRunning || isPaused ? reset : () => switchMode(TIMER_MODES.POMODORO)}
          >
            <Text style={styles.secondaryText}>
              {isRunning || isPaused ? 'ABORT PROTOCOL' : `CYCLE: ${pomodoroRound} OF ${settings?.pomodoroRounds || 4}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Config Row (Hidden when running) */}
        {!isRunning && !isPaused && (
          <View style={styles.configSection}>
            <Text style={styles.configLabel}>PARAMETERS</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.configScroll}>
              {Object.values(TIMER_MODES).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pillBtn, mode === m && styles.pillActive]}
                  onPress={() => { switchMode(m); hapticLight(); }}
                >
                  <Text style={[styles.pillText, mode === m && styles.pillTextActive]}>{MODE_LABELS[m]}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.pillBtn} onPress={() => { setShowCustomModal(true); hapticLight(); }}>
                <Text style={styles.pillText}>⚙ Edit</Text>
              </TouchableOpacity>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.configScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pillBtn, selectedCategory === cat.id && styles.pillActive]}
                  onPress={() => { setSelectedCategory(cat.id); hapticLight(); }}
                >
                  <MaterialCommunityIcons name={cat.icon} size={14} color={selectedCategory === cat.id ? Theme.primary : Theme.onSurfaceVariant} style={{ marginRight: 6 }} />
                  <Text style={[styles.pillText, selectedCategory === cat.id && styles.pillTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.configScroll}>
              {SOUNDS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pillBtn, selectedSound === s.id && styles.pillActive]}
                  onPress={() => { setSelectedSound(s.id); hapticLight(); }}
                >
                  <Text style={[styles.pillText, selectedSound === s.id && styles.pillTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Custom Duration Modal */}
      <Modal visible={showCustomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Duration</Text>
            <View style={styles.minuteGrid}>
              {[15, 20, 25, 30, 45, 60, 90, 120].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.minuteBtn, customMinutes === min && { backgroundColor: Theme.surfaceHigh, borderColor: Theme.primary }]}
                  onPress={() => { setCustomMinutes(min); hapticLight(); }}
                >
                  <Text style={[styles.minuteText, customMinutes === min && { color: Theme.primary }]}>{min}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => { setShowCustomModal(false); updateDuration(TIMER_MODES.CUSTOM, settings, customMinutes); hapticMedium(); }}>
              <LinearGradient colors={[Theme.primaryVariant, Theme.primary]} style={styles.saveBtnGrad}><Text style={styles.saveText}>Set Protocol Duration</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reflection Modal */}
      <Modal visible={showReflectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Session Complete!</Text>
            <Text style={styles.modalSub}>Document your progress.</Text>
            <TextInput
              style={styles.input} placeholder="Notes..." placeholderTextColor={Theme.onSurfaceVariant}
              multiline numberOfLines={3} value={reflectionNote} onChangeText={setReflectionNote}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReflectionNote(''); saveReflectionAndFinish(); }}><Text style={styles.cancelText}>Skip</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveReflectionAndFinish}><LinearGradient colors={[Theme.primaryVariant, Theme.primary]} style={styles.saveBtnGrad}><Text style={styles.saveText}>Save Sync</Text></LinearGradient></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  scroll: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' },

  // Mission Title
  missionWrapper: { alignItems: 'center', marginBottom: 24 },
  labelMuted: { fontSize: 10, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '600', marginBottom: 6 },
  missionTitle: { fontSize: 24, fontWeight: '700', color: Theme.onSurface, textAlign: 'center', letterSpacing: -0.5 },

  // Timer Card
  timerCard: { width: '100%', backgroundColor: Theme.surface, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: Theme.border, alignItems: 'center' },
  timeText: { fontSize: width * 0.22, fontWeight: '200', color: Theme.primary, letterSpacing: -4, lineHeight: width * 0.25 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16, backgroundColor: 'rgba(192,193,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 1.5 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%', marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: Theme.surfaceHigh, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(71,70,74,0.2)' },
  statLabel: { fontSize: 9, color: Theme.onSurfaceVariant, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  statValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statVal: { fontSize: 20, fontWeight: '700', color: Theme.onSurface },
  statUnit: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700' },

  actionBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  actionGradient: { width: '100%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#000', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },

  secondaryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryText: { color: Theme.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // Config Section
  configSection: { width: '100%', marginTop: 32 },
  configLabel: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '600', letterSpacing: 2, marginBottom: 16, marginLeft: 4 },
  configScroll: { marginBottom: 12 },
  pillBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Theme.surface, borderWidth: 1, borderColor: Theme.border, marginRight: 8 },
  pillActive: { backgroundColor: 'rgba(192,193,255,0.1)', borderColor: 'rgba(192,193,255,0.2)' },
  pillText: { fontSize: 12, color: Theme.onSurfaceVariant, fontWeight: '500' },
  pillTextActive: { color: Theme.primary, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Theme.surfaceHigh, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 52 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.onSurface, marginBottom: 8 },
  modalSub: { fontSize: 13, color: Theme.onSurfaceVariant, marginBottom: 20 },
  minuteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 },
  minuteBtn: { width: '22%', aspectRatio: 1, borderRadius: 12, borderWidth: 1, borderColor: Theme.border, alignItems: 'center', justifyContent: 'center' },
  minuteText: { fontSize: 14, color: Theme.onSurfaceVariant, fontWeight: '600' },
  input: { backgroundColor: Theme.surface, borderRadius: 12, padding: 16, color: Theme.onSurface, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: Theme.border },
  cancelBtn: { flex: 1, paddingVertical: 16, borderWidth: 1, borderColor: Theme.border, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: Theme.onSurfaceVariant, fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#000', fontWeight: '700' },
});
