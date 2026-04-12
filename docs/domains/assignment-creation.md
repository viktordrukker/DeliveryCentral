# Assignment Creation

## Purpose

This write slice creates the first authoritative internal staffing record in the platform.

`ProjectAssignment` is the system-of-record relationship between:

- one internal `Person`
- one internal `Project`

It is not derived from Jira issues, Jira assignees, or other external work evidence.

## Implemented flow

### Command

- `CreateProjectAssignmentService`

### API

- `POST /assignments`
- `POST /projects/{id}/assign-team`

### Persistence behavior

- persists `ProjectAssignment`
- persists initial `AssignmentApproval` state as `REQUESTED`
- persists `AssignmentHistory` entry for creation
- emits a domain event placeholder: `ProjectAssignmentCreatedEvent`

## Validations

- person must exist
- project must exist
- allocation percent must be between 0 and 100
- end date must not be before start date
- overlapping assignment for the same person and project is rejected

## Duplicate/conflict rule

The initial conflict rule is intentionally conservative:

- overlapping assignments for the same person and the same project are rejected when the existing assignment is still in a requestable or active lifecycle state

This avoids silent duplicate staffing records while leaving room for later policy refinement around multi-role staffing or phased assignment amendments.

## Team expansion behavior

The team-assignment endpoint is a convenience write around the same authoritative assignment model:

- a team is currently resolved from the active primary members of an internal org unit
- expansion creates one `ProjectAssignment` per eligible person
- traceability stays person-level because each created assignment keeps its own internal id, approval history, and lifecycle
- duplicate overlapping person-to-project assignments are skipped and reported per person instead of being silently merged

## Non-goals

- no Jira coupling
- no UI workflow
- no assignment creation from work evidence
- no external assignee mapping
