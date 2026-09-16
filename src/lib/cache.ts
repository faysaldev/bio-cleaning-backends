import { getRedis } from "../config/redis";

const memory = new Map<string, { value: string; expiresAt: number }>();

const prune = () => {
  const now = Date.now();
  for (const [key, entry] of memory) if (entry.expiresAt <= now) memory.delete(key);
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(`cache:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      // Fall through to process-local cache when Redis is temporarily unavailable.
    }
  }
  prune();
  const entry = memory.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return JSON.parse(entry.value) as T;
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 60) => {
  const raw = JSON.stringify(value);
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(`cache:${key}`, raw, "EX", Math.max(1, ttlSeconds));
      return;
    } catch {
      // Fall through.
    }
  }
  memory.set(key, { value: raw, expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000 });
};

export const cacheDeleteByPrefix = async (prefix: string) => {
  const redis = await getRedis();
  if (redis) {
    try {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `cache:${prefix}*`, "COUNT", 100);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== "0");
    } catch {
      // Best-effort invalidation. TTL remains the final safety net.
    }
  }
  for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
};
