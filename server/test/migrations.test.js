import assert from "node:assert/strict";
import test from "node:test";
import { applyMigrations } from "../src/db/migrations.js";
import { createTestApp } from "./helpers/app.js";

test("migration tracking", async (t) => {
  const { pool, createUser } = await createTestApp(t);
  const user = await createUser("migration@example.com");

  await t.test("rerunning migrations preserves existing rows", async () => {
    assert.deepEqual(await applyMigrations(pool), []);
    const rows = await pool.query("SELECT id FROM users WHERE id = $1", [user.id]);
    assert.equal(rows.rowCount, 1);
    assert.equal((await pool.query("SELECT name FROM schema_migrations")).rowCount, 2);
  });

  await t.test("baseline records manually applied tables without recreating them", async () => {
    await pool.query("DROP TABLE schema_migrations");
    assert.deepEqual(await applyMigrations(pool, { baseline: true }), ["create_users.sql", "create_readings.sql"]);
    assert.equal((await pool.query("SELECT id FROM users WHERE id = $1", [user.id])).rowCount, 1);
    assert.deepEqual(await applyMigrations(pool), []);
  });

  await t.test("a changed applied migration is rejected", async () => {
    await pool.query("UPDATE schema_migrations SET checksum = 'changed' WHERE name = 'create_users.sql'");
    await assert.rejects(applyMigrations(pool), /has changed/);
    assert.equal((await pool.query("SELECT id FROM users WHERE id = $1", [user.id])).rowCount, 1);
  });

  await t.test("baseline refuses a missing table and rolls back its tracking changes", async () => {
    await pool.query("DROP TABLE schema_migrations");
    await pool.query("ALTER TABLE readings RENAME TO missing_readings");
    try {
      await assert.rejects(applyMigrations(pool, { baseline: true }), /readings is missing/);
      const result = await pool.query("SELECT to_regclass('schema_migrations') AS table_name");
      assert.equal(result.rows[0].table_name, null);
    } finally {
      await pool.query("ALTER TABLE missing_readings RENAME TO readings");
    }
  });
});
