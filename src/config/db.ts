import dotenv from "dotenv";
import mongoose from "mongoose";
import logger from "../lib/logger";

dotenv.config({ quiet: true });

let cachedPromise: Promise<typeof mongoose> | null = null;

const connectionToDb = async (): Promise<typeof mongoose> => {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required");

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: Math.max(5, Number(process.env.MONGODB_MAX_POOL_SIZE || 20)),
        minPoolSize: Math.max(0, Number(process.env.MONGODB_MIN_POOL_SIZE || 0)),
      })
      .then((m) => {
        logger.info("mongodb_connected", { readyState: mongoose.connection.readyState });
        return m;
      })
      .catch((err) => {
        cachedPromise = null;
        logger.error("mongodb_connection_error", { error: err });
        throw err;
      });
  }

  return cachedPromise;
};

export default connectionToDb;
