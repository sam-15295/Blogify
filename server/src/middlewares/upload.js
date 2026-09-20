import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

// Extension comes from the validated MIME type, never from the client-supplied filename.
export const ALLOWED_IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

// The file is kept in memory (max MAX_UPLOAD_MB) and only written to storage by the service, AFTER
// validation and authorization have passed. Rejected requests therefore never leave files behind.
export const uploadCoverImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_IMAGE_TYPES[file.mimetype]
      ? cb(null, true)
      : cb(AppError.badRequest("Only JPEG, PNG or WebP images are allowed")),
}).single("coverImage");
