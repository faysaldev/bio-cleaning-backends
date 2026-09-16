import { v2 as cloudinary } from "cloudinary";
import MediaProcessingJob from "./mediaProcessingJob.model";
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, MEDIA_WORKER_INTERVAL_MS } from "../../config/ENV";
import { getRedis } from "../../config/redis";
import logger from "../../lib/logger";

cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
let timer: NodeJS.Timeout | undefined;
let running = false;

const processOne = async () => {
  const job: any = await MediaProcessingJob.findOneAndUpdate(
    { $or: [{ status: { $in: ["QUEUED", "FAILED"] }, nextAttemptAt: { $lte: new Date() }, attempts: { $lt: 5 } }, { status: "PROCESSING", lockedAt: { $lte: new Date(Date.now() - 10 * 60000) }, attempts: { $lt: 5 } }] },
    { $set: { status: "PROCESSING", lockedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true, sort: { nextAttemptAt: 1 } },
  );
  if (!job) return false;
  try {
    await cloudinary.uploader.explicit(job.publicId, {
      type: "upload",
      resource_type: "image",
      eager: [
        { width: 1920, height: 1920, crop: "limit", quality: "auto:good", fetch_format: "auto" },
        { width: 960, height: 960, crop: "limit", quality: "auto:eco", fetch_format: "auto" },
      ],
      eager_async: true,
    });
    job.status = "COMPLETED";
    job.completedAt = new Date();
    job.lockedAt = undefined;
    job.lastError = undefined;
  } catch (error: any) {
    job.status = "FAILED";
    job.lastError = String(error?.message || error).slice(0, 4000);
    job.lockedAt = undefined;
    job.nextAttemptAt = new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.max(0, job.attempts - 1)));
  }
  await job.save();
  return true;
};

export const processMediaQueue = async (limit = 10) => {
  const redis = await getRedis();
  if (redis) {
    try {
      for (let i = 0; i < limit; i += 1) {
        const signal = await redis.rpop("queue:media-processing");
        if (!signal) break;
      }
    } catch { /* MongoDB jobs remain durable when Redis is unavailable. */ }
  }
  let processed = 0;
  while (processed < limit && await processOne()) processed += 1;
  return processed;
};

export const startMediaProcessingWorker = () => {
  if (timer || process.env.VERCEL) return;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    processMediaQueue().catch((error) => logger.error("media_worker_failed", { error })).finally(() => { running = false; });
  }, MEDIA_WORKER_INTERVAL_MS);
  timer.unref?.();
};
