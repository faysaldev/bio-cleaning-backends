import winston from "winston";
import "winston-daily-rotate-file";

const production = process.env.NODE_ENV === "production";
const fileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/server-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "7d",
  level: "info",
});

const transports: winston.transport[] = [new winston.transports.Console()];
if (!process.env.VERCEL && !process.env.CLOUD_RUN_JOB) transports.push(fileTransport);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "bio-cleaning-api", release: process.env.APP_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "development" },
  format: production
    ? winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json())
    : winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
  transports,
});
export default logger;
