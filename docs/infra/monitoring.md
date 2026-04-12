# Monitoring And Logging

## Scope

The localhost stack now separates business services from monitoring/log viewing.

Business services:
- `backend`
- `frontend`
- `postgres`

Operational support:
- `monitoring`
- `monitoring-agent`

## Monitoring container

The Compose stack includes a separate `monitoring` service using Dozzle as a lightweight Docker log viewer.

The stack now also includes a separate `monitoring-agent` service using Vector
to collect Docker logs and expose an agent health API.

Characteristics:
- separate container from the application services
- reads container logs through the Docker socket
- no business logic
- suited for local development and demo troubleshooting

## Start the monitoring stack

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

Default URL:

- `http://localhost:8081`
- `http://localhost:8686/health`

Configurable port:

- `MONITORING_PORT`
- `MONITORING_AGENT_PORT`

## Backend logging behavior

The backend emits structured JSON logs through `StructuredLoggerService`.

Current log types include:
- request logs
- unhandled error logs
- business audit logs

Structured fields include:
- `timestamp`
- `service`
- `environment`
- `level`
- `context`
- `correlationId`
- `pid`
- `logger`
- `message`

## Correlation IDs

Correlation IDs are propagated through:

- request header: `x-correlation-id`
- response header: `x-correlation-id`
- async request context
- structured logs
- business audit log records

If a caller does not provide a correlation id, the backend generates one.

## Business audit logs

The audit slice is intentionally separate from domain services.

Current audited categories:

### Assignment changes

- `assignment.created`

### Approvals

- `assignment.approved`
- `assignment.rejected`

### Org changes

- `employee.created`
- `employee.deactivated`
- `reporting_line.changed`

### Project lifecycle

- `project.created`
- `project.activated`
- `project.closed`

### Metadata

- `metadata.dictionary.changed`

### Integration summaries

- `integration.sync_run`

### Notification summaries

- `notification.send_result`

These records are:
- emitted as structured audit logs
- stored in an in-memory audit sink for test sanity and local diagnostics

## Sanity coverage

The repository includes a log-generation sanity suite that verifies:

- audit records are emitted for assignment and org write flows
- correlation ids flow into audit records
- business audit records remain queryable
- diagnostics surface is available

Relevant test:

- `test/observability/log-generation.spec.ts`

## Local troubleshooting

Follow raw backend logs:

```bash
docker compose logs -f backend
```

Open the monitoring UI:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

Then browse:

- `http://localhost:8081`
- `http://localhost:8686/health`

Diagnostic endpoints:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/readiness`
- `http://localhost:3000/api/diagnostics`

## Design rules

- monitoring remains outside business services
- structured logs should be machine-readable first
- audit events should describe business mutations without leaking secrets
- the current local stack is lightweight and extensible toward Loki, Promtail, OpenTelemetry, or external SIEM tooling later
