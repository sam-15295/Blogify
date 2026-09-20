import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { ALLOWED_IMAGE_TYPES } from "../middlewares/upload.js";

export const uploadDir = path.resolve(env.UPLOAD_DIR);
export const PUBLIC_PREFIX = "/uploads/";

// Local-disk storage: used in development and tests, or when Cloudinary is not configured.
export const diskStorage = {
  // Returns the public URL path of the stored image.
  async save(file) {
    await fs.mkdir(uploadDir, { recursive: true });
    // Name and extension are generated here; the client's filename is never used.
    const name = `${randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`;
    await fs.writeFile(path.join(uploadDir, name), file.buffer);
    return `${PUBLIC_PREFIX}${name}`;
  },

  // Best-effort: a missing file must never fail the request that triggered the cleanup.
  async remove(url) {
    if (!url?.startsWith(PUBLIC_PREFIX)) return;
    // basename() blocks path traversal even if a bad value ever reached the database.
    await fs.unlink(path.join(uploadDir, path.basename(url))).catch(() => {});
  },
};
