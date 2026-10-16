import { supabase } from '../config/supabase';
import apiClient from './apiClient';
import {
  getUserProfile,
  getTasks,
  getStats,
  getUnlockedAchievements,
  getStreakData,
  getSettings,
  saveUserProfile,
  saveTasks,
  saveStats,
  getFocusSessions,
  saveFocusSessions,
  saveUnlockedAchievements,
  saveStreakData,
  saveSettings,
} from './storage';

/**
 * Identify which cloud synchronization provider is currently active
 * Priority: FocusForge Custom Backend API -> Supabase -> None
 */
export const getActiveCloudProvider = async () => {
  try {
    const isBackendAuthed = await apiClient.isAuthenticated();
    if (isBackendAuthed) {
      return 'backend';
    }

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return 'supabase';
      }
    }
  } catch (err) {
    console.warn('[CloudSync] Error determining active provider:', err.message);
  }

  return 'none';
};

/**
 * Pushes local data snapshot to cloud database.
 * Dual-sync engine: Attempts custom FocusForge backend first; falls back to Supabase if backend is offline.
 */
export const pushLocalDataToCloud = async () => {
  const profile = (await getUserProfile()) || {};
  const stats = (await getStats()) || {};
  const tasks = (await getTasks()) || [];
  const sessions = (await getFocusSessions()) || [];
  const achievements = (await getUnlockedAchievements()) || [];
  const streaks = (await getStreakData()) || {};
  const settings = (await getSettings()) || {};

  const payload = {
    profile,
    stats,
    tasks: { list: tasks },
    sessions: { list: sessions },
    achievements: { list: achievements },
    streaks,
    settings,
    updated_at: new Date().toISOString(),
  };

  // 1. Primary Sync: FocusForge Custom Backend
  const isBackendAuthed = await apiClient.isAuthenticated();
  if (isBackendAuthed) {
    try {
      const backendRes = await apiClient.syncPush(payload);
      if (backendRes && backendRes.success) {
        return true;
      }
    } catch (backendError) {
      console.warn(
        '[CloudSync] Backend push sync failed, falling back to Supabase:',
        backendError.message
      );
    }
  }

  // 2. Secondary Fallback: Supabase Cloud Database
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase.from('user_data').upsert(
          {
            user_id: session.user.id,
            profile,
            stats,
            tasks: { list: tasks },
            sessions: { list: sessions },
            achievements: { list: achievements },
            streaks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) throw error;
        return true;
      }
    } catch (supabaseError) {
      console.warn(
        '[CloudSync] Supabase fallback push failed:',
        supabaseError.message
      );
    }
  }

  return false;
};

/**
 * Pulls data snapshot from cloud and reconciles local storage.
 * Dual-sync engine: Attempts custom FocusForge backend first; falls back to Supabase if backend is offline.
 */
export const pullCloudDataToLocal = async () => {
  // 1. Primary Sync: FocusForge Custom Backend
  const isBackendAuthed = await apiClient.isAuthenticated();
  if (isBackendAuthed) {
    try {
      const backendRes = await apiClient.syncPull();
      if (backendRes && backendRes.success && backendRes.data) {
        const data = backendRes.data;
        if (data.profile) await saveUserProfile(data.profile);
        if (data.stats) await saveStats(data.stats);
        if (data.tasks?.list) await saveTasks(data.tasks.list);
        if (data.sessions?.list) await saveFocusSessions(data.sessions.list);
        if (data.achievements?.list) await saveUnlockedAchievements(data.achievements.list);
        if (data.streaks) await saveStreakData(data.streaks);
        if (data.settings) await saveSettings(data.settings);
        return true;
      }
    } catch (backendError) {
      console.warn(
        '[CloudSync] Backend pull sync failed, falling back to Supabase:',
        backendError.message
      );
    }
  }

  // 2. Secondary Fallback: Supabase Cloud Database
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No row found yet for new user
            return true;
          }
          throw error;
        }

        if (data) {
          if (data.profile) await saveUserProfile(data.profile);
          if (data.stats) await saveStats(data.stats);
          if (data.tasks?.list) await saveTasks(data.tasks.list);
          if (data.sessions?.list) await saveFocusSessions(data.sessions.list);
          if (data.achievements?.list) await saveUnlockedAchievements(data.achievements.list);
          if (data.streaks) await saveStreakData(data.streaks);
        }

        return true;
      }
    } catch (supabaseError) {
      console.warn(
        '[CloudSync] Supabase fallback pull failed:',
        supabaseError.message
      );
    }
  }

  return false;
};

export default {
  getActiveCloudProvider,
  pushLocalDataToCloud,
  pullCloudDataToLocal,
};
