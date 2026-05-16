"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.InternalServerError = exports.TooManyRequestsError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.BadRequestError = exports.AppError = void 0;
const http_status_1 = __importDefault(require("http-status"));
class AppError extends Error {
    constructor(message, statusCode = http_status_1.default.INTERNAL_SERVER_ERROR, isOperational = true, errors) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? "FAIL" : "ERROR";
        this.isOperational = isOperational;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = "Bad request", errors) {
        super(message, http_status_1.default.BAD_REQUEST, true, errors);
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends AppError {
    constructor(message = "Validation failed", errors) {
        super(message, http_status_1.default.BAD_REQUEST, true, errors);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized access") {
        super(message, http_status_1.default.UNAUTHORIZED);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Access forbidden") {
        super(message, http_status_1.default.FORBIDDEN);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, http_status_1.default.NOT_FOUND);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = "Resource already exists") {
        super(message, http_status_1.default.CONFLICT);
    }
}
exports.ConflictError = ConflictError;
class TooManyRequestsError extends AppError {
    constructor(message = "Too many requests") {
        super(message, http_status_1.default.TOO_MANY_REQUESTS);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends AppError {
    constructor(message = "Internal server error") {
        super(message, http_status_1.default.INTERNAL_SERVER_ERROR, false);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends AppError {
    constructor(message = "Service temporarily unavailable") {
        super(message, http_status_1.default.SERVICE_UNAVAILABLE, false);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
