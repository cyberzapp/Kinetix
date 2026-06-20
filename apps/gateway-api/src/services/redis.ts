import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.redisUrl);
export const redisSubscriber = new Redis(env.redisUrl);
