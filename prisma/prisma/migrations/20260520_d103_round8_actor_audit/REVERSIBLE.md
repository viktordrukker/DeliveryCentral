# F-36 / D-103 + DM-5-5 round 8 — actor-audit columns on ProjectBudget + RateCard

## Forward

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → `Person.id`, `ON DELETE SET NULL`) to `project_budgets` and `rate_cards`.

| Round | Sprint | Aggregates |
|---|---|---|
| 1 | F-10.3 | Project + ProjectAssignment |
| 2 | F-17 | CaseRecord + PersonReleaseRequest |
| 3 | F-26 | LeaveRequest + AssignmentApproval |
| 4 | F-29 | TimesheetWeek + ProjectRisk |
| 5 | F-30 | ProjectMilestone + BudgetApproval |
| 6 | F-32 | OrgUnit + StaffingRequestProposalSlate |
| 7 | F-34 | ResourcePool + Position |
| **8** | **F-36** | **ProjectBudget + RateCard** |

After this batch, **16 of 105** aggregates carry full actor-audit columns. Pairs financially with F-30's BudgetApproval and F-33's RateCardAdminService cleanup.

- `ProjectBudget` had no actor columns at all (only `version` + `updatedAt`). Joins with BudgetApproval (business actors via `requestedByPersonId` + `decidedByPersonId`) for the full approval-chain trail.
- `RateCard` is admin-curated and drives margin math; on-row creator/editor tracking is finance-grade.

## Backward

`rollback.sql` drops all 4 added FKs, indexes, and columns. Idempotent.

## Reversibility test

- Apply forward → both tables show the 2 new columns + 2 indexes + 2 FK constraints each.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent.
- Backward again → idempotent.
