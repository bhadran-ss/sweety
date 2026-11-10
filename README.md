# Sweety — Blood Glucose Tracker

An Express API with PostgreSQL for recording personal glucose readings and viewing
daily, month-to-date, and previous-month reports. The backend and React
authentication and reading-management screens are implemented. Report screens
are the next phase.

## Backend setup

Prerequisites: Node.js 22.12 or newer, npm, and PostgreSQL. The frontend uses
[Vite](https://vite.dev/guide/) with React.

For a new local database setup, open PostgreSQL as an administrator:

```sh
sudo -u postgres psql
```

```sql
CREATE ROLE sweety_app WITH LOGIN PASSWORD 'replace-with-your-local-password';
CREATE DATABASE sweety OWNER sweety_app;
CREATE DATABASE sweety_test OWNER sweety_app;
\q
```

Skip database/account creation if they already exist. Then, from the project root:

```sh
cd server
npm ci
cp .env.example .env
```

Edit `.env` with your database credentials. `DATABASE_URL` points to `sweety` and
`TEST_DATABASE_URL` points to `sweety_test`. Generate a JWT secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `JWT_SECRET` to that value. The environment example lists every configuration
variable. Keep `.env` out of Git.

For a fresh database:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

If the two SQL migrations were already applied manually, record them once with
`npm run db:migrate -- --baseline` before using the normal migration command.
Baseline assumes the existing tables match those migration files.

The API defaults to `http://localhost:5000`; check `GET /api/health`.
Use `npm start` to run without the development watcher.

## Frontend setup

Keep the API running in one terminal. In a second terminal, from the project root:

```sh
cd client
npm ci
npm run dev
```

Open **http://localhost:5173**. Keep `CLIENT_ORIGIN=http://localhost:5173` in
`server/.env`; use that hostname rather than `127.0.0.1` in the browser. The client
uses port 5173 strictly so a busy port cannot silently break the origin check.

Vite proxies `/api` to `http://localhost:5000` and preserves the browser's Origin
header. If the API runs elsewhere, copy `client/.env.example` to `client/.env`
and adjust `API_PROXY_TARGET`. The default needs no client environment file.
Never put database credentials or JWT secrets in the client configuration.

The frontend includes registration, login, password visibility controls, a demo
login button, and a protected account dashboard. Registration signs in
automatically. Refreshing restores the session through `/api/auth/me`. Logout
clears the cookie and the frontend user state. Expired sessions return to login;
the app also rechecks the session when the tab gains focus and once a minute while
visible. Network failures offer a retry instead of being treated as logout.
Authentication tokens are never stored in localStorage or sessionStorage.

The dashboard lets you select a date, add readings, edit their date/slot/value,
and delete them with confirmation. It shows all four daily slots, validates whole
numbers from 40 to 600, and displays duplicate-slot and daily-limit errors. Dates
use Asia/Kolkata to match the API. Changing the viewed date resets the form;
a reading saved to another date can be viewed by selecting that date.

From `client`, build or check the client:

```sh
npm test
npm run build
npm run preview
```

Preview uses port 5173 and the same local API proxy; stop the dev client before
starting preview. For production, serve `client/dist` with SPA fallback for React
routes and proxy `/api` to Express on the same origin. Vite's development proxy
is not a production server configuration.

## Demo data

Demo credentials:

- Email: `demo@sweety.example`
- Password: `SweetyDemo123!`

`npm run db:seed` creates the demo account with a bcrypt-hashed password and sample
readings relative to the current date in Asia/Kolkata. It includes the current and
previous months and days containing different numbers of readings. Repeating it
adds missing samples without deleting other users, duplicating slots, or replacing
existing readings.

To deliberately clear **all users and readings** in the local development database
and start again with demo data:

```sh
npm run db:seed -- --reset
```

The reset and seed run in one transaction. Migration history is preserved.
Demo seeding is disabled in production; reset also requires a local development
database connection.

## Tests

From `server`:

```sh
npm test
```

Tests exercise the HTTP API and real PostgreSQL queries. They use isolated schemas
in `sweety_test`, clean up afterward, and do not reset the development database.
See [test setup and migration details](server/test/README.md).

The client's `npm test` checks its API helper, including credentials, backend error
messages, expired-session notifications, and network/proxy failures.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and sign in |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get the authenticated user |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET / POST | `/api/readings` | List or add readings |
| GET / PUT / DELETE | `/api/readings/:id` | Retrieve, replace, or delete a reading |
| GET | `/api/reports?date=YYYY-MM-DD` | Get all three report summaries |

Readings accept `reading_date`, `slot`, and numeric `value`. Slots are
`morning_fasting`, `after_breakfast`, `after_lunch`, and `after_dinner`.
List readings for one date with `/api/readings?date=YYYY-MM-DD`.
Authenticated requests use the session cookie. Writes must include an `Origin`
matching `CLIENT_ORIGIN`, including when using Postman or curl.

## Notes

- Calendar dates and future-date validation use Asia/Kolkata.
- Monthly means the entire previous calendar month. For October 15, reports cover
  October 15, October 1–15, and September 1–30.
- Averages use individual readings and are rounded to one decimal. The frontend
  will format whole-number averages such as `120` as `120.0`.
- Registration automatically signs the user in. Sessions last 15 minutes.
  Logout clears the browser cookie; copied JWTs remain valid until expiry.
- Controllers handle HTTP, services enforce business rules, and repositories run
  parameterized SQL. Database constraints protect against duplicate slots even
  during concurrent requests.
- Improvements with more time: password recovery, session revocation, pagination,
  and broader browser/deployment testing.

Report screens and final application screenshots remain to be completed.
