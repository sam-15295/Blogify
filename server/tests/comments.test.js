import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, bearer, createBlog, registerUser } from "./helpers.js";

describe("comments", () => {
  it("requires authentication to comment", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);
    const res = await request(app).post(`/api/blogs/${blog._id}/comments`).send({ content: "Hello" });
    expect(res.status).toBe(401);
  });

  it("creates and lists comments newest-first with pagination", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);

    for (const content of ["first", "second", "third"]) {
      const res = await request(app).post(`/api/blogs/${blog._id}/comments`).set(bearer(token)).send({ content });
      expect(res.status).toBe(201);
    }

    const res = await request(app).get(`/api/blogs/${blog._id}/comments?limit=2`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.content)).toEqual(["third", "second"]);
    expect(res.body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  it("404s when commenting on a blog that does not exist", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/blogs/64b7f0f2a1b2c3d4e5f60718/comments")
      .set(bearer(token))
      .send({ content: "Anyone home?" });
    expect(res.status).toBe(404);
  });

  it("rejects empty comments", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);
    const res = await request(app).post(`/api/blogs/${blog._id}/comments`).set(bearer(token)).send({ content: "   " });
    expect(res.status).toBe(422);
  });

  it("only the author (or an admin) can delete a comment", async () => {
    const author = await registerUser();
    const other = await registerUser({ email: "other@example.com" });
    const blog = await createBlog(author.token);
    const created = await request(app).post(`/api/blogs/${blog._id}/comments`).set(bearer(author.token)).send({ content: "Mine" });
    const id = created.body.data._id;

    expect((await request(app).delete(`/api/comments/${id}`).set(bearer(other.token))).status).toBe(403);
    expect((await request(app).delete(`/api/comments/${id}`).set(bearer(author.token))).status).toBe(204);
    expect((await request(app).delete(`/api/comments/${id}`).set(bearer(author.token))).status).toBe(404);
  });
});
