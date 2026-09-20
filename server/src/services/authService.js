import { randomUUID } from "node:crypto";
import { User } from "../models/user.js";
import { RefreshToken } from "../models/refreshToken.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { generateRefreshToken, hashToken, signAccessToken } from "../utils/tokens.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// Two tabs restoring the same session refresh with the same cookie at almost the same moment.
// A token used less than this long ago is treated as that race, not as theft.
const REUSE_LEEWAY_MS = 10 * 1000;

// Used when the email doesn't exist, so the request still does a bcrypt comparison and takes about
// as long as a real one. Otherwise response time would reveal which emails are registered.
const DUMMY_USER = new User({ password: User.hashSync("not-a-real-password") });

async function issueTokens(user, family = randomUUID()) {
  const { token, hash } = generateRefreshToken();
  await RefreshToken.create({
    user: user._id,
    family,
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
  const passwordMatches = await (user ?? DUMMY_USER).comparePassword(password);
  // Same error for "no such user" and "wrong password" so accounts can't be enumerated.
  if (!user || !passwordMatches) {
    throw AppError.unauthorized("Invalid email or password");
  }
  return { user, ...(await issueTokens(user)) };
}

// Refresh-token rotation with reuse detection:
//  - every token works once; using it marks it used and issues a new token in the same family;
//  - presenting an already-used token shortly afterwards is allowed (parallel tabs);
//  - presenting it much later means an old token leaked, so the whole family is revoked.
export async function refresh(rawToken) {
  if (!rawToken) throw AppError.unauthorized("Missing refresh token");

  const now = new Date();
  const tokenHash = hashToken(rawToken);

  // Atomic claim: if two requests race, only one gets the unused token.
  let stored = await RefreshToken.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: now } },
    { usedAt: now },
  );

  if (!stored) {
    const previous = await RefreshToken.findOne({ tokenHash, expiresAt: { $gt: now } });
    if (!previous) throw AppError.unauthorized("Invalid or expired refresh token");

    if (previous.usedAt && now - previous.usedAt > REUSE_LEEWAY_MS) {
      await RefreshToken.deleteMany({ family: previous.family });
      throw AppError.unauthorized("Session is no longer valid, please log in again");
    }
    stored = previous;
  }

  const user = await User.findById(stored.user);
  if (!user) throw AppError.unauthorized("User no longer exists");

  return { user, ...(await issueTokens(user, stored.family)) };
}

// Logging out ends the whole session family, including any sibling tokens from parallel tabs.
export async function logout(rawToken) {
  if (!rawToken) return;
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (stored) await RefreshToken.deleteMany({ family: stored.family });
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized("User no longer exists");
  return user;
}
