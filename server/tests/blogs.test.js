import request from "supertest";
import { describe, expect, it } from "vitest";
import { Comment } from "../src/models/comment.js";
import { app, bearer, createAdmin, createBlog, registerUser } from "./helpers.js";

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

describe("POST /api/blogs", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/blogs").field("title", "Hello there").field("body", "A long enough body.");
    expect(res.status).toBe(401);
  });

  it("creates a blog owned by the caller, with an excerpt", async () => {
    const { token, user } = await registerUser();
    const longBody = "x".repeat(500);
    const res = await request(app).post("/api/blogs").set(bearer(token)).field("title", "Hello there").field("body", longBody);

    expect(res.status).toBe(201);
    expect(res.body.data.createdBy._id).toBe(user._id);
    expect(res.body.data.excerpt.length).toBeLessThan(longBody.length);
  });

  it("validates input", async () => {
    const { token } = await registerUser();
    const res = await request(app).post("/api/blogs").set(bearer(token)).field("title", "Hi").field("body", "short");
    expect(res.status).toBe(422);
  });

  it("accepts an image and rejects non-images", async () => {
    const { token } = await registerUser();
    const send = (buffer, filename, contentType) =>
      request(app)
        .post("/api/blogs")
        .set(bearer(token))
        .field("title", "With image")
        .field("body", "A long enough body.")
        .attach("coverImage", buffer, { filename, contentType });

    const ok = await send(PNG, "cover.png", "image/png");
    expect(ok.status).toBe(201);
    expect(ok.body.data.coverImageURL).toMatch(/^\/uploads\/[\w-]+\.png$/);

    const bad = await send(Buffer.from("<script>alert(1)</script>"), "evil.html", "text/html");
    expect(bad.status).toBe(400);
  });

  it("rejects images over the size limit", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/blogs")
      .set(bearer(token))
      .field("title", "Too big")
      .field("body", "A long enough body.")
      .attach("coverImage", Buffer.alloc(3 * 1024 * 1024), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_ERROR");
  });
});

describe("GET /api/blogs", () => {
  it("paginates newest-first and omits the full body", async () => {
    const { token } = await registerUser();
    for (let i = 1; i <= 5; i++) await createBlog(token, { title: `Post number ${i}` });

    const res = await request(app).get("/api/blogs?page=2&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data.map((b) => b.title)).toEqual(["Post number 3", "Post number 2"]);
    expect(res.body.data[0]).not.toHaveProperty("body");
  });

  it("caps limit to protect the database", async () => {
    const res = await request(app).get("/api/blogs?limit=1000");
    expect(res.status).toBe(422);
  });

  it("searches by text", async () => {
    const { token } = await registerUser();
    await createBlog(token, { title: "Learning Docker", body: "Containers make deployment predictable." });
    await createBlog(token, { title: "Cooking pasta", body: "Boil water, add salt, wait patiently." });

    const res = await request(app).get("/api/blogs?q=docker");
    expect(res.body.data.map((b) => b.title)).toEqual(["Learning Docker"]);
  });
});

describe("GET /api/blogs/:id", () => {
  it("returns the blog with the author's public fields only", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);
    const res = await request(app).get(`/api/blogs/${blog._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.body).toBeTypeOf("string");
    expect(res.body.data.createdBy).toEqual({ _id: blog.createdBy._id, fullName: "Test User" });
  });

  it("returns 422 for a malformed id and 404 for a missing one", async () => {
    expect((await request(app).get("/api/blogs/not-an-id")).status).toBe(422);
    expect((await request(app).get("/api/blogs/64b7f0f2a1b2c3d4e5f60718")).status).toBe(404);
  });
});

describe("PATCH and DELETE /api/blogs/:id (authorization)", () => {
  it("lets the owner update and blocks other users with 403", async () => {
    const owner = await registerUser();
    const other = await registerUser({ email: "other@example.com" });
    const blog = await createBlog(owner.token);

    const forbidden = await request(app).patch(`/api/blogs/${blog._id}`).set(bearer(other.token)).send({ title: "Hacked title" });
    expect(forbidden.status).toBe(403);

    const ok = await request(app).patch(`/api/blogs/${blog._id}`).set(bearer(owner.token)).send({ title: "Edited title" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.title).toBe("Edited title");
  });

  it("requires at least one field to update", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);
    const res = await request(app).patch(`/api/blogs/${blog._id}`).set(bearer(token)).send({});
    expect(res.status).toBe(422);
  });

  it("blocks non-owners from deleting but allows an admin, and deletes the comments too", async () => {
    const owner = await registerUser();
    const other = await registerUser({ email: "other@example.com" });
    const admin = await createAdmin();
    const blog = await createBlog(owner.token);
    await request(app).post(`/api/blogs/${blog._id}/comments`).set(bearer(other.token)).send({ content: "Nice one" });

    expect((await request(app).delete(`/api/blogs/${blog._id}`).set(bearer(other.token))).status).toBe(403);
    expect((await request(app).delete(`/api/blogs/${blog._id}`).set(bearer(admin.token))).status).toBe(204);

    expect((await request(app).get(`/api/blogs/${blog._id}`)).status).toBe(404);
    expect(await Comment.countDocuments({ blog: blog._id })).toBe(0);
  });
});
