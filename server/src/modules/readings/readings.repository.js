import { pool } from "../../db/pool.js";

const readingColumns = `
  id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date,
  slot, value, created_at, updated_at
`;

export async function findReadings(userId, date) {
  const result = await pool.query(
    `
      SELECT ${readingColumns}
      FROM readings
      WHERE user_id = $1
        AND ($2::date IS NULL OR reading_date = $2::date)
      ORDER BY reading_date DESC,
        CASE slot
          WHEN 'morning_fasting' THEN 1
          WHEN 'after_breakfast' THEN 2
          WHEN 'after_lunch' THEN 3
          WHEN 'after_dinner' THEN 4
        END,
        id
    `,
    [userId, date ?? null],
  );

  return result.rows;
}

export async function findReadingById(userId, readingId) {
  const result = await pool.query(
    `SELECT ${readingColumns} FROM readings WHERE user_id = $1 AND id = $2`,
    [userId, readingId],
  );

  return result.rows[0] ?? null;
}

export async function findDaySlots(userId, date, excludedReadingId = null) {
  const result = await pool.query(
    `
      SELECT slot FROM readings
      WHERE user_id = $1 AND reading_date = $2
        AND ($3::integer IS NULL OR id <> $3)
    `,
    [userId, date, excludedReadingId],
  );

  return result.rows.map((row) => row.slot);
}

export async function insertReading(userId, { reading_date, slot, value }) {
  const result = await pool.query(
    `
      INSERT INTO readings (user_id, reading_date, slot, value)
      VALUES ($1, $2, $3, $4)
      RETURNING ${readingColumns}
    `,
    [userId, reading_date, slot, value],
  );

  return result.rows[0];
}

export async function updateReadingById(
  userId,
  readingId,
  { reading_date, slot, value },
) {
  const result = await pool.query(
    `
      UPDATE readings
      SET reading_date = $3, slot = $4, value = $5, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND id = $2
      RETURNING ${readingColumns}
    `,
    [userId, readingId, reading_date, slot, value],
  );

  return result.rows[0] ?? null;
}

export async function deleteReadingById(userId, readingId) {
  const result = await pool.query(
    "DELETE FROM readings WHERE user_id = $1 AND id = $2 RETURNING id",
    [userId, readingId],
  );

  return result.rows[0] ?? null;
}
