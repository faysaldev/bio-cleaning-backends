import dotenv from "dotenv";
import mongoose from "mongoose";
import logger from "../lib/logger";

dotenv.config({ quiet: true });

const connectionToDb = async () => {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: Math.max(5, Number(process.env.MONGODB_MAX_POOL_SIZE || 30)),
    minPoolSize: Math.max(0, Number(process.env.MONGODB_MIN_POOL_SIZE || 0)),
  });
  logger.info("mongodb_connected", { readyState: mongoose.connection.readyState });
};
export default connectionToDb;
