import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { redis } from '../services/redis';

export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const keyIdentity = req.user?.id ?? req.ip;
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
