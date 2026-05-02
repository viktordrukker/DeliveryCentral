# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` revokes the same DML
privileges this migration grants.

## What this migration does

Grants `SELECT, INSERT, UPDATE, DELETE` on `setup_runs` and
`setup_run_logs` to the runtime users (`prod_user`, `staging_user`)
that the application connects as.

## Why a separate migration

The previous migration (`20260502_setup_wizard`) created the tables
under whatever role ran `prisma migrate deploy` (postgres superuser
via `MIGRATE_DATABASE_URL` on staging/prod, or `app_migrator` after
DM-R-21's DDL lockdown lands). `ops/bootstrap-app.sh:apply_baseline`
runs `ALTER DEFAULT PRIVILEGES` once at install time as the postgres
superuser — its auto-grants only fire when **that same role**
subsequently creates a table. Tables created by a different role
inherit no grant, and the runtime user gets `42501 permission denied`.

This migration plugs the gap explicitly. It's idempotent (GRANT is
idempotent in postgres) and skips users that don't exist on the
cluster (dev DBs / fresh installs without a per-DB user).

## Rolling forward / back

Re-running is safe. Rolling back removes the privileges, which would
re-break the runtime — only do so if you're also rolling back
`20260502_setup_wizard`.
