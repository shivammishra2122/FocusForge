import { supabase } from '../config/supabase';
import {
  getUserProfile,
  getTasks,
  getStats,
  getUnlockedAchievements,
  getStreakData,
  saveUserProfile,
  saveTasks,
  saveStats,
  saveFocusSession,
  getFocusSessions,
  saveFocusSessions,
  saveUnlockedAchievements,
  saveStreakData,
} from './storage';

/**
 * Pushes local data to Supabase for the authenticated user.
 * Expects a `user_data` table with columns: `user_id`, `profile`, `stats`, `tasks`, `sessions`, `achievements`, `streaks`, `updated_at`
 */
export const pushLocalDataToCloud = async () => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  try {
    const profile = await getUserProfile() || {};
    const stats = await getStats() || {};
    const tasks = await getTasks() || [];
    const sessions = await getFocusSessions() || [];
    const achievements = await getUnlockedAchievements() || [];
    const streaks = await getStreakData() || {};

    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: session.user.id,
        profile,
        stats,
        tasks: { list: tasks },
        sessions: { list: sessions },
        achievements: { list: achievements },
        streaks,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Error pushing data to Supabase:', error.message);
    return false;
  }
};

/**
 * Pulls data from Supabase and updates local AsyncStorage.
 */
export const pullCloudDataToLocal = async () => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found for user yet, which is fine
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
  } catch (error) {
    console.warn('Error pulling data from Supabase:', error.message);
    return false;
  }
};
