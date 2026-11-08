# Reversible migration

Pure additive — one boolean column `selfEndorsed` on `person_skills`
with `DEFAULT FALSE`. Existing rows keep manager-recorded semantics
because they backfill to `FALSE`.

Rollback drops the column. Any `TRUE` values written after this
migration shipped (i.e., real self-endorsements from `/me/skills`)
will be lost on rollback. See `rollback.sql`.
