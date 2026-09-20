import multer from "multer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

// Runs the middleware with a fake response and returns what it would have sent.
function handle(error) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const req = { log: { error: vi.fn() } };
  errorHandler(error, req, res, vi.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0], logged: req.log.error };
}

describe("errorHandler", () => {
  it("passes AppError status, code, message and details through", () => {
    const { status, body } = handle(new AppError(422, "VALIDATION_ERROR", "Nope", [{ field: "x" }]));
    expect(status).toBe(422);
    expect(body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Nope", details: [{ field: "x" }] } });
  });

  it("maps a MongoDB duplicate key to 409", () => {
    const { status, body } = handle(Object.assign(new Error("E11000 duplicate key ... email_1"), { code: 11000 }));
    expect(status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).not.toMatch(/E11000|email_1/); // no database internals
  });

  it("maps a Mongoose CastError to 400", () => {
    const { status } = handle(Object.assign(new Error("Cast to ObjectId failed"), { name: "CastError", path: "_id" }));
    expect(status).toBe(400);
  });

  it("maps multer's file-size error to 400", () => {
    const { status, body } = handle(new multer.MulterError("LIMIT_FILE_SIZE"));
    expect(status).toBe(400);
    expect(body.error).toMatchObject({ code: "UPLOAD_ERROR", message: "Image is too large" });
  });

  it("maps body-parser errors to 400 and 413", () => {
    expect(handle(Object.assign(new Error("Unexpected token"), { type: "entity.parse.failed" })).status).toBe(400);
    expect(handle(Object.assign(new Error("request entity too large"), { type: "entity.too.large" })).status).toBe(413);
  });

  it("gives unexpected errors a generic message and logs the real one instead", () => {
    const { status, body, logged } = handle(new Error("connect ECONNREFUSED 10.0.0.5:27017 password=hunter2"));

    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Something went wrong");
    expect(logged).toHaveBeenCalledTimes(1);
  });
});

describe("errorHandler stack traces", () => {
  const secret = new Error("connect ECONNREFUSED 10.0.0.5:27017 password=hunter2");
  const send = (handler) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    handler(secret, { log: { error: vi.fn() } }, res, vi.fn());
    return res.json.mock.calls[0][0];
  };

  afterEach(() => vi.unstubAllEnvs());

  it("includes the stack outside production, to help while developing", () => {
    expect(send(errorHandler).error.stack).toContain("hunter2");
  });

  it("never sends internals to clients in production", async () => {
    // env.js reads NODE_ENV once at import time, so load a fresh copy of the modules in production mode
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { errorHandler: productionHandler } = await import("../src/middlewares/errorHandler.js");

    const body = send(productionHandler);

    expect(body.error).toEqual({ code: "INTERNAL_ERROR", message: "Something went wrong" });
    expect(JSON.stringify(body)).not.toMatch(/hunter2|ECONNREFUSED|stack/);
  });
});

describe("notFound", () => {
  it("creates a 404 that names the route", () => {
    const next = vi.fn();
    notFound({ method: "GET", originalUrl: "/api/nope" }, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect(error.message).toContain("GET /api/nope");
  });
});
