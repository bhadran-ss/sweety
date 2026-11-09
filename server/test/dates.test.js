import assert from "node:assert/strict";
import test from "node:test";
import { getReportDateRanges, getTodayDate } from "../src/utils/date.js";
import { validateTestDatabaseUrl } from "./helpers/app.js";

test("today changes at midnight in Asia/Kolkata", () => {
  assert.equal(getTodayDate(new Date("2026-11-09T18:29:59Z")), "2026-11-09");
  assert.equal(getTodayDate(new Date("2026-11-09T18:30:00Z")), "2026-11-10");
});

test("report ranges match the checklist example", () => {
  assert.deepEqual(getReportDateRanges("2026-10-15"), {
    daily: { start_date: "2026-10-15", end_date: "2026-10-15" },
    month_to_date: { start_date: "2026-10-01", end_date: "2026-10-15" },
    previous_month: { start_date: "2026-09-01", end_date: "2026-09-30" },
  });
});

for (const [date, start, end] of [
  ["2024-01-15", "2023-12-01", "2023-12-31"],
  ["2024-03-15", "2024-02-01", "2024-02-29"],
  ["2025-03-15", "2025-02-01", "2025-02-28"],
  ["1900-03-15", "1900-02-01", "1900-02-28"],
  ["2000-03-15", "2000-02-01", "2000-02-29"],
  ["0001-02-01", "0001-01-01", "0001-01-31"],
]) {
  test(`previous month for ${date}`, () => {
    assert.deepEqual(getReportDateRanges(date).previous_month, { start_date: start, end_date: end });
  });
}

test("test configuration refuses development databases and missing URLs", () => {
  const development = "postgresql://test:secret@localhost/sweety";
  assert.throws(() => validateTestDatabaseUrl(undefined, development), /Set TEST_DATABASE_URL/);
  assert.throws(() => validateTestDatabaseUrl(development, development), /ending in _test/);
  assert.throws(() => validateTestDatabaseUrl("https://localhost/sweety_test", development), /PostgreSQL/);
  assert.throws(() => validateTestDatabaseUrl("postgresql://localhost/sweety_test", "postgresql://otherhost/sweety_test"), /development database/);
  assert.equal(validateTestDatabaseUrl("postgresql://localhost/sweety_test", development).pathname, "/sweety_test");
});
