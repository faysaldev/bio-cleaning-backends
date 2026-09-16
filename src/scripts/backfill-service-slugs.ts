import connectionToDb from "../config/db";
import { backfillServiceSlugs } from "../domains/Service/service.services";
import mongoose from "mongoose";

(async () => {
  await connectionToDb();
  const updated = await backfillServiceSlugs();
  console.log(`Service slug backfill complete: ${updated} updated`);
  await mongoose.disconnect();
})().catch((error) => { console.error(error); process.exit(1); });
