# Diagnostics API

## Endpoint
- `GET /diagnostics`

## Purpose
- Provide a bounded, operator-facing runtime diagnostics summary.
- Support the monitoring UI and local operational triage without exposing secrets.

## Response Areas

### Database
- connectivity status
- host
- port
- schema name
- server version when reachable
- query latency in milliseconds
- server time when reachable
- schema sanity status
- schema error summary when the schema-level probe fails

### Migrations
- applied migration count
- latest applied migration timestamp
- local migration directory count
- pending local migration heuristic count
- migration-table accessibility
- readiness-style migration status

### Integrations
- provider summaries for Jira, M365, and RADIUS
- provider status
- last sync outcome when available
- last sync timestamp when available
- capability list
- safe summary metrics only
- aggregate counts:
  - configured providers
  - degraded providers
  - providers never synced in current runtime view

### Notifications
- enabled channel count
- active template count
- readiness/degraded status
- recent outcome count
- retrying delivery count
- terminal failure count
- succeeded delivery count observed through audit visibility
- last attempted timestamp when available
- bounded operator summary string

### Audit Visibility
- total business audit records visible in current runtime
- last business audit timestamp

## Safety Notes
- no credentials or secrets are returned
- notification recipient targets stay sanitized in notification-specific APIs
- diagnostics returns summaries and safe counts, not raw provider payloads
- this endpoint is diagnostic, not a replacement for external monitoring

## Compatibility Notes
- existing monitoring UI can continue reading the original top-level sections:
  - `database`
  - `migrations`
  - `integrations`
  - `notifications`
  - `auditVisibility`
- additional sub-check fields extend the contract without removing prior fields
