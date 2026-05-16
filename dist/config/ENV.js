"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRYPTO_SECRET_KEY = exports.CLOUDINARY_API_SECRET = exports.CLOUDINARY_API_KEY = exports.CLOUDINARY_CLOUD_NAME = exports.REDIS_DB = exports.REDIS_PASSWORD = exports.REDIS_PORT = exports.REDIS_HOST = exports.FRONTEND_URL = exports.STRIPE_SECRET_KEY = exports.EMAIL_PASSWORD = exports.EMAIL_USERNAME = exports.JWT_REFRESH_SECRET = exports.JWT_EXPIRE_TIME = exports.JWT_SECRET = exports.DATABASE_URL = exports.SOCKET_PORT = exports.PORT = exports.BACKEND_IP = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
exports.BACKEND_IP = process.env.BACKEND_IP;
exports.PORT = parseInt(process.env.PORT, 10);
exports.SOCKET_PORT = parseInt(process.env.SOCKET_PORT, 10);
exports.DATABASE_URL = process.env.DATABASE_URL;
exports.JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_EXPIRE_TIME = parseInt(process.env.JWT_EXPIRE_TIME, 10);
exports.JWT_REFRESH_SECRET = process.env
    .JWT_REFRESH_SECRET;
exports.EMAIL_USERNAME = process.env.EMAIL_USERNAME;
exports.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
exports.STRIPE_SECRET_KEY = process.env
    .STRIPE_SECRET_KEY;
exports.FRONTEND_URL = process.env.FRONTEND_URL; // Optional, so it can be undefined
exports.REDIS_HOST = process.env.REDIS_HOST;
exports.REDIS_PORT = process.env.REDIS_PORT;
exports.REDIS_PASSWORD = process.env.REDIS_PASSWORD;
exports.REDIS_DB = process.env.REDIS_DB;
exports.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
exports.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
exports.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
// crypto secret key
exports.CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY;
