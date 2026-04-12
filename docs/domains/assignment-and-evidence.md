# Assignment And Evidence

## Purpose

This slice enforces the foundational separation between:

- `ProjectAssignment`: approved planned staffing truth
- `WorkEvidence`: observed actual work evidence

The platform must compare these concepts, not merge them.

## Implemented domain model

### Assignments

- `ProjectAssignment`
- `AssignmentApproval`
- `AssignmentHistory`
- `AssignmentId`
- `AllocationPercent`
- `ApprovalState`

### Work evidence

- `WorkEvidence`
- `WorkEvidenceSource`
- `WorkEvidenceLink`
- `WorkEvidenceId`

### Repositories

- `ProjectAssignmentRepositoryPort`
- `WorkEvidenceRepositoryPort`

### Service

- `AssignmentAuditComparisonService`

## Rules enforced in code

- assignments can exist with no evidence
- evidence can exist with no assignment
- evidence processing does not mutate assignment state
- unassigned contributors are detected through comparison logic
- post-assignment evidence is surfaced as a variance signal, not turned into a new assignment

## Persistence alignment

The domain maps directly onto the existing Prisma models:

- `ProjectAssignment`
- `AssignmentApproval`
- `AssignmentHistory`
- `WorkEvidence`
- `WorkEvidenceSource`
- `WorkEvidenceLink`

Prisma mapper/repository placeholders exist for both contexts so later persistence work can stay aligned with the domain model.

## Integration rule

External systems such as Jira may provide `WorkEvidence`, but they must never directly create or mutate authoritative `ProjectAssignment` records.
