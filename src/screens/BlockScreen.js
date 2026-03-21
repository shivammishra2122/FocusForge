import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

/**
 * BlockScreen — displayed when a blocked app is opened during a focus session.
 * In a native dev build, this is launched from BlockingActivity.
 * In Expo Go, it can be navigated to manually as a demo.
 */
export default function BlockScreen({ navigation, route }) {
  const appName = route?.params?.appName || 'that app';
  const minutesLeft = route?.params?.minutesLeft || 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Lock icon */}
      <View style={styles.lockCircle}>
        <Text style={styles.lockIcon}>🔒</Text>
      </View>

      <Text style={styles.heading}>Focus Session Active</Text>

      <Text style={styles.subtext}>
        <Text style={styles.appName}>{appName}</Text> is blocked during your session.{'\n'}
        Stay focused — you're building discipline.
      </Text>

      {minutesLeft > 0 && (
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>SESSION ENDS IN</Text>
          <Text style={styles.timeValue}>{minutesLeft} min</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.returnBtn}
        onPress={() => navigation?.goBack?.()}
        activeOpacity={0.85}
      >
        <Text style={styles.returnBtnText}>Return to FocusForge</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        You chose to block this app. Your future self thanks you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  lockIcon: {
    fontSize: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  appName: {
    fontWeight: '700',
    color: Colors.primary,
  },
  timeBox: {
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  returnBtn: {
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
  },
  returnBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});
