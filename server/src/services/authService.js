import { User } from "../models/user.js";
import { RefreshToken } from "../models/refreshToken.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { generateRefreshToken, hashToken, signAccessToken } from "../utils/tokens.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function issueTokens(user) {
  const { token, hash } = generateRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
  });
  return { accessToken: signAccessToken(user), refreshToken: token };
}

export async function register({ fullName, email, password }) {
  if (await User.exists({ email })) {
    throw AppError.conflict("An account with this email already exists");
  }
  const user = await User.create({ fullName, email, password });
  return { user, ...(await issueTokens(user)) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  // Same error for "no such user" and "wrong password" so accounts can't be enumerated.
  if (!user || !(await user.comparePassword(password))) {
    throw AppError.unauthorized("Invalid email or password");
  }
  return { user, ...(await issueTokens(user)) };
}

// Refresh-token rotation: each token is single-use. Using it deletes it and issues a new pair.
export async function refresh(rawToken) {
  if (!rawToken) throw AppError.unauthorized("Missing refresh token");

  const stored = await RefreshToken.findOneAndDelete({
    tokenHash: hashToken(rawToken),
    expiresAt: { $gt: new Date() },
  });
  if (!stored) throw AppError.unauthorized("Invalid or expired refresh token");

  const user = await User.findById(stored.user);
  if (!user) throw AppError.unauthorized("User no longer exists");

  return { user, ...(await issueTokens(user)) };
}

export async function logout(rawToken) {
  if (rawToken) await RefreshToken.deleteOne({ tokenHash: hashToken(rawToken) });
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized("User no longer exists");
  return user;
}
