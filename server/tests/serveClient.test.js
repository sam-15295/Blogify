import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("serving the built client (single-origin deployment)", () => {
  let dist;
  let app;

  beforeAll(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), "blogify-dist-"));
    fs.mkdirSync(path.join(dist, "assets"));
    fs.writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>Blogify SPA</title>");
    fs.writeFileSync(path.join(dist, "assets", "app-abc123.js"), "console.log('hi')");
    app = createApp({ serveClient: true, clientDist: dist });
  });

  afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

  it("serves index.html for client-side routes so deep links and refreshes work", async () => {
    for (const route of ["/", "/login", "/blogs/64b7f0f2a1b2c3d4e5f60718", "/blogs/new"]) {
      const res = await request(app).get(route);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Blogify SPA");
    }
  });

  it("serves fingerprinted assets with long-lived cache headers", async () => {
    const res = await request(app).get("/assets/app-abc123.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toMatch(/max-age=31536000.*immutable/);
  });

  it("does not turn missing files or unknown API routes into HTML", async () => {
    const missingAsset = await request(app).get("/assets/old-hash.js");
    expect(missingAsset.status).toBe(404);
    expect(missingAsset.headers["content-type"]).toMatch(/json/);

    const missingApi = await request(app).get("/api/nope");
    expect(missingApi.status).toBe(404);
    expect(missingApi.body.error.code).toBe("NOT_FOUND");
  });

  it("still answers API calls normally", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body).toEqual({ status: "ok" });
  });

  it("refuses to start if the client has not been built", () => {
    expect(() => createApp({ serveClient: true, clientDist: path.join(dist, "missing") })).toThrow(/Build the client first/);
  });

  it("sends a CSP that allows blob: images for the upload preview", async () => {
    const res = await request(app).get("/");
    expect(res.headers["content-security-policy"]).toMatch(/img-src 'self' data: blob:/);
  });
});
