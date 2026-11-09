import assert from "node:assert/strict";
import test from "node:test";
import { getTodayDate } from "../src/utils/date.js";
import { createTestApp } from "./helpers/app.js";

test("reading rules, ownership, and concurrent writes", async (t) => {
  const { pool, request, createUser } = await createTestApp(t);
  const alice = await createUser("alice@example.com");
  const bob = await createUser("bob@example.com");
  const body = { reading_date: "2024-02-29", slot: "morning_fasting", value: 100 };
  const slots = ["morning_fasting", "after_breakfast", "after_lunch", "after_dinner"];
  const create = (input, user = alice) => request("POST", "/readings", { body: input, cookie: user.cookie });
  const readings = {};

  await t.test("authentication and trusted origins protect reading endpoints", async () => {
    for (const [method, path] of [["GET", "/readings"], ["GET", "/readings/1"], ["POST", "/readings"], ["PUT", "/readings/1"], ["DELETE", "/readings/1"]]) {
      assert.equal((await request(method, path)).status, 401);
    }
    assert.equal((await request("POST", "/readings", { body, cookie: alice.cookie, origin: "https://attacker.example" })).status, 403);
    const preflight = await request("OPTIONS", "/readings/1");
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-methods"), /PUT, DELETE/);
  });

  await t.test("missing fields, decimals, invalid slots, and out-of-range values return 400", async () => {
    for (const value of [undefined, null, "100", 39, 601, 100.5]) {
      const response = await create({ ...body, value });
      assert.equal(response.status, 400, `value ${value}`);
      assert.equal(response.body.error.code, "VALIDATION_ERROR");
    }
    for (const slot of [undefined, "", "bedtime"]) {
      assert.equal((await create({ ...body, slot })).status, 400);
    }
    assert.equal((await create({ ...body, user_id: bob.id })).status, 400);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM readings")).rows[0].count, 0);
  });

  await t.test("invalid calendar dates and future dates are rejected", async () => {
    const future = getTodayDate(new Date(Date.now() + 2 * 86400000));
    for (const reading_date of [undefined, "", "2025-02-29", "2024-02-30", "2024-13-01", "0000-01-01", future]) {
      assert.equal((await create({ ...body, reading_date })).status, 400, String(reading_date));
    }
    assert.equal((await request("GET", "/readings?date=2025-02-29", { cookie: alice.cookie })).status, 400);
    assert.equal((await request("GET", "/readings?date=2024-02-29&date=2024-03-01", { cookie: alice.cookie })).status, 400);
    for (const id of ["0", "-1", "1e2", "1.5", "2147483648"]) {
      assert.equal((await request("GET", `/readings/${id}`, { cookie: alice.cookie })).status, 400);
    }
  });

  await t.test("40 and 600 are accepted, duplicate slots and fifth readings return distinct conflicts", async () => {
    for (const [index, slot] of [...slots].reverse().entries()) {
      const response = await create({ ...body, slot, value: index === 0 ? 40 : 600 });
      assert.equal(response.status, 201);
      readings[slot] = response.body.data.reading;
      assert.equal(readings[slot].reading_date, body.reading_date);
      if (index === 0) {
        const duplicate = await create({ ...body, slot });
        assert.equal(duplicate.status, 409);
        assert.equal(duplicate.body.error.code, "DUPLICATE_READING_SLOT");
      }
    }
    const fifth = await create(body);
    assert.equal(fifth.status, 409);
    assert.equal(fifth.body.error.code, "DAILY_LIMIT_REACHED");
  });

  await t.test("listing returns a stable slot order and an empty array for unused dates", async () => {
    const response = await request("GET", `/readings?date=${body.reading_date}`, { cookie: alice.cookie });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.readings.map(row => row.slot), slots);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const empty = await request("GET", "/readings?date=2024-01-01", { cookie: alice.cookie });
    assert.deepEqual(empty.body.data.readings, []);
  });

  await t.test("users cannot list, retrieve, update, or delete each other's readings", async () => {
    assert.equal((await create(body, bob)).status, 201);
    const id = readings.morning_fasting.id;
    for (const method of ["GET", "PUT", "DELETE"]) {
      const response = await request(method, `/readings/${id}`, { cookie: bob.cookie, body: method === "PUT" ? body : undefined });
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, "READING_NOT_FOUND");
    }
    const response = await request("GET", "/readings", { cookie: bob.cookie });
    assert.equal(response.body.data.readings.length, 1);
    assert.notEqual(response.body.data.readings[0].id, id);
    assert.equal((await request("GET", `/readings/${id}`, { cookie: alice.cookie })).body.data.reading.value, 600);
    assert.equal((await request("GET", "/readings/999999", { cookie: alice.cookie })).status, 404);
  });

  await t.test("edits on full days succeed unless they conflict with another slot", async () => {
    const original = readings.morning_fasting;
    const updated = await request("PUT", `/readings/${original.id}`, { cookie: alice.cookie, body: { ...body, value: 125 } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.reading.value, 125);
    assert.equal(updated.body.data.reading.created_at, original.created_at);
    assert.ok(updated.body.data.reading.updated_at >= original.updated_at);
    const conflict = await request("PUT", `/readings/${original.id}`, { cookie: alice.cookie, body: { ...body, slot: "after_lunch" } });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, "DUPLICATE_READING_SLOT");
    const invalid = await request("PUT", `/readings/${original.id}`, { cookie: alice.cookie, body: { ...body, value: 99.5 } });
    assert.equal(invalid.status, 400);
  });

  await t.test("moving a reading rejects full dates and occupied slots without changing the original", async () => {
    const source = await create({ ...body, reading_date: "2024-03-01" });
    const id = source.body.data.reading.id;
    const full = await request("PUT", `/readings/${id}`, { cookie: alice.cookie, body });
    assert.equal(full.status, 409);
    assert.equal(full.body.error.code, "DAILY_LIMIT_REACHED");
    await create({ ...body, reading_date: "2024-03-02" });
    const conflict = await request("PUT", `/readings/${id}`, { cookie: alice.cookie, body: { ...body, reading_date: "2024-03-02" } });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, "DUPLICATE_READING_SLOT");
    assert.equal((await request("GET", `/readings/${id}`, { cookie: alice.cookie })).body.data.reading.reading_date, "2024-03-01");
    const moved = await request("PUT", `/readings/${id}`, { cookie: alice.cookie, body: { ...body, reading_date: "2024-03-03" } });
    assert.equal(moved.status, 200);
    const all = await request("GET", "/readings", { cookie: alice.cookie });
    assert.equal(all.body.data.readings[0].reading_date, "2024-03-03");
  });

  await t.test("deleting a reading frees its slot and repeated deletion returns 404", async () => {
    const id = readings.morning_fasting.id;
    assert.equal((await request("DELETE", `/readings/${id}`, { cookie: alice.cookie })).status, 200);
    assert.equal((await request("DELETE", `/readings/${id}`, { cookie: alice.cookie })).status, 404);
    assert.equal((await create(body)).status, 201);
  });

  await t.test("concurrent creates cannot exceed four readings or duplicate a slot", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      create({ ...body, reading_date: "2024-04-01", slot: slots[index % 4] }),
    ));
    assert.equal(results.filter(result => result.status === 201).length, 4);
    assert.equal(results.filter(result => result.status === 409).length, 4);
    const stored = await pool.query("SELECT count(*)::int AS count FROM readings WHERE user_id = $1 AND reading_date = $2", [alice.id, "2024-04-01"]);
    assert.equal(stored.rows[0].count, 4);
  });

  await t.test("concurrent edits competing for one slot have one winner", async () => {
    const sources = await Promise.all(["2024-06-01", "2024-06-02"].map(reading_date => create({ ...body, reading_date })));
    const results = await Promise.all(sources.map(source => request("PUT", `/readings/${source.body.data.reading.id}`, {
      cookie: alice.cookie, body: { ...body, reading_date: "2024-06-03" },
    })));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  });

  await t.test("database constraints also reject invalid direct inserts", async () => {
    for (const [slot, value, date, userId, code, constraint] of [
      ["invalid", 100, "2024-05-01", alice.id, "23514", "readings_slot_valid"],
      ["morning_fasting", 39, "2024-05-01", alice.id, "23514", "readings_value_range"],
      ["morning_fasting", 601, "2024-05-01", alice.id, "23514", "readings_value_range"],
      ["morning_fasting", 100, null, alice.id, "23502", undefined],
      ["morning_fasting", 100, "2024-05-01", 999999, "23503", "readings_user_id_fkey"],
      ["morning_fasting", 100, body.reading_date, alice.id, "23505", "readings_user_date_slot_unique"],
    ]) {
      await assert.rejects(
        pool.query("INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)", [userId, date, slot, value]),
        error => error.code === code && (!constraint || error.constraint === constraint),
      );
    }
  });
});
