import Redis from "ioredis";
import {
  REDIS_DB,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_URL,
} from "./ENV";

const hasRedisConfig = Boolean(REDIS_URL || REDIS_HOST);

const redis = hasRedisConfig
  ? REDIS_URL
    ? new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : new Redis({
        host: REDIS_HOST,
        port: Number(REDIS_PORT || 6379),
        password: REDIS_PASSWORD || undefined,
        db: Number(REDIS_DB || 0),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
  : null;

export const getRedis = async (): Promise<Redis | null> => {
  if (!redis) return null;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    if (redis.status !== "ready") return null;
    return redis;
  } catch (error) {
    console.warn("Redis unavailable; falling back to in-memory rate limiting.");
    return null;
  }
};

export default redis;
