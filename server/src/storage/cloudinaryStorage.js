import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const FOLDER = "blogify";

// "https://res.cloudinary.com/<cloud>/image/upload/v123/blogify/abc.jpg" -> "blogify/abc"
// Only assets inside our own folder are matched, so a crafted URL can never delete anything else.
export function publicIdFromUrl(url) {
  const match = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(blogify\/[^./]+)\.\w+$/.exec(url ?? "");
  return match ? match[1] : null;
}

// The SDK reads its credentials from the CLOUDINARY_URL environment variable.
export const cloudinaryStorage = {
  // Returns the https URL of the stored image.
  save(file) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: FOLDER,
          resource_type: "image",
          allowed_formats: ["jpg", "png", "webp"],
          // Cap the stored size; a 2 MB phone photo does not need to be kept at 4000px.
          transformation: [{ width: 1600, crop: "limit" }],
        },
        (error, result) => {
          if (!error) return resolve(result.secure_url);
          if (error.http_code === 400) {
            // Cloudinary inspects the real file content, so this also catches files that only *claim* to be images.
            return reject(AppError.badRequest("The uploaded file is not a valid image"));
          }
          logger.error({ err: error }, "Cloudinary upload failed");
          reject(new AppError(502, "STORAGE_ERROR", "Image storage is temporarily unavailable"));
        },
      );
      stream.end(file.buffer);
    });
  },

  async remove(url) {
    const publicId = publicIdFromUrl(url);
    if (!publicId) return;
    await cloudinary.uploader
      .destroy(publicId, { resource_type: "image", invalidate: true })
      .catch((err) => logger.warn({ err, publicId }, "Could not delete image from Cloudinary"));
  },
};
