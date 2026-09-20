import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RefreshToken } from "../src/models/refreshToken.js";
import { hashToken } from "../src/utils/tokens.js";
import { app, bearer, registerUser, validUser } from "./helpers.js";

// "refreshToken=<value>" — ready to send back as a Cookie header
const cookieValue = (setCookie) => setCookie.find((c) => c.startsWith("refreshToken=")).split(";")[0];
const rawToken = (cookie) => cookie.split("=")[1];
const refresh = (cookie) => request(app).post("/api/auth/refresh").set("Cookie", cookie);

// Pretends the token was exchanged a while ago, i.e. outside the parallel-tab leeway window.
const ageToken = (cookie, ms = 60_000) =>
  RefreshToken.updateOne({ tokenHash: hashToken(rawToken(cookie)) }, { usedAt: new Date(Date.now() - ms) });

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
  it("issues a new pair on refresh", async () => {
    const { cookies } = await registerUser();
    const original = cookieValue(cookies);

    const res = await refresh(original);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
    expect(cookieValue(res.headers["set-cookie"])).not.toBe(original);
  });

  it("rejects a missing or unknown refresh token", async () => {
    expect((await request(app).post("/api/auth/refresh")).status).toBe(401);
    expect((await refresh("refreshToken=not-a-real-token")).status).toBe(401);
  });

  it("lets two tabs refresh with the same cookie at the same time", async () => {
    const { cookies } = await registerUser();
    const original = cookieValue(cookies);

    const [first, second] = await Promise.all([refresh(original), refresh(original)]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // and each tab's new cookie is a working session
    expect((await refresh(cookieValue(first.headers["set-cookie"]))).status).toBe(200);
    expect((await refresh(cookieValue(second.headers["set-cookie"]))).status).toBe(200);
  });

  it("treats a stale replayed token as theft and revokes the whole session", async () => {
    const { cookies } = await registerUser();
    const stolen = cookieValue(cookies);

    const legit = await refresh(stolen); // the real user rotates the token…
    const current = cookieValue(legit.headers["set-cookie"]);
    await ageToken(stolen); // …and later an attacker replays the old one

    const replay = await refresh(stolen);
    expect(replay.status).toBe(401);

    // the legitimate user's newest token was revoked too
    expect((await refresh(current)).status).toBe(401);
  });

  it("does not revoke other sessions when an unknown token is presented", async () => {
    const { cookies } = await registerUser();
    await refresh("refreshToken=guess");
    expect((await refresh(cookieValue(cookies))).status).toBe(200);
  });

  it("logout revokes the whole session, including tokens from parallel tabs", async () => {
    const { cookies } = await registerUser();
    const original = cookieValue(cookies);
    const rotated = cookieValue((await refresh(original)).headers["set-cookie"]);

    expect((await request(app).post("/api/auth/logout").set("Cookie", rotated)).status).toBe(204);

    expect((await refresh(rotated)).status).toBe(401);
    expect((await refresh(original)).status).toBe(401);
  });

  it("keeps separate logins independent", async () => {
    const first = await registerUser();
    const secondLogin = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "password123" });
    const firstCookie = cookieValue(first.cookies);
    const secondCookie = cookieValue(secondLogin.headers["set-cookie"]);

    await request(app).post("/api/auth/logout").set("Cookie", firstCookie);

    expect((await refresh(secondCookie)).status).toBe(200);
  });
});

describe("login timing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("still runs a password comparison when the email does not exist", async () => {
    const compare = vi.spyOn(bcrypt, "compare");

    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(1);
  });
});

describe("password limits", () => {
  it("rejects passwords longer than 72 bytes, which bcrypt would silently truncate", async () => {
    // 24 emoji are only 48 UTF-16 characters but 96 bytes
    const res = await request(app).post("/api/auth/register").send(validUser({ password: "😀".repeat(24) }));
    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toMatchObject({ field: "password", message: expect.stringMatching(/72/) });
  });
});
