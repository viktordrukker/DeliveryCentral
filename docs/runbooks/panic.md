# DM-R-24 — Panic runbook

Three escalating kill-switches. Pick the least-destructive that meets the
moment; you can always go deeper, but you cannot un-halt mid-traffic.

## Escalation ladder

| Level | Script | What it does | Reversible with |
|-------|--------|-------------|-----------------|
| 1. **Read-only** | `scripts/panic-readonly.sh` | `ALTER DATABASE … SET default_transaction_read_only = on` + terminate non-admin sessions. Writes fail with ERRCODE 25006; reads keep serving. | `scripts/panic-readwrite.sh` |
| 2. **Halt** | `scripts/panic-halt.sh` | Stop backend container + revoke `app_runtime` grants + terminate non-admin sessions. No traffic reaches the DB. | Grants re-apply + `docker compose up -d backend` |
| 3. **Restore** | `scripts/db-last-good.sh [N]` | PITR restore from newest (or Nth-newest) pre-migration snapshot. Destructive: wipes + replaces the entire DB. | No clean revert; snapshots are immutable. |

## Operator checklist

1. **Detect.** Dashboards dead? Check:
   - `docker logs backend | grep DRIFT_EVENT | tail -30` (DM-R-14 events)
   - `/api/health/deep` → look for non-ready aggregates
   - `SELECT * FROM ddl_audit ORDER BY occurred_at DESC LIMIT 20` (DM-R-21)
   - `SELECT * FROM migration_audit ORDER BY recorded_at DESC LIMIT 10` (DM-R-7)
   - Run `node scripts/verify-audit-hash-chain.cjs` — hash chain tampering?

2. **Contain.** Pick the escalation level. Default to `panic-readonly.sh`
   first — preserves read traffic while you investigate.

3. **Diagnose.** With writes stopped, compare current schema to baseline:
   - `bash scripts/prestart-verify-migrations.sh`
   - `pg_dump --schema-only | diff - prisma/migrations/.baseline-schema.sql`

4. **Recover.**
   - If the damage is a small data mutation: fix it forward with a
     surgical SQL statement run as `postgres` inside `SET LOCAL
     public.allow_bulk = 'true'` (DM-R-23 bypass).
   - If the damage is schema-level (dropped column, bad migration):
     restore from snapshot via `db-last-good.sh`.

5. **Resume.**
   - `panic-readwrite.sh` or re-apply `app_runtime` grants
   - `docker compose up -d backend`
   - Verify `/api/health/deep` returns `"status":"ready"` before routing
     traffic back.

## Dry-run exercise (do this quarterly)

Every DM-R-28 chaos drill rehearses this runbook. Time each phase:
- Time-to-detect (TTD): how long from symptom to operator issuing panic
- Time-to-contain (TTC): from panic command to write-free state
- Time-to-recover (TTR): from containment to dashboards green

Targets (post-DM-R-25 PITR):
- TTD ≤ 10 min (DRIFT_EVENT alerts cut this further)
- TTC ≤ 1 min (script runtime + interactive confirm)
- TTR ≤ 30 min (snapshot restore + smoke)

## Why three levels, not one

Read-only is usually enough: a bad write is in flight, you stop further
writes, investigate, and fix. Halt is for when reads themselves are
dangerous (data exfiltration in progress, honeypot tripped). Restore is
last resort — it destroys anything written after the snapshot; use only
when the damage exceeds the data loss.
