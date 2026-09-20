import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    // Same message for expired / tampered tokens so we don't help an attacker.
    next(AppError.unauthorized("Invalid or expired token"));
  }
}
