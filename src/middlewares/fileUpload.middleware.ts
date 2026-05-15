import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "../config/ENV";
import { BadRequestError } from "../lib/errors";

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Middleware for local file upload
const userFileUploadMiddleware = (uploadFolder: string) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadFolder); // Set the destination folder
    },
    filename: (req, file, cb) => {
      const extname = path.extname(file.originalname);
      const filename = Date.now() + "-" + file.fieldname + extname; // Unique file name
      cb(null, filename);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
    fileFilter: (req, file, cb) => {
      const fileTypes = /jpeg|jpg|png/;
      const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase(),
      );
      const mimetype = fileTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true); // If file is valid, allow it
      } else {
        const error: any = new Error("Only image files are allowed!");
        error.code = "INVALID_FILE_TYPE";
        return cb(error, false);
      }
    },
  });
};

// Middleware for Cloudinary file upload (memory storage)
const cloudinaryFileUploadMiddleware = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
    fileFilter: (req, file, cb) => {
      const fileTypes = /jpeg|jpg|png/;
      const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase(),
      );
      const mimetype = fileTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true); // If file is valid, allow it
      } else {
        const error: any = new Error("Only image files are allowed!");
        error.code = "INVALID_FILE_TYPE";
        return cb(error, false);
      }
    },
  });
};

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  filename: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result?.secure_url || "");
        }
      },
    );

    uploadStream.end(buffer);
  });
};

// Middleware to process files and upload to Cloudinary
// This middleware should be used AFTER cloudinaryFileUploadMiddleware
interface FileFieldConfig {
  name: string;
  required?: boolean;
}

const processCloudinaryUploads = (
  folder: string,
  fileFields: FileFieldConfig[],
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files) {
        // Check if any required fields are missing
        const missingRequired = fileFields.filter(
          (field) => field.required !== false,
        );
        if (missingRequired.length > 0) {
          throw new BadRequestError(
            `Missing required files: ${missingRequired.map((f) => f.name).join(", ")}`,
          );
        }
        return next();
      }

      // Process each file field
      const uploadPromises: Promise<void>[] = [];

      for (const fieldConfig of fileFields) {
        const fieldFiles = files[fieldConfig.name];

        if (!fieldFiles || fieldFiles.length === 0) {
          if (fieldConfig.required !== false) {
            throw new BadRequestError(`Missing required file: ${fieldConfig.name}`);
          }
          continue;
        }

        const file = fieldFiles[0];
        const filename = `${Date.now()}-${fieldConfig.name}`;

        const uploadPromise = uploadToCloudinary(
          file.buffer,
          folder,
          filename,
        ).then((url) => {
          // Add the Cloudinary URL to req.body
          req.body[fieldConfig.name] = url;
        });

        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to process multiple files for a single field (array of images)
interface ArrayFileFieldConfig {
  name: string;
  required?: boolean;
  maxCount?: number;
}

const processCloudinaryArrayUploads = (
  folder: string,
  fieldConfig: ArrayFileFieldConfig,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        if (fieldConfig.required !== false) {
          throw new BadRequestError(`Missing required files: ${fieldConfig.name}`);
        }
        req.body[fieldConfig.name] = [];
        return next();
      }

      // Upload all files in parallel
      const uploadPromises = files.map((file, index) => {
        const filename = `${Date.now()}-${fieldConfig.name}-${index}`;
        return uploadToCloudinary(file.buffer, folder, filename);
      });

      const urls = await Promise.all(uploadPromises);
      req.body[fieldConfig.name] = urls;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to process a single file upload
const processCloudinarySingleUpload = (
  folder: string,
  fieldName: string,
  required: boolean = true,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file) {
        if (required) {
          throw new BadRequestError(`Missing required file: ${fieldName}`);
        }
        return next();
      }

      const filename = `${Date.now()}-${fieldName}`;
      const url = await uploadToCloudinary(file.buffer, folder, filename);
      req.body[fieldName] = url;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export {
  cloudinaryFileUploadMiddleware,
  processCloudinaryUploads,
  processCloudinaryArrayUploads,
  processCloudinarySingleUpload,
};
export default userFileUploadMiddleware;
