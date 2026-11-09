import "dotenv/config";

const port = Number(process.env.PORT ?? 5000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const clientOrigin = process.env.CLIENT_ORIGIN;

//PORT
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Port must be an integer b/w 1 and 65535");
}

//ENV
const allowedEnvironments = ["development", "production", "test"];

if (!allowedEnvironments.includes(nodeEnv)) {
  throw new Error(
    "Environment must be one of these ( development , test , production).",
  );
}

//DB
if (!databaseUrl?.trim()) {
  throw new Error("DATABASSE_URL is required.");
}

let parsedDatabaseUrl;

try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL must be a valid postgreSQL url.");
}

if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
  throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
}

//JWT

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

//CLIENT

let parsedClientOrigin;

try {
  parsedClientOrigin = new URL(clientOrigin);
} catch {
  throw new Error("CLIENT_ORIGIN must be a valid HTTP or HTTPS origin.");
}

if (
  !["http:", "https:"].includes(parsedClientOrigin.protocol) ||
  parsedClientOrigin.origin !== clientOrigin
) {
  throw new Error(
    "CLIENT_ORIGIN must contain only the origin, without a path or trailing slash.",
  );
}
export const env = Object.freeze({
  port,
  nodeEnv,
  isProduction: nodeEnv === "production",
  databaseUrl,
  jwtSecret,
  clientOrigin,
});
