import { AppError } from "../utils/AppError.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { verifyAccessToken } from "../utils/token.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token !== "string" || !token) {
    return next(
      new AppError(401, "UNAUTHENTICATED", "Please log in to continue."),
    );
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const tokenErrors = [
      "TokenExpiredError",
      "JsonWebTokenError",
      "NotBeforeError",
    ];

    if (tokenErrors.includes(error.name)) {
      return next(
        new AppError(
          401,
          "INVALID_TOKEN",
          "Your session is invalid or expired. Please log in again.",
        ),
      );
    }

    return next(error);
  }

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return next(new AppError(401, "INVALID_TOKEN", "Please log in again."));
  }

  req.auth = { userId };

  return next();
}
