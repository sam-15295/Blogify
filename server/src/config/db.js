import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDB(uri = env.MONGO_URI) {
  // The default wait for an unreachable database is 30 s; failing after 10 s gives faster feedback on a bad URI.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info("MongoDB connected");
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
