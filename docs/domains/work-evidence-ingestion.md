# Work Evidence Ingestion

## Intent

The platform needs a way to capture actual work before the Jira worklog integration is implemented. This slice provides that capability without collapsing actual work into staffing truth.

## Domain Boundary

`WorkEvidence` and `ProjectAssignment` are separate aggregates for different truths:

- `ProjectAssignment`: approved staffing intent
- `WorkEvidence`: observed work that happened

This separation is deliberate.

Observed work may exist when:

- a person was never formally assigned
- an assignment has ended
- evidence arrived late from another system

Formal assignments may exist when:

- work has not started
- evidence has not been entered yet

## Implemented Slice

This first ingestion slice supports:

- manual/internal work evidence creation
- evidence listing and filtering
- explicit source typing
- trace metadata for audit and later reconciliation

The live application runtime now persists `WorkEvidence` and `WorkEvidenceSource` through Prisma-backed repositories.

That means:

- evidence survives restart
- source traceability survives restart
- downstream project closure and comparison reads can consume persisted evidence directly

## Non-Goals

This slice does not:

- create assignments
- mutate assignments
- infer approval state
- import Jira worklogs directly

## Extensibility Path

Later integrations can map external evidence into this same bounded context through adapters and anti-corruption logic. The domain model already keeps `sourceType`, `sourceRecordKey`, and trace data separate from staffing aggregates so future finance, analytics, and audit use cases can consume the evidence stream independently.
