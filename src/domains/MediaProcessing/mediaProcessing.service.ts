import MediaProcessingJob from "./mediaProcessingJob.model";
import { getRedis } from "../../config/redis";

export const keyFromMediaUrl = (url: string): string | undefined => {
  try {
    const pathname = new URL(url).pathname;
    const clean = pathname.replace(/^\/+/, "");
    return clean || undefined;
  } catch {
    return url.split("/").pop() || undefined;
  }
};

export const enqueueMediaOptimization = async (sourceUrl: string, publicId?: string) => {
  const id = publicId || keyFromMediaUrl(sourceUrl);
  if (!id) return null;
  const job = await MediaProcessingJob.findOneAndUpdate(
    { publicId: id, kind: "R2_OPTIMIZE" },
    {
      $setOnInsert: {
        publicId: id,
        sourceUrl,
        kind: "R2_OPTIMIZE",
        status: "COMPLETED", // Pre-compressed to WebP on upload
        nextAttemptAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const redis = await getRedis();
  if (redis) void redis.multi().lpush("queue:media-processing", String(job._id)).ltrim("queue:media-processing", 0, 9999).exec().catch(() => undefined);
  return job;
};
