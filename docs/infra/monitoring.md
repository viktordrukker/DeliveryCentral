# Monitoring + Logging

_Last reconciled: 2026-05-23. HD-11 prom-client landed; deep-health probe and outbox backlog snapshot added. Audit log section reflects post-D-103 + D-114 state._

## Stack shape

Business services + their operational support coexist in the Compose stack:

| Tier | Container |
|---|---|
| Business | `backend`, `frontend`, `postgres` |
| Local logging | `monitoring` (Dozzle), `monitoring-agent` (Vector) |
| Metrics | Backend `/metrics` endpoint (prom-client, HD-11) — scraped by Prometheus in staging/prod |
| Probes | `/api/health`, `/api/readiness`, `/api/health/deep`, `/api/diagnostics` |

## Start local monitoring containers

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

| URL | Tool |
|---|---|
| `http://localhost:8081` | Dozzle log viewer |
| `http://localhost:8686/health` | Vector health API |

Configurable via `MONITORING_PORT` + `MONITORING_AGENT_PORT`.

## Prometheus metrics (`/metrics`, HD-11)

Backend exposes Prometheus-format scrape endpoint at `/metrics` (`@Public()`). Implementation at `src/shared/observability/metrics.controller.ts` + `metrics.service.ts`.

Current metric families:

- **Outbox** (`dc_outbox_*`) — pending count, backlog seconds, publish rate, failure rate.
- **Assignment SLA** (`dc_assignment_sla_*`) — pending approvals count by priority, time-to-fill histogram, 24h breach count (WO-4.15/5.6).
- **Nudge sweep** (`dc_nudge_*`) — per-tick scan counts, channel sends.
- **HTTP** (`dc_http_request_*`) — request count, duration histogram, error count by route + method + status.
- **Pulse + Help Center** counters where flag-enabled.

Sprint F-9.1 added the outbox round-trip test + `/api/health/deep` outbox backlog snapshot.

## Health + diagnostics endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness — returns `{ status, service, environment, timestamp, diagnosticsPath }` |
| `GET /api/readiness` | Readiness summary with per-check status: database, migrations, integrations, notifications |
| `GET /api/health/deep` | DM-R-8 deep probe — exercises every aggregate root via the repo layer; returns per-aggregate `{ name, status, latencyMs, count }` for 12 aggregates |
| `GET /api/diagnostics` | Operator diagnostics: DB host + version + latency, migration sanity, integration summary (Jira/M365/RADIUS/JSM/LDAP/LLM), notification readiness, audit visibility counts |

The CI green-up workflow asserts `/api/health/deep` returns `"status":"ready"` after every staging deploy; the run fails if it isn't.

## Structured logging

Backend logs are JSON via `StructuredLoggerService`. Fields:

`timestamp · service · environment · level · context · correlationId · pid · logger · message`

Three log types: request logs, unhandled error logs, business audit logs.

## Correlation IDs

Propagated through:

- Request header: `x-correlation-id`
- Response header: `x-correlation-id`
- Async request context
- Structured logs
- `AuditLog.correlationId` column

If a caller does not provide one, the backend generates one.

## Business audit logs (`AuditLog`, hash-chained)

`AuditLog` is hash-chained for tamper detection. CHECK constraints (D-111, Sprint F-5.7) enforce entity_type ∈ enum + action ∈ enum + actor present + payload validity. Schema-wide actor-audit work (D-103) added `*ById` actor columns on 81 audited aggregates (17 already had canonical actor fields, 7 deferred per `project-d103-actor-audit-state.md` memory).

Categories (sampled, not exhaustive):

- **Assignment lifecycle:** `assignment.created`, `assignment.approved`, `assignment.rejected`, `assignment.cancelled`, plus all 9 CSW transition actions
- **Org changes:** `employee.created`, `employee.deactivated`, `reporting_line.changed`
- **Project lifecycle:** `project.created`, `project.activated`, `project.closed`
- **Metadata:** `metadata.dictionary.changed`
- **Integration:** `integration.sync_run`
- **Notification:** `notification.send_result`
- **Cases:** `case.created`, `case.approved`, `case.completed`
- **Privileged read:** `business_audit.read`, `period_lock.read`

UI: `BusinessAuditPage` at `/admin/audit` (HR/director/admin) — filterable + paginated. Configured at `audit/business` controller. D-167 v1 redact-payload (Sprint F-5.5) supports right-to-erasure with payload-level PII redaction.

## Retention + purge

`AuditLog` retention configured at `/admin/audit-retention` (D-168, Sprint F-5.6). Scheduled purge cron runs per-tenant policy.

## Local troubleshooting

```bash
# Raw logs
docker compose logs -f backend

# Run monitoring containers
docker compose --profile monitoring up -d monitoring monitoring-agent

# Snapshot probes
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/readiness | jq
curl -s http://localhost:3000/api/health/deep | jq .status
curl -s http://localhost:3000/api/diagnostics | jq
curl -s http://localhost:3000/metrics | head -40
```

Staging URL pattern: replace host with `deliverit-test.agentic.uz`; same paths.

## Design rules

- Monitoring stays outside business services.
- Structured logs are machine-readable first.
- Audit events describe business mutations without leaking secrets (D-167 v1 redact-payload enforces this on read).
- Diagnostics are read-only and credential-free.
- The local stack is lightweight; production target is Prometheus + Loki + Grafana scraping `/metrics` + `/api/health/deep` + container logs.
