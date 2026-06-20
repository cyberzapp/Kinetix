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
  jwtSecret: required('JWT_SECRET', 'super_secure_key'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379/0'),
  databaseUrl: required('DATABASE_URL', '******127.0.0.1:5432/kinetix'),
  idempotencyTtlSec: Number(process.env.IDEMPOTENCY_TTL_SEC ?? 86400),
};
