"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.handleError = exports.notFoundHandler = exports.globalErrorHandler = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const http_status_1 = __importDefault(require("http-status"));
const errors_1 = require("./errors");
const isDevelopment = process.env.NODE_ENV === "development";
/**
 * Convert various error types to AppError
 */
const normalizeError = (error) => {
    // Already an AppError
    if (error instanceof errors_1.AppError) {
        return error;
    }
    // Zod validation error
    if (error instanceof zod_1.ZodError) {
        const errors = error.issues.map((issue) => ({
            field: String(issue.path.join(".")),
            message: issue.message,
        }));
        return new errors_1.AppError("Validation failed", http_status_1.default.BAD_REQUEST, true, errors);
    }
    // Mongoose validation error
    if (error instanceof mongoose_1.default.Error.ValidationError) {
        const errors = Object.values(error.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        return new errors_1.AppError("Validation failed", http_status_1.default.BAD_REQUEST, true, errors);
    }
    // Mongoose CastError (invalid ObjectId)
    if (error instanceof mongoose_1.default.Error.CastError) {
        return new errors_1.AppError(`Invalid ${error.path}: ${error.value}`, http_status_1.default.BAD_REQUEST);
    }
    // MongoDB duplicate key error
    if (error instanceof Error &&
        "code" in error &&
        error.code === 11000) {
        const keyValue = error.keyValue;
        const field = Object.keys(keyValue || {})[0] || "field";
        return new errors_1.AppError(`Duplicate value for ${field}. Please use another value.`, http_status_1.default.CONFLICT);
    }
    // JWT errors
    if (error instanceof Error) {
        if (error.name === "JsonWebTokenError") {
            return new errors_1.AppError("Invalid token. Please log in again.", http_status_1.default.UNAUTHORIZED);
        }
        if (error.name === "TokenExpiredError") {
            return new errors_1.AppError("Your token has expired. Please log in again.", http_status_1.default.UNAUTHORIZED);
        }
    }
    // Generic Error
    if (error instanceof Error) {
        return new errors_1.AppError(error.message, http_status_1.default.INTERNAL_SERVER_ERROR, false);
    }
    // Unknown error
    return new errors_1.AppError("An unexpected error occurred", http_status_1.default.INTERNAL_SERVER_ERROR, false);
};
/**
 * Format error response
 */
const formatErrorResponse = (error) => {
    const response = {
        code: error.statusCode,
        status: error.status,
        message: error.message,
    };
    if (error.errors && error.errors.length > 0) {
        response.errors = error.errors;
    }
    if (isDevelopment && error.stack) {
        response.stack = error.stack;
    }
    return response;
};
/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, _next) => {
    const error = normalizeError(err);
    // Log error in development
    if (isDevelopment) {
        console.error("ERROR:", {
            message: error.message,
            statusCode: error.statusCode,
            stack: error.stack,
            path: req.path,
            method: req.method,
        });
    }
    else if (!error.isOperational) {
        // Log non-operational errors in production (programming errors)
        console.error("CRITICAL ERROR:", error);
    }
    const response = formatErrorResponse(error);
    res.status(error.statusCode).json(response);
};
exports.globalErrorHandler = globalErrorHandler;
/**
 * Handle 404 - Route not found
 */
const notFoundHandler = (req, res, next) => {
    const error = new errors_1.AppError(`Route ${req.originalUrl} not found`, http_status_1.default.NOT_FOUND);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Legacy error handler for backwards compatibility
 * @deprecated Use globalErrorHandler instead
 */
const handleError = (error) => {
    const normalizedError = normalizeError(error);
    return {
        message: normalizedError.message,
        stack: isDevelopment ? normalizedError.stack : undefined,
    };
};
exports.handleError = handleError;
/**
 * Async handler wrapper to catch async errors automatically
 * Eliminates the need for try-catch blocks in controllers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
