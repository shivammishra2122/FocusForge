import SessionService from '../services/sessionService.js';

export class SessionController {
  static async createSession(req, res, next) {
    try {
      const result = SessionService.createSession(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Focus session recorded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req, res, next) {
    try {
      const { category, mode, limit, offset } = req.query;
      const sessions = SessionService.getSessions(req.user.id, {
        category,
        mode,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        count: sessions.length,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSessionStats(req, res, next) {
    try {
      const stats = SessionService.getSessionStats(req.user.id);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SessionController;
