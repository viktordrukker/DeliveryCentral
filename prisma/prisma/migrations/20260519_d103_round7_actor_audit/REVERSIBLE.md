# F-34 / D-103 + DM-5-5 round 7 — actor-audit columns on ResourcePool + Position

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `ResourcePool` and `Position`.

| Round | Sprint | Aggregates |
|---|---|---|
| 1 | F-10.3 | Project + ProjectAssignment |
| 2 | F-17 | CaseRecord + PersonReleaseRequest |
| 3 | F-26 | LeaveRequest + AssignmentApproval |
| 4 | F-29 | TimesheetWeek + ProjectRisk |
| 5 | F-30 | ProjectMilestone + BudgetApproval |
| 6 | F-32 | OrgUnit + StaffingRequestProposalSlate |
| **7** | **F-34** | **ResourcePool + Position** |

After this batch, **14 of 105** aggregates carry full actor-audit columns. Pairs with F-32's OrgUnit work — full org-structure coverage now: OrgUnit + ResourcePool + Position.

- `ResourcePool` had no actor at all (RM-curated). The new columns capture who created the pool and who last touched the row.
- `Position` had `occupantPersonId` (the person currently holding the position, a business actor) but no row-author actor. Admin-curated; the columns matter for "who restructured the org" trail.

All columns nullable → existing rows + writers continue unchanged.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d "ResourcePool"` / `\d "Position"` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent.
- Backward again → idempotent.
