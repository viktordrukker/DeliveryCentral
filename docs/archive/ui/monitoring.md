# Monitoring UI

## Route

- `/admin/monitoring`

## Purpose

This page gives operators a read-only monitoring view over the application health surfaces that already exist in the backend. It is intentionally diagnostic and does not expose secrets, credentials, or write actions.

## Data sources

- `GET /health`
- `GET /readiness`
- `GET /diagnostics`

There is currently no dedicated application log-search endpoint. Because of that, the UI derives recent error and alert summaries from diagnostics and readiness data instead of pretending a log API exists.

## Sections

### System status

Shows compact health cards for:

- overall health
- readiness
- database health summary
- integration health summary
- migration sanity
- notification subsystem readiness and retry/failure signal
- business audit visibility count

### Database health

Shows bounded operator-facing database diagnostics such as:

- connectivity
- schema sanity
- schema name
- latency
- server version when available

### Recent errors

Derived from diagnostics surfaces such as:

- database errors
- schema sanity errors
- migration errors
- degraded or failed integrations
- notification retry or terminal failure summaries

### Integration health summary

Shows per-provider operator summaries for:

- Jira
- M365
- RADIUS

Each provider card keeps the data bounded to:

- status
- last sync time
- last outcome
- capabilities
- safe summary metrics

### Notification readiness

Shows bounded notification subsystem signals such as:

- subsystem status
- enabled channel count
- template count
- last attempt time
- summary of retrying versus terminal failures

### Alerts summary

Aggregates readiness checks plus:

- database schema degradation
- integration degradation summary
- notification retry and terminal failure summary

### Readiness checks

Shows the explicit readiness checks returned by the backend so the UI remains aligned with the operational contract.

## Components

- `HealthCard`
- `ErrorList`
- `AlertPanel`

## Guardrails

- read-only only
- no credentials exposed
- no transport-level monitoring secrets shown
- no synthetic write or remediation actions

## Test coverage

- `frontend/src/routes/admin/MonitoringPage.test.tsx`
  - renders healthy operator diagnostics
  - renders degraded operator diagnostics
