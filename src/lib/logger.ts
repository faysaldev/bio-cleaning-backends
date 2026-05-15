import winston, { Logform } from "winston";
import "winston-daily-rotate-file";

const logFormat = winston.format.printf(({ level, message }) => {
  return `${level}: ${message}`;
});

const fileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/server-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "7d",
  level: "info",
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// Add file transport only if not on Vercel
if (!process.env.VERCEL) {
  transports.push(fileTransport);
}

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports,
});

export default logger;
