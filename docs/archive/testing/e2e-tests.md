# E2E Tests

## Purpose

The E2E layer verifies a small number of high-value cross-slice business paths through the running platform.

It is intentionally smaller than the unit and API integration suites and is reserved for validating operational wiring rather than edge-case business rules.

## Frameworks

Two E2E styles exist:

1. browser E2E via Playwright for user-visible flows
2. backend app E2E via Nest test bootstrapping for deterministic operational scenarios

Configuration:

- [playwright.config.ts](C:\VDISK1\DeliveryCentral\playwright.config.ts)
- browser test folder: [e2e](C:\VDISK1\DeliveryCentral\e2e)
- backend app E2E folder: [test/e2e](C:\VDISK1\DeliveryCentral\test\e2e)

## Covered Browser Happy Path

Current coverage is the first operational workload flow:

1. open employee directory
2. open employee details
3. open project registry
4. open project details
5. create a formal project assignment
6. approve the assignment as the line manager
7. record manual work evidence
8. open planned-vs-actual and verify the matched result

The browser flow uses deterministic demo identities from:

- [demo-identifiers.ts](C:\VDISK1\DeliveryCentral\e2e\fixtures\demo-identifiers.ts)

## Covered Operational UAT Path

The backend app E2E suite now also covers a deterministic UAT-grade staffing journey:

1. create employee
2. assign reporting line
3. create project
4. activate project
5. create assignment
6. approve assignment
7. verify employee and manager-facing reads
8. record work evidence
9. end assignment
10. verify notification outcomes and business audit visibility

Files:

- [uat-happy-path-staffing.e2e-spec.ts](C:\VDISK1\DeliveryCentral\test\e2e\uat-happy-path-staffing.e2e-spec.ts)
- [run-uat-happy-path-staffing.ts](C:\VDISK1\DeliveryCentral\test\helpers\scenarios\run-uat-happy-path-staffing.ts)
- [uat-happy-path-staffing.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-happy-path-staffing.md)

## Runtime Assumptions

The current E2E suite runs against the application's local Docker-oriented runtime assumptions:

- backend services start through NestJS inside test bootstrap or local containers
- frontend starts locally through Vite for browser Playwright coverage
- persistence tests reset and seed deterministic demo reference data before execution

The browser flow does not require a live Jira connection.

The UAT staffing app E2E path does not require live SMTP, Jira, M365, or RADIUS connections. Notification transport is overridden with an in-memory transport so workflow notification outcomes remain observable without external dependencies.

## Commands

Install repository dependencies first:

```bash
npm install
npm --prefix frontend install
```

Install the Playwright browser:

```bash
npm run e2e:install
```

Run the browser suite:

```bash
npm run test:e2e:ui
```

Run the backend app E2E suite:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/e2e
```

Run the UAT staffing E2E path only:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/e2e/uat-happy-path-staffing.e2e-spec.ts
```

## Stability Rules

The suite is intentionally biased toward reliability:

- one primary browser happy-path spec instead of many overlapping browser tests
- one deterministic operational UAT scenario instead of many partially overlapping backend journeys
- seeded deterministic IDs
- stable page and form selectors where text-only selection would be brittle
- no low-value assertions on styling or layout mechanics

## Selectors

Stable selectors were added where useful:

- page roots via `data-testid`
- assignment creation form
- work evidence creation form
- success banners where the flow needs explicit post-submit confirmation

Prefer semantic selectors first. Use `data-testid` only for container boundaries and actions that would otherwise be brittle.

