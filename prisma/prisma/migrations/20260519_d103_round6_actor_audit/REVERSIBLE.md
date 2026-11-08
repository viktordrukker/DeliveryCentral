# F-32 / D-103 + DM-5-5 round 6 — actor-audit columns on OrgUnit + StaffingRequestProposalSlate

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `OrgUnit` and `StaffingRequestProposalSlate`.

| Round | Sprint | Aggregates |
|---|---|---|
| 1 | F-10.3 | Project + ProjectAssignment |
| 2 | F-17 | CaseRecord + PersonReleaseRequest |
| 3 | F-26 | LeaveRequest + AssignmentApproval |
| 4 | F-29 | TimesheetWeek + ProjectRisk |
| 5 | F-30 | ProjectMilestone + BudgetApproval |
| **6** | **F-32** | **OrgUnit + StaffingRequestProposalSlate** |

After this batch, **12 of 105** aggregates carry full actor-audit columns.

- `OrgUnit` had no actor at all (`managerPersonId` is the business owner, not the row author). Admin-curated structure changes now leave a creator + last-editor trail.
- `StaffingRequestProposalSlate` already has `proposedByPersonId` (creator-actor). The canonical pair brings it into uniform shape and adds an updater column.

All columns nullable → existing rows + writers continue unchanged.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → `\d "OrgUnit"` / `\d "StaffingRequestProposalSlate"` show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent.
- Backward again → idempotent.
