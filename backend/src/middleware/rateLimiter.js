/**
 * Simple in-memory token-bucket / window rate limiter middleware.
 * Prevents brute force on sensitive auth routes.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // max requests per window
  const message = options.message || 'Too many requests, please try again later.';
  const hits = new Map();

  // Periodic cleanup
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, windowMs);

  if (interval.unref) interval.unref();

  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = hits.get(ip) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count += 1;
    }

    hits.set(ip, record);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
      });
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 min
  message: 'Too many authentication attempts, please try again after 15 minutes',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300, // 300 requests per minute
  message: 'API rate limit exceeded, please slow down',
});

export default {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
};
