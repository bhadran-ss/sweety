import { pool } from "./pool.js";
import { applyMigrations } from "./migrations.js";

try {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--baseline")) {
    throw new Error("Usage: npm run db:migrate -- [--baseline]");
  }
  const baseline = args.includes("--baseline");
  const applied = await applyMigrations(pool, { baseline });
  console.log(applied.length
    ? `${baseline ? "Recorded existing migrations" : "Applied migrations"}: ${applied.join(", ")}`
    : "Database migrations are up to date.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
