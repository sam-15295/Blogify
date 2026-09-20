import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, bearer, createBlog, registerUser, validUser } from "./helpers.js";

const detailsOf = (res) => Object.fromEntries(res.body.error.details.map((d) => [d.field, d.message]));

describe("validation messages are readable by humans", () => {
  it("explains registration problems in plain language", async () => {
    const res = await request(app).post("/api/auth/register").send({ fullName: "A", email: "nope", password: "short" });

    expect(res.status).toBe(422);
    expect(detailsOf(res)).toEqual({
      fullName: "Full name must be at least 2 characters",
      email: "Enter a valid email address",
      password: "Password must be at least 8 characters",
    });
  });

  it("says a field is required when it is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(detailsOf(res)).toEqual({
      fullName: "Full name is required",
      email: "Email is required",
      password: "Password is required",
    });
  });

  it("does not echo Zod internals when the wrong type is sent", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: 123 });
    expect(detailsOf(res)).toEqual({ email: "Email must be text", password: "Password must be text" });
  });

  it("explains blog, comment and query problems", async () => {
    const { token } = await registerUser();
    const blog = await createBlog(token);

    const badBlog = await request(app).post("/api/blogs").set(bearer(token)).field("title", "Hi").field("body", "short");
    expect(detailsOf(badBlog)).toEqual({
      title: "Title must be at least 3 characters",
      body: "Body must be at least 10 characters",
    });

    const badComment = await request(app).post(`/api/blogs/${blog._id}/comments`).set(bearer(token)).send({ content: "  " });
    expect(detailsOf(badComment)).toEqual({ content: "Comment can't be empty" });

    const badQuery = await request(app).get("/api/blogs?limit=500&page=0");
    expect(detailsOf(badQuery)).toEqual({ limit: "Limit can be at most 50", page: "Page must be at least 1" });
  });
});

describe("request size and format", () => {
  it("answers 413, not 500, when the JSON body is too large", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "x".repeat(200_000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(res.body.error).not.toHaveProperty("stack");
  });

  it("answers 400 for malformed JSON", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Malformed JSON body");
  });

  it("accepts a normal registration at the size limits", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validUser({ fullName: "N".repeat(60), password: "p".repeat(72) }));
    expect(res.status).toBe(201);
  });
});
