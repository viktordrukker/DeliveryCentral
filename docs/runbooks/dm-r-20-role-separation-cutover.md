# DM-R-20 — Role separation cutover runbook

**Status:** Roles created + permissions granted. Runtime cutover is opt-in
via env vars so the rollout can happen one environment at a time.

## The roles

| Role | Can DDL? | Can DML? | Can DELETE audit rows? | Used by |
|------|----------|----------|-------------------------|---------|
| `postgres` (default superuser) | ✅ | ✅ | ✅ | Legacy / fallback only |
| `app_migrator` | ✅ | ✅ | ✅ | `migrate` + `seed` + `mock-data-generator` containers, DBAs |
| `app_runtime` | ❌ | ✅ | ❌ (append-only on `AuditLog` + `migration_audit`) | `backend` container |

## Cutover (per environment)

1. Rotate the role passwords to production-grade secrets:

   ```sql
   ALTER ROLE app_runtime  WITH PASSWORD '<new-strong-secret>';
   ALTER ROLE app_migrator WITH PASSWORD '<new-strong-secret>';
   ```

2. Set environment variables **before** restarting the stack. Both point
   at the same host/port/database, but use distinct credentials:

   ```bash
   export RUNTIME_DATABASE_URL="postgresql://app_runtime:<secret>@postgres:5432/workload_tracking?schema=public"
   export MIGRATE_DATABASE_URL="postgresql://app_migrator:<secret>@postgres:5432/workload_tracking?schema=public"
   ```

3. Recreate the affected services:

   ```bash
   docker compose up -d --force-recreate migrate backend
   ```

4. Verify — grep the backend startup log for DM-R-1 passing, then smoke
   `/api/health/deep`:

   ```bash
   docker compose logs backend | grep "migration state verified"
   curl -sf http://localhost:3000/api/health/deep | jq .status   # "ready"
   ```

5. Adversarial smoke — confirm the runtime role is really locked down:

   ```bash
   docker compose exec postgres psql -U app_runtime -d workload_tracking \
     -c 'DROP TABLE "Person";'
   # Expected: ERROR: must be owner of table Person
   ```

## Rollback

Unset `RUNTIME_DATABASE_URL` + `MIGRATE_DATABASE_URL` and restart:

```bash
unset RUNTIME_DATABASE_URL MIGRATE_DATABASE_URL
docker compose up -d --force-recreate migrate backend
```

Both services revert to the superuser `postgres` connection.

## Why two variables?

Only the `migrate` / `seed` / `mock-data-generator` services need DDL.
The NestJS backend only needs DML. Splitting the URLs makes it
impossible for a bug in the backend (or a hostile agent riding the
backend's trust) to issue `DROP TABLE` — the Postgres server refuses
before any CI/review gate sees the request.

## Related

- Migration: `prisma/migrations/20260418_dm_r_20_role_separation/`
- Event trigger lockout (defense in depth): **DM-R-21** (pending)
- Append-only hash-chain: **DM-R-22** (pending)
- Connection-level agent provenance: **DM-R-26** (pending)
