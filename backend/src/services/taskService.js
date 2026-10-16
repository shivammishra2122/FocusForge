import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { TASK_XP_REWARDS, getLevelInfo, getProgressToNextLevel } from '../constants/achievements.js';
import AchievementService from './achievementService.js';

export class TaskService {
  /**
   * Retrieves all tasks for a user with optional completed filter
   */
  static getTasks(userId, options = {}) {
    const db = getDb();
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [userId];

    if (options.completed !== undefined) {
      query += ' AND completed = ?';
      params.push(options.completed ? 1 : 0);
    }

    query += ' ORDER BY completed ASC, created_at DESC';

    const rows = db.prepare(query).all(...params);
    return rows.map(this.formatTask);
  }

  /**
   * Creates a new task
   */
  static createTask(userId, { id, title, notes = '', note = '', priority = 'MEDIUM' }) {
    if (!title || !title.trim()) {
      throw new AppError('Task title is required', 400);
    }

    const db = getDb();
    const taskId = id || crypto.randomUUID();
    const cleanTitle = title.trim();
    const cleanNotes = (notes || note || '').trim();
    const cleanPriority = ['HIGH', 'MEDIUM', 'LOW'].includes(priority?.toUpperCase()) 
      ? priority.toUpperCase() 
      : 'MEDIUM';
    const now = Date.now();

    db.prepare(`
      INSERT INTO tasks (id, user_id, title, notes, priority, completed, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, NULL)
    `).run(taskId, userId, cleanTitle, cleanNotes, cleanPriority, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    return this.formatTask(task);
  }

  /**
   * Updates an existing task
   */
  static updateTask(userId, taskId, updates = {}) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!existing) {
      throw new AppError('Task not found', 404);
    }

    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const notes = updates.notes !== undefined ? updates.notes : (updates.note !== undefined ? updates.note : existing.notes);
    const priority = updates.priority !== undefined 
      ? (['HIGH', 'MEDIUM', 'LOW'].includes(updates.priority.toUpperCase()) ? updates.priority.toUpperCase() : existing.priority)
      : existing.priority;
    const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : existing.completed;
    const completedAt = updates.completed !== undefined 
      ? (updates.completed ? (existing.completed_at || Date.now()) : null)
      : existing.completed_at;

    db.prepare(`
      UPDATE tasks 
      SET title = ?, notes = ?, priority = ?, completed = ?, completed_at = ?
      WHERE id = ? AND user_id = ?
    `).run(title, notes, priority, completed, completedAt, taskId, userId);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    return this.formatTask(updated);
  }

  /**
   * Deletes a task
   */
  static deleteTask(userId, taskId) {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!existing) {
      throw new AppError('Task not found', 404);
    }

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
    return { success: true, message: 'Task deleted successfully', taskId };
  }

  /**
   * Toggles task completion and awards XP (HIGH: 450, MEDIUM: 220, LOW: 80)
   */
  static toggleTask(userId, taskId) {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const willBeCompleted = task.completed === 0;
    const completedAt = willBeCompleted ? Date.now() : null;
    let xpEarned = 0;

    if (willBeCompleted) {
      xpEarned = TASK_XP_REWARDS[task.priority] || TASK_XP_REWARDS.MEDIUM;
      db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(xpEarned, userId);
    }

    db.prepare(`
      UPDATE tasks 
      SET completed = ?, completed_at = ?
      WHERE id = ? AND user_id = ?
    `).run(willBeCompleted ? 1 : 0, completedAt, taskId, userId);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);

    const newlyUnlockedAchievements = willBeCompleted 
      ? AchievementService.evaluateAchievements(userId) 
      : [];

    const level = getLevelInfo(user.xp);
    const progressToNextLevel = getProgressToNextLevel(user.xp);

    return {
      task: this.formatTask(updatedTask),
      xpEarned,
      newTotalXp: user.xp,
      level: level.level,
      levelTitle: level.title,
      progressToNextLevel,
      unlockedAchievements: newlyUnlockedAchievements,
    };
  }

  /**
   * Batch sync tasks (upsert multiple tasks from mobile app sync)
   */
  static batchSyncTasks(userId, tasksList = []) {
    if (!Array.isArray(tasksList)) {
      throw new AppError('Tasks must be an array', 400);
    }

    const db = getDb();
    const upsertStmt = db.prepare(`
      INSERT INTO tasks (id, user_id, title, notes, priority, completed, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        title = excluded.title,
        notes = excluded.notes,
        priority = excluded.priority,
        completed = excluded.completed,
        completed_at = excluded.completed_at
    `);

    for (const t of tasksList) {
      const taskId = t.id ? String(t.id) : crypto.randomUUID();
      const title = t.title || 'Untitled Task';
      const notes = t.notes || t.note || '';
      const priority = ['HIGH', 'MEDIUM', 'LOW'].includes(t.priority?.toUpperCase()) ? t.priority.toUpperCase() : 'MEDIUM';
      const completed = t.completed ? 1 : 0;
      const createdAt = Number(t.createdAt || t.created_at) || Date.now();
      const completedAt = t.completedAt || t.completed_at ? Number(t.completedAt || t.completed_at) : null;

      upsertStmt.run(taskId, userId, title, notes, priority, completed, createdAt, completedAt);
    }

    return this.getTasks(userId);
  }

  /**
   * Helper to format database task row to standard JSON object
   */
  static formatTask(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      note: row.notes,
      notes: row.notes,
      priority: row.priority,
      completed: Boolean(row.completed),
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }
}

export default TaskService;
