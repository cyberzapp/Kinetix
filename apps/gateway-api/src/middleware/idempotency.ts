import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { redis } from '../services/redis';

export async function enforceIdempotency(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method.toUpperCase())) {
    next();
    return;
  }

  const idempotencyKey = req.headers['x-idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    res.status(400).json({ error: 'Idempotency key required to mitigate duplicate requests' });
    return;
  }

  const lockKey = `idempotency:${idempotencyKey}`;
  const isNew = await redis.set(lockKey, 'PROCESSED', 'EX', env.idempotencyTtlSec, 'NX');

  if (!isNew) {
    res.status(409).json({ error: 'Conflict: Duplicate request detected for this idempotency key' });
    return;
  }

  next();
}
