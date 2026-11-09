import { Pool } from "pg";
import { env } from "./../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected error on an idle DB connection:", {
    code: error.code,
    message: error.message,
  });
});
