import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} from "../config/ENV";
import logger from "./logger";

let r2ClientInstance: S3Client | null = null;

export const isR2Configured = (): boolean => {
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
};

export const getR2Client = (): S3Client => {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment."
    );
  }

  if (!r2ClientInstance) {
    r2ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }

  return r2ClientInstance;
};

export interface CompressedImageResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
  width?: number;
  height?: number;
}

/**
 * Compresses an image buffer in-memory and converts it to modern WebP format.
 * - Auto-orients according to EXIF metadata
 * - Constrains maximum dimension to 2400px without upscaling
 * - Applies balanced WebP compression (quality: 82, effort: 4)
 */
export const compressToWebp = async (
  inputBuffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<CompressedImageResult> => {
  const maxWidth = options.maxWidth || 2400;
  const maxHeight = options.maxHeight || 2400;
  const quality = options.quality || 82;

  const pipeline = sharp(inputBuffer)
    .rotate() // auto-orient based on EXIF
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
    });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    extension: ".webp",
    originalSize: inputBuffer.length,
    compressedSize: data.length,
    width: info.width,
    height: info.height,
  };
};

/**
 * Uploads a file buffer directly to Cloudflare R2 and returns its public URL.
 */
export const uploadToR2 = async (
  buffer: Buffer,
  folder: string = "uploads",
  customFilename?: string,
  contentType: string = "image/webp"
): Promise<{ url: string; key: string; size: number }> => {
  const client = getR2Client();
  const bucket = R2_BUCKET_NAME as string;

  const safeFolder = folder.replace(/^\/+|\/+$/g, "");
  const baseName = customFilename
    ? customFilename.replace(/\.[^/.]+$/, "")
    : `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const key = `${safeFolder}/${baseName}.webp`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await client.send(command);

  const publicUrlBase = R2_PUBLIC_URL
    ? R2_PUBLIC_URL.replace(/\/$/, "")
    : `https://${bucket}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const publicUrl = `${publicUrlBase}/${key}`;

  logger.info("r2_upload_success", {
    bucket,
    key,
    size: buffer.length,
    url: publicUrl,
  });

  return {
    url: publicUrl,
    key,
    size: buffer.length,
  };
};

/**
 * Deletes an object from Cloudflare R2 by key.
 */
export const deleteFromR2 = async (key: string): Promise<void> => {
  if (!isR2Configured()) return;
  const client = getR2Client();
  const bucket = R2_BUCKET_NAME as string;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    logger.info("r2_delete_success", { bucket, key });
  } catch (error) {
    logger.warn("r2_delete_failed", {
      bucket,
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
