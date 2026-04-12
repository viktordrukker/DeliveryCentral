# Production Readiness

## Purpose

This document defines the minimum practical gate for promoting DeliveryCentral beyond local development into staging, UAT, or a controlled rollout.

It is intentionally concrete. It is not a generic release policy document.

## Primary Readiness Flow

### 1. Start the stack

```powershell
docker compose up -d postgres backend frontend
```

### 2. Ensure migrations are applied

```powershell
docker compose run --rm migrate
```

### 3. Run the platform self-check

```powershell
docker compose exec -T backend npm run platform:self-check
```

Optional stricter gate:

```powershell
docker compose exec -T backend powershell -Command "$env:SELF_CHECK_INCLUDE_TEST_BASELINE='true'; $env:SELF_CHECK_STRICT='true'; npm run platform:self-check"
```

### 4. Review operator surfaces

At minimum, verify:

- monitoring page
- notifications admin outcomes
- integrations admin status and sync history
- business audit page
- exception queue

### 5. Run the scenario baseline

Recommended minimum:

```powershell
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-happy-path-staffing.integration.spec.ts
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-exceptions-and-anomalies.integration.spec.ts
docker compose exec -T backend npm test -- --runInBand test/performance/bank-scale-profile.performance.spec.ts
docker compose exec -T frontend npm test -- --runInBand
```

## What The Self-Check Covers

The automated self-check is read-only. It does not create or mutate business data.

It validates:

- liveness via `/api/health`
- readiness via `/api/readiness`
- diagnostics via `/api/diagnostics`
- database connectivity and schema sanity
- migration visibility
- auth configuration presence
- notification readiness visibility
- integration health visibility
- audit visibility
- representative protected read APIs

The self-check reports:

- `pass`
- `warn`
- `fail`

`fail` means the environment is not ready.

`warn` means the environment may still be acceptable for local or limited validation, but the warning must be reviewed explicitly before staging or higher use.

## Environment Expectations

### Local development

Allowed:

- local default JWT secret
- optional bootstrap identity
- notification configuration gaps
- degraded integrations when intentionally mocked or disconnected

Not acceptable:

- database unreachable
- unapplied migrations
- broken core read APIs

### Staging / UAT

Expected:

- JWT secret is not the local default
- header-bypass auth is disabled
- bootstrap identity is disabled unless there is an explicit temporary test exception
- diagnostics are reachable
- business audit is queryable
- notification outcomes are visible
- integration degradation is visible and understood
- happy-path and anomaly scenario packs pass or known exceptions are approved

### Controlled rollout / production-like

Expected:

- no auth bypass
- no bootstrap identity
- durable runtime contexts active
- migrations fully applied
- notifications configured intentionally
- diagnostics and monitoring visible to operators
- explicit acceptance of any degraded external integration state

## Durable Runtime Expectations

Before promotion, confirm these contexts are running durably through Prisma-backed persistence:

- Organization
- Assignments
- Project Registry
- Work Evidence
- Team runtime read/write path

This matters because operational trust depends on restart-surviving state for staffing truth, project truth, and observed work.

## Auth Readiness

Required checks:

- `AUTH_ISSUER` is set intentionally
- `AUTH_AUDIENCE` is set intentionally
- `AUTH_JWT_SECRET` is present
- `AUTH_ALLOW_TEST_HEADERS=false`
- `AUTH_DEV_BOOTSTRAP_ENABLED=false` outside local-only environments

Recommended validation:

- mint a token with `scripts/mint-auth-token.ts`
- call one protected admin endpoint
- confirm unauthenticated access is rejected where policy requires it

## Notification Readiness

Required checks:

- notification templates are visible
- notification channels are enabled intentionally
- recent outcomes are visible in admin UI
- retrying vs terminal failure is visible to operators

If real email is expected:

- `NOTIFICATIONS_SMTP_HOST`
- `NOTIFICATIONS_SMTP_PORT`
- `NOTIFICATIONS_EMAIL_FROM_ADDRESS`
- credentials if the SMTP server requires them

## Integration Readiness

Required checks:

- admin integrations page loads
- sync history is visible
- failure summaries are visible
- M365 reconciliation review loads if M365 is enabled
- RADIUS reconciliation review loads if RADIUS is enabled

External integration degradation must not be treated as internal truth corruption.

## Workflow Availability

Before sign-off, validate these still work:

- create employee
- change reporting line
- create project
- activate project
- create assignment
- approve assignment
- record work evidence
- end assignment
- view notifications/admin outcomes
- view business audit
- review exception queue

## Evidence For Sign-Off

Capture these artifacts with the release record:

- self-check output
- diagnostics snapshot
- list of executed automated suites
- UAT scenario result
- known warnings and whether they are accepted
- operator sign-off owner

## When Not To Promote

Do not promote if any of these are true:

- database connectivity is degraded
- migration sanity is degraded
- auth is relying on raw header bypass
- diagnostics are unavailable
- key protected read APIs fail
- audit visibility is broken
- notification readiness is unknown
- core staffing scenarios are failing without approved exception
