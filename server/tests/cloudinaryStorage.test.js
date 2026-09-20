import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudinary", () => ({
  v2: { uploader: { upload_stream: vi.fn(), destroy: vi.fn() } },
}));

import { v2 as cloudinary } from "cloudinary";
import { cloudinaryStorage, publicIdFromUrl } from "../src/storage/cloudinaryStorage.js";
import { diskStorage, uploadDir } from "../src/storage/diskStorage.js";
import { imageStorage } from "../src/storage/index.js";

const URL = "https://res.cloudinary.com/demo/image/upload/v1712345678/blogify/abc123.jpg";
const png = { buffer: Buffer.from("89504e470d0a1a0a", "hex"), mimetype: "image/png" };

// Makes the mocked SDK behave like a successful or failed upload stream.
const mockUpload = (result) =>
  cloudinary.uploader.upload_stream.mockImplementation((_options, callback) => ({
    end: (buffer) => callback(result.error, result.value && { ...result.value, receivedBytes: buffer.length }),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });
});

describe("publicIdFromUrl", () => {
  it("extracts the public id, with or without a version segment", () => {
    expect(publicIdFromUrl(URL)).toBe("blogify/abc123");
    expect(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/blogify/abc123.png")).toBe("blogify/abc123");
  });

  it("refuses anything outside our folder or not served by Cloudinary", () => {
    expect(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1/other-folder/abc.jpg")).toBeNull();
    expect(publicIdFromUrl("https://evil.example.com/image/upload/v1/blogify/abc.jpg")).toBeNull();
    expect(publicIdFromUrl("http://res.cloudinary.com/demo/image/upload/v1/blogify/abc.jpg")).toBeNull();
    expect(publicIdFromUrl("/uploads/abc.png")).toBeNull();
    expect(publicIdFromUrl(undefined)).toBeNull();
  });
});

describe("cloudinaryStorage.save", () => {
  it("uploads the buffer into our folder as an image and returns the https URL", async () => {
    mockUpload({ value: { secure_url: URL } });

    await expect(cloudinaryStorage.save(png)).resolves.toBe(URL);

    const [options] = cloudinary.uploader.upload_stream.mock.calls[0];
    expect(options).toMatchObject({ folder: "blogify", resource_type: "image" });
    expect(options.allowed_formats).toEqual(["jpg", "png", "webp"]);
  });

  it("maps 'not a valid image' (400) to a client error", async () => {
    mockUpload({ error: { http_code: 400, message: "Invalid image file" } });
    await expect(cloudinaryStorage.save(png)).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
  });

  it("maps any other Cloudinary failure to 502 without leaking details", async () => {
    mockUpload({ error: { http_code: 401, message: "Invalid api_key secret-detail" } });
    const error = await cloudinaryStorage.save(png).catch((e) => e);
    expect(error).toMatchObject({ statusCode: 502, code: "STORAGE_ERROR" });
    expect(error.message).not.toMatch(/api_key/);
  });
});

describe("cloudinaryStorage.remove", () => {
  it("destroys the image by its public id", async () => {
    await cloudinaryStorage.remove(URL);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("blogify/abc123", { resource_type: "image", invalidate: true });
  });

  it("does nothing for URLs it doesn't own", async () => {
    await cloudinaryStorage.remove("/uploads/x.png");
    await cloudinaryStorage.remove(undefined);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("never throws if Cloudinary is down", async () => {
    cloudinary.uploader.destroy.mockRejectedValue(new Error("network"));
    await expect(cloudinaryStorage.remove(URL)).resolves.toBeUndefined();
  });
});

describe("imageStorage (router between backends)", () => {
  it("saves to local disk when CLOUDINARY_URL is not configured", async () => {
    const url = await imageStorage.save(png);
    expect(url).toMatch(/^\/uploads\/[\w-]+\.png$/);
    expect(fs.existsSync(path.join(uploadDir, path.basename(url)))).toBe(true);
    await diskStorage.remove(url);
  });

  it("removes an image using the backend that owns its URL", async () => {
    const localUrl = await diskStorage.save(png);
    await imageStorage.remove(localUrl);
    expect(fs.existsSync(path.join(uploadDir, path.basename(localUrl)))).toBe(false);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();

    await imageStorage.remove(URL);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
  });
});
