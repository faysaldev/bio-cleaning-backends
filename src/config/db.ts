import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ quiet: true });
const MongodbURL = process.env.DATABASE_URL;

const connectionToDb = async () => {
  if (!MongodbURL) {
    process.exit(1);
  }
  try {
    await mongoose.connect(MongodbURL);
    console.log("MongoDB Server Connected");
  } catch (error) {
    console.error("MongoDB connected Error", error);
    process.exit(1);
  }
};

export default connectionToDb;
