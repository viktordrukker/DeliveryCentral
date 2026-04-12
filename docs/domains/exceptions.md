# Exception Queue

## Purpose

The exception queue is a derived operational read model for anomalies that need
human attention.

It is not a new source of truth.

It exists so operators can review staffing, project, and integration exceptions
without hunting through dashboards or raw logs.

## Sources of truth

Exception items are derived from existing platform truths:

- `ProjectAssignment`
- `WorkEvidence`
- `Project`
- M365 reconciliation review records
- RADIUS reconciliation review records

If the underlying anomaly disappears, the exception item disappears from the
queue as well.

## Current categories

- `WORK_EVIDENCE_WITHOUT_ASSIGNMENT`
  - observed work exists without a matching active assignment
- `ASSIGNMENT_WITHOUT_EVIDENCE`
  - active staffing exists but no work evidence has been observed
- `WORK_EVIDENCE_AFTER_ASSIGNMENT_END`
  - observed work exists after the related assignment ended
- `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`
  - a closed project still has active assignments
  - normal project closure should be blocked first
  - if an elevated operator uses the explicit closure override, the resulting
    condition remains visible here until staffing cleanup completes
- `STALE_ASSIGNMENT_APPROVAL`
  - a requested assignment has been waiting past the configured threshold
- `M365_RECONCILIATION_ANOMALY`
  - M365 reconciliation produced unmatched, ambiguous, or stale/conflict review items
- `RADIUS_RECONCILIATION_ANOMALY`
  - RADIUS reconciliation produced unmatched, ambiguous, or presence-drift review items

## Status model

Current status values:

- `OPEN`

The queue is intentionally derived and read-only for now. A future operator
workflow can add review or acknowledgement state without changing the fact that
the anomaly itself comes from other bounded contexts.

## Guardrails

- The queue does not rewrite assignment, work evidence, project, or integration truth.
- Assignment and WorkEvidence remain separate truths.
- Integration anomalies remain read-only and do not enable write-back.
- The queue complements dashboards; it does not hide anomalies inside them.
- When governance allows explicit override, the override must remain separate,
  reasoned, and auditable rather than silently bypassing the underlying rule.

## Configuration

- `EXCEPTIONS_STALE_APPROVAL_DAYS`
  - controls when a requested assignment becomes a stale approval exception
