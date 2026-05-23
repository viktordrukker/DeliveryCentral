# Observability Integration

_Last reconciled: 2026-05-23 (post HD-11 prom-client + F-9 outbox round-trip; Windows path in prior doc removed)._

## Goal

The platform keeps monitoring infrastructure separate from business services while exposing practical operational signals through the backend.

## Monitoring stack

The Docker monitoring profile contains:

- `monitoring` — Dozzle log viewer for local container browsing
- `monitoring-agent` — Vector sidecar for Docker log collection + normalized JSON output

Start both with:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

URLs:

- Dozzle: `http://localhost:8081`
- Vector health API: `http://localhost:8686/health`

## Structured logging

Backend logs are emitted as structured JSON and include:

`timestamp · service · environment · level · context · correlationId · pid · logger · message`

## Prometheus metrics (HD-11)

`GET /metrics` (`@Public()`, `prom-client`) — Prometheus-format scrape endpoint. See [monitoring.md](./monitoring.md) for the current metric families.

## Diagnostic endpoints

### `GET /api/health`

Liveness plus a pointer to diagnostics.

### `GET /api/readiness`

Readiness summary with explicit checks for: database connectivity, migration sanity, integration summary, notification readiness.

### `GET /api/health/deep` (DM-R-8)

Per-aggregate probe exercising the repository layer for 12 aggregate roots — returns `{ name, status, latencyMs, count }` per aggregate. CI deploy gate asserts `"status":"ready"`. Sprint F-9.1 added outbox-backlog snapshot to this surface.

### `GET /api/diagnostics`

Operational diagnostics surface, bounded + credential-free:

- Database host + connectivity + version
- DB query latency + server time when reachable
- Schema-level sanity signal separate from raw connectivity
- Migration application count + latest timestamp
- Local-vs-applied migration sanity heuristic
- Integration status summary (Jira, M365, RADIUS, JSM, LDAP, LLM)
- Provider capability summaries + safe per-provider metrics
- Notification template / channel readiness
- Recent notification retry + terminal-failure counts
- Business audit visibility counts

## Business-level linkage

Observability links into business visibility without coupling domains to the monitoring stack:

- Integration failures surface through `GET /api/integrations` history (bounded fields only: provider, resource type, started/finished, success/failure, processed-item summary, failure summary)
- Notification failures are counted from business-audit records
- Notification retry cycles surface as distinct business-audit outcomes: `RETRYING`, `FAILED_TERMINAL`, `SUCCEEDED`
- Business-audit visibility reports total records + last audit timestamp
- Outbox backlog snapshot — published via `/metrics` + `/api/health/deep` since F-9.1

## Operator drill alignment

Operator drill pack at [`docs/testing/operator-drills.md`](../testing/operator-drills.md).

```bash
docker compose exec -T backend npm run platform:operator-drills
```

Snapshots the operational surfaces operators use during triage:

- `/api/health`, `/api/readiness`, `/api/health/deep`, `/api/diagnostics`
- `/api/integrations` (history)
- `/api/notifications` outcomes
- `/api/exceptions`
- `/api/audit/business`

Focused drills can optionally execute targeted backend specs before taking a snapshot. Reproducible, bounded; no destructive chaos behavior in local / staging.

## Operational notes

- Monitoring containers stay separate from business services.
- Diagnostics are read-only.
- No secrets emitted through business audit or diagnostics by design.
- `D-167 v1 redact-payload` (Sprint F-5.5) replaces PII on `AuditLog.payload` after right-to-erasure; hash chain stays intact.
- Staging URL: `https://deliverit-test.agentic.uz` — same path layout.

## Sanity coverage

Automated checks cover `/api/health`, `/api/readiness`, `/api/diagnostics`, degraded notification + schema-sanity behavior in `HealthService`, business audit visibility expectations, outbox round-trip (F-9.1).
