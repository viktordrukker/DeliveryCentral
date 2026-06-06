# Tenancy assumptions — cross-cutting aggregators

**Purpose:** for every cross-cutting service that aggregates data across
multiple Prisma tables, record whether it currently filters by `tenantId`
and (if not) why that is acceptable today + what unblocks adding the
filter.

**Phase:** TENANCY-AUDIT-3-AGGREGATORS (Phase 5 compliance, V2 master plan).

**Created:** 2026-06-06.

---

## Platform tenancy posture today

- The schema has nullable `tenantId` columns + indexes on **27 models**
  (Person, Project, ProjectPosition, BudgetApproval-adjacent, etc.).
- `src/shared/persistence/tenant-resolver.middleware.ts` exists but is
  **NOT registered** on `PrismaService`. Cutover is gated on:
  1. `TENANT_ISOLATION_ENABLED=true` (currently `false` in `.env.example`,
     `env.staging.example`, `env.prod.example`).
  2. DM-7.5-5 RLS policies enabled per table.
- Until both gates flip, the platform runs effectively as **single-tenant**:
  every row's `tenantId` is either NULL or the same UUID for all rows.
- Tracker references: DM-7.5-4 (resolver scaffold done), DM-7.5-4b
  (interceptor wiring outstanding), DM-7.5-5 (RLS migration outstanding).

This file is the audit trail for the **read-side** aggregators that
operate before RLS is on. When RLS lands, every `findMany` runs under
`SET LOCAL app.current_tenant_id` and the policy enforces isolation
without any service-layer code change. The aggregators below were
written under that assumption.

---

## Aggregator audit

### 1. `DirectorAnomalyDetectionService`

**File:** `src/modules/dashboard/application/director-anomaly-detection.service.ts`

**Endpoint:** `GET /api/dashboard/director/anomalies`

**Prisma tables touched:**

| Table | Has `tenantId` column? | Filter applied today? |
|---|---|---|
| `Project` | yes | no — filters by `status: 'ACTIVE'` only |
| `ProjectRagSnapshot` | no | n/a |
| `BudgetApproval` | no | n/a |
| `ProjectBudget` | no | n/a |
| `ProjectActivationApproval` | yes | no — filters by `decision: null` only |
| `ProjectMilestone` | no | n/a |
| `ProjectPosition` | yes | no — filters by `projectId IN (…)` + `fillStatus` |

**Decision:** single-tenant assumption documented. No filter added in
this PR.

**Why this is acceptable today:**

- The service is reachable only via `@RequireRoles('director','admin')`
  controllers; both roles are tenant-scoped at the auth layer.
- 4 of 7 tables have no `tenantId` column at all (`ProjectRagSnapshot`,
  `BudgetApproval`, `ProjectBudget`, `ProjectMilestone`). Adding the
  filter without first adding the column would have no effect.
- The 3 tables that DO have `tenantId` (`Project`,
  `ProjectActivationApproval`, `ProjectPosition`) get isolation for
  free once DM-7.5-5 RLS lands — `SET LOCAL app.current_tenant_id`
  filters the `Project` results, and the milestone/budget/rag queries
  scope through `projectId IN (…)` which already inherits.

**What unblocks the filter:**

1. DM-7.5-5 RLS policies enabled on `Project` + child tables → automatic
   isolation, no service-layer code change.
2. (Alternative, more invasive) inject a tenant-context port + add
   `tenantId: ctx.tenantId` to every `findMany` `where` clause. Only
   useful if RLS is rejected as a strategy.

**Integration test:** `test/integration/tenancy-audit/director-anomaly-detection.spec.ts`

---

### 2. `UnifiedApprovalQueueService`

**File:** `src/modules/dashboard/application/unified-approval-queue.service.ts`

**Endpoint:** `GET /api/dashboard/approvals` (`loadX` methods aggregated)

**Prisma tables touched:**

| Table | Has `tenantId` column? | Filter applied today? |
|---|---|---|
| `ProjectPosition` | yes | no — filters by `fillStatus: 'PROPOSED'` only |
| `BudgetApproval` | no | n/a |
| `ProjectActivationApproval` | yes | no — filters by `decision: null` only |
| `LeaveRequest` | yes | no — filters by `status: 'PENDING'` only |
| `CaseRecord` | yes | no — filters by `status: 'OPEN'` only |
| `TimesheetWeek` | yes | no — filters by `status: 'SUBMITTED'` only |
| `Person` | yes | no — used for `findMany({ id: { in: … } })` lookup |

