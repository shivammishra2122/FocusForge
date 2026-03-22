import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

export default function BlockScreen({ navigation, route }) {
  const appName = route?.params?.appName || 'Target Application';
  const minutesLeft = route?.params?.minutesLeft || 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.iconContainer}>
        <View style={styles.iconPulseBg}>
          <MaterialCommunityIcons name="shield-lock" size={48} color={Theme.primary} />
        </View>
      </View>

      <Text style={styles.heading}>PROTOCOL ACTIVE</Text>

      <Text style={styles.subtext}>
        Endpoint <Text style={styles.appName}>{appName}</Text> has been restricted.{'\n'}
        Please return to your active focus session.
      </Text>

      {minutesLeft > 0 && (
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>SYSTEM UPTIME REMAINING</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeValue}>{minutesLeft}</Text>
            <Text style={styles.timeUnit}>MIN</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.returnBtn}
        onPress={() => navigation?.goBack?.()}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Theme.secondary, Theme.primaryVariant]}
          style={styles.returnGrad}
          start={{x:0, y:0}} end={{x:1, y:1}}
        >
          <Text style={styles.returnBtnText}>RETURN TO FOCUS</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  
  iconContainer: { marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
  iconPulseBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(192, 193, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(192, 193, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  
  heading: { fontSize: 28, fontWeight: '800', color: Theme.onSurface, marginBottom: 16, textAlign: 'center', letterSpacing: -1 },
  subtext: { fontSize: 13, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 16 },
  appName: { fontWeight: '700', color: Theme.primary },
  
  timeBox: { alignItems: 'center', backgroundColor: Theme.surface, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 32, width: '100%', borderWidth: 1, borderColor: Theme.border, marginBottom: 40 },
  timeLabel: { fontSize: 10, color: Theme.onSurfaceVariant, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  timeValue: { fontSize: 44, fontWeight: '300', color: Theme.primary, lineHeight: 48 },
  timeUnit: { fontSize: 14, color: Theme.onSurfaceVariant, fontWeight: '600', paddingBottom: 6 },
  
  returnBtn: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  returnGrad: { paddingVertical: 16, alignItems: 'center' },
  returnBtnText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
});
