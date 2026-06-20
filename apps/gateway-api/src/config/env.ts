import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  jwtSecret: required('JWT_SECRET'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379/0'),
  databaseUrl: required('DATABASE_URL'),
  idempotencyTtlSec: Number(process.env.IDEMPOTENCY_TTL_SEC ?? 86400),
  orderClaimLockTtlSec: Number(process.env.ORDER_CLAIM_LOCK_TTL_SEC ?? 15),
  rateLimitWindowSec: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 240),
};
