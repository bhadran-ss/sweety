import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReadings, DEMO_USER, seedDemoData } from "../src/db/demoData.js";
import { getReportDateRanges } from "../src/utils/date.js";
import { createTestApp } from "./helpers/app.js";

test("demo dates remain valid at month boundaries", () => {
  for (const today of ["2026-11-09", "2026-01-01", "2024-03-01", "2025-03-01"]) {
    const readings = buildDemoReadings(today);
    const ranges = getReportDateRanges(today);
    assert.ok(readings.some(row => row.reading_date === today));
    assert.ok(readings.some(row => row.reading_date === ranges.previous_month.end_date));
    const dates = new Map();
    for (const row of readings) {
      assert.ok(row.reading_date <= today && row.reading_date >= ranges.previous_month.start_date);
      assert.ok(Number.isInteger(row.value) && row.value >= 40 && row.value <= 600);
      const slots = dates.get(row.reading_date) ?? new Set();
      assert.ok(!slots.has(row.slot));
      slots.add(row.slot);
      dates.set(row.reading_date, slots);
      assert.ok(slots.size <= 4);
    }
    assert.ok(new Set([...dates.values()].map(slots => slots.size)).size > 1);
  }
});

test("demo seed lifecycle", async (t) => {
  const { pool, request, createUser } = await createTestApp(t);
  const today = "2026-01-01";
  const other = await createUser("existing@example.com");
  await pool.query("INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, '2025-12-31', 'morning_fasting', 100)", [other.id]);

  await t.test("seed preserves other users and creates a working demo login", async () => {
    const seeded = await seedDemoData(pool, { today });
    assert.equal(seeded.insertedReadings, buildDemoReadings(today).length);
    assert.equal((await pool.query("SELECT id FROM users WHERE id = $1", [other.id])).rowCount, 1);
    const login = await request("POST", "/auth/login", { body: { email: DEMO_USER.email, password: DEMO_USER.password } });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const response = await request("GET", `/reports?date=${today}`, { cookie });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.daily.count > 0);
    assert.ok(response.body.data.month_to_date.count > 0);
    assert.ok(response.body.data.previous_month.count > 0);
  });

  await t.test("rerunning the seed is safe and preserves edits", async () => {
    const first = (await pool.query("SELECT id FROM readings WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY id LIMIT 1", [DEMO_USER.email])).rows[0];
    await pool.query("UPDATE readings SET value = 199 WHERE id = $1", [first.id]);
    assert.equal((await seedDemoData(pool, { today })).insertedReadings, 0);
    assert.equal((await pool.query("SELECT value FROM readings WHERE id = $1", [first.id])).rows[0].value, 199);
    assert.equal((await pool.query("SELECT id FROM readings WHERE user_id = $1", [other.id])).rowCount, 1);
  });

  await t.test("explicit reset replaces old data while preserving migration tracking", async () => {
    const seeded = await seedDemoData(pool, { reset: true, today });
    const users = await pool.query("SELECT email FROM users");
    assert.deepEqual(users.rows, [{ email: DEMO_USER.email }]);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM readings")).rows[0].count, seeded.insertedReadings);
    assert.equal((await pool.query("SELECT name FROM schema_migrations")).rowCount, 2);
  });

  await t.test("a failed reset seed rolls back the original data", async () => {
    const before = await pool.query("SELECT id, user_id, reading_date::text, slot, value FROM readings ORDER BY id");
    await pool.query("ALTER TABLE readings ADD CONSTRAINT test_seed_failure CHECK (value < 40) NOT VALID");
    try {
      await assert.rejects(seedDemoData(pool, { reset: true, today }), error => error.code === "23514");
      const after = await pool.query("SELECT id, user_id, reading_date::text, slot, value FROM readings ORDER BY id");
      assert.deepEqual(after.rows, before.rows);
      assert.equal((await pool.query("SELECT email FROM users")).rows[0].email, DEMO_USER.email);
    } finally {
      await pool.query("ALTER TABLE readings DROP CONSTRAINT test_seed_failure");
    }
  });
});
