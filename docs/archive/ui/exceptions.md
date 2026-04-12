# Exception Queue UI

## Route
- `/exceptions`

## Purpose
- Surface staffing, project, work-evidence, and integration anomalies in one operational queue.
- Keep anomaly review separate from dashboards, business audit, and technical monitoring.
- Provide a clean review surface that future resolution or acknowledgement actions can attach to later.

## Data Sources
- `GET /exceptions`
- `GET /exceptions/{id}`

## UI Structure
- Queue filters
  - category
  - provider
  - target entity id
  - as-of timestamp
- Exception queue table
  - category
  - status
  - related person or project summary
  - observed timestamp
- Exception review panel
  - source context
  - target entity
  - linked person or project context
  - provider context when present
  - derived details payload
  - related navigation shortcuts
  - governed handoff links when an implemented override workflow exists

## Operator Notes
- The queue is derived from existing truths rather than becoming a new source of truth.
- Exception review stays intentionally narrow.
- The detail panel does not invent unsupported resolution workflows.
- When the backend already supports a governed override path, the detail panel links operators into the authoritative workflow surface instead.
- Example: `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS` links to project details, where director/admin users can use the explicit closure override flow with a recorded reason.
- This surface is distinct from:
  - dashboards, which summarize signals
  - business audit, which records business actions
  - monitoring, which surfaces health and technical diagnostics

## Related Navigation
- person details
- project details
- assignment details
- work evidence page
- planned-vs-actual view

## States
- loading
- empty
- error
- detail review without a selected exception
- detail review for a selected exception

## Test Coverage
- `frontend/src/routes/exceptions/ExceptionsPage.test.tsx`
  - list render
  - loading state
  - empty state
  - error state
  - detail render after selection
  - project-closure conflict handoff render
