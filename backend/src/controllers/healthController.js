import { getDb } from '../db/database.js';

export class HealthController {
  static getHealth(req, res) {
    let dbStatus = 'healthy';
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
    } catch (e) {
      dbStatus = `degraded: ${e.message}`;
    }

    const memory = process.memoryUsage();

    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'FocusForge Backend API',
      version: '1.0.0',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memory.rss / (1024 * 1024)),
          heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
          heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
        },
      },
    });
  }
}

export default HealthController;
