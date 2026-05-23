# Indexing + Constraint Strategy

_Last reconciled: 2026-05-23. Live counts: `grep -cE "^\s*@@index|^\s*@@unique" prisma/schema.prisma` → 446 entries; CHECK constraints land across multiple tables per DM-4-1 + D-111._

## Goals

- Fast lookup for active org + assignment state
- Deterministic uniqueness for external identifiers (per-provider)
- Efficient time-window queries for historical reconstruction
- Practical support for sync, audit, and outbox processing
- Multi-tenant isolation (DM-7.5 — `tenantId` participates in uniqueness on 15 aggregates)

## D-110 — FK index sweep (Sprint F-6.1)

16 missing FK indexes added in PR #57. Guardrail ratchet: `scripts/check-fk-indexes.cjs` blocks new FK columns without backing indexes. Every relation column on a hot-path query now has an index.

## External identity + sync uniqueness

| Table | Composite UNIQUE |
|---|---|
| `ProjectExternalLink` | `(provider, externalProjectKey)` |
| `IntegrationSyncState` | `(provider, resourceType, scopeKey)` |
| `WorkEvidence` | `(workEvidenceSourceId, sourceRecordKey)` |
| `WorkEvidenceLink` | `(workEvidenceId, provider, externalKey)` |
| `M365DirectoryReconciliationRecord` | per-`externalId` per-tenant |
| `RadiusReconciliationRecord` | per-`externalId` per-tenant |

These let provider records be replayed safely without duplicating core records.

## Temporal indexes

- `ReportingLine`, `PersonOrgMembership`, `PersonResourcePoolMembership` — index subject + counterpart + `(validFrom, validTo)`
- `ProjectAssignment` — index person + project + status + validity window (supports "as-of" queries: who managed X on date Y; which assignments overlapped period Z)
- `Position`, `EmploymentEvent` — effective-dated for HR history

## Search + workflow indexes

- `Project` — `name`, `tenantId`
- `CaseRecord` — `caseTypeId`, `subjectPersonId`, `relatedProjectId`, `relatedAssignmentId`
- `CaseStep` — `assigneePersonId`, `workflowStateId`
- `AuditLog` — aggregate id + correlation id (hash-chain integrity verified per DM-R-22)
- `OutboxEvent` — `(status, availableAt)` for the publisher cursor

## DM-7.5 tenant scoping

- `Tenant` model + `tenantId` column on 15 aggregates as of last DM-7.5 wave (`Person`, `Project`, `ProjectAssignment`, `StaffingRequest`, `CaseRecord`, `Skill`, `MetadataDictionary`, `WorkEvidence`, `Vendor`, `Client`, etc.). Uniqueness constraints flipped to composite `(tenantId, ...)` where applicable.
- RLS policies scaffolded per DM-7.5-6; resolver middleware enforces `SET LOCAL app.current_tenant_id` per request.
- Multi-tenant single-DB hosting still has known gaps on notification suite + IdempotencyKey + IntegrationSyncState + PlatformSetting per D-153 (P0 in MASTER_TRACKER).

## CHECK constraints (DM-4-1 + D-111)

Numeric invariants landed in migration `20260...d111_check_constraints/`:

- `ProjectAssignment.allocationPercent BETWEEN 0 AND 100`
- `OvertimeException.hoursPerWeek BETWEEN 0 AND 168`
- `TimesheetEntry.hours BETWEEN 0 AND 24`
- `OvertimePolicy.effectiveTo IS NULL OR effectiveTo > effectiveFrom`
- `WorkEvidence.hoursWorked >= 0`
- `StaffingRequest.headcountFulfilled <= headcountRequired` _(scheduled for derivation per D-95 in MASTER_TRACKER F-16.15)_
- `LENGTH(reason) >= 10` on close-overrides
- `workspendSummary IS NOT NULL OR status != 'CLOSED'`
- AuditLog CHECKs (D-111) constrain entity_type ∈ enum + action ∈ enum + actor present + payload validity.

See `data-quality-audit.md` Part 6 + `prisma/migrations/*d111*/` for the full list.

## Constraint notes

- Active reporting-line exclusivity is partially enforced via uniqueness + date columns; preventing overlapping active windows for the same relationship requires Postgres exclusion constraints or service-layer validation (Prisma can't model exclusion constraints directly — handled in raw-SQL migrations where strict enforcement matters).
- DM-5-1 raw-SQL audit (archived at `docs/archive/2026-05-23/dm-5-1-raw-sql-audit-2026-05-17.md`) catalogued 32 raw-SQL sites across 8 files; all confirmed intentional (setup wizard DDL + DM-R-22 hash-chain rebuild + RLS `SET LOCAL` + Postgres-internal probes).

## Performance follow-ups (open in MASTER_TRACKER)

- **MV bundle** (T-13) — not built (not needed at 200-2,000 person bank-IT scale).
- **Cache headers on tenant-shared metadata** (T-13 D-148) — currently `no-store`; Cat-2.
- **Hot-path findMany caps** (D-144) — top-3 unbounded findMany sites capped in Sprint F-6.2; remaining sites in MASTER_TRACKER F-16.4.
- **N+1 fixes** (D-145 PvA per-id loop → batch; D-146 workforce-planner via `PlatformSettingsService`) — shipped F-6.3 + F-6.4.
- **env-driven DB pool** (D-143) — shipped Sprint F-6.6 (`prisma.service.ts` now reads `DATABASE_CONNECTION_LIMIT`).
