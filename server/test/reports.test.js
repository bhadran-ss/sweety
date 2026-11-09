import assert from "node:assert/strict";
import test from "node:test";
import { getTodayDate } from "../src/utils/date.js";
import { createTestApp } from "./helpers/app.js";

test("daily, month-to-date, and previous-month reports", async (t) => {
  const { pool, request, createUser } = await createTestApp(t);
  const alice = await createUser("alice@example.com");
  const bob = await createUser("bob@example.com");
  async function report(date, user = alice) {
    const response = await request("GET", `/reports?date=${date}`, { cookie: user.cookie });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return response.body.data;
  }
  async function insert(date, slot, value, user = alice) {
    const result = await pool.query(
      "INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4) RETURNING id",
      [user.id, date, slot, value],
    );
    return result.rows[0].id;
  }
  const stats = summary => [summary.count, summary.minimum, summary.maximum, summary.average];
  let lunchId;
  let fastingId;
  let septemberFirst;

  await t.test("authentication and valid report dates are required", async () => {
    assert.equal((await request("GET", "/reports?date=2024-10-15")).status, 401);
    const future = getTodayDate(new Date(Date.now() + 2 * 86400000));
    for (const query of ["", "?date=", "?date=2025-02-29", "?date=0000-01-01", "?date=0001-01-01", "?date=2024-13-01", "?date=2024-10-15&date=2024-10-16", "?date=2024-10-15&user_id=2", `?date=${future}`]) {
      const response = await request("GET", `/reports${query}`, { cookie: alice.cookie });
      assert.equal(response.status, 400, query);
      assert.equal(response.body.error.code, "VALIDATION_ERROR");
    }
  });

  await t.test("empty reports return zero counts, null statistics, and no readings", async () => {
    const result = await report("2024-10-15");
    for (const name of ["daily", "month_to_date", "previous_month"]) {
      assert.deepEqual(stats(result[name]), [0, null, null, null]);
    }
    assert.deepEqual(result.daily.readings, []);
  });

  await t.test("summaries include correct boundaries and average individual readings", async () => {
    await insert("2024-08-31", "morning_fasting", 600);
    septemberFirst = await insert("2024-09-01", "morning_fasting", 80);
    await insert("2024-09-30", "after_dinner", 120);
    await insert("2024-10-01", "morning_fasting", 40);
    lunchId = await insert("2024-10-15", "after_lunch", 103);
    fastingId = await insert("2024-10-15", "morning_fasting", 100);
    await insert("2024-10-15", "after_breakfast", 101);
    await insert("2024-10-16", "morning_fasting", 600);
    const result = await report("2024-10-15");
    assert.equal(result.selected_date, "2024-10-15");
    assert.equal(result.time_zone, "Asia/Kolkata");
    assert.deepEqual(stats(result.daily), [3, 100, 103, 101.3]);
    assert.deepEqual(stats(result.month_to_date), [4, 40, 103, 86]);
    assert.deepEqual(stats(result.previous_month), [2, 80, 120, 100]);
    assert.equal(result.month_to_date.start_date, "2024-10-01");
    assert.equal(result.month_to_date.end_date, "2024-10-15");
    assert.equal(result.previous_month.start_date, "2024-09-01");
    assert.equal(result.previous_month.end_date, "2024-09-30");
    assert.deepEqual(result.daily.readings.map(row => row.slot), ["morning_fasting", "after_breakfast", "after_lunch"]);
    assert.deepEqual(result.daily.readings.map(row => row.value), [100, 101, 103]);
    assert.ok(result.daily.readings.every(row => row.reading_date === "2024-10-15"));
  });

  await t.test("every report is isolated to its authenticated user", async () => {
    await insert("2024-10-15", "morning_fasting", 500, bob);
    await insert("2024-09-01", "morning_fasting", 600, bob);
    const result = await report("2024-10-15", bob);
    assert.deepEqual(stats(result.daily), [1, 500, 500, 500]);
    assert.deepEqual(stats(result.month_to_date), [1, 500, 500, 500]);
    assert.deepEqual(stats(result.previous_month), [1, 600, 600, 600]);
    assert.equal(result.daily.readings.length, 1);
    const aliceResult = await report("2024-10-15");
    assert.deepEqual(stats(aliceResult.daily), [3, 100, 103, 101.3]);
    assert.deepEqual(stats(aliceResult.previous_month), [2, 80, 120, 100]);
  });

  await t.test("the previous month is complete even when the selected month is empty", async () => {
    const result = await report("2024-11-01");
    assert.deepEqual(stats(result.daily), [0, null, null, null]);
    assert.deepEqual(stats(result.month_to_date), [0, null, null, null]);
    assert.deepEqual(stats(result.previous_month), [5, 40, 600, 188.8]);
  });

  await t.test("editing and deleting readings immediately changes report statistics", async () => {
    const edited = await request("PUT", `/readings/${lunchId}`, {
      cookie: alice.cookie, body: { reading_date: "2024-10-15", slot: "after_lunch", value: 200 },
    });
    assert.equal(edited.status, 200);
    let result = await report("2024-10-15");
    assert.deepEqual(stats(result.daily), [3, 100, 200, 133.7]);
    assert.deepEqual(stats(result.month_to_date), [4, 40, 200, 110.3]);
    assert.equal((await request("DELETE", `/readings/${fastingId}`, { cookie: alice.cookie })).status, 200);
    result = await report("2024-10-15");
    assert.deepEqual(stats(result.daily), [2, 101, 200, 150.5]);
    assert.deepEqual(stats(result.month_to_date), [3, 40, 200, 113.7]);
    assert.equal(result.daily.readings.length, 2);
    assert.equal((await request("DELETE", `/readings/${septemberFirst}`, { cookie: alice.cookie })).status, 200);
    assert.deepEqual(stats((await report("2024-10-15")).previous_month), [1, 120, 120, 120]);
  });

  await t.test("year transitions and leap-year February include their final day", async () => {
    await insert("2023-12-31", "after_dinner", 200);
    const january = await report("2024-01-01");
    assert.equal(january.previous_month.start_date, "2023-12-01");
    assert.equal(january.previous_month.end_date, "2023-12-31");
    assert.deepEqual(stats(january.previous_month), [1, 200, 200, 200]);
    await insert("2024-02-01", "morning_fasting", 100);
    await insert("2024-02-29", "after_dinner", 150);
    const leap = await report("2024-03-01");
    assert.equal(leap.previous_month.end_date, "2024-02-29");
    assert.deepEqual(stats(leap.previous_month), [2, 100, 150, 125]);
    const nonLeap = await report("2025-03-01");
    assert.equal(nonLeap.previous_month.end_date, "2025-02-28");
    assert.deepEqual(stats(nonLeap.previous_month), [0, null, null, null]);
  });
});
