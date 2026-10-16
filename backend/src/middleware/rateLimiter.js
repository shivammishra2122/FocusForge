import rateLimit from 'express-rate-limit';

/**
 * Standard Express Rate Limiter Middleware
 * Uses express-rate-limit for production-grade request throttling and CodeQL compliance.
 */
export const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    limit: options.max || options.limit || 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later.',
    },
    ...options,
  });
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts, please try again after 15 minutes',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded, please slow down',
});

export default {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
};
