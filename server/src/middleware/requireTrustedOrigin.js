import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF defense for cookie-authenticated writes. CORS alone does not reject them.
// Missing and "null" origins are deliberately rejected for unsafe methods.
export function requireTrustedOrigin(req, res, next) {
  if (safeMethods.has(req.method)) {
    return next();
  }

  if (req.get("Origin") !== env.clientOrigin) {
    return next(
      new AppError(
        403,
        "UNTRUSTED_ORIGIN",
        "This request origin is not allowed.",
      ),
    );
  }

  return next();
}
