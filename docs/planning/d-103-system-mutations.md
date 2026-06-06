# D-103 — System-generated mutations (actor-audit exempt)

These are Prisma writes that happen outside any human request flow.
The `scripts/check-actor-audit-coverage.cjs` allowlist holds the
authoritative list; this doc explains why each file is exempt.

A mutation belongs here when ALL of these are true:
- The write is triggered by a cron, scheduled task, webhook receiver,
  authentication-flow side-effect, or singleton bootstrap.
- There is no human actor in scope at the call site, AND threading one
  through would be misleading (the work was not user-initiated).
- A "system" sentinel actor would have to be invented for the column,
  which loses signal vs. dropping the column.

If any of those three fail, write the actor instead.

## Cron / sweep services

| File | Why exempt |
|------|------------|
| `src/modules/assignments/application/assignment-sla-sweep.service.ts` | SLA pre-breach + breach sweep. Audit log already records `actorId: 'system'`. |
| `src/shared/persistence/outbox.producer.ts` | Outbox event producer. Actor lives on the source aggregate write. |
| `src/modules/audit-observability/application/audit-retention.service.ts` | Hard-delete retention sweep. No user action. |

## Authentication / token plumbing

| File | Why exempt |
|------|------------|
| `src/modules/auth/auth.service.ts` | Login flow auto-tracks `failedLoginAttempts` / `lockedUntil` / `lastLoginAt`. The login attempt itself is not an "edit". |
| `src/modules/auth/oidc.service.ts` | OIDC provisioning. The IdP is the actor; we have no `personId` to stamp at first-login. |
| `src/modules/auth/token.service.ts` | Refresh-token lifecycle. |
| `src/modules/auth/refresh-token.service.ts` | Idem. |
| `src/modules/auth/password.service.ts` | Password reset token lifecycle. |
| `src/modules/auth/two-factor.service.ts` | 2FA enrolment / lock. Actor = own session, not a directed edit. |

## Webhook receivers / directory adapters

| File | Why exempt |
|------|------------|
| `src/modules/integrations/application/jira-webhook.service.ts` | Jira-driven ingest. |
| `src/modules/integrations/application/jira-importer.service.ts` | Backfill ingest. |
| `src/modules/integrations/application/jsm-cloud-connector.service.ts` | JSM cloud sync. |
| `src/modules/integrations/application/m365-directory-adapter.service.ts` | M365 directory pull. |
| `src/modules/integrations/application/ldap-directory-adapter.service.ts` | LDAP / AD pull. |
| `src/modules/integrations/application/radius-adapter.service.ts` | Radius reconciliation. |

## Notification dispatch (system → user, never user → system)

| File | Why exempt |
|------|------------|
| `src/modules/notifications/application/notification-event-translator.service.ts` | Domain event → outbox notification. The triggering edit owns the actor. |
| `src/modules/notifications/application/nudge.service.ts` | System nudges (no human asked for them). |
| `src/modules/in-app-notifications/infrastructure/in-app-notification.repository.ts` | Notification delivery rows. |
| `src/modules/notifications/application/notification-dispatch.service.ts` | Notification delivery sender. |

## Status / derivation recomputers

| File | Why exempt |
|------|------------|
| `src/modules/staffing-requests/application/derive-staffing-request-status.service.ts` | Recomputes derived status from position rows. No user edit. |

## Setup / health / shadow CI

| File | Why exempt |
|------|------------|
| `src/modules/setup/application/setup-wizard.service.ts` | Bootstrap, no operator `personId` yet. |
| `src/modules/setup/application/setup-token.service.ts` | Token lifecycle. |
| `src/shared/health/health.service.ts` | Liveness/readiness probes. |
| `src/modules/shadow-ci/application/shadow-ci-recorder.service.ts` | Shadow-CI capture/replay. |

## Singleton bootstrap

The `OrgConfigService.getConfig()` upsert seeds the singleton
`OrganizationConfig` row when missing. Annotated with the inline marker
`D-103-exempt:` so the audit picks it up per-call (rather than the
whole file).
