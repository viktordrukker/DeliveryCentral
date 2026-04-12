# Localhost Docker Deployment

## Scope

This deployment path is for local development and demo use only.

Everything runs through Docker Compose:
- PostgreSQL
- NestJS backend
- React frontend
- Prisma migration job
- Prisma seed job

Direct host execution of backend, frontend, migrations, seed, or database is unsupported for localhost runtime.

## Files involved

- `.env.example`: starter environment file
- `docker-compose.yml`: local service orchestration
- `Dockerfile`: backend and Prisma utility image
- `frontend/Dockerfile`: frontend image
- `.dockerignore` and `frontend/.dockerignore`: build-context pruning

## Environment setup

Copy the example file before running Docker Compose.

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

Important variables:

- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `AUTH_JWT_SECRET`
- `AUTH_ALLOW_TEST_HEADERS`
- `AUTH_DEV_BOOTSTRAP_ENABLED`
- `AUTH_DEV_BOOTSTRAP_USER_ID`
- `AUTH_DEV_BOOTSTRAP_PERSON_ID`
- `AUTH_DEV_BOOTSTRAP_ROLES`
- `NOTIFICATIONS_SMTP_HOST`
- `NOTIFICATIONS_SMTP_PORT`
- `NOTIFICATIONS_SMTP_SECURE`
- `NOTIFICATIONS_SMTP_USERNAME`
- `NOTIFICATIONS_SMTP_PASSWORD`
- `NOTIFICATIONS_EMAIL_FROM_ADDRESS`
- `NOTIFICATIONS_EMAIL_FROM_NAME`
- `NOTIFICATIONS_EMAIL_REPLY_TO`
- `NOTIFICATIONS_DEFAULT_EMAIL_RECIPIENT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `MONITORING_PORT`
- `MONITORING_AGENT_PORT`
- `PUBLIC_API_BASE_URL`
- `INTERNAL_API_BASE_URL`
- `API_PREFIX`
- `CORS_ORIGIN`
- `NODE_ENV`

When changing ports, update the related browser-facing values as a set:
- `BACKEND_PORT` and `PUBLIC_API_BASE_URL`
- `FRONTEND_PORT` and `CORS_ORIGIN`

### Default localhost URLs

With the default `.env` values:
- frontend: `http://localhost:5173`
- backend health: `http://localhost:3000/api/health`
- backend readiness: `http://localhost:3000/api/readiness`
- backend diagnostics: `http://localhost:3000/api/diagnostics`
- API docs: `http://localhost:3000/api/docs`
- monitoring: `http://localhost:8081` after starting the monitoring profile
- monitoring agent: `http://localhost:8686/health` after starting the monitoring profile

## Docker service model

### `postgres`

- PostgreSQL 16 on Alpine
- stores data in the named volume `postgres-data`
- exposes `${POSTGRES_PORT}` to the host
- includes a `pg_isready` healthcheck

### `migrate`

- one-shot Prisma migration job
- waits for PostgreSQL health
- runs `prisma generate` and `prisma migrate deploy`
- designed to be safe to rerun

### `backend`

- NestJS service running in Docker only
- waits for successful migration completion
- exposes `${BACKEND_PORT}` to the host
- reads config entirely from env
- uses CORS origin from env
- serves `/api/health`, `/api/readiness`, `/api/diagnostics`, and `/api/docs`

### `seed`

- one-shot data-load job
- intentionally manual
- runs only when invoked explicitly
- clears and reloads the deterministic demo dataset
- now reloads the live Prisma-backed Organization runtime used by employee, manager-scope, org-chart, and team APIs

### `frontend`

- Vite/React UI running in Docker only
- exposed on `${FRONTEND_PORT}`
- reads `VITE_API_BASE_URL` from env at container startup
- points the browser to the backend through the host-safe URL in `PUBLIC_API_BASE_URL`

### `monitoring`

- separate monitoring/log-view container
- starts through the `monitoring` profile
- exposes `${MONITORING_PORT}` to the host
- intended for local log inspection only

### `monitoring-agent`

- separate monitoring sidecar container
- starts through the `monitoring` profile
- exposes `${MONITORING_AGENT_PORT}` to the host
- normalizes Docker logs and exposes a health API

## Recommended startup flow

### 1. Build images

```bash
docker compose build
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 3. Run migrations

```bash
docker compose run --rm migrate
```

### 4. Run seed job

```bash
docker compose --profile tools run --rm seed
```

### 5. Start backend and frontend

```bash
docker compose up -d backend frontend
```

### 6. Verify runtime

```bash
docker compose ps
```

Then verify:
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/readiness`
- `http://localhost:3000/api/diagnostics`
- `http://localhost:5173`

Optional platform self-check:

```powershell
docker compose exec -T backend npm run platform:self-check
```

## Local authenticated API access

Protected write/admin endpoints now expect bearer tokens instead of raw `x-platform-*` headers.

Mint a local token through Docker only:

```powershell
docker compose run --rm backend npx ts-node --transpile-only --project tsconfig.json scripts/mint-auth-token.ts --subject local-admin --person-id 11111111-1111-1111-1111-111111111004 --roles admin
```

