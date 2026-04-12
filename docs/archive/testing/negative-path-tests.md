# Negative Path Tests

## Purpose

The negative-path suite verifies that critical APIs fail predictably and safely when given invalid input, invalid workflow transitions, missing references, or integration-time faults.

## Coverage Areas

Current coverage focuses on high-value failure modes:

- invalid project-assignment creation input
- nonexistent person and project references
- invalid assignment workflow transitions
- malformed work-evidence payloads
- integration sync orchestration failure behavior
- metadata not-found handling

Files:

- [critical-api-negative.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api-negative\critical-api-negative.integration.spec.ts)
- [integrations-negative.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api-negative\integrations-negative.integration.spec.ts)
- [uat-exceptions-and-anomalies.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api\uat-exceptions-and-anomalies.integration.spec.ts)

## Error Contract

Negative-path tests use the shared API helper:

- [api-response-assertions.ts](C:\VDISK1\DeliveryCentral\test\helpers\api\api-response-assertions.ts)

The suite validates:

- HTTP status code
- presence of a message
- absence of stack or trace leakage in the JSON response body

## Current Failure Modes Covered

### Assignments

- missing person -> `404`
- missing project -> `404`
- invalid allocation -> `400`
- invalid date range -> `400`
- inactive employee assignment request -> `400`
- repeat approval transition -> `400`
- rejection after approval -> `400`
- bulk assignment partial failure remains explicit instead of rolling back valid items

### Work Evidence

- malformed `recordedAt` -> `400`
- non-positive `effortHours` -> `400`
- blank `sourceRecordKey` -> `400`

### Integrations

- Jira sync orchestration failure -> `500` with safe generic response shape
- degraded M365 sync can fail without mutating internal people truth
- failed integration runs remain visible through integration history rather than only container logs

Note:
The current Jira sync endpoint does not yet accept a request payload contract, so negative coverage is focused on failure isolation rather than body validation.

### Metadata

- missing dictionary id -> `404`

## Authorization

Authentication and RBAC are now part of the live API contract.

Negative-path coverage should include:

- unauthenticated access to critical write endpoints
- forged raw `x-platform-*` headers being rejected in normal runtime
- authenticated callers with insufficient roles receiving `403`
- manager-scope and self-scope access boundaries as those policies are rolled out

## Commands

Run negative-path integration coverage with the existing integration suite command:

```bash
npm run test:integration
```

For the deterministic UAT-grade anomaly pack, run:

```bash
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-exceptions-and-anomalies.integration.spec.ts
```
