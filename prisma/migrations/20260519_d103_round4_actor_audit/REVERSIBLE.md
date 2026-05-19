# F-29 / D-103 + DM-5-5 round 4 — actor-audit columns on TimesheetWeek + ProjectRisk

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `timesheet_weeks` and `project_risks`.

| Round | Sprint | Aggregates |
|---|---|---|
| 1 | F-10.3 | Project + ProjectAssignment |
| 2 | F-17   | CaseRecord + PersonReleaseRequest |
| 3 | F-26   | LeaveRequest + AssignmentApproval |
| **4** | **F-29** | **TimesheetWeek + ProjectRisk** |

After this batch, **8 of 105** aggregates carry full actor-audit columns.

- `TimesheetWeek` already carries `approvedBy` (legacy non-UUID String capturing the decision actor). The new columns capture the timesheet author + last editor — often different from `personId` when an admin corrects on behalf of a person.
- `ProjectRisk` already carries `ownerPersonId` + `assigneePersonId` (the business actors). The new columns capture who raised the risk + who last touched the row.

All columns nullable → existing rows + existing writers continue unchanged.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d timesheet_weeks` / `\d project_risks` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent (`ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
- Backward again → idempotent (`DROP ... IF EXISTS`).
