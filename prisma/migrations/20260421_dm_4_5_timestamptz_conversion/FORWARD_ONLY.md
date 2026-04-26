# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**. Reverting `timestamptz`
back to `timestamp without time zone` cannot preserve the recorded
instant — Postgres would strip the offset and keep only the UTC wall-time,
which is indistinguishable from a local-wall-time reading in a non-UTC
session. The ambiguity is exactly what DM-4-5 is fixing; we cannot
un-fix it without knowing each row's originating timezone.

## How to restore after a bad deploy

Recovery goes through a pre-migration snapshot. The canonical flow:

```bash
# 1) Before the migration (required by scripts/db-migrate-safe.sh):
./scripts/db-snapshot.sh pre-migrate

# 2) Run the migration via the safe wrapper:
./scripts/db-migrate-safe.sh deploy

# 3) If it turns out bad, restore the snapshot:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

## Why the conversion is hazardous

`ALTER COLUMN ... TYPE timestamptz USING <col>` interprets the source
value against the session's `timezone` GUC. DM-4-4 enforces UTC at the
runtime level; this migration also runs `SET LOCAL TIMEZONE = 'UTC'`
defensively.

## Verification after apply

Sampling confirms no offset shift:

```sql
SELECT id, "createdAt", "createdAt" AT TIME ZONE 'UTC'
FROM "Person" ORDER BY "createdAt" LIMIT 5;
```

Expected: the two columns show identical wall-clock times for every row.
