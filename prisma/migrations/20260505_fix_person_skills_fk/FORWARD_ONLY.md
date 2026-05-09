# FORWARD_ONLY

**Posture:** FORWARD_ONLY. This migration deletes orphan rows (step 1) and
type-casts a column (step 2) before adding the FK (step 3). The deletion
is not safely reversible — restoring the orphan rows would require
re-creating the missing parent `Person` records (which were already gone
or never existed).

## What this migration does

1. Deletes `person_skills` rows whose `personId` does not exist in `Person.id`.
2. Casts `person_skills.personId` from `text` to `uuid` (only if currently `text`).
3. Adds `person_skills_personId_fkey` FK referencing `Person(id)` with
   `ON DELETE CASCADE ON UPDATE CASCADE` (only if not already present).

## Why FORWARD_ONLY

* Step 1 is a destructive `DELETE`. The orphan rows had a `personId` pointing
  at a non-existent `Person`. By definition we cannot restore the parent
  Person record from the orphan row alone.
* Step 2 is a type cast. Reversing it would require widening `uuid` back to
  `text`, which is technically possible but pointless without the parent
  table being restored.

## Restore flow (if needed)

Strict rollback is not supported. The recovery path is:

1. Restore the database from a backup taken **before** this migration ran
   (e.g. `/opt/backups/<env>-<date>.sql.gz` from the daily 03:00 UTC cron).
2. Re-apply any subsequent migrations that landed after the backup window.

If you only need to remove the FK (without un-deleting orphans), run:

```sql
ALTER TABLE person_skills DROP CONSTRAINT IF EXISTS "person_skills_personId_fkey";
ALTER TABLE person_skills ALTER COLUMN "personId" TYPE text USING "personId"::text;
```

## Why this matters

Historically the column was plain `text` with no FK, which let orphan rows
accumulate (e.g. retired demo-dataset personIds). The matcher then surfaced
those orphans as candidates and slate-submit failed at the
`StaffingRequestProposalCandidate` FK with an opaque 500. This migration
closes the gap so the integrity invariant is enforced at the DB level.
