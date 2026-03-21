import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_PROFILE: '@focusforge:user_profile',
  FOCUS_SESSIONS: '@focusforge:focus_sessions',
  TASKS: '@focusforge:tasks',
  STATS: '@focusforge:stats',
  ACHIEVEMENTS: '@focusforge:achievements',
  ONBOARDING_DONE: '@focusforge:onboarding_done',
  SETTINGS: '@focusforge:settings',
  STREAK_DATA: '@focusforge:streak_data',
  FOCUS_SESSION_ACTIVE: '@focusforge:focus_session_active',
  BLOCKED_APPS: '@focusforge:blocked_apps',
};

// ─── Generic Helpers ─────────────────────────────────────────────────────────

const get = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error(`Storage.get error [${key}]:`, e);
    return null;
  }
};

const set = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Storage.set error [${key}]:`, e);
  }
};

const remove = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error(`Storage.remove error [${key}]:`, e);
  }
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const getUserProfile = () => get(KEYS.USER_PROFILE);
export const saveUserProfile = (profile) => set(KEYS.USER_PROFILE, profile);

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const isOnboardingDone = async () => {
  const val = await get(KEYS.ONBOARDING_DONE);
  return val === true;
};
export const setOnboardingDone = () => set(KEYS.ONBOARDING_DONE, true);

// ─── Focus Sessions ───────────────────────────────────────────────────────────

export const getFocusSessions = async () => {
  const sessions = await get(KEYS.FOCUS_SESSIONS);
  return sessions || [];
};

export const saveFocusSession = async (session) => {
  const sessions = await getFocusSessions();
  sessions.unshift(session); // newest first
  // Keep only last 365 days
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const filtered = sessions.filter((s) => s.timestamp > cutoff);
  await set(KEYS.FOCUS_SESSIONS, filtered);
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const getTasks = async () => {
  const tasks = await get(KEYS.TASKS);
  return tasks || [];
};

export const saveTasks = (tasks) => set(KEYS.TASKS, tasks);

// ─── Stats ────────────────────────────────────────────────────────────────────

const DEFAULT_STATS = {
  totalMinutes: 0,
  totalSessions: 0,
  tasksCompleted: 0,
  xp: 0,
  streak: 0,
  hasEarlySession: false,
  hasLateSession: false,
  lastSessionDate: null,
};

export const getStats = async () => {
  const stats = await get(KEYS.STATS);
  return { ...DEFAULT_STATS, ...(stats || {}) };
};

export const saveStats = (stats) => set(KEYS.STATS, stats);

export const addSessionToStats = async (durationMinutes) => {
  const stats = await getStats();
  const now = new Date();
  const today = now.toDateString();
  const hour = now.getHours();

  // Update streak
  const lastDate = stats.lastSessionDate;
  if (lastDate) {
    const last = new Date(lastDate);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // same day, no change
    } else if (diffDays === 1) {
      stats.streak += 1;
    } else {
      stats.streak = 1; // reset
    }
  } else {
    stats.streak = 1;
  }

  stats.totalMinutes += durationMinutes;
  stats.totalSessions += 1;
  stats.lastSessionDate = today;
  stats.xp += Math.floor(durationMinutes * 2);

  if (hour < 8) stats.hasEarlySession = true;
  if (hour >= 22) stats.hasLateSession = true;

  await saveStats(stats);
  return stats;
};

// ─── Achievements ─────────────────────────────────────────────────────────────

export const getUnlockedAchievements = async () => {
  const ach = await get(KEYS.ACHIEVEMENTS);
  return ach || [];
};

export const unlockAchievement = async (id) => {
  const unlocked = await getUnlockedAchievements();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    await set(KEYS.ACHIEVEMENTS, unlocked);
    return true;
  }
  return false;
};

// ─── Active Focus Session ─────────────────────────────────────────────────

export const setFocusSessionActive = (session) => set(KEYS.FOCUS_SESSION_ACTIVE, session);
export const getFocusSessionActive = () => get(KEYS.FOCUS_SESSION_ACTIVE);
export const clearFocusSession = () => remove(KEYS.FOCUS_SESSION_ACTIVE);

// ─── Streak Penalty ───────────────────────────────────────────────────────

export const penalizeStreak = async () => {
  const stats = await getStats();
  stats.streak = Math.max(0, stats.streak - 1);
  await saveStats(stats);
  return stats;
};

// ─── Blocked Apps ─────────────────────────────────────────────────────────

const DEFAULT_BLOCKED_APPS = [
  { packageName: 'com.instagram.android', label: 'Instagram', blocked: false },
  { packageName: 'com.whatsapp', label: 'WhatsApp', blocked: false },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok', blocked: false },
  { packageName: 'com.google.android.youtube', label: 'YouTube', blocked: false },
  { packageName: 'com.snapchat.android', label: 'Snapchat', blocked: false },
  { packageName: 'com.twitter.android', label: 'Twitter / X', blocked: false },
  { packageName: 'com.reddit.frontpage', label: 'Reddit', blocked: false },
  { packageName: 'com.facebook.katana', label: 'Facebook', blocked: false },
];

export const getBlockedApps = async () => {
  const apps = await get(KEYS.BLOCKED_APPS);
  return apps || DEFAULT_BLOCKED_APPS;
};

export const saveBlockedApps = (apps) => set(KEYS.BLOCKED_APPS, apps);

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  pomodoroWork: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroRounds: 4,
  dailyGoalHours: 2,
  notifications: true,
  haptics: true,
  autoStartBreaks: false,
  autoStartWork: false,
  appBlockingEnabled: false,
};

export const getSettings = async () => {
  const settings = await get(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
};

export const saveSettings = (settings) => set(KEYS.SETTINGS, settings);

// ─── Streak Data (day-by-day) ─────────────────────────────────────────────────

export const getStreakData = async () => {
  const data = await get(KEYS.STREAK_DATA);
  return data || {};
};

export const addFocusMinutesToDate = async (date, minutes) => {
  const data = await getStreakData();
  const key = date; // 'YYYY-MM-DD'
  data[key] = (data[key] || 0) + minutes;
  await set(KEYS.STREAK_DATA, data);
};
