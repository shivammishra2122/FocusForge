import AnalyticsService from '../services/analyticsService.js';

export class AnalyticsController {
  static async getOverview(req, res, next) {
    try {
      const overview = AnalyticsService.getOverview(req.user.id);
      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AnalyticsController;
