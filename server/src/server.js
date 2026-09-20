import mongoose from "mongoose";
import { env, isProd } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { usesCloudinary } from "./storage/index.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const SHUTDOWN_TIMEOUT_MS = 10 * 1000;

async function start() {
  await connectDB();

  if (usesCloudinary) logger.info("Image storage: Cloudinary");
  else if (isProd) logger.warn("Image storage: local disk. Most hosts wipe it on restart; set CLOUDINARY_URL to keep images.");
  else logger.info("Image storage: local disk (set CLOUDINARY_URL to use Cloudinary)");

  const server = createApp().listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));

  // Graceful shutdown: stop accepting requests, let in-flight ones finish, then close the DB.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);

    // A stuck connection must not keep the process alive forever (the host would eventually SIGKILL it).
    setTimeout(() => {
      logger.error("Shutdown took too long, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// After an unhandled rejection or uncaught exception the process may be in an undefined state.
// The safe response is to log it in full and exit, so the host restarts a clean process.
const crash = (kind) => (err) => {
  logger.fatal({ err }, kind);
  process.exit(1);
};
process.on("unhandledRejection", crash("Unhandled promise rejection"));
process.on("uncaughtException", crash("Uncaught exception"));

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
