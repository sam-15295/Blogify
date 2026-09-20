import mongoose from "mongoose";
import { env, isProd } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { usesCloudinary } from "./storage/index.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

async function start() {
  await connectDB();

  if (usesCloudinary) logger.info("Image storage: Cloudinary");
  else if (isProd) logger.warn("Image storage: local disk. Most hosts wipe it on restart; set CLOUDINARY_URL to keep images.");
  else logger.info("Image storage: local disk (set CLOUDINARY_URL to use Cloudinary)");

  const server = createApp().listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));

  // Graceful shutdown: stop accepting requests, let in-flight ones finish, then close the DB.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
