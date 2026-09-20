import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

// Access token: short-lived, stateless, sent in the Authorization header.
export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.ACCESS_TOKEN_SECRET, {
    subject: String(user._id),
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
}

// Refresh token: opaque random string (not a JWT) so it can be revoked by deleting its DB row.
export function generateRefreshToken() {
  const token = randomBytes(48).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
