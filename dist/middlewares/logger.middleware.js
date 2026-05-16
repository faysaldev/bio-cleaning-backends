"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../lib/logger"));
const logRequestResponse = (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - start;
        logger_1.default.info(`${req.method} ${req.originalUrl} - ${duration}ms`);
        res.send = originalSend;
        return res.send(body);
    };
    next();
};
exports.default = logRequestResponse;
