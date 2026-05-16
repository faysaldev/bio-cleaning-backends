"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const logFormat = winston_1.default.format.printf(({ level, message }) => {
    return `${level}: ${message}`;
});
const fileTransport = new winston_1.default.transports.DailyRotateFile({
    filename: "logs/server-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "7d",
    level: "info",
});
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }),
];
// Add file transport only if not on Vercel
if (!process.env.VERCEL) {
    transports.push(fileTransport);
}
const logger = winston_1.default.createLogger({
    level: "info",
    format: logFormat,
    transports,
});
exports.default = logger;
