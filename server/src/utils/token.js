import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const ISSUER = "sweety-api";
const AUDIENCE = "sweety-web";

export function createAccessToken(userId) {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: "HS256",
    subject: String(userId),
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}
