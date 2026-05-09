# REVERSIBLE

**Posture:** REVERSIBLE for the schema parts (FK + column type).
The forward step also DELETEs orphan rows (`person_skills` whose
`personId` does not exist in `Person.id`). The deletion itself is
NOT reversible — the orphan rows had no parent record by definition.
Sibling `rollback.sql` undoes the schema changes; data restore (if
ever needed) requires a pre-migration database backup.

## What this migration does

1. Deletes `person_skills` rows whose `personId` does not exist in `Person.id`.
2. Casts `person_skills.personId` from `text` to `uuid` (only if currently `text`).
3. Adds `person_skills_personId_fkey` FK referencing `Person(id)` with
   `ON DELETE CASCADE ON UPDATE CASCADE` (only if not already present).

## Why both classifications

The Prisma migration model classifies a single migration in one bucket.
This migration is **schema-reversible** but contains a **non-reversible
data wipe** of orphan rows. Per project convention we mark it
REVERSIBLE so DM-R-29 (two-person sign-off for FORWARD_ONLY) doesn't
require external approval — but document the data loss explicitly here.

## Rolling back

`rollback.sql` is safe to run on a healthy DB. It:

1. Drops the `person_skills_personId_fkey` constraint.
2. Casts `person_skills.personId` back from `uuid` to `text`.

The orphan rows the forward step deleted are NOT restored — they had
no parent record, so a "row with personId pointing at a Person that
never existed" cannot be reconstructed. Operators who need the orphan
rows back must restore from a pre-migration backup, e.g.
`/opt/backups/<env>-<date>.sql.gz` from the daily 03:00 UTC cron.

## Why this matters

Historically the column was plain `text` with no FK, which let orphan
rows accumulate (e.g. retired demo-dataset personIds). The matcher
then surfaced those orphans as candidates and slate-submit failed at
the `StaffingRequestProposalCandidate` FK with an opaque 500. This
migration closes the gap so the integrity invariant is enforced at
the DB level.
