# Current State

This document summarizes the platform as it exists in code today, oriented to the **bank-IT supply/demand application** framing locked on 2026-05-10.

For going-forward work, read [`NEXT_ITERATION_PLAN.md`](NEXT_ITERATION_PLAN.md) (master plan) + [`synthesis-themes.md`](synthesis-themes.md) (24-theme catalog). For outstanding work, [`MASTER_TRACKER.md`](MASTER_TRACKER.md). For the bank-IT 3-category re-categorization, [`/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`](/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md).

_Last updated: 2026-05-15 (Sprint F-5 Customizable RBAC + Governance COMPLETE — PRs #49–#55: role-preset constants + literal-array ratchet (D-130 step 1), PlatformSetting-driven preset overrides (D-130 step 2), read-action coverage via ResponsibilityRule (D-158, flag default OFF), RolePermissionAdminPage FE (D-159, flag default OFF), POST /admin/persons/:id/forget redact-payload v1 (D-167), audit.retentionDays + nightly auto-purge cron (D-168), AuditLog CHECK constraints (D-111))._

---

## 1. Platform shape (today)

### Runtime

- **Backend:** NestJS modular monolith. 36 modules under `src/modules/`. Global API prefix `/api`. Structured JSON logging. Swagger at `/api/docs`. Operator endpoints: `/api/health`, `/api/readiness`, `/api/health/deep` (12-aggregate probe), `/api/diagnostics`, `/metrics` (HD-11 prom-client).
- **Frontend:** React + Vite + React Router. 30 route trees under `frontend/src/routes/`. Local entry `http://localhost:5173`. Vite dev proxy forwards `/api` to backend. Production build served from container.
- **Database:** PostgreSQL 16. Prisma migrations at `prisma/migrations/`. 53+ schema models. CHECK constraints (DM-4-1: 33 across 14 tables). Hash-chained AuditLog.
- **Local environment:** Docker-only. PostgreSQL 512MB, backend 2GB (raised from 1GB on 2026-04-18), frontend 1GB. Single seed profile `it-company` (200 people, 40 projects, 5-year history).

### Tenant posture

- **Single-tenant per-bank install** (locked 2026-05-10). HARDEN F6 multi-tenant scaffolding stays in code behind `flag.tenancy.multiTenant.enabled=false` for a future SaaS pivot.

### Domain modules (backend)

`admin`, `assignment-workload`, `assignments`, `audit-observability`, `auth`, `case-management`, `customization-metadata`, `dashboard`, `exceptions`, `financial-governance`, `health`, `help-center`, `identity-access`, `in-app-notifications`, `integrations`, `integrations-hub`, `leave-requests`, `metadata`, `notifications`, `organization`, `organization-org-chart`, `overtime`, `platform-settings`, `project-registry`, `pulse`, `reports`, `resource-pools`, `setup`, `skills`, `staffing-desk`, `staffing-requests`, `time-work-evidence`, `timesheets`, `undo`, `work-evidence`, `workload`.

### Frontend route trees

`admin`, `assignments`, `auth`, `cases`, `dashboard`, `exceptions`, `help`, `integrations`, `leave`, `metadata-admin`, `my-time`, `notifications`, `org`, `people`, `projects`, `reports`, `resource-pools`, `settings`, `setup`, `staffing-board`, `staffing-desk`, `staffing-requests`, `teams`, `time-management`, `timesheets`, `work-evidence`, `workload`. Plus `FeatureGuard.tsx`, `ProtectedRoute.tsx`, `RoleGuard.tsx`, `RoutePlaceholderPage.tsx`, `NotFoundPage.tsx`.

---

## 2. What is implemented (bank-IT lens)

### 2.1 Identity + access

- **Local-account auth:** `/auth/login` + JWT cookies + 2FA + password reset. Functional but local-only (D-155 / Cat-1.1 will add OIDC).
- **8 platform roles:** `admin`, `director`, `hr_manager`, `resource_manager`, `project_manager`, `delivery_manager`, `employee`, plus `dual-role`. Bank-specific shapes (Squad/Tribe Lead, IT Service Owner) added by tenant admin via D-159 UI on installation; not pre-baked.
- **Impersonation:** Admin "View as" overlay (CLAUDE.md §8.13). Used by walker-results.json and admin investigation flows.
- **OIDC handler:** ❌ not yet (D-155 in Cat-1.1). Settings + `openid-client@6.8.2` are wired; route handler missing.
- **LDAP / AD adapter:** ❌ not yet (Cat-1.1 NEW C1-LDAP).
- **M365 directory adapter:** read-only stub (`m365-directory-adapter.ts:1-38`); auto-provision missing (D-156 in Cat-1.1).

### 2.2 Project + portfolio

- **Project lifecycle:** ACTIVE → CLOSED workflow shipped; `CloseProjectService` + `RestoreProjectService` (HD-8 chunk 8.4a). `ProjectClosureReadinessService` checks budget variance + work hours.
- **Project Radiator v1:** 16-axis PMBOK radar; per-axis PM override with audit; portfolio rollup; PDF/PPTX export; 60s scoring cache.
- **Project assignments:** state machine DRAFT → REQUESTED → APPROVED → ACTIVE → COMPLETED/CANCELLED. CHECK constraints prevent overlap > 100% (allocationPercent 0..100). Undo seam (HD-8 chunk 8.4a/b) for cancel/close/deactivate.
- **Jira PPM connector:** ❌ stub-shaped today (Cat-1.2 NEW C1-JIRA-PPM promotes to first-class).

### 2.3 Staffing + workforce

- **Workforce Planner "Distribution Studio":** 3-tier solver (chain/qualified/fallback), 5 strategies, multi-week coverageWeeks, server-persisted PlannerScenario, HC-diagnostics.
- **Staffing Desk:** approval queue, slate-based proposal flow, drag-and-drop placement (`@dnd-kit/core`).
- **Manager Dashboard — Pending Approvals tile:** ✅ KPI tile + embedded approval-queue strip on `/dashboard/manager` (WO-4.14/WO-5.5 — Sprint F-3.2 / PR #33).
- **Exec/Director Dashboard — SLA breach + Time-to-fill tiles:** ✅ Director-approvals-waiting + 24h SLA breach count + Time-to-fill sparkline on `/dashboard/exec` (WO-4.15/WO-5.6 — Sprint F-3.3 / PR #34).
- **Portfolio Radiator KPI:** ✅ Green/Warning/Critical counts now show correctly (D-115 — Sprint F-3.5 / PR #36).
- **RM dashboard data shaping:** ✅ RM excluded from their own managed-people counts; pool Util/Assignment numbers now accurate (D-120 — Sprint F-3.6 / PR #37).
- **Per-user preferred dashboard route:** ✅ `account.preferredDashboardRoute` setting on Account Settings; dual-role HR > RM precedence codified (D-119 — Sprint F-3.7 / PR #38).
- **PvA dashboard "Resolve" → Project Budget tab:** ✅ PvA resolve action links into Project Detail budget-approval CTA (CLAUDE.md Pitfall #14 — Sprint F-3.4 / PR #35).
- **Skills:** `Skill` + `PersonSkill` (proficiency 1-5), `SkillCategory`. CRUD via `/admin/skills`.
- **PvA dashboard:** virtualized layout; configurable hours/week constant from PlatformSettings.

### 2.4 Time + leave + evidence

- **Timesheets:** weekly approval flow with hash-chained AuditLog. `TimesheetWeek` rows DRAFT/SUBMITTED/APPROVED. CHECK: hours 0..24.
- **Leave requests:** `LeaveRequestType` (currently a code enum; T-09 D-107 migrates to MetadataDictionary in Cat-2). Approvals via standard chain.
- **Work evidence:** `WorkEvidence` records. ❌ Today gated to director/admin (D-116 in Cat-1.4 widens self-scope or relocates).
- **Overtime:** shipped (DM-4-1 CHECK constraint HPW 0..168; OvertimePolicy + OvertimeException effective-dating).
- **Period locks:** BE endpoint `POST /admin/period-locks` exists; ❌ admin FE missing (D-93 in Cat-1.5).

### 2.5 Cases + governance

- **Case management module:** `cases` BE module + `/cases` FE routes. Approve workflow ✅ FE button wired on CaseDetailsPage (D-91 — Sprint F-3.1 / PR #32).
- **Budget-change request approval:** ✅ FE button wired on Project BudgetTab (D-92 — Sprint F-3.1 / PR #32).
- **Audit log:** hash-chained. AuditLog `payload.email` + `actorDisplayName` are NOT redacted on erasure (D-167 in Cat-1.8 closes; redact-payload v1).
- **Audit log admin page:** ❌ missing FE (D-114 in Cat-1.5; no longer blocked by tenantId since single-tenant).
- **AuditLog retention:** ❌ no policy / no purge cron (D-168 in Cat-1.8).

### 2.6 Notifications + nudge + outbox

- **In-app notifications:** shipped. PersonNotificationPreference (HD-8 era).
- **Outbox seam:** schema landed (HD-7); ❌ producers + publisher zero-wired (D-142 in Cat-1.6).
- **Nudge sweeper:** HD-8 chunk 8.3 — NudgeSweeperService runs per-tick scan (60min), emits `nudge.proposal_acknowledgment_overdue` + `nudge.timesheet_submission_overdue` events through outbox seam.
- **Approver nudge button:** ✅ `NudgeButton.tsx` + `POST /notifications/nudge` with 24h rate-limit — wired into manager-dashboard approval queue rows (21-09 — Sprint F-3.4 / PR #35).
- **SLA pre-breach:** HD-10 — assignment SLA sweep at 50%/75% pre-breach + breach.
- **Email channels:** generic + ms_teams_webhook + email shipped (HD-8 chunk 8.1).

### 2.7 Help Center + onboarding

- **Help Center MVP:** HD-9 closed 2026-05-09 (admin editor + public list + article detail + feedback widget + onboarding tour). Per Cat-2 plan, may be flag-gated per-bank with `flag.helpCenter.enabled`.

### 2.8 Performance + caching

- **DB pool:** ❌ `prisma.service.ts:50-58` instantiates with no `connection_limit` (D-143 in Cat-1.6).
- **FK indexes:** ❌ 12 missing (D-110 in Cat-1.6).
- **MV bundle:** ❌ not built (T-13 in Cat-2; not needed at bank-IT 200-2,000 person scale).
- **Cache headers:** ❌ tenant-shared metadata serves `no-store` (T-13 D-148 in Cat-2).
- **Hot-path queries:** ❌ 3 unbounded findMany sites + 2 N+1s (D-144/145/146 in Cat-1.6).

### 2.9 Locale + currency + fiscal

- **Tenant timezone, weekStartDay, currency, fiscalYearStart:** ❌ settings exist but NOT consumed (D-160a/D-161/D-163/D-165 in Cat-1.3 fix).
- **FxRate model:** ❌ does not exist (D-164 in Cat-1.3).
- **PublicHoliday:** ❌ defaults to `'AU'` (D-163 in Cat-1.3 makes multi-region).

### 2.10 GDPR + compliance

- **Right-to-erasure:** ❌ zero `purge|forget|gdpr` hits in `src/` (D-167 in Cat-1.8 ships redact-payload v1).
- **Soft-delete model:** dual `archivedAt` + `deletedAt`; default `archivedAt` as live column (D-96 in Cat-1.8).

### 2.11 Observability

- **prom-client + `/metrics`:** HD-11 closed. Counters/gauges for outbox + assignment SLA + nudge sweep.
- **Health probes:** `/api/health`, `/api/readiness`, `/api/health/deep` (12-aggregate probe).
- **OpenTelemetry / structured logging:** structured JSON logging + correlation ids; OTel exporters not yet wired.

### 2.12 Local-LLM scaffolding

- ❌ Not yet (Cat-1.2 NEW C1-LLM-SCAFFOLD). Generic OpenAI-compatible client wrapper to be built; no AI features yet.

---

## 3. Test accounts (it-company seed profile)

Single seed profile is `it-company` (200 people, 40 projects, 5-year history). Test accounts:

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@deliverycentral.local` | `DeliveryCentral@Admin1` |
| director (Engineering) | `noah.bennett@itco.local` | `DirectorPass1!` |
| hr_manager | `diana.walsh@itco.local` | `HrManagerPass1!` |
| resource_manager | `sophia.kim@itco.local` | `ResourceMgrPass1!` |
| project_manager | `lucas.reed@itco.local` | `ProjectMgrPass1!` |
| delivery_manager | `carlos.vega@itco.local` | `DeliveryMgrPass1!` |
| employee | `ethan.brooks@itco.local` | `EmployeePass1!` |
| dual-role RM+HR | `emma.garcia@itco.local` | `DualRolePass1!` |

Seed: `docker compose exec -e SEED_PROFILE=it-company backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"`.

---

## 4. Outstanding work (high level)

For the full breakdown see [`MASTER_TRACKER.md`](MASTER_TRACKER.md) + [`/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`](/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md) Appendix A.

| Category | Count | Examples |
|---|---|---|
| **Cat-1 (Now — bank-IT go-live)** | ~40 tasks across themes T-02/T-03/T-04/T-05a/T-06/T-07/T-08-D110/T-11/T-12/T-16/T-18/T-20/T-21/T-22-D133 + 6 NEW-C1-* | OIDC handler, LDAP adapter, JSM connector, locale-agnostic settings, customizable+deterministic RBAC, PMO surface gaps, employee Report-Issue, FK indexes, hot-path queries, outbox producers |
| **Cat-2 (Toggle off — flag-gated)** | ~24 tasks across themes T-01/T-05b/T-09/T-10/T-13/T-14/T-23 + Pulse + Help Center + Undo toast | Multi-tenant scaffolding (kept-in-code), MV bundle, BI extracts, customization L1 catalog, bulk-import, Pulse mood heatmap, Help Center per-bank gating |
| **Cat-3 (Future roadmap)** | ~13 capabilities + ~18 legacy tracker items | SaaS multi-tenant activation, SCIM 2.0, AI-driven case classification, mobile employee app, cross-bank benchmarking, architecture refactors (T-15) |

---

## 5. Highest-value remaining gaps (pre-bank-IT-go-live)

Ordered by impact × effort score from Phase 10 synthesis:

1. **T-07 Locale + timezone + week + currency** — bank cannot operate without correct locale handling. Effort: 5–7d.
2. **T-02 SSO/OIDC handler + M365 auto-provision** — enterprise-blocker. Effort: 8–12d.
3. **T-06 Multi-currency consolidation (FxRate)** — locale-agnostic architecture requires it. Effort: 7–10d.
4. **T-05a Fiscal year quick fix** — banks rarely have Jan-1 FY. Effort: 3d.
5. **T-04 Customizable + deterministic RBAC** — promoted from Cat-2 to Cat-1. Effort: 12–18d (D-130+D-158+D-159).
6. **T-03 GDPR redact-payload v1** — regulatory blocker for EU/UK banks. Effort: 10–15d.
7. **T-08 D-110 FK indexes** — hardening + prereq for any future MV work. Effort: 5d.
8. **T-12 Hot-path queries** — perf safety net. Effort: 3–5d.
9. **T-11 Outbox producers + DB pool** — production-readiness. Effort: 4–7d.
10. **T-18 Approval-flow + admin gap completion** — case approve, budget approve, period lock, audit log, /admin/setup. Effort: 6–8d.
