# Release Readiness Checklist

## Purpose

This checklist is for go/no-go review before promoting a build to shared dev, staging, UAT, or controlled rollout.

Use it together with the automated platform self-check:

```powershell
docker compose exec -T backend npm run platform:self-check
```

For a stricter gate:

```powershell
docker compose exec -T backend powershell -Command "$env:SELF_CHECK_INCLUDE_TEST_BASELINE='true'; $env:SELF_CHECK_STRICT='true'; npm run platform:self-check"
```

## Gate Structure

Release readiness is not one green light. Review it in three layers:

1. automated self-check
2. curated automated test baseline
3. explicit human sign-off for workflow and rollout risk

## Automated Self-Check

The self-check must complete without any `fail` results.

It validates:

- `/api/health`
- `/api/readiness`
- `/api/diagnostics`
- persistence and migration sanity
- auth configuration presence
- audit visibility
- notification readiness visibility
- integration health visibility
- representative protected API reads:
  - employee directory
  - project registry
  - assignments list
  - employee dashboard
  - exception queue
  - business audit
  - notification outcomes

Warnings are acceptable for local development. They require explicit review before staging or higher promotion.

## Required Automated Baseline

Before shared-environment promotion, capture the result of:

- backend integration baseline
- frontend test baseline
- UAT happy-path staffing scenario
- anomaly/exclusion scenario pack
- performance profile baseline

Minimum command set:

```powershell
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-happy-path-staffing.integration.spec.ts
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-exceptions-and-anomalies.integration.spec.ts
docker compose exec -T backend npm test -- --runInBand test/performance/bank-scale-profile.performance.spec.ts
docker compose exec -T frontend npm test -- --runInBand
```

## Build and Automation

- backend dependencies install cleanly
- frontend dependencies install cleanly
- lint passes when required for the release branch policy
- architecture checks pass
- curated backend baseline passes
- UI tests pass
- browser E2E happy path passes where enabled for the target environment
- architecture boundary checks pass

## Data and Environment

- staging or UAT seed/data state is known and documented
- required environment variables are present and environment-appropriate
- API base URL for frontend is correct
- Swagger/OpenAPI docs load if enabled
- database migrations are applied successfully
- durable runtime contexts are active through Prisma-backed persistence:
  - organization
  - assignments
  - project registry
  - work evidence
- self-check output is attached to the release record

## Environment-Specific Controls

### Authentication

- `AUTH_ISSUER` is set intentionally
- `AUTH_AUDIENCE` is set intentionally
- `AUTH_JWT_SECRET` is not the local default in staging or higher
- `AUTH_ALLOW_TEST_HEADERS=false`
- `AUTH_DEV_BOOTSTRAP_ENABLED=false` in shared environments

### Notifications

- notification channels exist for the intended environment
- notification templates load
- SMTP or other channel configuration is present where live delivery is expected
- recent notification outcomes are visible in admin UI

### Integrations

- integration status is visible in admin UI
- degraded integrations are understood and documented
- reconciliation queues are reviewed if M365 or RADIUS sync is enabled
- read-only integration boundaries remain intact

## Workflow Availability Review

### Employee Directory

- list loads
- search works
- row navigation works
- empty/error states render correctly

### Employee Details

- seeded employee details load
- org unit and manager data are consistent with directory
- placeholders are clearly marked

### Project Registry

- internal projects load
- search works
- Jira-linked projects show external links as secondary

### Project Details

- summary and status load
- external links section loads
- activate, close, and assign-team controls behave correctly for the target role

### Assignment Creation

- selectors load from APIs
- validation errors are human-readable
- new assignment can be created successfully

### Assignment Approval

- assignment detail page loads
- current workflow state is visible
- approve action works
- reject action works
- invalid transitions are blocked

### Manager Scope

- direct reports render
- dotted-line section renders separately
- quick links work

### Work Evidence

- list loads
- filters work
- manual evidence creation works
- evidence remains visibly separate from assignment state

### Planned vs Actual

- page loads
- categories render
- matched/unmatched behavior is sensible against seeded data

### Dashboard

- summary cards load
- quick links work
- counts are directionally consistent with underlying pages
- known dashboard limitations are documented if any services still rely on demo-backed slices

### Integrations Admin

- status page loads
- recent sync history is visible
- failure summaries are visible
- reconciliation review pages load for enabled providers

### Notifications Admin

- templates load
- recent outcomes load
- test-send behavior is understood for the target environment

### Metadata And Admin

- dictionaries load
- dictionary detail loads
- entry states are visible
- admin monitoring page reflects real diagnostics

## High-Risk Domain Checks

### Assignment vs Evidence Separation

- creating or importing evidence does not create assignments
- approving assignments does not create evidence
- planned-vs-actual remains a read/diagnostic slice only

### Org Structure Changes

- manager scope is plausible for seeded managers
- dotted-line visibility does not replace line-manager logic
- historical truth scenarios remain covered in automated tests

### External Sync Stability

- Jira sync does not mutate staffing truth
- outage/failure markers remain visible in integration status
- previously imported internal projects remain stable after failed retry scenarios
- M365 and RADIUS degradation does not overwrite internal people truth

### Metadata-Driven Behavior

- business pages do not rely on hardcoded dictionaries where metadata should drive behavior
- metadata admin remains coherent with seeded dictionary content

### Governance And Audit

- business audit page is populated and queryable
- exception queue is visible for operators
- project closure override remains explicit and auditable
- assignment override remains explicit and auditable

## Release Notes Inputs

Before release sign-off, capture:

- new pages or workflows added
- known limitations still using placeholders
- scenarios requiring manual verification
- integration behaviors intentionally mocked or seeded
- self-check warnings accepted for the target environment

## Sign-Off Record

Suggested release sign-off fields:

- build identifier
- environment tested
- seed dataset version or commit
- automated suites passed
- automated self-check result
- manual smoke completed by
- exploratory testing completed by
- open known risks
- release decision
