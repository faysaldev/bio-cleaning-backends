import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import httpStatus from "http-status";
import { AppError, ErrorResponse } from "./errors";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Convert various error types to AppError
 */
const normalizeError = (error: unknown): AppError => {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      field: String(issue.path.join(".")),
      message: issue.message,
    }));
    return new AppError("Validation failed", httpStatus.BAD_REQUEST, true, errors);
  }

  // Mongoose validation error
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new AppError("Validation failed", httpStatus.BAD_REQUEST, true, errors);
  }

  // Mongoose CastError (invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${error.path}: ${error.value}`, httpStatus.BAD_REQUEST);
  }

  // MongoDB duplicate key error
  if (
    error instanceof Error &&
    "code" in error &&
    (error as any).code === 11000
  ) {
    const keyValue = (error as any).keyValue;
    const field = Object.keys(keyValue || {})[0] || "field";
    return new AppError(
      `Duplicate value for ${field}. Please use another value.`,
      httpStatus.CONFLICT
    );
  }

  // JWT errors
  if (error instanceof Error) {
    if (error.name === "JsonWebTokenError") {
      return new AppError("Invalid token. Please log in again.", httpStatus.UNAUTHORIZED);
    }
    if (error.name === "TokenExpiredError") {
      return new AppError("Your token has expired. Please log in again.", httpStatus.UNAUTHORIZED);
    }
  }

  // Generic Error
  if (error instanceof Error) {
    return new AppError(error.message, httpStatus.INTERNAL_SERVER_ERROR, false);
  }

  // Unknown error
  return new AppError("An unexpected error occurred", httpStatus.INTERNAL_SERVER_ERROR, false);
};

/**
 * Format error response
 */
const formatErrorResponse = (error: AppError): ErrorResponse => {
  const response: ErrorResponse = {
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
export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
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
  } else if (!error.isOperational) {
    // Log non-operational errors in production (programming errors)
    console.error("CRITICAL ERROR:", error);
  }

  const response = formatErrorResponse(error);
  res.status(error.statusCode).json(response);
};

/**
 * Handle 404 - Route not found
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, httpStatus.NOT_FOUND);
  next(error);
};

/**
 * Legacy error handler for backwards compatibility
 * @deprecated Use globalErrorHandler instead
 */
export const handleError = (error: unknown): { message: string; stack?: string } => {
  const normalizedError = normalizeError(error);
  return {
    message: normalizedError.message,
    stack: isDevelopment ? normalizedError.stack : undefined,
  };
};

/**
 * Async handler wrapper to catch async errors automatically
 * Eliminates the need for try-catch blocks in controllers
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
