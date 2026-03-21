import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getBlockedApps, saveBlockedApps } from '../utils/storage';
import { hapticLight } from '../utils/helpers';
import { isNativeBlockerAvailable, hasUsagePermission, openUsageSettings } from '../utils/appBlocker';

const APP_ICONS = {
  'com.instagram.android': '📸',
  'com.whatsapp': '💬',
  'com.zhiliaoapp.musically': '🎵',
  'com.google.android.youtube': '▶️',
  'com.snapchat.android': '👻',
  'com.twitter.android': '🐦',
  'com.reddit.frontpage': '🔶',
  'com.facebook.katana': '👤',
};

export default function BlockedAppsScreen({ navigation }) {
  const [apps, setApps] = useState([]);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    const a = await getBlockedApps();
    setApps(a);
    setNativeAvailable(isNativeBlockerAvailable());
    if (Platform.OS === 'android') {
      const perm = await hasUsagePermission();
      setPermissionGranted(perm);
    }
  };

  const toggleApp = async (packageName) => {
    hapticLight();
    const updated = apps.map((a) =>
      a.packageName === packageName ? { ...a, blocked: !a.blocked } : a
    );
    setApps(updated);
    await saveBlockedApps(updated);
  };

  const blockedCount = apps.filter((a) => a.blocked).length;

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Blocked Apps</Text>
            <Text style={styles.headerSub}>{blockedCount} app{blockedCount !== 1 ? 's' : ''} blocked during focus</Text>
          </View>
        </View>

        {/* Permission status */}
        {Platform.OS === 'android' && (
          <View style={[styles.permCard, permissionGranted ? styles.permGranted : styles.permDenied]}>
            <View style={styles.permLeft}>
              <Text style={styles.permIcon}>{permissionGranted ? '✓' : '⚠️'}</Text>
              <View>
                <Text style={styles.permTitle}>
                  {permissionGranted ? 'Usage Access Granted' : 'Usage Access Required'}
                </Text>
                <Text style={styles.permSub}>
                  {permissionGranted
                    ? 'App blocking is ready to use'
                    : 'Needed to detect which app is open'}
                </Text>
              </View>
            </View>
            {!permissionGranted && (
              <TouchableOpacity style={styles.permBtn} onPress={openUsageSettings}>
                <Text style={styles.permBtnText}>Grant</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expo Go warning */}
        {Platform.OS === 'android' && !nativeAvailable && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>📱</Text>
            <Text style={styles.warningText}>
              Native blocking requires a dev build. In Expo Go, blocking is simulated.
              Run <Text style={styles.code}>npx expo run:android</Text> for real blocking.
            </Text>
          </View>
        )}

        {/* iOS notice */}
        {Platform.OS === 'ios' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>🍎</Text>
            <Text style={styles.warningText}>
              iOS doesn't support real app blocking. A streak penalty will be applied if you leave the app during a focus session.
            </Text>
          </View>
        )}

        {/* App List */}
        <Text style={styles.sectionTitle}>Distracting Apps</Text>
        <View style={styles.appList}>
          {apps.map((app, i) => (
            <View key={app.packageName}>
              <View style={styles.appRow}>
                <View style={styles.appLeft}>
                  <Text style={styles.appIcon}>{APP_ICONS[app.packageName] || '📱'}</Text>
                  <View>
                    <Text style={styles.appName}>{app.label}</Text>
                    <Text style={styles.appPkg}>{app.packageName}</Text>
                  </View>
                </View>
                <Switch
                  value={app.blocked}
                  onValueChange={() => toggleApp(app.packageName)}
                  trackColor={{ false: Colors.bgHighlight, true: Colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={Colors.bgHighlight}
                />
              </View>
              {i < apps.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Blocked apps will be inaccessible during focus sessions.
          You can change this list anytime.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  scroll: { paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: Colors.textPrimary, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  permCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  permGranted: { backgroundColor: Colors.accent + '10', borderColor: Colors.accent + '30' },
  permDenied: { backgroundColor: Colors.danger + '10', borderColor: Colors.danger + '30' },
  permLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  permIcon: { fontSize: 20 },
  permTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  permSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  warningCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  code: { fontWeight: '700', color: Colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  appList: { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 20 },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  appLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appIcon: { fontSize: 24 },
  appName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  appPkg: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  footerNote: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
