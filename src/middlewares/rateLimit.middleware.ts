import { NextFunction, Request, Response } from "express";
import { getRedis } from "../config/redis";
import { TooManyRequestsError } from "../lib/errors";

type RateLimitOptions = {
  namespace: string;
  windowMs: number;
  max: number;
};

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();
let lastMemoryCleanupAt = 0;

const cleanupMemoryStore = (now: number) => {
  if (now - lastMemoryCleanupAt < 60_000) return;
  lastMemoryCleanupAt = now;
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) memoryStore.delete(key);
  }
};

const normalizeIp = (req: Request) =>
  (req.ip || req.socket.remoteAddress || "unknown").replace(/[^a-zA-Z0-9:._-]/g, "");

const incrementMemory = (key: string, windowMs: number) => {
  const now = Date.now();
  cleanupMemoryStore(now);
  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, next);
    return next;
  }
  existing.count += 1;
  return existing;
};

export const createRateLimiter = ({ namespace, windowMs, max }: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${namespace}:${normalizeIp(req)}`;
    let count: number;
    let resetAt: number;

    const redis = await getRedis();
    if (redis) {
      try {
        const result = await redis.multi().incr(key).pttl(key).exec();
        count = Number(result?.[0]?.[1] || 1);
        let ttl = Number(result?.[1]?.[1] || -1);
        if (count === 1 || ttl < 0) {
          await redis.pexpire(key, windowMs);
          ttl = windowMs;
        }
        resetAt = Date.now() + ttl;
      } catch {
        const entry = incrementMemory(key, windowMs);
        count = entry.count;
        resetAt = entry.resetAt;
      }
    } else {
      const entry = incrementMemory(key, windowMs);
      count = entry.count;
      resetAt = entry.resetAt;
    }

    const remaining = Math.max(0, max - count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
      return next(new TooManyRequestsError("Too many requests. Please try again later."));
    }

    next();
  };
};

export const loginRateLimiter = createRateLimiter({
  namespace: "auth-login",
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const registerRateLimiter = createRateLimiter({
  namespace: "auth-register",
  windowMs: 60 * 60 * 1000,
  max: 5,
});

export const forgotPasswordRateLimiter = createRateLimiter({
  namespace: "auth-forgot-password",
  windowMs: 60 * 60 * 1000,
  max: 5,
});

export const resetPasswordRateLimiter = createRateLimiter({
  namespace: "auth-reset-password",
  windowMs: 60 * 60 * 1000,
  max: 10,
});

export const refreshSessionRateLimiter = createRateLimiter({
  namespace: "auth-refresh",
  windowMs: 15 * 60 * 1000,
  max: 120,
});

export const bookingRateLimiter = createRateLimiter({
  namespace: "public-booking",
  windowMs: 15 * 60 * 1000,
  max: 30,
});

export const bookingQuoteRateLimiter = createRateLimiter({
  namespace: "public-booking-quote",
  windowMs: 60 * 1000,
  max: 60,
});

export const availabilityRateLimiter = createRateLimiter({
  namespace: "public-availability",
  windowMs: 60 * 1000,
  max: 120,
});

export const contactRateLimiter = createRateLimiter({
  namespace: "public-contact",
  windowMs: 15 * 60 * 1000,
  max: 6,
});
