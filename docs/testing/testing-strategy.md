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
- `npm run test:fast`
- `npm run test:db`
- `npm run test:slow`
- `npm run verify:pr`
- `npm run verify:full`
- `npm run test:e2e`
- `npm run test:performance`
- `npm run test:all`

## Runtime lanes

The backend test runtime is split into three lanes so pull requests fail fast on cheap regressions and keep DB-coupled suites serialized by default:

- `test:fast`: unit, domain, and contract suites. Uses Jest's default local/CI worker policy unless `JEST_MAX_WORKERS` or `JEST_FAST_MAX_WORKERS` is set.
- `test:db`: repository and integration suites. Defaults to `1` worker because these suites reset and reseed shared Prisma-backed state.
- `test:slow`: performance plus backend Jest e2e suites. Runs after the fast and DB lanes.

Playwright follows a similar lane split:

- `npm run test:e2e:ui:smoke`: merge-gate browser checks tagged `@smoke`
- `npm run test:e2e:ui:critical`: primary JTBD browser coverage tagged `@critical`
- `npm run test:e2e:ui:full`: broad regression coverage tagged `@full`
- `npm run test:e2e:ui:non-smoke`: everything except the smoke gate, suitable for CI sharding

Role-based Playwright auth is precomputed in `e2e/auth.setup.ts` and stored under `playwright/.auth/`. Core role suites reuse that cached state instead of logging in before every test.

## Runtime targets

These are planning targets for day-to-day engineering flow, not hard guarantees:

| Command | Local target | CI target | Notes |
|---------|--------------|-----------|-------|
| `npm run test:fast` | <= 30s | <= 60s | PR feedback lane |
| `npm run test:db` | <= 90s | <= 180s | Serialized Prisma-backed suites |
| `npm run test:slow` | <= 60s | <= 120s | Performance + backend Jest e2e |
| `npm run verify:pr` | <= 5m | <= 8m | Default pre-PR check |
| `npm run verify:full` | <= 10m | <= 15m | Release-candidate confidence run |

## CI baseline
CI runs fast checks first, then promotes the build to slower lanes:
- backend fast checks: lint, architecture, contract validation, `test:fast`
- frontend quality: type check and Vitest
- backend DB lane: `test:db`
- backend slow lane: `test:slow`
- production image build smoke tests
- Playwright smoke merge gate plus sharded non-smoke coverage
