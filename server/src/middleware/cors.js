import { env } from "../config/env.js";

// Grants browser response access; requireTrustedOrigin enforces write origins.
export function cors(req, res, next) {
  res.vary("Origin");

  if (req.get("Origin") !== env.clientOrigin) {
    return next();
  }

  res.set("Access-Control-Allow-Origin", env.clientOrigin);
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(204);
  }

  return next();
}
