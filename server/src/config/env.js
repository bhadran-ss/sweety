import "dotenv/config";

const port = Number(process.env.PORT ?? 5000);
const nodeEnv = process.env.NODE_ENV ?? "Development";
const databaseUrl = process.env.DATABASE_URL;

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

export const env = Object.freeze({
  port,
  nodeEnv,
  isProduction: nodeEnv === "production",
  databaseUrl,
});
