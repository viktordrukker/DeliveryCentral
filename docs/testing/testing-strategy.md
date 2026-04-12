# Testing Strategy

## Purpose
This repository uses layered tests so changes can be validated at the cheapest effective boundary first and then promoted through broader slices only when needed.

## Default order
1. Unit tests
2. Domain tests
3. Repository tests
4. API integration tests
5. Contract tests
6. UI component tests
7. UI page/integration tests
8. End-to-end tests
9. Seed and fixture validation tests
10. Resilience and performance scenario tests

## Repository conventions
- `test/unit`: isolated helper and utility behavior
- `test/domain`: aggregate, entity, and value-object rules
- `test/repository`: repository behavior with in-memory or database-backed adapters
- `test/integration`: backend slice integration through Nest modules and HTTP
- `test/contracts`: request/response shape guarantees for stable consumers
- `test/e2e`: smoke and workflow coverage across running application boundaries
- `test/performance`: baseline timing and resilience-oriented scenarios
- `test/scenarios`: reusable enterprise scenario assertions
- `test/fixtures`: deterministic shared data
- `test/factories`: controlled object builders for targeted tests

## Frontend mapping
Frontend tests stay next to the code they protect:
- component tests under `frontend/src/components/**`
- page and feature integration tests under `frontend/src/routes/**` and `frontend/src/features/**`

## Execution rules
- TDD stays the default
- Prefer the narrowest layer that can prove the rule
- Promote a test upward only when integration risk matters
- Avoid duplicated assertions across layers unless the higher layer validates wiring or contract behavior

## Commands
- `npm run test:unit`
- `npm run test:domain`
- `npm run test:repository`
- `npm run test:integration`
- `npm run test:contracts`
- `npm run test:e2e`
- `npm run test:performance`
- `npm run test:all`

## CI baseline
CI runs the architectural minimum on every push and pull request:
- lint
- unit tests
- domain tests
- integration tests
- contract tests
- architecture check
- contract validation script

Broader e2e and frontend runs remain available locally and can be added to CI when dependency installation and environment startup are made reproducible in the pipeline.
