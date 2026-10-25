import type { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  reset: () => void;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiterMiddleware {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  } = options;

  const records = new Map<string, ClientRecord>();

  // Periodically sweep expired entries (unref so process can exit cleanly)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now >= record.resetTime) {
        records.delete(key);
      }
    }
  }, Math.max(windowMs, 10000));
  cleanupTimer.unref();

  const middleware: RateLimiterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = records.get(key);
    if (!record || now >= record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      records.set(key, record);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message,
        retryAfter: retryAfterSec,
      });
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    next();
  };

  middleware.reset = () => {
    records.clear();
  };

  return middleware;
}

/** Rate limiter for auth endpoints: 15 requests per minute per IP */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please try again later.',
});
