import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn() }));
vi.mock("../src/storage/index.js", () => ({ imageStorage: storage, usesCloudinary: true }));

import { app, bearer, registerUser } from "./helpers.js";

const PNG = Buffer.from("89504e470d0a1a0a", "hex");
const URL_1 = "https://res.cloudinary.com/demo/image/upload/v1/blogify/first.png";
const URL_2 = "https://res.cloudinary.com/demo/image/upload/v1/blogify/second.png";

const postWithImage = (token, overrides = {}) =>
  request(app)
    .post("/api/blogs")
    .set(bearer(token))
    .field("title", overrides.title ?? "A post with an image")
    .field("body", overrides.body ?? "This body is long enough to pass validation.")
    .attach("coverImage", PNG, { filename: "cover.png", contentType: "image/png" });

beforeEach(() => {
  // mockReset (not clearAllMocks) also drops unused "once" values left over by earlier tests.
  storage.save.mockReset();
  storage.remove.mockReset();
  storage.save.mockResolvedValueOnce(URL_1);
});

describe("blog cover images go through the storage layer at the right moment", () => {
  it("stores the returned URL when a post is created", async () => {
    const { token } = await registerUser();
    const res = await postWithImage(token);

    expect(res.status).toBe(201);
    expect(res.body.data.coverImageURL).toBe(URL_1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(storage.save.mock.calls[0][0]).toMatchObject({ mimetype: "image/png", buffer: expect.any(Buffer) });
  });

  it("does not store anything if validation fails", async () => {
    const { token } = await registerUser();
    const res = await postWithImage(token, { title: "Hi" });

    expect(res.status).toBe(422);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("does not store anything for unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/blogs")
      .field("title", "A post with an image")
      .field("body", "This body is long enough to pass validation.")
      .attach("coverImage", PNG, { filename: "cover.png", contentType: "image/png" });

    expect(res.status).toBe(401);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("does not store anything when a non-owner tries to replace the image", async () => {
    const owner = await registerUser();
    const other = await registerUser({ email: "other@example.com" });
    const created = await postWithImage(owner.token);
    storage.save.mockClear();

    const res = await request(app)
      .patch(`/api/blogs/${created.body.data._id}`)
      .set(bearer(other.token))
      .field("title", "An updated title")
      .attach("coverImage", PNG, { filename: "new.png", contentType: "image/png" });

    expect(res.status).toBe(403);
    expect(storage.save).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("replaces the image: saves the new one, then removes the old one", async () => {
    const { token } = await registerUser();
    const created = await postWithImage(token);
    storage.save.mockResolvedValueOnce(URL_2);

    const res = await request(app)
      .patch(`/api/blogs/${created.body.data._id}`)
      .set(bearer(token))
      .field("title", "An updated title")
      .attach("coverImage", PNG, { filename: "new.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.data.coverImageURL).toBe(URL_2);
    expect(storage.remove).toHaveBeenCalledWith(URL_1);
  });

  it("allows changing only the cover image", async () => {
    const { token } = await registerUser();
    const created = await postWithImage(token);
    storage.save.mockResolvedValueOnce(URL_2);

    const res = await request(app)
      .patch(`/api/blogs/${created.body.data._id}`)
      .set(bearer(token))
      .attach("coverImage", PNG, { filename: "new.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.data.coverImageURL).toBe(URL_2);
    expect(res.body.data.title).toBe("A post with an image");
    expect(storage.remove).toHaveBeenCalledWith(URL_1);
  });

  it("rejects an update that changes nothing, without touching storage", async () => {
    const { token } = await registerUser();
    const created = await postWithImage(token);
    storage.save.mockClear();

    const res = await request(app).patch(`/api/blogs/${created.body.data._id}`).set(bearer(token)).send({});

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/at least one of/);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("removes the stored image when the post is deleted", async () => {
    const { token } = await registerUser();
    const created = await postWithImage(token);

    const res = await request(app).delete(`/api/blogs/${created.body.data._id}`).set(bearer(token));

    expect(res.status).toBe(204);
    expect(storage.remove).toHaveBeenCalledWith(URL_1);
  });

  it("reports storage outages as 502 and creates no post", async () => {
    const { token } = await registerUser();
    storage.save.mockReset();
    const { AppError } = await import("../src/utils/AppError.js");
    storage.save.mockRejectedValueOnce(new AppError(502, "STORAGE_ERROR", "Image storage is temporarily unavailable"));

    const res = await postWithImage(token);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("STORAGE_ERROR");

    const list = await request(app).get("/api/blogs");
    expect(list.body.meta.total).toBe(0);
  });
});
