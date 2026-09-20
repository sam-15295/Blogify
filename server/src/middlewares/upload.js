import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const uploadDir = path.resolve(env.UPLOAD_DIR);

// Extension comes from the validated MIME type, never from the client-supplied filename.
const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype]}`),
});

export const uploadCoverImage = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(AppError.badRequest("Only JPEG, PNG or WebP images are allowed")),
}).single("coverImage");
