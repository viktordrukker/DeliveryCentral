# F-20 / D-109 — onboarding_tour_progress.personId FK action Cascade → SetNull

## Forward

Changes the `onboarding_tour_progress.personId` foreign-key action from
`ON DELETE CASCADE` to `ON DELETE SET NULL`, and relaxes the column
nullability to allow the SET NULL semantics. Data-quality audit Part
4 sub-task c: audit-adjacent analytics (which tours each person
completed) should survive person deletion so onboarding effectiveness
can be evaluated independently of the people who churned through.

## Backward

`rollback.sql` deletes any rows that became orphan (`personId = NULL`)
after the forward migration, sets the column back to `NOT NULL`, and
restores `ON DELETE CASCADE`. Orphan-row deletion is the only
non-idempotent step — re-running the rollback after a clean state is
safe because there are no rows with NULL personId to delete.

## Reversibility test

- Apply forward → `\d onboarding_tour_progress` shows `personId UUID`
  (nullable) and the FK constraint with `ON DELETE SET NULL`.
- Insert a row, delete the referenced person → progress row survives
  with `personId = NULL`.
- Apply backward → `personId` is `NOT NULL` again, FK action is
  `CASCADE`, any orphan rows from the forward direction are dropped.
- Backward again → idempotent (`DROP ... IF EXISTS` + `DELETE ...`
  is a no-op on a clean state).
