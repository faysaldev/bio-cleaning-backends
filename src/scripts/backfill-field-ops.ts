import mongoose from "mongoose";
import connectDB from "../config/db";
import fieldOpsService from "../domains/FieldOps/fieldOps.services";

const run = async () => {
  await connectDB();
  const result = await fieldOpsService.backfillJobs();
  console.log(`Field operations backfill complete. Processed ${result.processed} bookings.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Field operations backfill failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
