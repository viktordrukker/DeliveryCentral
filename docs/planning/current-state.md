# Current State

This document summarizes the platform as it exists in code today, oriented to the **bank-IT supply/demand application** framing locked on 2026-05-10.

**Roadmap source-of-truth:** [`MASTER_TRACKER.md`](MASTER_TRACKER.md) (live execution tracker) + [`/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md`](/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md) (V2 lean-flow SoT — 20-PR shrink plan, supersedes all prior `v2-*` and `lean-*` plans). For the thematic index, [`synthesis-themes.md`](synthesis-themes.md) (24 themes). For doc topology, [`README.md`](README.md). Superseded pre-pivot roadmaps (`NEXT_ITERATION_PLAN.md`, `ULTIMATE_ANALYSIS_AND_PLAN.md`, `master-plan.md`) moved to `docs/archive/2026-05-23/`. Post-C0 strategic roadmap: `/home/drukker/.claude/plans/it-block-lifecycle-coverage-2026-06-02.md` (orthogonal).

_Last updated: 2026-06-09 (SoT PR 18 doc sweep — `ProjectPosition` confirmed as canonical staffing aggregate; legacy `ProjectAssignment`/`StaffingRequest` tables dropped via SoT PR 16 forward-only migration; account references switched to `*@itco.local`; jtbd-matrix counts corrected; superseded v2/lean plans archived under `/home/drukker/.claude/plans/archive/`)._

---

## 1. Platform shape (today)

### Runtime

- **Backend:** NestJS modular monolith. 36 modules under `src/modules/`. Global API prefix `/api`. Structured JSON logging. Swagger at `/api/docs`. Operator endpoints: `/api/health`, `/api/readiness`, `/api/health/deep` (12-aggregate probe), `/api/diagnostics`, `/metrics` (HD-11 prom-client).
- **Frontend:** React + Vite + React Router. 30 route trees under `frontend/src/routes/`. Local entry `http://localhost:5173`. Vite dev proxy forwards `/api` to backend. Production build served from container.
- **Database:** PostgreSQL 16. Prisma migrations at `prisma/migrations/`. 104 schema models (was 113 prior to SoT PR 16; 9 legacy staffing tables dropped 2026-06-09). CHECK constraints (DM-4-1: 33 across 14 tables). Hash-chained AuditLog.
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
- **OIDC handler:** ✅ `/auth/oidc/login` + `/auth/oidc/callback` (Entra-primary, IdP-agnostic) shipped via Sprint F-4.4 / PR #44 (D-155).
- **LDAP / AD adapter:** ✅ `LdapDirectoryAdapter` mirrors the M365 shape — pulls users + manager hierarchy + group membership; maps groups → platform roles via `ldap.groupRoleMap`. Sprint F-4.7 / PR #47 (NEW C1-LDAP).
- **M365 directory adapter:** ✅ auto-provision wired — unmatched users create INACTIVE Person rows via `CreateEmployeeService`. Gated by `sso.autoProvisionUsers` (default ON; OFF routes unmatched to UNMATCHED reconciliation for operator review). Sprint F-8.2 (D-156).
- **Integrations registry:** ✅ uniform admin view at `/admin/integrations/registry` enumerates every adapter (Jira PPM, M365, RADIUS, JSM, LDAP, LLM) with status / configured / reachable / last-sync / summary. Sprint F-8.1 (NEW C1-INT-FRAMEWORK).

### 2.2 Project + portfolio

- **Project lifecycle:** ACTIVE → CLOSED workflow shipped; `CloseProjectService` + `RestoreProjectService` (HD-8 chunk 8.4a). `ProjectClosureReadinessService` checks budget variance + work hours.
- **Project Radiator v1:** 16-axis PMBOK radar; per-axis PM override with audit; portfolio rollup; PDF/PPTX export; 60s scoring cache.
- **Project positions (canonical):** `ProjectPosition` is the canonical staffing aggregate as of SoT PR 16 (2026-06-09). State machine DRAFT → REQUESTED → APPROVED → ACTIVE → COMPLETED/CANCELLED on `ProjectPosition.activeFill`. CHECK constraints prevent overlap > 100% (allocationPercent 0..100). Undo seam (HD-8 chunk 8.4a/b) for cancel/close/deactivate. Legacy interim entities (`ProjectAssignment`, `StaffingRequest`, `AssignmentApproval`, `AssignmentHistory`, `StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`, `StaffingRequestFulfilment`, `PersonReleaseRequest`, `PersonReleaseApproval`) dropped via forward-only migration `20260*lean_p3_2_drop_legacy_tables` after a 7-day green parity soak.
- **Jira PPM connector:** ❌ stub-shaped today (Cat-1.2 NEW C1-JIRA-PPM promotes to first-class).

