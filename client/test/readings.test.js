import assert from "node:assert/strict";
import test from "node:test";
import { todayDate, dateError, readingError } from "../src/lib/readings.js";

test("dates follow Kolkata midnight rather than the browser timezone", () => {
  assert.equal(todayDate(new Date("2026-01-31T18:29:59Z")), "2026-01-31");
  assert.equal(todayDate(new Date("2026-01-31T18:30:00Z")), "2026-02-01");
});
test("invalid calendar dates and future dates are rejected", () => {
  for (const date of [
    "",
    "2025-02-29",
    "2026-04-31",
    "0000-01-01",
    "9999-12-31",
  ])
    assert.ok(dateError(date));
  assert.equal(dateError("2024-02-29"), "");
});
test("reading values require whole numbers within inclusive bounds", () => {
  const form = { reading_date: "2024-02-29", slot: "morning_fasting" };
  for (const value of ["", " ", "39", "601", "100.5", "abc"])
    assert.ok(readingError({ ...form, value }));
  for (const value of ["40", "600", "125"])
    assert.equal(readingError({ ...form, value }), "");
  assert.ok(readingError({ ...form, slot: "invalid", value: "100" }));
});
