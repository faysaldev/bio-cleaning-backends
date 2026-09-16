import MediaProcessingJob from "./mediaProcessingJob.model";
import { getRedis } from "../../config/redis";

export const publicIdFromCloudinaryUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    const marker = "/upload/";
    const idx = pathname.indexOf(marker);
    if (idx < 0) return undefined;
    const after = pathname.slice(idx + marker.length).replace(/^v\d+\//, "");
    return decodeURIComponent(after).replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return undefined;
  }
};

export const enqueueMediaOptimization = async (sourceUrl: string, publicId?: string) => {
  const id = publicId || publicIdFromCloudinaryUrl(sourceUrl);
  if (!id) return null;
  const job = await MediaProcessingJob.findOneAndUpdate(
    { publicId: id, kind: "CLOUDINARY_OPTIMIZE" },
    { $setOnInsert: { publicId: id, sourceUrl, kind: "CLOUDINARY_OPTIMIZE", status: "QUEUED", nextAttemptAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const redis = await getRedis();
  if (redis) void redis.multi().lpush("queue:media-processing", String(job._id)).ltrim("queue:media-processing", 0, 9999).exec().catch(() => undefined);
  return job;
};