### 2.3 Staffing + workforce

- **Workforce Planner "Distribution Studio":** 3-tier solver (chain/qualified/fallback), 5 strategies, multi-week coverageWeeks, server-persisted PlannerScenario, HC-diagnostics. Reads/writes `ProjectPosition` exclusively after SoT PRs 14/15.
- **Staffing Desk:** unified position queue (no separate "Staffing Request" vs "Assignment" surfaces post-SoT PR 1), drag-and-drop placement (`@dnd-kit/core`).
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
- **Work evidence:** `WorkEvidence` records. ✅ Self-scope widened — `ALL_AUTHENTICATED_ROLES` can list their own records; privileged roles see the full surface. Shipped in customer-walk sweep `cbf3c64` (D-116).
- **Overtime:** shipped (DM-4-1 CHECK constraint HPW 0..168; OvertimePolicy + OvertimeException effective-dating).
- **Period locks:** ✅ BE endpoint + admin FE `PeriodLocksAdminPage` at `/admin/period-locks` (admin-only). Shipped in Sprint F-2.0a (D-93).

### 2.5 Cases + governance

- **Case management module:** `cases` BE module + `/cases` FE routes. Approve workflow ✅ FE button wired on CaseDetailsPage (D-91 — Sprint F-3.1 / PR #32).
- **Budget-change request approval:** ✅ FE button wired on Project BudgetTab (D-92 — Sprint F-3.1 / PR #32).
- **Audit log:** hash-chained. AuditLog `payload.email` + `actorDisplayName` are NOT redacted on erasure (D-167 in Cat-1.8 closes; redact-payload v1).
- **Audit log admin page:** ✅ `BusinessAuditPage` at `/admin/audit` (HR/director/admin). Filterable + paginated stream of business-action audit rows (D-114).
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

## 5. Highest-value remaining gaps (post Sprint F-8.1/F-8.2)

The original Cat-1 list (T-02..T-12, T-18) is largely closed by F-3..F-8. What's left is the long-tail Cat-2/Cat-3 backlog from `MASTER_TRACKER.md` and the Appendix A of `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`. Top candidates for the next sprint:

1. **20c-09 / 20c-10 / 20c-11 — DTO + type-safety hygiene** — 25+ inline `@Body()` without DTOs; `any`/`as unknown as` cleanup. Cat-1 hygiene. Effort: 5–7d.
2. **DM-2.5-8..12 — publicId top-down rollout** — controller-uuid-leak baseline 55 → 0. CLAUDE.md memory rule + security boundary. Effort: 8–12d.
3. **D-167 v2 — cryptographic forgetting** — moves redact-payload v1 to per-row encryption + key-shred. Required for high-bar EU/UK banks. Cat-3. Effort: 10–14d.
4. **Outbox consumer audit (post-F-6.5)** — verify `flag.outboxEnabled` flip actually moved fan-out off the request thread on staging. Effort: 2–3d.
5. **20c-15 — split god dashboard pages (PM/Director/HR)** — internal velocity. Cat-3. Effort: 4–6d.
6. **DM-5-2 / DM-5-5 — temporal-column rename + uniform createdBy/updatedBy** — schema hygiene. Cat-2. Effort: 3–4d.

The plan-mandated Cat-1 stack (Locale-agnostic, SSO/OIDC, FxRate, FiscalCalendar, RBAC, redact-payload v1, FK indexes, hot-path queries, outbox producers, approval-flow + admin gap completion) is **shipped**.
