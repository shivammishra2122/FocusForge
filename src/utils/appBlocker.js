/**
 * App Blocker Bridge
 *
 * JS interface for the native Android app-blocking module.
 * On iOS (or when native module unavailable), all functions are safe no-ops.
 */
import { NativeModules, Platform, Linking } from 'react-native';

const isAndroid = Platform.OS === 'android';
const NativeBlocker = NativeModules.AppBlockerModule;

/**
 * Start blocking the given list of package names.
 * Requires active focus session and Usage Access permission on Android.
 */
export const startBlocking = async (blockedPackages) => {
  if (!isAndroid || !NativeBlocker) return;
  try {
    await NativeBlocker.startBlocking(blockedPackages || []);
  } catch (e) {
    console.warn('[AppBlocker] startBlocking failed:', e.message);
  }
};

/**
 * Stop the blocking service.
 */
export const stopBlocking = async () => {
  if (!isAndroid || !NativeBlocker) return;
  try {
    await NativeBlocker.stopBlocking();
  } catch (e) {
    console.warn('[AppBlocker] stopBlocking failed:', e.message);
  }
};

/**
 * Check if the app has Usage Access permission.
 */
export const hasUsagePermission = async () => {
  if (!isAndroid || !NativeBlocker) return false;
  try {
    return await NativeBlocker.hasUsagePermission();
  } catch (e) {
    return false;
  }
};

/**
 * Open Android Usage Access settings screen.
 */
export const openUsageSettings = async () => {
  if (!isAndroid) return;
  if (!NativeBlocker) {
    // Fallback when native module isn't available yet
    Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS').catch(() => Linking.openSettings());
    return;
  }
  try {
    await NativeBlocker.openUsageSettings();
  } catch (e) {
    // Fallback: open generic settings
    Linking.openSettings();
  }
};

/**
 * Check if the native module is available (only true in dev builds, not Expo Go).
 */
export const isNativeBlockerAvailable = () => {
  return isAndroid && !!NativeBlocker;
};
