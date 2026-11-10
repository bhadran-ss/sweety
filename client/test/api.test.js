import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, onUnauthorized } from "../src/lib/api.js";

test("requests use the API proxy, cookies, and JSON bodies", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ data: { user: { id: 1 } } }),
  );
  const credentials = { email: "demo@example.com", password: "test-password" };
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
  });
  assert.equal(result.data.user.id, 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "/api/auth/login");
  assert.equal(options.credentials, "include");
  assert.equal(options.method, "POST");
  assert.equal(options.body, JSON.stringify(credentials));
  assert.equal(options.headers["Content-Type"], "application/json");
});

test("backend error messages are preserved for the form", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "This email is already registered.",
        },
      },
      { status: 409 },
    ),
  );
  await assert.rejects(
    apiRequest("/auth/register", { method: "POST", body: {} }),
    (error) =>
      error.status === 409 &&
      error.code === "EMAIL_ALREADY_EXISTS" &&
      error.message === "This email is already registered.",
  );
});

test("protected 401 responses invalidate the session, but login failures do not", async (t) => {
  let expired = 0;
  t.after(
    onUnauthorized(() => {
      expired++;
    }),
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: { message: "Please sign in." } }, { status: 401 }),
  );
  await assert.rejects(
    apiRequest("/readings"),
    (error) => error.status === 401,
  );
  assert.equal(expired, 1);
  await assert.rejects(
    apiRequest("/auth/login", { notifyUnauthorized: false }),
    (error) => error.status === 401,
  );
  assert.equal(expired, 1);
});

test("proxy HTML failures produce a readable error", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>Unavailable</html>", { status: 503 }),
  );
  await assert.rejects(
    apiRequest("/auth/me"),
    (error) => error.status === 503 && !error.message.includes("<html>"),
  );
});

test("network failures and invalid success responses are handled", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    apiRequest("/auth/me"),
    (error) =>
      error.code === "NETWORK_ERROR" && error.message.includes("connection"),
  );
  fetch.mock.mockImplementation(
    async () => new Response("<html>Wrong server</html>"),
  );
  await assert.rejects(
    apiRequest("/auth/me"),
    (error) => error.code === "INVALID_RESPONSE",
  );
});

test("empty 204 responses succeed", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(await apiRequest("/auth/logout", { method: "POST" }), null);
});
