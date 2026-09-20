import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, bearer, registerUser, validUser } from "./helpers.js";

const cookieValue = (setCookie) => setCookie.find((c) => c.startsWith("refreshToken=")).split(";")[0];

describe("POST /api/auth/register", () => {
  it("creates a user, never returns the password, and sets an httpOnly refresh cookie", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser());

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTypeOf("string");
    expect(res.body.data.user.email).toBe("test@example.com");
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.headers["set-cookie"].join()).toMatch(/refreshToken=.*HttpOnly/i);
  });

  it("normalises email casing so duplicates are caught (409)", async () => {
    await registerUser();
    const res = await request(app).post("/api/auth/register").send(validUser({ email: "TEST@Example.com" }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects invalid input with 422 and field-level details", async () => {
    const res = await request(app).post("/api/auth/register").send({ fullName: "A", email: "nope", password: "short" });
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(["email", "fullName", "password"]);
  });

  it("is not vulnerable to NoSQL operator injection in login", async () => {
    await registerUser();
    const res = await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    await registerUser();
    const res = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    await registerUser();
    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "wrongpass1" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "who@example.com", password: "password123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe("GET /api/auth/me", () => {
  it("requires a valid access token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set(bearer("garbage"))).status).toBe(401);
  });

  it("returns the current user", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/auth/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("test@example.com");
  });
});

describe("refresh token rotation", () => {
  it("issues a new pair and invalidates the used refresh token", async () => {
    const { cookies } = await registerUser();
    const original = cookieValue(cookies);

    const first = await request(app).post("/api/auth/refresh").set("Cookie", original);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toBeTypeOf("string");
    expect(cookieValue(first.headers["set-cookie"])).not.toBe(original);

    const replay = await request(app).post("/api/auth/refresh").set("Cookie", original);
    expect(replay.status).toBe(401);
  });

  it("rejects a request without a refresh cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const { cookies } = await registerUser();
    const cookie = cookieValue(cookies);

    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookie)).status).toBe(401);
  });
});
