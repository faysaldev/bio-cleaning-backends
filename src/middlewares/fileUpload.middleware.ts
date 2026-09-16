import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../lib/errors";
import { compressToWebp, uploadToR2 } from "../lib/r2.service";

// Memory storage for serverless-friendly streaming into Sharp & Cloudflare R2
const fileUploadMiddleware = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // Max file size: 15MB
    fileFilter: (_req, file, cb) => {
      const allowedExts = /jpeg|jpg|png|webp|heic|tiff|gif/;
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      const isMimeValid = file.mimetype.startsWith("image/");
      const isExtValid = allowedExts.test(ext);

      if (isMimeValid || isExtValid) {
        return cb(null, true);
      } else {
        const error: any = new BadRequestError(
          "Invalid file type. Only images (JPEG, PNG, WebP, HEIC, TIFF) are allowed."
        );
        error.code = "INVALID_FILE_TYPE";
        return cb(error, false);
      }
    },
  });
};

interface FileFieldConfig {
  name: string;
  required?: boolean;
}

/**
 * Middleware to process multi-field uploads, compress to WebP, and upload to Cloudflare R2.
 */
const processR2Uploads = (
  folder: string,
  fileFields: FileFieldConfig[]
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (!files) {
        const missingRequired = fileFields.filter((field) => field.required !== false);
        if (missingRequired.length > 0) {
          throw new BadRequestError(
            `Missing required files: ${missingRequired.map((f) => f.name).join(", ")}`
          );
        }
        return next();
      }

      for (const fieldConfig of fileFields) {
        const fieldFiles = files[fieldConfig.name];

        if (!fieldFiles || fieldFiles.length === 0) {
          if (fieldConfig.required !== false) {
            throw new BadRequestError(`Missing required file: ${fieldConfig.name}`);
          }
          continue;
        }

        const file = fieldFiles[0];
        const compressed = await compressToWebp(file.buffer);
        const { url } = await uploadToR2(compressed.buffer, folder, `${Date.now()}-${fieldConfig.name}`);
        req.body[fieldConfig.name] = url;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

interface ArrayFileFieldConfig {
  name: string;
  required?: boolean;
  maxCount?: number;
}

/**
 * Middleware to process an array of images, compress to WebP, and upload to Cloudflare R2.
 */
const processR2ArrayUploads = (
  folder: string,
  fieldConfig: ArrayFileFieldConfig
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        if (fieldConfig.required !== false) {
          throw new BadRequestError(`Missing required files: ${fieldConfig.name}`);
        }
        req.body[fieldConfig.name] = [];
        return next();
      }

      const uploadPromises = files.map(async (file, index) => {
        const compressed = await compressToWebp(file.buffer);
        const { url } = await uploadToR2(
          compressed.buffer,
          folder,
          `${Date.now()}-${fieldConfig.name}-${index}`
        );
        return url;
      });

      const urls = await Promise.all(uploadPromises);
      req.body[fieldConfig.name] = urls;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to process a single file upload, compress to WebP, and upload to Cloudflare R2.
 */
const processR2SingleUpload = (
  folder: string,
  fieldName: string,
  required: boolean = true
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file) {
        if (required) {
          throw new BadRequestError(`Missing required file: ${fieldName}`);
        }
        return next();
      }

      const compressed = await compressToWebp(file.buffer);
      const { url } = await uploadToR2(
        compressed.buffer,
        folder,
        `${Date.now()}-${fieldName}`
      );
      req.body[fieldName] = url;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Aliases for seamless drop-in backwards compatibility with existing route imports
export const cloudinaryFileUploadMiddleware = fileUploadMiddleware;
export const processCloudinaryUploads = processR2Uploads;
export const processCloudinaryArrayUploads = processR2ArrayUploads;
export const processCloudinarySingleUpload = processR2SingleUpload;

export {
  fileUploadMiddleware,
  processR2Uploads,
  processR2ArrayUploads,
  processR2SingleUpload,
};

export default fileUploadMiddleware;
