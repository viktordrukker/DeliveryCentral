# Employee

## Purpose

Employee creation is the first authoritative write operation in the Organization domain.
Employees are foundational to assignments, reporting structure, manager visibility, and dashboard aggregation.

## Domain rules

- An employee is created as an internal `Person`.
- Employee email must be unique.
- Employee must be attached to an existing internal `OrgUnit`.
- Employee creation does not auto-activate the employee.
- `status` defaults to `INACTIVE` when omitted.
- `grade` and `role` remain free-form fields for now.
  Metadata-driven governance can constrain them later.
- `skillsets` are stored as a simple string list and deduplicated on write.

## Persistence model

Employee creation writes:

- `Person`
- one primary `PersonOrgMembership`

The API accepts `orgUnitId` as part of the employee command, but the organizational placement is persisted through `PersonOrgMembership` rather than a direct foreign key on `Person`.

## Event

Employee creation records a domain event placeholder:

- `organization.employee_created`

The event is generated on the aggregate and keeps the write path compatible with future outbox/audit publishing.

## Current limitations

- The read-side person directory remains a separate projection concern.
- `grade` and `role` are not yet metadata-backed.
- Reporting lines are not auto-created during employee creation.
