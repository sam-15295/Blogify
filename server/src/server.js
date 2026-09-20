import fs from "node:fs";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { uploadDir } from "./middlewares/upload.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

async function start() {
  fs.mkdirSync(uploadDir, { recursive: true });
  await connectDB();

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
