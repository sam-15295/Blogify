import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { uploadDir } from "./middlewares/upload.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

// Built separately from server.js so tests can import the app without opening a port.
export function createApp() {
  const app = express();

  // Behind a proxy (Render, Nginx) the real client IP comes from X-Forwarded-For; rate limiting needs it.
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // allow the SPA to show /uploads images
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use("/uploads", express.static(uploadDir, { maxAge: "7d", index: false }));
  app.use("/api", apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
