# Schema Overview

_Last reconciled: 2026-05-23. **106 Prisma models** in `prisma/schema.prisma`. Live count: `grep -c "^model " prisma/schema.prisma`._

This is a navigation map only — the schema itself is the source of truth. For invariants + CHECK constraints see [indexing-strategy.md](./indexing-strategy.md). For the per-aggregate sequence rule see `docs/planning/aggregate-map.md` and `docs/planning/schema-conventions.md`.

## Design rules (intact since 2026-03)

- **Internal project identity vs external links** — `Project` is canonical; `ProjectExternalLink` stores provider keys; `ExternalSyncState` tracks link health. A project may exist before any external link.
- **Formal assignment vs work evidence** — `ProjectAssignment` is planned truth; `WorkEvidence` is observed truth; the schema supports either independently.
- **Historical org reconstruction** — `PersonOrgMembership`, `ReportingLine`, `PersonResourcePoolMembership`, `Position` carry `validFrom`/`validTo`. `ReportingLineType` distinguishes solid vs dotted line.
- **Metadata-driven customization** — `MetadataDictionary` + `MetadataEntry` (controlled vocab); `CustomFieldDefinition` + `CustomFieldValue` (per-entity extension); `WorkflowDefinition` + `WorkflowStateDefinition` + `EntityLayoutDefinition` (configurable workflow + layout).
- **Cases stay separate from assignment workflow** — `CaseRecord` may link to a person + project + assignment but its lifecycle is independent.

## DM (Data Model) work landed since 2026-04

- **DM-3 / DM-4** — schema-wide hygiene. Enum promotions (13/13), `timestamptz` on 231 columns, `allocationPercent` unified, UTC gate.
- **DM-4-1** — CHECK constraints across multiple tables (`allocationPercent BETWEEN 0 AND 100`, `hoursWorked >= 0`, `LENGTH(reason) >= 10` on close-overrides, etc.).
- **DM-6a** — 8 new aggregates / dictionary tables: `Currency`, `BudgetApproval`, `Contact`, `EmploymentEvent`, `ProjectRetrospective`, plus `ProjectTechnology` / `ProjectTag` / `VendorSkillArea` join tables.
- **DM-7** — `DomainEvent` table + outbox view + `AggregateType` enum. Outbox publisher wired in Sprint F-6.5 (D-142); `flag.outboxEnabled` ON.
- **DM-7.5** — `Tenant` model + `tenantId` on 15 aggregates + UNIQUE flips + RLS policies + resolver middleware. Bank-IT pivot keeps single-tenant per-install; multi-tenant code stays behind `flag.tenancy.multiTenant.enabled=false`.
- **DM-8** — version columns, partial archived indexes, Postgres role matrix, PII markers, `pg_trgm`, `pg_stat_statements`, capacity audit, partition runbook, MVs, soft-delete middleware, person-level RLS.
- **DM-2.5** — opaque tenant-scoped `publicId` layer; rollout in flight (2/10 aggregates at controller layer; CLAUDE.md memory rule: never expose raw UUIDs in browser).
- **DM-R Waves 1-4** (32/32) — resilience fixes. Hash chains on 4 audit tables stay intact.

## Major tables by domain

### Organization & org chart

`Person`, `OrgUnit`, `Position`, `PersonOrgMembership`, `ReportingLine`, `ResourcePool`, `PersonResourcePoolMembership`, `EmployeeActivityEvent`, `EmploymentEvent`, `OnboardingTourProgress`

### Project registry + portfolio

`Project`, `ProjectExternalLink`, `ExternalSyncState`, `ProjectMilestone`, `ProjectChangeRequest`, `ProjectRagSnapshot`, `ProjectRadiatorOverride`, `RadiatorThresholdConfig`, `ProjectRolePlan`, `ProjectVendorEngagement`, `ProjectWorkstream`, `ProjectRisk`, `ProjectRetrospective`, `ProjectActivationApproval`, `ProjectBudget` (+ 5 EVM columns: `plannedValue`, `earnedValue`, `actualCost`, `costVariance`, `scheduleVariance`)

### Project Radiator v1 (Phase PR-v1)

