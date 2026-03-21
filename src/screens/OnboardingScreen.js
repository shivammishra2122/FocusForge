import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  TextInput,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { saveUserProfile, setOnboardingDone, saveSettings, getSettings } from '../utils/storage';
import { hapticLight, hapticMedium } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🧠',
    title: 'Build Laser Focus',
    subtitle: 'FocusForge helps you crush distractions and unlock your full potential — one session at a time.',
    bg: ['#0D1220', '#0D0F14'],
    accent: Colors.primary,
  },
  {
    id: '2',
    emoji: '⏱️',
    title: 'Pomodoro Powered',
    subtitle: 'Use science-backed techniques to get more done in less time. Work in focused bursts, recharge, repeat.',
    bg: ['#0D1A18', '#0D0F14'],
    accent: Colors.accent,
  },
  {
    id: '3',
    emoji: '🔥',
    title: 'Build Unstoppable Streaks',
    subtitle: 'Track your daily progress, earn XP, level up and unlock achievements as you crush your goals.',
    bg: ['#1A0D12', '#0D0F14'],
    accent: Colors.secondary,
  },
  {
    id: '4',
    emoji: '🎯',
    title: 'Set Your Goal',
    subtitle: '',
    bg: ['#0D1220', '#0D0F14'],
    accent: Colors.accentWarm,
    isGoal: true,
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [name, setName] = useState('');
  const [goalHours, setGoalHours] = useState('2');
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = async () => {
    hapticLight();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    hapticMedium();
    const hours = parseFloat(goalHours) || 2;
    await saveUserProfile({ name: name.trim() || 'Focused Student', goalHours: hours });
    const settings = await getSettings();
    await saveSettings({ ...settings, dailyGoalHours: hours });
    await setOnboardingDone();
    onComplete();
  };

  const renderSlide = ({ item }) => (
    <LinearGradient colors={item.bg} style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={[styles.emojiContainer, { borderColor: item.accent + '55', backgroundColor: item.accent + '15' }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {!item.isGoal ? (
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        ) : (
          <View style={styles.goalContainer}>
            <Text style={styles.subtitle}>Tell us about yourself to personalize your experience.</Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name..."
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Daily Focus Goal (hours)</Text>
              <View style={styles.hoursRow}>
                {['1', '2', '3', '4', '5', '6'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourBtn,
                      goalHours === h && { backgroundColor: item.accent, borderColor: item.accent },
                    ]}
                    onPress={() => { setGoalHours(h); hapticLight(); }}
                  >
                    <Text style={[styles.hourBtnText, goalHours === h && { color: '#fff' }]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === currentIndex ? slide.accent : Colors.textMuted }]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? "LET'S FORGE! 🔥" : 'NEXT →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  slide: { width, height, justifyContent: 'center', alignItems: 'center' },
  slideContent: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
  emojiContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  emoji: { fontSize: 52 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 12,
  },
  goalContainer: { width: '100%', alignItems: 'center' },
  inputSection: { width: '100%', marginTop: 20 },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hourBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
  },
  hourBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  dotsContainer: { position: 'absolute', bottom: 120, flexDirection: 'row', gap: 8, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttonContainer: { position: 'absolute', bottom: 48, left: 32, right: 32 },
  button: { paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
});
