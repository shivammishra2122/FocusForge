import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import config from '../config/index.js';

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection.
 * @param {string} [customPath] Optional custom DB path (e.g. ':memory:' for tests)
 * @returns {DatabaseSync}
 */
export function getDb(customPath) {
  if (dbInstance && !customPath) {
    try {
      dbInstance.prepare('SELECT 1').get();
      return dbInstance;
    } catch {
      dbInstance = null;
    }
  }

  const targetPath = customPath || (process.env.NODE_ENV === 'test' ? ':memory:' : config.dbPath);

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Enable WAL mode, busy timeout, and foreign keys for high performance and integrity
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');

  initSchema(db);

  dbInstance = db;

  return db;
}

/**
 * Initialize all database tables if they do not exist.
 * @param {DatabaseSync} db
 */
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      daily_goal_hours REAL DEFAULT 2.0,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      priority TEXT DEFAULT 'MEDIUM',
      completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      deep_focus INTEGER DEFAULT 0,
      category TEXT DEFAULT 'Focus',
      sound_id TEXT DEFAULT 'none',
      efficiency INTEGER DEFAULT 90,
      focus_index REAL DEFAULT 0.85,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streak_history (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      minutes INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      pomodoro_work INTEGER DEFAULT 25,
      pomodoro_short_break INTEGER DEFAULT 5,
      pomodoro_long_break INTEGER DEFAULT 15,
      pomodoro_rounds INTEGER DEFAULT 4,
      daily_goal_hours REAL DEFAULT 2.0,
      notifications INTEGER DEFAULT 1,
      haptics INTEGER DEFAULT 1,
      auto_start_breaks INTEGER DEFAULT 0,
      auto_start_work INTEGER DEFAULT 0,
      app_blocking_enabled INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_streak_user_id ON streak_history(user_id);
  `);
}

/**
 * Closes the current database connection if open.
 */
export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      // Ignored
    }
    dbInstance = null;
  }
}

export default {
  getDb,
  initSchema,
  closeDb,
};
