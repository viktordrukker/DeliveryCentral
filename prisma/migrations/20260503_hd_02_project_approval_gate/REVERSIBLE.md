# REVERSIBLE

**Posture:** REVERSIBLE (with caveats — see below). Sibling `rollback.sql`
drops the new table + decision enum. The `PENDING_APPROVAL` enum value
on `ProjectStatus` is intentionally NOT dropped by the rollback — Postgres
has no `ALTER TYPE … DROP VALUE` primitive, and a multi-step
CREATE-NEW-ENUM / ALTER-COLUMN / DROP-OLD dance is too sharp-edged to ship
as automatic rollback.

## What this migration adds

* `ProjectStatus.PENDING_APPROVAL` — new enum value, sits between DRAFT
  and ACTIVE on the project lifecycle.
* `ProjectActivationDecision` — APPROVED / REJECTED enum.
* `project_activation_approvals` — one row per submission; columns
  mirror `BudgetApproval` so the audit trail stays consistent across
  governance surfaces.

All additive; no existing data is touched.

## Rollback impact

* All approval history is lost.
* The `SubmitProjectForApprovalService` and `DecideProjectActivationService`
  will fail at boot if their tables are missing — schedule a code rollback
  alongside any DB rollback.

## Operational caveat

If any project rows reach `status='PENDING_APPROVAL'` before rollback,
flip them back to `DRAFT` first:

```sql
UPDATE "Project" SET status = 'DRAFT' WHERE status = 'PENDING_APPROVAL';
```

Then run `rollback.sql`. The orphaned `PENDING_APPROVAL` enum value
remains in the type until a follow-up cleanup migration removes it.
