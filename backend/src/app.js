import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Root Index & API Documentation Overview
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'FocusForge Backend API',
    tagline: 'Obsidian Protocol - Deep Focus & Gamified Productivity Engine',
    version: '1.0.0',
    status: 'online',
    documentation: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
      },
      tasks: {
        list: 'GET /api/tasks',
        create: 'POST /api/tasks',
        update: 'PUT /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id',
        toggle: 'PATCH /api/tasks/:id/toggle',
        batch: 'POST /api/tasks/batch',
      },
      sessions: {
        create: 'POST /api/sessions',
        list: 'GET /api/sessions',
        stats: 'GET /api/sessions/stats',
      },
      analytics: {
        overview: 'GET /api/analytics/overview',
      },
      leaderboard: {
        list: 'GET /api/leaderboard',
      },
      sync: {
        push: 'POST /api/sync/push',
        pull: 'GET /api/sync/pull',
      },
      insights: {
        coaching: 'GET /api/insights',
      },
    },
  });
});

// Mount API Routes
app.use('/api', routes);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
