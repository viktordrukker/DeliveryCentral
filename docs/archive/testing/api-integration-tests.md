# API Integration Tests

## Purpose
These tests exercise the real Nest application layer through HTTP without dropping into UI concerns or duplicating unit-level logic.

## Location
- `test/integration/api`
- shared HTTP helpers under `test/helpers/api`

## Covered endpoints
- `GET /health`
- `GET /org/people`
- `GET /projects`
- `POST /assignments`
- `POST /assignments/{id}/approve`
- `GET /assignments`
- `POST /work-evidence`
- `GET /work-evidence`
- `POST /integrations/jira/projects/sync`
- `GET /dashboard/workload/summary`
- supporting reliability checks for metadata, cases, and not-found error shapes

## Helpers
- `create-api-test-app.ts`: boots the real `AppModule`
- `api-response-assertions.ts`: keeps error-shape assertions consistent
- `api-test-client.helper.ts`: wraps `supertest` for common usage

## What these tests verify
- expected status codes
- stable payload shape for consumers
- seeded demo data compatibility for read endpoints
- write/read compatibility for assignments and work evidence
- error model consistency for validation and not-found scenarios

## Scope boundaries
- domain rules belong in `test/domain`
- persistence mapping belongs in `test/integration/repositories`
- API integration tests verify application wiring, transport contracts, and HTTP behavior

## Running
- `npm run test:integration`
