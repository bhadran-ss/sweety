import { getReportDateRanges, getTodayDate } from "../utils/date.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export const DEMO_USER = Object.freeze({
  name: "Demo Patient",
  email: "demo@sweety.example",
  password: "SweetyDemo123!",
});

export function buildDemoReadings(today = getTodayDate()) {
  const ranges = getReportDateRanges(today);
  const months = [ranges.previous_month, ranges.month_to_date];
  const slots = ["morning_fasting", "after_breakfast", "after_lunch", "after_dinner"];
  const values = [92, 138, 154, 128];
  const readings = [];

  for (const [monthIndex, range] of months.entries()) {
    const lastDay = Number(range.end_date.slice(8));
    const days = [...new Set([
      1,
      Math.max(1, Math.floor(lastDay / 3)),
      Math.max(1, Math.floor(lastDay * 2 / 3)),
      lastDay,
    ])];

    for (const [dayIndex, day] of days.entries()) {
      const date = `${range.start_date.slice(0, 7)}-${String(day).padStart(2, "0")}`;
      for (let slotIndex = 0; slotIndex <= dayIndex; slotIndex++) {
        readings.push({
          reading_date: date,
          slot: slots[slotIndex],
          value: values[slotIndex] + dayIndex * 5 + monthIndex * 3,
        });
      }
    }
  }

  return readings;
}

export async function seedDemoData(pool, { reset = false, today = getTodayDate() } = {}) {
  const readings = buildDemoReadings(today);
  const passwordHash = await hashPassword(DEMO_USER.password);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    if (reset) {
      await client.query("TRUNCATE TABLE readings, users RESTART IDENTITY");
    }

    const inserted = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [DEMO_USER.name, DEMO_USER.email, passwordHash],
    );
    let userId = inserted.rows[0]?.id;

    if (!userId) {
      const existing = await client.query(
        "SELECT id, password_hash FROM users WHERE email = $1",
        [DEMO_USER.email],
      );
      const user = existing.rows[0];
      if (!user || !await verifyPassword(DEMO_USER.password, user.password_hash)) {
        throw new Error("The demo email belongs to an account with a different password; no data was changed.");
      }
      userId = user.id;
    }

    let insertedReadings = 0;
    for (const reading of readings) {
      const result = await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, slot) DO NOTHING`,
        [userId, reading.reading_date, reading.slot, reading.value],
      );
      insertedReadings += result.rowCount;
    }

    await client.query("COMMIT");
    return { userId, insertedReadings, today };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
