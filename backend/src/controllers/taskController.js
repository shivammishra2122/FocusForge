import TaskService from '../services/taskService.js';

export class TaskController {
  static async getTasks(req, res, next) {
    try {
      const { completed } = req.query;
      const options = {};
      if (completed !== undefined) {
        options.completed = completed === 'true' || completed === '1';
      }

      const tasks = TaskService.getTasks(req.user.id, options);
      res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTask(req, res, next) {
    try {
      const { id, title, notes, note, priority } = req.body;
      const task = TaskService.createTask(req.user.id, {
        id,
        title,
        notes,
        note,
        priority,
      });

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = TaskService.updateTask(req.user.id, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const result = TaskService.deleteTask(req.user.id, id);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleTask(req, res, next) {
    try {
      const { id } = req.params;
      const result = TaskService.toggleTask(req.user.id, id);

      res.status(200).json({
        success: true,
        message: result.task.completed ? 'Task completed! XP awarded.' : 'Task marked incomplete',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async batchSyncTasks(req, res, next) {
    try {
      const { tasks } = req.body;
      const updatedTasks = TaskService.batchSyncTasks(req.user.id, tasks || []);

      res.status(200).json({
        success: true,
        message: 'Batch tasks synchronized successfully',
        count: updatedTasks.length,
        data: updatedTasks,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default TaskController;
