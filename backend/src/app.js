import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Safe CORS configuration
const allowedOrigins = config.corsOrigin && config.corsOrigin !== '*'
  ? config.corsOrigin.split(',').map((o) => o.trim())
  : ['http://localhost:8081', 'http://localhost:5001', 'http://localhost:19006', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile app, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (config.env !== 'test') {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

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
