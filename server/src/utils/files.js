import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "../middlewares/upload.js";

export const toPublicUrl = (file) => `/uploads/${file.filename}`;

// Best-effort cleanup: a missing file must never fail the request that triggered it.
export async function removeUpload(publicUrl) {
  if (!publicUrl) return;
  // basename() blocks path traversal even if a bad value ever reached the DB.
  await fs.unlink(path.join(uploadDir, path.basename(publicUrl))).catch(() => {});
}
