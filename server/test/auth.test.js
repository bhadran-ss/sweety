import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createTestApp } from "./helpers/app.js";

test("authentication and API errors", async (t) => {
  const { pool, request } = await createTestApp(t);
  const { verifyPassword } = await import("../src/utils/password.js");
  const { verifyAccessToken } = await import("../src/utils/token.js");
  const { AUTH_COOKIE_NAME } = await import("../src/utils/authCookie.js");
  const credentials = { name: " Test User ", email: " TEST@Example.com ", password: "test-password" };
  let cookie;
  let user;

  await t.test("registration stores a bcrypt hash and automatically authenticates", async () => {
    const response = await request("POST", "/auth/register", { body: credentials });
    assert.equal(response.status, 201);
    user = response.body.data.user;
    assert.deepEqual(Object.keys(user).sort(), ["created_at", "email", "id", "name"]);
    assert.equal(user.name, "Test User");
    assert.equal(user.email, "test@example.com");
    const stored = await pool.query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    assert.notEqual(stored.rows[0].password_hash, credentials.password);
    assert.equal(await verifyPassword(credentials.password, stored.rows[0].password_hash), true);
    assert.equal(await verifyPassword("incorrect", stored.rows[0].password_hash), false);
    const header = response.headers.get("set-cookie");
    assert.match(header, /HttpOnly/i);
    assert.match(header, /SameSite=Lax/i);
    assert.match(header, /Max-Age=900/i);
    cookie = header.split(";")[0];
    const payload = verifyAccessToken(cookie.slice(AUTH_COOKIE_NAME.length + 1));
    assert.equal(payload.sub, String(user.id));
    assert.equal(payload.exp - payload.iat, 900);
    const me = await request("GET", "/auth/me", { cookie });
    assert.equal(me.status, 200);
    assert.deepEqual(me.body.data.user, user);
    assert.equal(me.headers.get("cache-control"), "no-store");
  });

  await t.test("duplicate normalized email returns 409 without a new session", async () => {
    const response = await request("POST", "/auth/register", { body: credentials });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "EMAIL_ALREADY_EXISTS");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM users")).rows[0].count, 1);
  });

  await t.test("logout clears the cookie, then login restores authentication", async () => {
    const logout = await request("POST", "/auth/logout", { cookie });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);
    // A browser drops the cookie when it receives the expiry header.
    assert.equal((await request("GET", "/auth/me")).status, 401);
    const login = await request("POST", "/auth/login", {
      body: { email: credentials.email, password: credentials.password },
    });
    assert.equal(login.status, 200);
    assert.deepEqual(login.body.data.user, user);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("GET", "/auth/me", { cookie })).status, 200);
  });

  await t.test("unknown email and incorrect password return the same generic error", async () => {
    const wrong = await request("POST", "/auth/login", { body: { email: user.email, password: "wrong" } });
    const missing = await request("POST", "/auth/login", { body: { email: "missing@example.com", password: "wrong" } });
    assert.equal(wrong.status, 401);
    assert.equal(missing.status, 401);
    assert.deepEqual(wrong.body, missing.body);
    assert.equal(wrong.body.error.code, "INVALID_CREDENTIALS");
  });

  await t.test("missing, malformed, expired, and wrongly signed tokens return 401", async () => {
    const claims = { algorithm: "HS256", subject: String(user.id), issuer: "sweety-api", audience: "sweety-web" };
    const expired = jwt.sign({}, process.env.JWT_SECRET, { ...claims, expiresIn: -1 });
    const wrongSignature = jwt.sign({}, "another-test-secret-at-least-32-characters", { ...claims, expiresIn: 900 });
    const wrongAudience = jwt.sign({}, process.env.JWT_SECRET, { ...claims, audience: "another-app", expiresIn: 900 });
    for (const token of [null, "invalid", expired, wrongSignature, wrongAudience]) {
      const response = await request("GET", "/auth/me", { cookie: token ? `${AUTH_COOKIE_NAME}=${token}` : undefined });
      assert.equal(response.status, 401);
    }
  });

  await t.test("invalid registration input is rejected before insertion", async () => {
    for (const patch of [{ email: "bad" }, { password: "short" }, { password: "🙂".repeat(19) }, { name: " " }, { admin: true }]) {
      const response = await request("POST", "/auth/register", { body: { ...credentials, ...patch } });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, "VALIDATION_ERROR");
    }
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM users")).rows[0].count, 1);
  });

  await t.test("CORS permits trusted preflight but the origin guard rejects untrusted writes", async () => {
    const preflight = await request("OPTIONS", "/auth/login", { headers: { "Access-Control-Request-Method": "POST" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), process.env.CLIENT_ORIGIN);
    assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
    for (const origin of [null, "null", "https://attacker.example", `${process.env.CLIENT_ORIGIN}.attacker.example`]) {
      const response = await request("POST", "/auth/logout", { origin, cookie, raw: "", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      assert.equal(response.status, 403);
      assert.equal(response.body.error.code, "UNTRUSTED_ORIGIN");
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
  });

  await t.test("health, malformed JSON, large bodies, and unknown routes have stable responses", async () => {
    assert.equal((await request("GET", "/health")).status, 200);
    const malformed = await request("POST", "/auth/login", { raw: "{" });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, "INVALID_JSON");
    const large = await request("POST", "/auth/login", { body: { value: "x".repeat(101 * 1024) } });
    assert.equal(large.status, 413);
    assert.equal(large.body.error.code, "PAYLOAD_TOO_LARGE");
    const unknown = await request("GET", "/missing");
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, "ROUTE_NOT_FOUND");
  });

  await t.test("unexpected database errors expose a generic 500 response", async (t) => {
    await pool.query("ALTER TABLE users RENAME TO unavailable_users");
    t.mock.method(console, "error", () => {});
    try {
      const response = await request("GET", "/auth/me", { cookie });
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Please try again." } });
    } finally {
      await pool.query("ALTER TABLE unavailable_users RENAME TO users");
    }
  });

  await t.test("repeated auth attempts return 429", async () => {
    let response;
    for (let attempt = 0; attempt < 21; attempt++) {
      response = await request("POST", "/auth/login", { body: {} });
      if (response.status === 429) break;
      assert.equal(response.status, 400);
    }
    assert.equal(response.status, 429);
    assert.equal(response.body.error.code, "TOO_MANY_ATTEMPTS");
    assert.ok(response.headers.get("retry-after"));
  });
});
