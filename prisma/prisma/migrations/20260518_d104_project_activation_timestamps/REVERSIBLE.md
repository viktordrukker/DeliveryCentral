# F-21 / D-104 — final D-104 child: ProjectActivationApproval framework-time timestamps

## Forward

Adds `createdAt` + `updatedAt` (both `TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`, the latter auto-managed by Prisma's `@updatedAt`) to `project_activation_approvals`. The table already has `requestedAt` + `decidedAt` business-time columns; this brings it into line with the schema-conventions baseline applied to the rest of the registry aggregates.

Continues the F-10.4 pattern (which covered `person_release_approvals` + `staffing_request_fulfilments`). With this migration, D-104 is fully closed.

Existing rows are backfilled from `requestedAt` / `decidedAt` to preserve audit ordering — the `WHERE created = updated AND created >= now() - 5min` guard ensures the UPDATE only touches rows the column-add just defaulted.

## Backward

`rollback.sql` drops both columns. Idempotent.

## Reversibility test

- Apply forward → `\d project_activation_approvals` shows two new columns; existing rows have `createdAt = requestedAt`, `updatedAt = COALESCE(decidedAt, requestedAt)`.
- Apply backward → both columns gone.
- Forward again → idempotent (`ADD COLUMN IF NOT EXISTS`).
- Backward again → idempotent (`DROP COLUMN IF EXISTS`).
