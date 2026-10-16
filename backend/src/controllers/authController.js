import AuthService from '../services/authService.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { email, password, name, avatar, dailyGoalHours } = req.body;
      const result = await AuthService.register({
        email,
        password,
        name,
        avatar,
        dailyGoalHours,
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { name, avatar, dailyGoalHours, settings } = req.body;
      const updated = await AuthService.updateProfile(req.user.id, {
        name,
        avatar,
        dailyGoalHours,
        settings,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
