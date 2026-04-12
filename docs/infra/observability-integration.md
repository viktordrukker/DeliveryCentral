# Observability Integration

## Goal

The platform keeps monitoring infrastructure separate from business services
while exposing practical operational signals through the backend.

## Monitoring stack

The Docker monitoring profile now contains:

- `monitoring`
  - Dozzle log viewer for local container browsing
- `monitoring-agent`
  - Vector sidecar for Docker log collection and normalized JSON output

Start both with:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

URLs:

- Dozzle: `http://localhost:8081`
- Vector health API: `http://localhost:8686/health`

## Structured logging

Backend logs are emitted as structured JSON and now include:

- `timestamp`
- `service`
- `environment`
- `level`
- `context`
- `correlationId`
- `pid`
- `logger`
- `message`

This keeps app logs consistent for local review and future forwarding.

## Diagnostic endpoints

### `GET /health`

Liveness plus a pointer to diagnostics.

### `GET /readiness`

Readiness summary with explicit checks for:

- database connectivity
- migration sanity
- integration summary
- notification readiness

### `GET /diagnostics`

Operational diagnostics surface including:

- database host/connectivity/version
- database query latency and server time when reachable
- schema-level sanity signal separate from raw connectivity
- migration application count and latest timestamp
- local-vs-applied migration sanity heuristic
- integration status summary for Jira, M365, and RADIUS
- provider capability summaries and safe per-provider metrics
- notification template/channel readiness
- recent notification retry and terminal-failure counts
- business audit visibility counts

The diagnostics contract stays safe for operator use:

- no credentials or provider secrets
- no raw provider payload dumps
- bounded summaries only

## Business-level linkage

Observability now links into business visibility without coupling domains to the
monitoring stack:

- integration failures surface through integration summaries
- recent integration sync-run history is available through `GET /integrations/history`
- sync-run history exposes bounded fields only:
  - provider
  - resource type
  - started/finished timestamps
  - success/failure status
  - processed-item summary
  - failure summary
- notification failures are counted from business-audit records
- notification retry cycles surface as distinct business-audit outcomes:
  - `RETRYING`
  - `FAILED_TERMINAL`
  - `SUCCEEDED`
- business audit visibility reports total records and last audit timestamp

## Operational notes

- monitoring containers remain separate from business services
- diagnostics are read-only
- no secrets are emitted intentionally through business audit or diagnostics
- this is a pragmatic local/dev observability layer, not a full production telemetry platform

## Operator drill alignment

The platform now has an operator drill pack for rehearsing degradation and
incident handling against the implemented monitoring and governance surfaces.

Primary drill guide:

- [operator-drills.md](C:\VDISK1\DeliveryCentral\docs\testing\operator-drills.md)

Read-first drill helper:

```bash
docker compose exec -T backend npm run platform:operator-drills
```

The drill helper snapshots the same operational surfaces operators use during
triage, including:

- `/api/health`
- `/api/readiness`
- `/api/diagnostics`
- `/api/integrations/history`
- `/api/notifications/outcomes`
- `/api/exceptions`
- `/api/audit/business`

Focused drills can optionally execute targeted backend specs before taking a
snapshot. This keeps drills reproducible and bounded without introducing
destructive chaos behavior into the local or staging workflow.

## Sanity coverage

Current automated checks cover:

- `GET /health`
- `GET /readiness`
- `GET /diagnostics`
- degraded notification and schema-sanity behavior in `HealthService`
- business audit visibility expectations
