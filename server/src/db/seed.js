import { env } from "../config/env.js";
import { pool } from "./pool.js";
import { DEMO_USER, seedDemoData } from "./demoData.js";

try {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--reset")) {
    throw new Error("Usage: npm run db:seed -- [--reset]");
  }
  if (env.isProduction) {
    throw new Error("Demo seeding is disabled in production.");
  }
  const reset = args.includes("--reset");
  const host = new URL(env.databaseUrl).hostname;
  if (reset && (env.nodeEnv !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(host))) {
    throw new Error("--reset is restricted to a local development database.");
  }

  const result = await seedDemoData(pool, { reset });
  console.log(`${reset ? "Cleared existing users and readings. " : ""}Demo account ready.`);
  console.log(`Added ${result.insertedReadings} readings for the current and previous months (Asia/Kolkata).`);
  console.log(`Demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
