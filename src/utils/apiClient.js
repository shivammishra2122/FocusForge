import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl, API_ENDPOINTS, API_TIMEOUT_MS } from '../config/backend';

export const AUTH_TOKEN_KEY = '@focusforge:auth_token';

let memoryToken = null;

/**
 * Custom error class for FocusForge API errors
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieve saved auth token from AsyncStorage / memory cache
 */
export const getToken = async () => {
  if (memoryToken) return memoryToken;
  try {
    const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    memoryToken = stored;
    return stored;
  } catch (err) {
    console.warn('[ApiClient] Failed to load token from storage:', err.message);
    return null;
  }
};

/**
 * Store auth token in memory cache and AsyncStorage
 */
export const setToken = async (token) => {
  memoryToken = token || null;
  try {
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[ApiClient] Failed to persist token:', err.message);
  }
};

/**
 * Clear stored auth token (logout)
 */
export const clearToken = async () => {
  return setToken(null);
};

/**
 * Check whether user is currently authenticated with backend
 */
export const isAuthenticated = async () => {
  const token = await getToken();
  return Boolean(token);
};

/**
 * Core HTTP request handler
 */
export const request = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = API_TIMEOUT_MS,
    noAuth = false,
    params = null,
  } = options;

  let url = `${getBackendUrl()}${endpoint}`;

  if (params && typeof params === 'object') {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        query.append(k, String(v));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!noAuth) {
    const token = await getToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions = {
      method,
      headers: reqHeaders,
      signal: controller.signal,
    };

    if (body !== undefined && body !== null) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let responseData = null;
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        responseData = null;
      }
    } else {
      const text = await response.text();
      responseData = { message: text };
    }

    if (!response.ok) {
      const errorMsg =
        responseData?.error ||
        responseData?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMsg, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError(`Connection timeout after ${timeout}ms`, 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Network error occurred connecting to FocusForge backend',
      0,
      null
    );
  }
};

// ─── Authentication API ────────────────────────────────────────────────────────

/**
 * Register a new user account
 */
export const register = async (email, password, name, options = {}) => {
  const payload = {
    email,
    password,
    name,
    avatar: options.avatar,
    dailyGoalHours: options.dailyGoalHours,
  };

  const res = await request(API_ENDPOINTS.AUTH.REGISTER, {
    method: 'POST',
    body: payload,
    noAuth: true,
  });

  if (res?.data?.token) {
    await setToken(res.data.token);
  }

  return res;
};

/**
 * Authenticate existing user with email and password
 */
export const login = async (email, password) => {
  const res = await request(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: { email, password },
    noAuth: true,
  });

  if (res?.data?.token) {
    await setToken(res.data.token);
  }

  return res;
};

/**
 * Log out and clear cached credentials
 */
export const logout = async () => {
  await clearToken();
  return { success: true };
};

/**
 * Retrieve authenticated user profile, settings, and stats
 */
export const getProfile = async () => {
  return request(API_ENDPOINTS.AUTH.ME, { method: 'GET' });
};

/**
 * Update authenticated user profile and atmospheric settings
 */
export const updateProfile = async (data) => {
  return request(API_ENDPOINTS.AUTH.PROFILE, {
    method: 'PUT',
    body: data,
  });
};

// ─── Task Management API ───────────────────────────────────────────────────────

/**
 * Retrieve tasks with optional completion filter
 */
export const fetchTasks = async (params = {}) => {
  return request(API_ENDPOINTS.TASKS.BASE, {
    method: 'GET',
    params,
  });
};

/**
 * Create a new task
 */
export const createTask = async (data) => {
  return request(API_ENDPOINTS.TASKS.BASE, {
    method: 'POST',
    body: data,
  });
};

/**
 * Update task metadata
 */
export const updateTask = async (id, data) => {
  return request(API_ENDPOINTS.TASKS.BY_ID(id), {
    method: 'PUT',
    body: data,
  });
};

/**
 * Toggle task completed status and earn XP
 */
export const toggleTask = async (id) => {
  return request(API_ENDPOINTS.TASKS.TOGGLE(id), {
    method: 'PATCH',
  });
};

/**
 * Delete a task
 */
export const deleteTask = async (id) => {
  return request(API_ENDPOINTS.TASKS.BY_ID(id), {
    method: 'DELETE',
  });
};

/**
 * Batch synchronize tasks
 */
export const batchSyncTasks = async (tasks) => {
  return request(API_ENDPOINTS.TASKS.BATCH, {
    method: 'POST',
    body: { tasks },
  });
};

// ─── Focus Sessions API ────────────────────────────────────────────────────────

/**
 * Record a completed focus session
 */
export const createSession = async (data) => {
  return request(API_ENDPOINTS.SESSIONS.BASE, {
    method: 'POST',
    body: data,
  });
};

/**
 * Retrieve session history with optional filtering
 */
export const fetchSessions = async (params = {}) => {
  return request(API_ENDPOINTS.SESSIONS.BASE, {
    method: 'GET',
    params,
  });
};

/**
 * Retrieve aggregated focus stats
 */
export const fetchSessionStats = async () => {
  return request(API_ENDPOINTS.SESSIONS.STATS, {
    method: 'GET',
  });
};

// ─── Analytics, Leaderboard & AI Insights ──────────────────────────────────────

/**
 * Fetch 360 productivity dashboard analytics
 */
export const fetchAnalytics = async () => {
  return request(API_ENDPOINTS.ANALYTICS.OVERVIEW, {
    method: 'GET',
  });
};

/**
 * Fetch global community leaderboard rankings
 */
export const fetchLeaderboard = async (limit = 50) => {
  return request(API_ENDPOINTS.LEADERBOARD.BASE, {
    method: 'GET',
    params: { limit },
  });
};

/**
 * Fetch tailored AI coaching insights
 */
export const fetchInsights = async () => {
  return request(API_ENDPOINTS.INSIGHTS.BASE, {
    method: 'GET',
  });
};

// ─── Cloud Synchronization API ─────────────────────────────────────────────────

/**
 * Push full local snapshot to backend cloud database
 */
export const syncPush = async (data) => {
  return request(API_ENDPOINTS.SYNC.PUSH, {
    method: 'POST',
    body: data,
  });
};

/**
 * Pull full cloud snapshot from backend
 */
export const syncPull = async () => {
  return request(API_ENDPOINTS.SYNC.PULL, {
    method: 'GET',
  });
};

// ─── Health API ────────────────────────────────────────────────────────────────

/**
 * Check backend system health and database connectivity
 */
export const checkHealth = async () => {
  return request(API_ENDPOINTS.HEALTH, {
    method: 'GET',
    noAuth: true,
  });
};

export default {
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  request,
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  fetchTasks,
  createTask,
  updateTask,
  toggleTask,
  deleteTask,
  batchSyncTasks,
  createSession,
  fetchSessions,
  fetchSessionStats,
  fetchAnalytics,
  fetchLeaderboard,
  fetchInsights,
  syncPush,
  syncPull,
  checkHealth,
};
