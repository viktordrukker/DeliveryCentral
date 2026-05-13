# FORWARD_ONLY — 20260513_emp_case_employee_issue_enum

Adds the `EMPLOYEE_ISSUE` member to the Postgres enum type `CaseTypeKey`.

## Why FORWARD_ONLY

Postgres cannot drop a value from an enum without rebuilding the type, recreating every column that references it, and re-pointing every FK. Rolling back an `ALTER TYPE ADD VALUE` requires a dump + restore. Treating this as REVERSIBLE would invite an unsafe rollback.sql; FORWARD_ONLY makes the operational expectation explicit (restore from snapshot per DM-R-3 flow if rollback is ever needed).

## Two-person rule (DM-R-29)

Co-authored by:
- Developer agent (commit author)
- viktordrukker (repo owner, sprint approver)

## Impact

Additive only. No existing rows touched. No FK changes. No app code change required for the migration itself — downstream BE DTO + seed update ship in the same PR.
