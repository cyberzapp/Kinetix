import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { redis } from '../services/redis';

export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined;
  const keyIdentity = req.user?.id ?? forwardedIp ?? req.ip ?? 'unknown';
  const key = `ratelimit:${keyIdentity}:${req.method}:${req.path}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, env.rateLimitWindowSec);
  }

  if (count > env.rateLimitMaxRequests) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}
