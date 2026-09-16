import crypto from "crypto";
import { getRedis } from "../config/redis";
import { ConflictError } from "./errors";

const localLocks = new Map<string, number>();
const releaseScript = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

export async function withDistributedLock<T>(
  key: string,
  task: () => Promise<T>,
  options: { ttlMs?: number; waitMs?: number; retryMs?: number } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? 15_000;
  const waitMs = options.waitMs ?? 4_000;
  const retryMs = options.retryMs ?? 80;
  const token = crypto.randomUUID();
  const redis = await getRedis();
  const redisKey = `lock:${key}`;
  const deadline = Date.now() + waitMs;

  if (redis) {
    while (Date.now() <= deadline) {
      try {
        const acquired = await redis.set(redisKey, token, "PX", ttlMs, "NX");
        if (acquired === "OK") {
          try {
            return await task();
          } finally {
            try { await redis.eval(releaseScript, 1, redisKey, token); } catch { /* TTL releases it */ }
          }
        }
      } catch {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
    if (Date.now() > deadline) throw new ConflictError("This operation is already being processed. Please retry shortly.");
  }

  while (Date.now() <= deadline) {
    const expiresAt = localLocks.get(key) || 0;
    if (expiresAt <= Date.now()) {
      localLocks.set(key, Date.now() + ttlMs);
      try {
        return await task();
      } finally {
        localLocks.delete(key);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, retryMs));
  }
  throw new ConflictError("This operation is already being processed. Please retry shortly.");
}
