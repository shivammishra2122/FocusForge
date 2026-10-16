import { Platform } from 'react-native';

/**
 * FocusForge Backend API Configuration
 * Supports environment variables, simulator localhost, Android emulator 10.0.2.2, and production endpoints.
 */

// Production or custom backend URL override via Expo environment variables
const ENV_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  '';

// Default host based on execution platform
const getDefaultHost = () => {
  if (ENV_BACKEND_URL) {
    return ENV_BACKEND_URL.replace(/\/+$/, '');
  }

  // Android emulator maps host machine localhost to 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';
  }

  // iOS simulator, macOS, and Web use localhost
  return 'http://localhost:5001';
};

let runtimeBackendUrl = getDefaultHost();

/**
 * Get current configured backend URL
 */
export const getBackendUrl = () => runtimeBackendUrl;

/**
 * Allow runtime override of backend URL (e.g. for developer LAN testing or settings)
 */
export const setBackendUrl = (url) => {
  if (typeof url === 'string' && url.trim()) {
    runtimeBackendUrl = url.trim().replace(/\/+$/, '');
  }
};

/**
 * Default backend URL constant
 */
export const BACKEND_URL = getDefaultHost();

/**
 * Default network timeout in milliseconds
 */
export const API_TIMEOUT_MS = 12000;

/**
 * API route constants matching the Express backend routing tree
 */
export const API_ENDPOINTS = {
  // Health & System
  HEALTH: '/api/health',
  ROOT: '/',

  // Authentication & Profile
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    PROFILE: '/api/auth/profile',
  },

  // Task Management
  TASKS: {
    BASE: '/api/tasks',
    BATCH: '/api/tasks/batch',
    BY_ID: (id) => `/api/tasks/${id}`,
    TOGGLE: (id) => `/api/tasks/${id}/toggle`,
  },

  // Focus Sessions
  SESSIONS: {
    BASE: '/api/sessions',
    STATS: '/api/sessions/stats',
  },

  // Analytics & Aggregates
  ANALYTICS: {
    OVERVIEW: '/api/analytics/overview',
  },

  // Global Leaderboard
  LEADERBOARD: {
    BASE: '/api/leaderboard',
  },

  // AI Cognitive Insights
  INSIGHTS: {
    BASE: '/api/insights',
  },

  // Cloud Synchronization Snapshot
  SYNC: {
    PUSH: '/api/sync/push',
    PULL: '/api/sync/pull',
  },
};

export default {
  BACKEND_URL,
  getBackendUrl,
  setBackendUrl,
  API_TIMEOUT_MS,
  API_ENDPOINTS,
};