**Decision:** single-tenant assumption documented. No filter added in
this PR.

**Why this is acceptable today:**

- The service is reachable only through `@RequireRoles(MANAGEMENT_ROLES)`
  controllers; management roles are tenant-scoped at the auth layer.
- The downstream `decide()` dispatcher calls into per-source services
  (`LeaveRequestsService.approve`, `DecideBudgetChangeService.execute`,
  etc.) that each thread `actorId` + already validate the actor's scope
  for that source — so even today a director from tenant A could not
  approve a leave request from tenant B (the per-source service would
  reject on actor/owner mismatch).
- 1 of 7 tables (`BudgetApproval`) has no `tenantId` column. Filter
  would need that migration first.
- Remaining 6 tables get isolation for free when DM-7.5-5 RLS lands.

**What unblocks the filter:**

1. DM-7.5-5 RLS on `ProjectPosition`, `ProjectActivationApproval`,
   `LeaveRequest`, `CaseRecord`, `TimesheetWeek`, `Person` → automatic.
2. Add `tenantId` to `BudgetApproval` (its parent `ProjectBudget` also
   lacks the column) → schema migration + RLS together.

**Integration test:** `test/integration/tenancy-audit/unified-approval-queue.spec.ts`

---

### 3. `PortfolioRadiatorService`

**File:** `src/modules/project-registry/application/portfolio-radiator.service.ts`

**Endpoint:** `GET /api/portfolio/radiator`

**Prisma tables touched:**

| Table | Has `tenantId` column? | Filter applied today? |
|---|---|---|
| `Project` | yes | no — filters by `status IN ('ACTIVE','ON_HOLD')` + `deletedAt: null` |

(The service then delegates per-project to `RadiatorScoringService`,
which reads project-scoped tables via `projectId`; those queries inherit
tenancy through the project once RLS is on.)

**Decision:** single-tenant assumption documented. No filter added in
this PR.

**Why this is acceptable today:**

- The service is reachable only through `@RequireRoles('director',
  'delivery_manager','admin')` controllers; all three roles are
  tenant-scoped at the auth layer.
- 60-second portfolio-wide cache (`PORTFOLIO_CACHE_KEY = 'radiator:portfolio'`)
  is **global, not tenant-keyed**. If RLS lands while this cache key
  remains global, cross-tenant leakage WILL occur via the cache. When
  enabling RLS, this cache key MUST be re-keyed to
  `radiator:portfolio:<tenantId>` or evicted on every tenant context
  change. Filed as a follow-up note below.
- Single table with `tenantId` (`Project`) → trivial to filter once
  RLS is on.

**What unblocks the filter:**

1. DM-7.5-5 RLS on `Project` → `findMany` automatically scoped.
2. **Cache eviction:** retire `PORTFOLIO_CACHE_KEY` global key in favour
   of a tenant-scoped key. Track as a sub-task of DM-7.5-5 cutover.

**Integration test:** `test/integration/tenancy-audit/portfolio-radiator.spec.ts`

---

## Summary

| Service | Tenant filter today? | Unblocks |
|---|---|---|
| `DirectorAnomalyDetectionService` | no (single-tenant) | DM-7.5-5 RLS on 3 tables |
| `UnifiedApprovalQueueService` | no (single-tenant) | DM-7.5-5 RLS + `BudgetApproval.tenantId` migration |
| `PortfolioRadiatorService` | no (single-tenant) | DM-7.5-5 RLS + cache key re-scope |

**No code changes were made to the three services in this PR.** The
audit confirms that the platform's current single-tenant posture
(`TENANT_ISOLATION_ENABLED=false`) is consistent across these three
aggregators and that the RLS-cutover path will make them tenant-safe
without touching service code (except the cache eviction follow-up
noted under PortfolioRadiator).

The 3 integration tests in `test/integration/tenancy-audit/`
exercise each service against a real test database with rows from a
single tenant, asserting that current behavior is well-defined and
that no obvious cross-tenant leakage exists today (because there is
only one tenant in play). When RLS is enabled, these tests should be
extended with a second tenant fixture + `runInTenantScope` to assert
true cross-tenant isolation.
