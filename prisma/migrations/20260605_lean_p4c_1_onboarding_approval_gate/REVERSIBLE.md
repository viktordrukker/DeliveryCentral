# REVERSIBLE — LEAN-P4c-1 onboarding-stage approval gate

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` drops the three additive columns on `ProjectPosition`:

1. `requiresOnboardingApproval` (BOOLEAN, default FALSE).
2. `onboardingApprovedAt` (TIMESTAMPTZ).
3. `onboardingApprovedByPersonId` (UUID + FK + index).

## When rollback is safe

Before any production position has its gate set to `TRUE`. The default
value (`FALSE`) means pre-existing rows behave exactly as before, so a
rollback prior to any operator enabling the gate is information-preserving.
Rolling back after gates have been enabled would lose the gate state +
approval audit trail.

## Rollback path

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260605_lean_p4c_1_onboarding_approval_gate/rollback.sql
```

Then revoke the migration row:

```sql
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260605_lean_p4c_1_onboarding_approval_gate';
```
