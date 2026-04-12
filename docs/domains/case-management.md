# Case Management

## Intent

Case management coordinates onboarding, offboarding, and other operational flows that intersect with people, org structure, and assignments.

This initial slice implements onboarding case creation and read access only.

## Domain Rules

- case workflow is separate from assignment workflow
- a case can reference a subject person directly
- a case can optionally reference project or assignment context
- participant and owner information is persisted separately from assignment approvals

## Initial Scope

Implemented now:

- onboarding case creation
- owner and participant capture
- retrieval by id
- list cases

Deferred for later:

- case steps
- approval routing
- SLA handling
- agreements and documents
- richer workflow states

## Extensibility

The model is intentionally simple:

- `CaseRecord` is the primary aggregate
- `CaseType` keeps the workflow entry point explicit
- `CaseParticipant` preserves ownership and involvement

This keeps the slice useful now without committing the platform to a BPM engine.
