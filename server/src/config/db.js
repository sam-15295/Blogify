import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDB(uri = env.MONGO_URI) {
  await mongoose.connect(uri);
  logger.info("MongoDB connected");
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
