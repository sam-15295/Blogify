import multer from "multer";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { isProd } from "../config/env.js";

export function notFound(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Translate library errors into AppErrors so the client always gets one response shape.
function normalize(err) {
  if (err instanceof AppError) return err;
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large" : err.message;
    return new AppError(400, "UPLOAD_ERROR", message);
  }
  if (err.code === 11000) return AppError.conflict("Duplicate value: resource already exists");
  if (err.name === "CastError") return AppError.badRequest(`Invalid ${err.path}`);
  if (err.type === "entity.parse.failed") return AppError.badRequest("Malformed JSON body");
  if (err.type === "entity.too.large") return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  return null;
}

// Express recognises error middleware by its 4 parameters — keep `_next` even though it is unused.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const known = normalize(err);

  if (!known) {
    // Programmer / unexpected error: log everything, reveal nothing.
    (req.log ?? logger).error({ err }, "Unhandled error");
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", ...(!isProd && { stack: err.stack }) },
    });
  }

  res.status(known.statusCode).json({
    error: { code: known.code, message: known.message, ...(known.details && { details: known.details }) },
  });
}
