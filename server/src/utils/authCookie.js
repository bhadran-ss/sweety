import { env } from "../config/env.js";
import { ACCESS_TOKEN_TTL_SECONDS } from "./token.js";

export const AUTH_COOKIE_NAME = "sweety_access_token";

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
  path: "/",
};

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
