"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCloudinarySingleUpload = exports.processCloudinaryArrayUploads = exports.processCloudinaryUploads = exports.cloudinaryFileUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("cloudinary");
const ENV_1 = require("../config/ENV");
const errors_1 = require("../lib/errors");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: ENV_1.CLOUDINARY_CLOUD_NAME,
    api_key: ENV_1.CLOUDINARY_API_KEY,
    api_secret: ENV_1.CLOUDINARY_API_SECRET,
});
// Middleware for local file upload
const userFileUploadMiddleware = (uploadFolder) => {
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadFolder); // Set the destination folder
        },
        filename: (req, file, cb) => {
            const extname = path_1.default.extname(file.originalname);
            const filename = Date.now() + "-" + file.fieldname + extname; // Unique file name
            cb(null, filename);
        },
    });
    return (0, multer_1.default)({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
        fileFilter: (req, file, cb) => {
            const fileTypes = /jpeg|jpg|png/;
            const extname = fileTypes.test(path_1.default.extname(file.originalname).toLowerCase());
            const mimetype = fileTypes.test(file.mimetype);
            if (extname && mimetype) {
                return cb(null, true); // If file is valid, allow it
            }
            else {
                const error = new Error("Only image files are allowed!");
                error.code = "INVALID_FILE_TYPE";
                return cb(error, false);
            }
        },
    });
};
// Middleware for Cloudinary file upload (memory storage)
const cloudinaryFileUploadMiddleware = () => {
    return (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
        fileFilter: (req, file, cb) => {
            const fileTypes = /jpeg|jpg|png/;
            const extname = fileTypes.test(path_1.default.extname(file.originalname).toLowerCase());
            const mimetype = fileTypes.test(file.mimetype);
            if (extname && mimetype) {
                return cb(null, true); // If file is valid, allow it
            }
            else {
                const error = new Error("Only image files are allowed!");
                error.code = "INVALID_FILE_TYPE";
                return cb(error, false);
            }
        },
    });
};
exports.cloudinaryFileUploadMiddleware = cloudinaryFileUploadMiddleware;
// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: filename,
            resource_type: "image",
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve((result === null || result === void 0 ? void 0 : result.secure_url) || "");
            }
        });
        uploadStream.end(buffer);
    });
};
const processCloudinaryUploads = (folder, fileFields) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const files = req.files;
            if (!files) {
                // Check if any required fields are missing
                const missingRequired = fileFields.filter((field) => field.required !== false);
                if (missingRequired.length > 0) {
                    throw new errors_1.BadRequestError(`Missing required files: ${missingRequired.map((f) => f.name).join(", ")}`);
                }
                return next();
            }
            // Process each file field
            const uploadPromises = [];
            for (const fieldConfig of fileFields) {
                const fieldFiles = files[fieldConfig.name];
                if (!fieldFiles || fieldFiles.length === 0) {
                    if (fieldConfig.required !== false) {
                        throw new errors_1.BadRequestError(`Missing required file: ${fieldConfig.name}`);
                    }
                    continue;
                }
                const file = fieldFiles[0];
                const filename = `${Date.now()}-${fieldConfig.name}`;
                const uploadPromise = uploadToCloudinary(file.buffer, folder, filename).then((url) => {
                    // Add the Cloudinary URL to req.body
                    req.body[fieldConfig.name] = url;
                });
                uploadPromises.push(uploadPromise);
            }
            yield Promise.all(uploadPromises);
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.processCloudinaryUploads = processCloudinaryUploads;
const processCloudinaryArrayUploads = (folder, fieldConfig) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                if (fieldConfig.required !== false) {
                    throw new errors_1.BadRequestError(`Missing required files: ${fieldConfig.name}`);
                }
                req.body[fieldConfig.name] = [];
                return next();
            }
            // Upload all files in parallel
            const uploadPromises = files.map((file, index) => {
                const filename = `${Date.now()}-${fieldConfig.name}-${index}`;
                return uploadToCloudinary(file.buffer, folder, filename);
            });
            const urls = yield Promise.all(uploadPromises);
            req.body[fieldConfig.name] = urls;
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.processCloudinaryArrayUploads = processCloudinaryArrayUploads;
// Middleware to process a single file upload
const processCloudinarySingleUpload = (folder, fieldName, required = true) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const file = req.file;
            if (!file) {
                if (required) {
                    throw new errors_1.BadRequestError(`Missing required file: ${fieldName}`);
                }
                return next();
            }
            const filename = `${Date.now()}-${fieldName}`;
            const url = yield uploadToCloudinary(file.buffer, folder, filename);
            req.body[fieldName] = url;
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.processCloudinarySingleUpload = processCloudinarySingleUpload;
exports.default = userFileUploadMiddleware;
