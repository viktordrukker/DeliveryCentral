# Project Lifecycle

## Scope

Project creation establishes the internal project identity before any external integration linkage exists.

The live runtime now persists project lifecycle state through Prisma-backed repositories rather than seeded in-memory stores.

## Concurrency safety

Project lifecycle mutations now use optimistic concurrency control at the repository boundary.

This currently protects:

- `activate`
- `close`
- `assign-team` when the caller provides an expected project version

Behavior:

- each persisted project carries a version
- lifecycle writes compare the loaded version to the stored version
- stale lifecycle mutations return a conflict instead of silently overwriting state
- stale team-assignment requests can be rejected when the project version they were based on is no longer current

## Creation rules

- projects are created through `POST /projects`
- new projects start in `DRAFT`
- Jira or other external-system identifiers are not part of this command
- `projectManagerId` must reference an existing internal person

## Charter fields

The current write slice supports:

- `name`
- `description`
- `startDate`
- `plannedEndDate`
- `projectManagerId`

## Identity

`Project` remains the internal source of truth.
External integrations attach later through `ProjectExternalLink`.

That means:

- project creation does not include Jira fields
- project creation does not create external links
- project creation does not mutate staffing

## Initial status

All newly created projects are stored as `DRAFT`.

This keeps the lifecycle explicit and leaves room for later activation, charter approval, and portfolio-governance steps.

## Activation

Projects become assignable through `POST /projects/{id}/activate`.

Current lifecycle rule:

- `DRAFT -> ACTIVE`

Validation rules:

- project must exist
- a project already in `ACTIVE` cannot be activated again

Activation updates the internal project lifecycle state only.
It does not create assignments, external links, or Jira metadata.

## Closure

Projects close through `POST /projects/{id}/close`.

Current closure rule:

- `ACTIVE -> CLOSED`

Closure returns a workspend summary derived from `WorkEvidence` only.
Assignments remain available for history and audit.

## Team assignment and lifecycle

Team expansion remains separate from project identity and project status, but it now honors lifecycle state more explicitly:

- team assignments can only be created for `ACTIVE` projects
- if the project lifecycle has advanced since the caller's known version, the request can fail with a conflict

## Runtime durability

The following records are durably persisted in the live application runtime:

- `Project`
- `ProjectExternalLink`
- `ExternalSyncState`

That means:

- created projects survive restart
- lifecycle transitions survive restart
- Jira linkage and sync-state tracking survive restart
- closing a project preserves the project record and related history
