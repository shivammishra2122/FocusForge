import SyncService from '../services/syncService.js';

export class SyncController {
  static async pushData(req, res, next) {
    try {
      const result = SyncService.pushData(req.user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async pullData(req, res, next) {
    try {
      const snapshot = SyncService.pullData(req.user.id);
      res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SyncController;
