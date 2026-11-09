import { pool } from "./pool.js";

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS username
  `);

  console.log("Database connected:", result.rows[0]);
} catch (error) {
  console.error("Database connection failed:", {
    code: error.code,
    message: error.message,
  });

  process.exitCode = 1;
} finally {
  await pool.end();
}
