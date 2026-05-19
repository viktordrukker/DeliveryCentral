# F-38 / D-103 + DM-5-5 round 9 — actor-audit on NotificationTemplate + ResponsibilityRule

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `NotificationTemplate` and `responsibility_rules`.

After this batch, **18 of 105** aggregates carry full actor-audit columns.

Both are admin-curated configuration aggregates with no current actor info:
- `NotificationTemplate` — `isSystemManaged` distinguishes baseline templates from tenant overrides, but neither path tracks the row author.
- `ResponsibilityRule` — RBAC overrides; the existing `targetPersonId` is the rule's *target*, not its author.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.
