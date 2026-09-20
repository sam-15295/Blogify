import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/user.js";

export const app = createApp();

export const validUser = (overrides = {}) => ({
  fullName: "Test User",
  email: "test@example.com",
  password: "password123",
  ...overrides,
});

export async function registerUser(overrides = {}) {
  const res = await request(app).post("/api/auth/register").send(validUser(overrides));
  return { token: res.body.data.accessToken, user: res.body.data.user, cookies: res.headers["set-cookie"] };
}

export async function createAdmin() {
  await User.create({ fullName: "Admin", email: "admin@example.com", password: "password123", role: "ADMIN" });
  const res = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
  return { token: res.body.data.accessToken };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export async function createBlog(token, overrides = {}) {
  const res = await request(app)
    .post("/api/blogs")
    .set(bearer(token))
    .field("title", overrides.title ?? "My first post")
    .field("body", overrides.body ?? "This is the body of my first post.");
  return res.body.data;
}
