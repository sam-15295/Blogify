import { env } from "../config/env.js";
import { cloudinaryStorage } from "./cloudinaryStorage.js";
import { PUBLIC_PREFIX, diskStorage } from "./diskStorage.js";

export const usesCloudinary = Boolean(env.CLOUDINARY_URL);

// Where NEW images go depends on configuration; where an EXISTING image lives depends on its URL.
// Routing removal by URL means switching storage later never leaves undeletable old images.
export const imageStorage = {
  save: (file) => (usesCloudinary ? cloudinaryStorage : diskStorage).save(file),
  remove: (url) => (url?.startsWith(PUBLIC_PREFIX) ? diskStorage : cloudinaryStorage).remove(url),
};
