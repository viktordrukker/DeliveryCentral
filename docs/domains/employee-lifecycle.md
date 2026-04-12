# Employee Lifecycle

## Scope

Employee lifecycle currently supports deactivation without deleting records.

## Rules

- Employee deactivation changes the employee status to `INACTIVE`.
- Deactivation does not delete the employee.
- Existing assignments, approvals, history, work evidence, and org history remain intact.
- An already inactive employee cannot be deactivated again.
- Inactive employees cannot receive new project assignments.

## Why this matters

The platform needs to preserve historical truth:

- staffing history must remain auditable
- work evidence must remain attributable
- reporting and dashboard history must remain reconstructable

Deactivation is therefore a status transition, not a destructive delete.

## Current write behavior

- `POST /org/people/{id}/deactivate`
- updates `Person.employmentStatus` to `INACTIVE`
- emits `organization.employee_deactivated` as a domain-event placeholder
- leaves related records untouched

## Cross-domain effect

Assignment creation now checks employee activity status before creating a new `ProjectAssignment`.

If the employee is inactive, assignment creation is rejected with a validation error.
