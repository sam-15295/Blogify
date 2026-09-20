import * as authService from "../services/authService.js";
import { env, isProd } from "../config/env.js";

const COOKIE_NAME = "refreshToken";

const cookieOptions = {
  httpOnly: true, // not readable by JavaScript, which limits the damage of an XSS bug
  secure: isProd, // HTTPS only in production
  // Frontend and API are on different sites in production, which requires SameSite=None.
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth", // the browser only sends it to the auth endpoints
};

const setRefreshCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 });

export async function register(req, res) {
  const { user, accessToken, refreshToken } = await authService.register(req.validated.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ data: { user, accessToken } });
}

export async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(req.validated.body);
  setRefreshCookie(res, refreshToken);
  res.json({ data: { user, accessToken } });
}

export async function refresh(req, res) {
  const { user, accessToken, refreshToken } = await authService.refresh(req.cookies[COOKIE_NAME]);
  setRefreshCookie(res, refreshToken);
  res.json({ data: { user, accessToken } });
}

export async function logout(req, res) {
  await authService.logout(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  res.json({ data: { user } });
}
