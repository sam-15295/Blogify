import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { uploadDir } from "./storage/diskStorage.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

const defaultClientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
const API_OR_UPLOADS = /^\/(api|uploads)(\/|$)/;

// Built separately from server.js so tests can import the app without opening a port.
export function createApp({ serveClient = env.SERVE_CLIENT, clientDist = defaultClientDist } = {}) {
  const app = express();

  // Behind a proxy (Render, Nginx) the real client IP comes from X-Forwarded-For; rate limiting needs it.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }, // allow the SPA to show /uploads images
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // blob: powers the cover-image preview in the editor; res.cloudinary.com serves uploaded covers in production.
          "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use("/uploads", express.static(uploadDir, { maxAge: "7d", index: false }));
  app.use("/api", apiLimiter, routes);

  if (serveClient) {
    // Single-origin deployment: the API also serves the built React app, so the browser sees one site
    // (first-party cookies, no CORS, one service to run).
    const indexHtml = path.join(clientDist, "index.html");
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`SERVE_CLIENT is enabled but ${indexHtml} does not exist. Build the client first.`);
    }

    // Vite fingerprints filenames in /assets, so they can be cached forever.
    app.use("/assets", express.static(path.join(clientDist, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(clientDist, { index: false }));

    // Client-side routes (/blogs/123, /login…) must return index.html so React Router can take over.
    // Paths with a file extension are real files: if they weren't found above, fall through to 404.
    app.use((req, res, next) => {
      if (req.method !== "GET" || API_OR_UPLOADS.test(req.path) || path.extname(req.path)) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
