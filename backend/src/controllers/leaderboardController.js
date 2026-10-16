import LeaderboardService from '../services/leaderboardService.js';

export class LeaderboardController {
  static async getLeaderboard(req, res, next) {
    try {
      const { limit } = req.query;
      const currentUserId = req.user ? req.user.id : null;
      const result = LeaderboardService.getLeaderboard(currentUserId, limit);

      res.status(200).json({
        success: true,
        count: result.leaderboard.length,
        data: result.leaderboard,
        standing: result.currentUserStanding,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default LeaderboardController;
