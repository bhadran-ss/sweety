import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const migrations = [
  { name: "create_users.sql", table: "users" },
  { name: "create_readings.sql", table: "readings" },
];

export async function applyMigrations(pool, { baseline = false } = {}) {
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query("BEGIN");
    // Serialize migration commands in the same database.
    await client.query("SELECT pg_advisory_xact_lock(6183507)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const { name, table } of migrations) {
      const sql = await readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [name],
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Applied migration ${name} has changed. Add a new migration instead.`);
        }
        continue;
      }

      if (baseline) {
        const result = await client.query(
          "SELECT to_regclass(quote_ident(current_schema()) || '.' || quote_ident($1)) AS table_name",
          [table],
        );
        if (!result.rows[0].table_name) {
          throw new Error(`Cannot baseline ${name}: ${table} is missing. Run migrations normally on a fresh database.`);
        }
      } else {
        await client.query(sql);
      }

      await client.query(
        "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
        [name, checksum],
      );
      applied.push(name);
    }

    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
