import http from "http";
import mongoose from "mongoose";
import { PORT } from "./config/ENV";
import app from "./server";
import connectionToDb from "./config/db";
import { startNotificationWorker } from "./domains/Notification/notification.worker";
import { startRetentionScheduler } from "./domains/Retention/retention.worker";
import { startMediaProcessingWorker } from "./domains/MediaProcessing/mediaProcessing.worker";
import { validateEnvironment } from "./config/validateEnv";
import logger from "./lib/logger";
import redis from "./config/redis";

validateEnvironment();
let server: http.Server | undefined;
let shuttingDown = false;
const isManagedServerless = process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL);

const bootstrap = async () => {
  await connectionToDb();
  startNotificationWorker();
  startRetentionScheduler();
  startMediaProcessingWorker();
  if (!isManagedServerless) {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(PORT || 9500, resolve));
    logger.info("server_started", { port: PORT || 9500 });
  }
};

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown_started", { signal });
  const force = setTimeout(() => process.exit(1), 12_000);
  if (typeof force === "object" && force && "unref" in force) (force as any).unref();
  try {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
    if (redis && ["ready", "connect", "connecting"].includes(redis.status)) await redis.quit().catch(() => undefined);
    logger.info("shutdown_complete", { signal });
    clearTimeout(force);
    process.exit(0);
  } catch (error) {
    logger.error("shutdown_failed", { signal, error });
    clearTimeout(force);
    process.exit(1);
  }
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => logger.error("unhandled_rejection", { reason }));
process.on("uncaughtException", (error) => { logger.error("uncaught_exception", { error }); void shutdown("uncaughtException"); });

void bootstrap().catch((error) => {
  logger.error("bootstrap_failed", { error });
  process.exitCode = 1;
});

export default app;