Then use the returned token in:

```text
Authorization: Bearer <token>
```

If you need a non-production bootstrap identity for local debugging, enable it explicitly in `.env`:

- `AUTH_DEV_BOOTSTRAP_ENABLED=true`
- `AUTH_DEV_BOOTSTRAP_USER_ID=<user id>`
- `AUTH_DEV_BOOTSTRAP_PERSON_ID=<person id>`
- `AUTH_DEV_BOOTSTRAP_ROLES=admin`

Keep this disabled in shared or production-like environments.

## Local notification email configuration

Real notification email delivery now uses SMTP configuration from `.env`.

Minimum values for a live email channel:

- `NOTIFICATIONS_SMTP_HOST`
- `NOTIFICATIONS_SMTP_PORT`
- `NOTIFICATIONS_EMAIL_FROM_ADDRESS`

Optional values:

- `NOTIFICATIONS_SMTP_SECURE`
- `NOTIFICATIONS_SMTP_USERNAME`
- `NOTIFICATIONS_SMTP_PASSWORD`
- `NOTIFICATIONS_EMAIL_FROM_NAME`
- `NOTIFICATIONS_EMAIL_REPLY_TO`
- `NOTIFICATIONS_DEFAULT_EMAIL_RECIPIENT`

If these values are missing, notification template resolution still works, but real email delivery attempts will fail channel validation instead of silently falling back to demo behavior.

Optional monitoring:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

Then open:
- `http://localhost:8081`
- `http://localhost:8686/health`

## Alternative shorter flow

If the database is already initialized and you just want to start the stack:

```bash
docker compose up -d backend frontend
```

Because `backend` depends on `migrate`, Compose will also start `postgres` and rerun the idempotent migration job as needed.

## Container-only Prisma operations

Supported Docker commands:

Generate and apply migrations:

```bash
docker compose run --rm migrate
```

Seed demo data:

```bash
docker compose --profile tools run --rm seed
```

Unsupported localhost flow:
- `npm run db:migrate` on the host
- `npm run db:seed` on the host
- `prisma` commands on the host

## Logs and diagnosis

Follow service logs:

```bash
docker compose logs -f postgres migrate backend frontend
```

Start the separate monitoring UI:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

Inspect a single service:

```bash
docker compose logs backend
```

Check container status:

```bash
docker compose ps
```

## Common failure cases

### Backend cannot connect to PostgreSQL

Check:
- `postgres` is healthy in `docker compose ps`
- `DATABASE_URL` still points at `postgres:5432` inside Docker
- `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` match the Compose env

### Frontend cannot reach the API

Check:
- `PUBLIC_API_BASE_URL` points to `http://localhost:<BACKEND_PORT>/api`
- backend is healthy on `/api/health`
- `CORS_ORIGIN` matches the frontend localhost origin

### Migration job fails

Check:
- database credentials in `.env`
- PostgreSQL container health
- existing migration state in the bound volume

Rerun after fixing the cause:

```bash
docker compose run --rm migrate
```

### Seed job fails or data looks stale

The seed job clears operational data before loading the deterministic dataset. Rerun it explicitly:

```bash
docker compose --profile tools run --rm seed
```

### A clean reset is needed

```bash
docker compose down -v --remove-orphans
docker compose build
docker compose up -d postgres
docker compose run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d backend frontend
```

## Cleanup

Stop containers only:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v --remove-orphans
```

## PowerShell launcher helpers

For Windows, the repository includes Docker-only PowerShell wrappers:

- [local-platform.ps1](C:\VDISK1\DeliveryCentral\scripts\local-platform.ps1): main entrypoint
- [local-launch.ps1](C:\VDISK1\DeliveryCentral\scripts\local-launch.ps1): build, migrate, seed, and start
- [local-restart.ps1](C:\VDISK1\DeliveryCentral\scripts\local-restart.ps1): stop and start again
- [local-stop.ps1](C:\VDISK1\DeliveryCentral\scripts\local-stop.ps1): stop the stack

One-line usage:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 launch -Seed
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 restart
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 stop
```

The main script also supports:
- `status`
- `logs`
- `migrate`
- `seed`
- `reset`

## Production-readiness rehearsal

For a local rehearsal of the staging/UAT readiness gate:

```powershell
docker compose exec -T backend npm run platform:self-check
docker compose exec -T backend powershell -Command "$env:SELF_CHECK_INCLUDE_TEST_BASELINE='true'; npm run platform:self-check"
```

See also:

- `docs/testing/release-readiness-checklist.md`
- `docs/deployment/production-readiness.md`

Each script run writes a PowerShell transcript to `logs/` in the repository root. If a wrapper such as `local-launch.ps1` fails, the PowerShell window stays open and prints the log path so the failure can be reviewed before closing.

## Notes on architecture boundaries

The Docker changes are infrastructure-only.

They do not alter the business rules that:
- keep `ProjectAssignment` separate from `WorkEvidence`
- preserve internal project identity apart from external links
- prevent Jira integration from mutating staffing truth
