# FORWARD_ONLY — PR-15 ProjectPositionFillChangeType REASSIGNED extension

Single `ALTER TYPE ... ADD VALUE` so `ProjectPositionFillHistory.changeType`
can record bulk-reassign person swaps / project moves truthfully instead of
fabricating an `ASSIGNED` progression.

## Why FORWARD_ONLY?

Postgres enum has no `DROP VALUE`. Reverting requires:

1. Pause every service that writes ProjectPositionFillHistory rows.
2. `DELETE FROM "ProjectPositionFillHistory" WHERE "changeType" = 'REASSIGNED'`.
3. Recreate the enum without the value + rebind every column that uses it
   (a multi-statement migration with operational risk).

Additive enum extension is the right shape — FORWARD_ONLY is the honest
classification.

## DM-R-29 two-person rule

This PR triggers the two-person rule (`scripts/check-forward-only-approvals.cjs`).
CI runs with `DM_R_29_SOLO_MAINTAINER=true` (single-owner repo), so the gate
logs the FORWARD_ONLY scope without blocking on trailer count.
