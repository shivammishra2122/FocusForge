import InsightService from '../services/insightService.js';

export class InsightController {
  static async getFocusInsights(req, res, next) {
    try {
      const insights = InsightService.getFocusInsights(req.user.id);
      res.status(200).json({
        success: true,
        data: insights,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default InsightController;