`ProjectMilestone`, `ProjectChangeRequest`, `ProjectRadiatorOverride`, `RadiatorThresholdConfig` — 16-axis PMBOK scoring + portfolio rollup; PDF/PPTX export via `jspdf` + `html2canvas` + `pptxgenjs`.

### Assignment + staffing + workforce

`ProjectAssignment` (9-state CSW workflow), `AssignmentApproval`, `AssignmentHistory`, `StaffingRequest`, `StaffingRequestFulfilment`, `StaffingRequestProposalCandidate`, `StaffingRequestProposalSlate`, `PlannerScenario` (Workforce Planner "Distribution Studio"), `PersonReleaseRequest`, `PersonReleaseApproval`, `ResponsibilityRule`

### Skills

`Skill`, `PersonSkill` (proficiency 1-5), `SkillCategory`

### Time + leave + evidence + overtime

`TimesheetWeek` (DRAFT/SUBMITTED/APPROVED), `TimesheetEntry`, `LeaveRequest`, `LeaveBalance`, `WorkEvidence`, `WorkEvidenceSource`, `WorkEvidenceLink`, `OvertimePolicy`, `OvertimeException`, `PeriodLock` (D-93)

### Cases + governance

`CaseRecord`, `CaseType`, `CaseStep`, `CaseParticipant`, `BudgetApproval`, hash-chained `AuditLog` (+ CHECK constraints from D-111)

### Notifications + outbox

`NotificationRequest`, `NotificationTemplate`, `NotificationChannel`, `NotificationDelivery`, `PersonNotificationPreference`, `InAppNotification`, `DomainEvent`, `OutboxEvent` (D-142 publisher ON), `IdempotencyKey`

### Identity + access

`LocalAccount`, `RefreshToken`, `PasswordResetToken`, `PersonExternalIdentityLink`, `ExternalAccountLink`, `Tenant`

### Customization + metadata + platform

`MetadataDictionary`, `MetadataEntry`, `CustomFieldDefinition`, `CustomFieldValue`, `WorkflowDefinition`, `WorkflowStateDefinition`, `EntityLayoutDefinition`, `PlatformSetting`, `OrganizationConfig`, `FeatureFlag`-adjacent (in `admin-feature-flags`)

### Vendor + finance + locale

`Vendor`, `VendorSkillArea`, `RateCard`, `RateCardEntry`, `PersonCostRate`, `Client`, `Contact`, `Currency`, `FxRate` (D-164, flag-gated F-7.4), `FiscalCalendar` + `FiscalPeriod` (D-160b, flag-gated F-7.5), `PublicHoliday` (D-163 multi-region)

### Pulse + Help Center

`PulseEntry`, `PulseReport`, `HelpArticle`, `HelpFeedback`, `HelpTip`

### Setup wizard

`SetupRun`, `SetupRunLog`

### Integration sync state

`IntegrationSyncState`, `M365DirectoryReconciliationRecord`, `RadiusReconciliationRecord`

### Undo seam (HD-8)

`UndoAction`

### Audit infrastructure (Postgres tables, not Prisma models)

`capacity_audit`, `ddl_audit`, `honeypot`, `honeypot_alerts`, `migration_audit` — DM-8 capacity + drift + intrusion-detection tables, populated by triggers + roles.

## Migration approach

- `prisma/migrations/` is the source of truth for migration history.
- New migrations: `npx prisma migrate dev --name <name>` (requires running DB).
- **All migrations must be idempotent** — see memory note `feedback-migrations-must-be-idempotent.md` and template at `/tmp/migrate-idempotent.py`. Lesson from staging breakage 2026-05-02.
- Schema-hash refresh after any `migration.sql` change: `npm run test:migrations:gen` (DM-R-13).
- Forward-only migrations from F-4.5 (EMP-CASE + EMPLOYEE_ISSUE enum, DM-R-29).

## Soft-delete + archival

- Operationally important tables carry `archivedAt`; some also carry `deletedAt`. `archivedAt` is the business retention mechanism. DM-8 soft-delete middleware enforces the convention. (D-96 DECIDE — see MASTER_TRACKER F-16.8 to collapse or document.)
