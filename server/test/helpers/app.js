import "dotenv/config";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { Pool } from "pg";
import { applyMigrations } from "../../src/db/migrations.js";

export function validateTestDatabaseUrl(value, developmentUrl) {
  if (!value) throw new Error("Set TEST_DATABASE_URL to a separate PostgreSQL database ending in _test.");
  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !name.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL URL with a database name ending in _test.");
  }
  if (developmentUrl && name === decodeURIComponent(new URL(developmentUrl).pathname.slice(1))) {
    throw new Error("TEST_DATABASE_URL must not use the development database name.");
  }
  return url;
}

export async function createTestApp(t) {
  const databaseUrl = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
  const schema = `test_${randomBytes(12).toString("hex")}`;
  const admin = new Pool({ connectionString: databaseUrl.href, connectionTimeoutMillis: 5000 });
  let pool;
  let server;
  let created = false;

  t.after(async () => {
    try {
      if (server?.listening) {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
    } finally {
      try {
        if (pool) await pool.end();
        if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await admin.end();
      }
    }
  });

  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  databaseUrl.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = databaseUrl.href;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-only-secret-at-least-32-characters-long";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.PORT = "5000";

  // Import the app only after redirecting all connections to the isolated schema.
  ({ pool } = await import("../../src/db/pool.js"));
  await applyMigrations(pool);
  const { default: app } = await import("../../src/app.js");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function request(method, path, { body, cookie, origin = process.env.CLIENT_ORIGIN, headers = {}, raw } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(origin === null ? {} : { Origin: origin }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
  }

  async function createUser(email) {
    const { hashPassword } = await import("../../src/utils/password.js");
    const { createAccessToken } = await import("../../src/utils/token.js");
    const { AUTH_COOKIE_NAME } = await import("../../src/utils/authCookie.js");
    const password = "test-password";
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Test User", email, await hashPassword(password)],
    );
    const id = result.rows[0].id;
    return { id, email, password, cookie: `${AUTH_COOKIE_NAME}=${createAccessToken(id)}` };
  }

  return { pool, request, createUser };
}
