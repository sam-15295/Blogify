import rateLimit from "express-rate-limit";
import { isTest } from "../config/env.js";

const tooManyRequests = (message) => ({
  error: { code: "RATE_LIMITED", message },
});

const skip = () => isTest;

// Global safety net for the whole API.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooManyRequests("Too many requests, slow down"),
  skip,
});

// Much stricter on login/register to slow down brute-force / credential stuffing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count, so normal users are never punished
  message: tooManyRequests("Too many attempts, try again in 15 minutes"),
  skip,
});
