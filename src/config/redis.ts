import Redis, { RedisOptions } from "ioredis";
import {
  REDIS_DB,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_URL,
} from "./ENV";
import logger from "../lib/logger";

const hasRedisConfig = Boolean(REDIS_URL || REDIS_HOST);

const createRedisClient = (): Redis | null => {
  if (!hasRedisConfig) return null;

  try {
    if (REDIS_URL) {
      const isTls = REDIS_URL.startsWith("rediss://");
      const options: RedisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        connectTimeout: 8000,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      };

      if (isTls) {
        // Upstash Redis uses TLS over rediss://
        options.tls = {
          rejectUnauthorized: false,
        };
      }

      return new Redis(REDIS_URL, options);
    }

    return new Redis({
      host: REDIS_HOST || "127.0.0.1",
      port: Number(REDIS_PORT || 6379),
      password: REDIS_PASSWORD || undefined,
      db: Number(REDIS_DB || 0),
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 8000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
    });
  } catch (error) {
    logger.warn("redis_client_init_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const redis = createRedisClient();

export const getRedis = async (): Promise<Redis | null> => {
  if (!redis) return null;

  try {
    if (redis.status === "wait" || redis.status === "close") {
      await redis.connect();
    }
    if (redis.status !== "ready") return null;
    return redis;
  } catch (error) {
    logger.warn("redis_unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export default redis;
