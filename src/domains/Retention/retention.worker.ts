import crypto from "crypto";
import { RETENTION_SWEEP_INTERVAL_MS } from "../../config/ENV";
import { getRedis } from "../../config/redis";
import retentionService from "./retention.service";

let timer: NodeJS.Timeout | undefined;
let running = false;
const lockKey = "bio:communications:retention-sweep";

const runWithDistributedLock = async () => {
  if (running) return;
  running = true;
  const token = crypto.randomBytes(16).toString("hex");
  const redis = await getRedis();
  let ownsLock = !redis;
  try {
    if (redis) {
      const result = await redis.set(lockKey, token, "PX", Math.max(10 * 60 * 1000, RETENTION_SWEEP_INTERVAL_MS * 2), "NX");
      ownsLock = result === "OK";
    }
    if (!ownsLock) return;
    await retentionService.runAutomationSweep();
  } catch (error) {
    console.error("Retention automation sweep failed", error);
  } finally {
    if (redis && ownsLock) {
      try {
        await redis.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          1,
          lockKey,
          token,
        );
      } catch {
        // The lock expires automatically; do not fail the process on cleanup.
      }
    }
    running = false;
  }
};

/**
 * Best-effort scheduler for persistent API instances. Deployments that can scale
 * to zero should also invoke POST /communications/cron from an external scheduler.
 * Redis, when configured, prevents every horizontally scaled instance from
 * running the same sweep at once. Event/delivery dedupe remains the final guard.
 */
export const startRetentionScheduler = () => {
  if (timer || process.env.VERCEL) return;
  const startup = setTimeout(() => void runWithDistributedLock(), 15_000);
  startup.unref?.();
  timer = setInterval(() => void runWithDistributedLock(), RETENTION_SWEEP_INTERVAL_MS);
  timer.unref?.();
};
