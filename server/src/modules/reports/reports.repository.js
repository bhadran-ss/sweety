import { pool } from "../../db/pool.js";

export async function findReportSummaries(userId, ranges) {
  const result = await pool.query(
    `
      WITH report_ranges (name, start_date, end_date) AS (
        VALUES
          ('daily', $2::date, $3::date),
          ('month_to_date', $4::date, $5::date),
          ('previous_month', $6::date, $7::date)
      )
      SELECT
        report_ranges.name,
        COUNT(readings.id)::integer AS count,
        MIN(readings.value) AS minimum,
        MAX(readings.value) AS maximum,
        ROUND(AVG(readings.value), 1)::double precision AS average,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', readings.id,
              'reading_date', to_char(readings.reading_date, 'YYYY-MM-DD'),
              'slot', readings.slot,
              'value', readings.value
            ) ORDER BY CASE readings.slot
              WHEN 'morning_fasting' THEN 1
              WHEN 'after_breakfast' THEN 2
              WHEN 'after_lunch' THEN 3
              WHEN 'after_dinner' THEN 4
            END, readings.id
          ) FILTER (WHERE report_ranges.name = 'daily' AND readings.id IS NOT NULL),
          '[]'::jsonb
        ) AS readings
      FROM report_ranges
      LEFT JOIN readings
        ON readings.user_id = $1
        AND readings.reading_date BETWEEN report_ranges.start_date AND report_ranges.end_date
      GROUP BY report_ranges.name
    `,
    [
      userId,
      ranges.daily.start_date,
      ranges.daily.end_date,
      ranges.month_to_date.start_date,
      ranges.month_to_date.end_date,
      ranges.previous_month.start_date,
      ranges.previous_month.end_date,
    ],
  );

  return result.rows;
}
