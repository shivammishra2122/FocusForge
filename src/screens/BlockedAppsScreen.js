import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getBlockedApps, saveBlockedApps } from '../utils/storage';
import { hapticLight } from '../utils/helpers';
import { isNativeBlockerAvailable, hasUsagePermission, openUsageSettings } from '../utils/appBlocker';

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

const APP_DATA = {
  'com.instagram.android':  { icon: 'instagram',           color: '#E1306C', bg: '#E1306C' },
  'com.whatsapp':           { icon: 'whatsapp',            color: '#25D366', bg: '#25D366' },
  'com.zhiliaoapp.musically':{ icon: 'music-note',         color: '#010101', bg: '#69C9D0' },
  'com.google.android.youtube': { icon: 'youtube',        color: '#FF0000', bg: '#FF0000' },
  'com.snapchat.android':   { icon: 'snapchat',            color: '#FFFC00', bg: '#FFFC00' },
  'com.twitter.android':    { icon: 'twitter',             color: '#1DA1F2', bg: '#1DA1F2' },
  'com.reddit.frontpage':   { icon: 'reddit',              color: '#FF4500', bg: '#FF4500' },
  'com.facebook.katana':    { icon: 'facebook',            color: '#1877F2', bg: '#1877F2' },
  'com.google.android.gm':  { icon: 'gmail',              color: '#D44638', bg: '#D44638' },
  'com.netflix.mediaclient': { icon: 'netflix',            color: '#E50914', bg: '#E50914' },
};

const AppIconBadge = ({ packageName, size = 44 }) => {
  const data = APP_DATA[packageName];
  if (!data) {
    return (
      <View style={[styles.iconBadge, { backgroundColor: Theme.surfaceHigh, width: size, height: size, borderRadius: size / 2 }]}>
        <MaterialCommunityIcons name="cellphone" size={size * 0.5} color={Theme.onSurfaceVariant} />
      </View>
    );
  }
  return (
    <View style={[styles.iconBadge, { backgroundColor: data.bg + '15', width: size, height: size, borderRadius: size / 2, borderColor: data.bg + '30' }]}>
      <MaterialCommunityIcons name={data.icon} size={size * 0.52} color={data.color} />
    </View>
  );
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

  const handleGrant = async () => {
    hapticLight();
    await openUsageSettings();
    setTimeout(async () => {
      const perm = await hasUsagePermission();
      setPermissionGranted(perm);
    }, 1500);
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Theme.onSurface} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Endpoints</Text>
            <Text style={styles.headerSub}>{blockedCount} block{blockedCount !== 1 ? 's' : ''} active</Text>
          </View>
          <View style={[styles.blockedBadge, blockedCount > 0 && { borderColor: Theme.primaryVariant }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={16} color={blockedCount > 0 ? Theme.primary : Theme.onSurfaceVariant} />
            <Text style={[styles.blockedBadgeText, blockedCount > 0 && { color: Theme.primary }]}>{blockedCount}</Text>
          </View>
        </View>

        {/* Permission card */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            activeOpacity={permissionGranted ? 1 : 0.7}
            onPress={!permissionGranted ? handleGrant : null}
          >
            <View style={[styles.permCard, permissionGranted ? { borderColor: Theme.border } : { borderColor: Theme.error + '40' }]}>
              <View style={[styles.permIconWrap, { backgroundColor: permissionGranted ? Theme.surfaceHigh : Theme.error + '20' }]}>
                <MaterialCommunityIcons
                  name={permissionGranted ? 'shield-check' : 'alert-decagram'}
                  size={24}
                  color={permissionGranted ? Theme.primary : Theme.error}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>
                  {permissionGranted ? 'System Access Valid' : 'System Access Required'}
                </Text>
                <Text style={styles.permSub}>
                  {permissionGranted
                    ? 'Endpoint blocking is operational'
                    : 'Tap to configure system permissions'}
                </Text>
              </View>
              {!permissionGranted && (
                <View style={[styles.grantBtn, { backgroundColor: Theme.error }]}>
                  <Text style={styles.grantBtnText}>Grant</Text>
                  <MaterialCommunityIcons name="chevron-right" size={14} color="#000" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Dev build warning */}
        {Platform.OS === 'android' && !nativeAvailable && (
          <View style={[styles.warningCard, { borderColor: '#F59E0B40' }]}>
            <View style={styles.warningIconWrap}>
              <MaterialCommunityIcons name="information" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.warningText}>
              Native blocking requires a <Text style={styles.code}>expo run:android</Text> build. Exgo Go provides simulated blocking.
            </Text>
          </View>
        )}

        {Platform.OS === 'ios' && (
          <View style={styles.warningCard}>
            <View style={styles.warningIconWrap}>
              <MaterialCommunityIcons name="apple" size={20} color={Theme.onSurfaceVariant} />
            </View>
            <Text style={styles.warningText}>
              iOS prevents native blocking. System will enforce streak penalties contextually.
            </Text>
          </View>
        )}

        {/* Section Header */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Targets</Text>
          <Text style={styles.sectionSub}>Toggle disruption sources</Text>
        </View>

        {/* App List */}
        <View style={styles.appList}>
          {apps.map((app, i) => (
            <View key={app.packageName}>
              <View style={styles.appRow}>
                <AppIconBadge packageName={app.packageName} />
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.label}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Switch
                  value={app.blocked}
                  onValueChange={() => toggleApp(app.packageName)}
                  trackColor={{ false: Theme.surfaceHighest, true: Theme.primaryVariant + '80' }}
                  thumbColor={app.blocked ? Theme.primary : Theme.onSurfaceVariant}
                  ios_backgroundColor={Theme.surfaceHighest}
                />
              </View>
              {i < apps.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Blocked endpoints will redirect to the Focus Protocol active module.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  scroll: { paddingHorizontal: 24 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.surfaceHigh, borderWidth: 1, borderColor: Theme.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Theme.onSurface, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: Theme.onSurfaceVariant, marginTop: 4 },
  blockedBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Theme.border, flexDirection: 'row', gap: 6 },
  blockedBadgeText: { fontSize: 14, fontWeight: '700', color: Theme.onSurfaceVariant },

  permCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Theme.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  permIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 13, fontWeight: '700', color: Theme.onSurface, textTransform: 'uppercase', letterSpacing: 1 },
  permSub: { fontSize: 12, color: Theme.onSurfaceVariant, marginTop: 4, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  grantBtnText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 1 },

  warningCard: { flexDirection: 'row', gap: 16, backgroundColor: Theme.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Theme.border, alignItems: 'center' },
  warningIconWrap: { },
  warningText: { flex: 1, fontSize: 12, color: Theme.onSurfaceVariant, lineHeight: 20 },
  code: { fontWeight: '700', color: Theme.primaryVariant },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5 },
  sectionSub: { fontSize: 11, color: Theme.onSurfaceVariant },

  appList: { backgroundColor: Theme.surface, borderRadius: 24, borderWidth: 1, borderColor: Theme.border, overflow: 'hidden', marginBottom: 24 },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 16 },
  iconBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontWeight: '600', color: Theme.onSurface },
  appPkg: { fontSize: 11, color: Theme.onSurfaceVariant, marginTop: 4 },
  divider: { height: 1, backgroundColor: Theme.border, marginHorizontal: 20 },

  footerNote: { fontSize: 11, color: Theme.onSurfaceVariant, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24, fontStyle: 'italic' },
});
