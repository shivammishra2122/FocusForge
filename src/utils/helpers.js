import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// ─── Haptics ──────────────────────────────────────────────────────────────────

export const hapticLight = async (enabled = true) => {
  if (!enabled || Platform.OS === 'web') return;
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
};

export const hapticMedium = async (enabled = true) => {
  if (!enabled || Platform.OS === 'web') return;
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
};

export const hapticHeavy = async (enabled = true) => {
  if (!enabled || Platform.OS === 'web') return;
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (_) {}
};

export const hapticSuccess = async (enabled = true) => {
  if (!enabled || Platform.OS === 'web') return;
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
};

// ─── Notifications ────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleBreakReminder = async (minutes) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧠 Focus Session Complete!',
      body: `Great work! Time for a ${minutes}-minute break. You've earned it.`,
      sound: true,
    },
    trigger: null, // immediate
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ─── Time Formatting ──────────────────────────────────────────────────────────

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatHours = (minutes) => {
  return (minutes / 60).toFixed(1) + 'h';
};

export const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getLastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
};

export const getDayLabel = (dateKey) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [y, m, d] = dateKey.split('-').map(Number);
  return days[new Date(y, m - 1, d).getDay()];
};
