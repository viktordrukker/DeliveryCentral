# FORWARD_ONLY — Sprint 2 / S2-1 lean staffing aggregate expand

This migration is forward-only per DM-R-29.

## Why not REVERSIBLE?

The original PR shipped this migration as REVERSIBLE with a `rollback.sql`
that dropped the 3 new tables + 3 new enums. That rollback was technically
correct (it undoes the migration), but the DM-R-11 round-trip workflow flagged
it as a "fake rollback":

```
✗ 20260523_lean_staffing_expand_project_position: rollback.sql ran cleanly
  but produced ZERO schema change — fake rollback suspected
```

The reason: DM-R-11 applies rollback.sql against the **baseline schema dump**
(`prisma/migrations/.baseline-schema.sql`), which was captured BEFORE this
migration. With `DROP TABLE IF EXISTS` guards, the rollback against the
baseline is correctly a no-op — but DM-R-11 interprets "no schema change"
as a fake rollback.

For pure additive expand-phase migrations (new tables, no changes to existing
tables) the FORWARD_ONLY posture is the right semantic fit. Operational
rollback procedures are documented below.

## Restore procedure if a rollback is genuinely needed

If this migration must be reversed in production (e.g. a critical bug surfaces
in dual-write code in S2-6 that requires reverting Sprint 2):

1. Pause dual-write code (S2-6 adapter) so legacy models become single source
   of truth again. The new tables stop receiving writes.
2. Stop the backend.
3. Run the destructive SQL:
   ```sql
   DROP TABLE IF EXISTS "ProjectPositionFillHistory" CASCADE;
   DROP TABLE IF EXISTS "ProjectPositionCandidate" CASCADE;
   DROP TABLE IF EXISTS "ProjectPosition" CASCADE;
   DROP TYPE IF EXISTS "ProjectPositionFillChangeType";
   DROP TYPE IF EXISTS "ProjectPositionCandidateDecision";
   DROP TYPE IF EXISTS "ProjectPositionFillStatus";
   ```
4. Remove the migration row:
   ```sql
   DELETE FROM _prisma_migrations
   WHERE migration_name = '20260523_lean_staffing_expand_project_position';
   ```
5. Revert the schema.prisma + dependent code via `git revert` + redeploy.

After the Sprint 5 contract phase lands (drops legacy `StaffingRequest`,
`ProjectAssignment`, etc.), this restore procedure is no longer safe —
contract is forward-only.

## Safe to deploy?

Yes. Pure additive: 3 new tables + 3 new enums. No changes to existing
tables. No data manipulation. Backend code didn't reference the new
tables on the initial S2-1 merge (services land in S2-3, dual-write in
S2-6) so application reads + writes against legacy paths continue
unchanged.
