# F-30 / D-103 + DM-5-5 round 5 — actor-audit columns on ProjectMilestone + BudgetApproval

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `project_milestones` and `budget_approvals`.

| Round | Sprint | Aggregates |
|---|---|---|
| 1 | F-10.3 | Project + ProjectAssignment |
| 2 | F-17   | CaseRecord + PersonReleaseRequest |
| 3 | F-26   | LeaveRequest + AssignmentApproval |
| 4 | F-29   | TimesheetWeek + ProjectRisk |
| **5** | **F-30** | **ProjectMilestone + BudgetApproval** |

After this batch, **10 of 105** aggregates carry full actor-audit columns.

- `ProjectMilestone` previously had no actor at all — only `projectId` joined milestones to the project owner. The new columns capture the milestone author + last editor.
- `BudgetApproval` already has `requestedByPersonId` (creation actor) + `decidedByPersonId` (decision actor). Adding the canonical pair brings it into uniform shape with the rest of the actor-audit aggregates and lets join-by-actor queries use the same columns across every aggregate.

All columns nullable → existing rows + writers continue unchanged.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d project_milestones` / `\d budget_approvals` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent.
- Backward again → idempotent.
