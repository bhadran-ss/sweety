# Backend tests and migrations

Run commands from `server`. Install dependencies with `npm ci` and configure `.env`
using `.env.example`. Use Node.js 20 or newer and a running PostgreSQL server.

## Separate test database

For the local application account used by this project:

```sh
sudo -u postgres createdb --owner=sweety_app sweety_test
```

Set `TEST_DATABASE_URL` in `.env` to the same application credentials with database
name `sweety_test`. Keep `DATABASE_URL` pointing to the development database `sweety`.
The test account must own the test database or have permission to create schemas.

```sh
npm test
```

The suite uses real PostgreSQL queries and temporary HTTP listeners. Each suite
creates a unique schema in the test database, runs the migrations, and removes its
own schema afterward. It never resets or truncates the development database. The
test URL must name a database ending in `_test` and must differ from the development
database name. Missing configuration or an unavailable database fails the tests.

Coverage includes authentication, bcrypt verification, cookie expiry, invalid and
expired JWTs, origin checks, rate limiting, reading validation, duplicate slots,
daily limits, concurrent writes, user isolation, report calculations, empty results,
changes after edits/deletions, timezone boundaries, year transitions, and leap years.

Date-only and database-configuration checks can run without PostgreSQL:

```sh
node --test test/dates.test.js
```

## Migrations

For a fresh development database configured by `DATABASE_URL`:

```sh
npm run db:migrate
```

Migrations run in order inside a transaction. `schema_migrations` records their
names and checksums. Repeating the command skips applied migrations; changing an
already applied migration is rejected. Add new migration files to the ordered list
in `src/db/migrations.js` when the schema changes.

This project's existing development database already had `create_users.sql` and
`create_readings.sql` applied manually. To start tracking that existing database:

```sh
npm run db:migrate -- --baseline
```

Use baseline only when those migrations have already been applied exactly as
written. It checks that the tables exist and records their checksums; it does not
compare or repair existing column definitions. It preserves existing data.
The tests migrate their isolated schemas automatically; no manual test migration
command is required.
