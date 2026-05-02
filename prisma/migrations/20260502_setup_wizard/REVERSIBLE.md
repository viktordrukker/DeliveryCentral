# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` drops the two tables
(`setup_runs`, `setup_run_logs`) and two enums (`SetupRunStatus`,
`SetupRunLogLevel`) the migration installs.

## What this migration adds

* `setup_runs` — one row per (run_id, step_key) pair. Drives the
  in-app first-run setup wizard's state machine.
* `setup_run_logs` — verbose breadcrumb log per logical action,
  bundled into the diagnostic tar.gz the wizard's "Download diagnostic
  bundle" button serves.

Both are pure additions; no existing data is touched.

## Rollback impact

* All wizard run history + breadcrumbs are lost.
* The runtime `SetupModule` will fail at boot until the tables come
  back. Rollback is intended only for ephemeral CI DBs and dev
  scratch — never for an environment that has shipped the wizard.

## Procedure

```bash
docker compose exec -T postgres \
  psql -U postgres -d workload_tracking \
  < prisma/migrations/20260502_setup_wizard/rollback.sql
```

Then mark the migration rolled-back so a re-deploy doesn't think it's
still pending:

```sql
UPDATE _prisma_migrations
   SET rolled_back_at = NOW()
 WHERE migration_name = '20260502_setup_wizard'
   AND finished_at IS NOT NULL
   AND rolled_back_at IS NULL;
```
