# Current State

This document summarizes the platform as it exists in code today, oriented to the **bank-IT supply/demand application** framing locked on 2026-05-10.

**Roadmap source-of-truth:** [`MASTER_TRACKER.md`](MASTER_TRACKER.md) (live execution tracker) + [`/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md`](/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md) (V2 lean-flow SoT — 20-PR shrink plan, supersedes all prior `v2-*` and `lean-*` plans). For the thematic index, [`synthesis-themes.md`](synthesis-themes.md) (24 themes). For doc topology, [`README.md`](README.md). Superseded pre-pivot roadmaps (`NEXT_ITERATION_PLAN.md`, `ULTIMATE_ANALYSIS_AND_PLAN.md`, `master-plan.md`) moved to `docs/archive/2026-05-23/`. Post-C0 strategic roadmap: `/home/drukker/.claude/plans/it-block-lifecycle-coverage-2026-06-02.md` (orthogonal).

_Last updated: 2026-06-11 (docs truth sweep — §1 module/route inventories aligned to disk (39 BE modules / 26 FE route trees), §§2.5-2.12 stale "❌ not shipped" claims flipped to ✅ for retention cron (D-168), outbox producers (D-142), DB pool (D-143), FK indexes (D-110), hot-path queries (D-144/145/146), locale consumption (D-160/161/163/165), FxRate (D-164), PublicHoliday multi-region (D-163), right-to-erasure redact v1 (D-167), and LLM scaffold — each verified against code. Prior sweep — 2026-06-10 — SoT PR 18 follow-up — adds PR 17a/17b FE deletion footprint to the implemented column; legacy `ProjectAssignment` / `StaffingRequest` BE tables (PR 16) and FE clients + components (PR 17a/17b) are gone; remaining V2 residuals are PR 19 (soak monitor) and PR 20 (`dsRefresh` C0 flip). Earlier sweep — 2026-06-09 — confirmed `ProjectPosition` as the canonical staffing aggregate, switched accounts to `*@itco.local`, corrected jtbd-matrix counts, and archived superseded v2/lean plans under `/home/drukker/.claude/plans/archive/`)._

---

## 1. Platform shape (today)

### Runtime

- **Backend:** NestJS modular monolith. 39 modules under `src/modules/`. Global API prefix `/api`. Structured JSON logging. Swagger at `/api/docs`. Operator endpoints: `/api/health`, `/api/readiness`, `/api/health/deep` (12-aggregate probe), `/api/diagnostics`, `/metrics` (HD-11 prom-client).
- **Frontend:** React + Vite + React Router. 26 route trees under `frontend/src/routes/`. Local entry `http://localhost:5173`. Vite dev proxy forwards `/api` to backend. Production build served from container.
- **Database:** PostgreSQL 16. Prisma migrations at `prisma/migrations/`. 104 schema models (was 113 prior to SoT PR 16; 9 legacy staffing tables dropped 2026-06-09). CHECK constraints (DM-4-1: 33 across 14 tables). Hash-chained AuditLog.
- **Local environment:** Docker-only. PostgreSQL 512MB, backend 2GB (raised from 1GB on 2026-04-18), frontend 1GB. Single seed profile `it-company` (200 people, 40 projects, 5-year history).

### Tenant posture

- **Single-tenant per-bank install** (locked 2026-05-10). HARDEN F6 multi-tenant scaffolding stays in code behind `flag.tenancy.multiTenant.enabled=false` for a future SaaS pivot.

### Domain modules (backend)

`admin`, `admin-feature-flags`, `audit-observability`, `auth`, `case-management`, `customization-metadata`, `dashboard`, `delivery-manager`, `dm-team-detail`, `exceptions`, `financial-governance`, `health`, `help-center`, `identity-access`, `in-app-notifications`, `integrations`, `integrations-hub`, `leave-requests`, `metadata`, `notifications`, `organization`, `organization-org-chart`, `overtime`, `planner-scenarios`, `platform-settings`, `project-positions`, `project-registry`, `pulse`, `reports`, `resource-pools`, `search`, `setup`, `skills`, `staffing-desk`, `time-work-evidence`, `timesheets`, `undo`, `work-evidence`, `workload`.

### Frontend route trees

`admin`, `approvals`, `auth`, `cases`, `dashboard`, `exceptions`, `help`, `integrations`, `leave`, `me`, `metadata-admin`, `my-time`, `notifications`, `org`, `people`, `projects`, `reports`, `resource-pools`, `settings`, `setup`, `staffing-desk`, `teams`, `time-management`, `timesheets`, `work-evidence`, `workload`. Plus `FeatureGuard.tsx`, `ProtectedRoute.tsx`, `RoleGuard.tsx`, `RoutePlaceholderPage.tsx`, `NotFoundPage.tsx`.

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
- **Project positions (canonical):** `ProjectPosition` is the canonical staffing aggregate as of SoT PR 16 (2026-06-09). State machine DRAFT → REQUESTED → APPROVED → ACTIVE → COMPLETED/CANCELLED on `ProjectPosition.activeFill`. CHECK constraints prevent overlap > 100% (allocationPercent 0..100). Undo seam (HD-8 chunk 8.4a/b) for cancel/close/deactivate. Legacy interim entities (`ProjectAssignment`, `StaffingRequest`, `AssignmentApproval`, `AssignmentHistory`, `StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`, `StaffingRequestFulfilment`, `PersonReleaseRequest`, `PersonReleaseApproval`) dropped via forward-only migration `20260*lean_p3_2_drop_legacy_tables` after a 7-day green parity soak. **FE deletion finalized 2026-06-10 (SoT PR 17a + PR 17b):** removed `frontend/src/lib/api/assignments.ts`, `frontend/src/lib/api/staffing-requests.ts`, the `position-to-assignment-mapper` bridge (incl. its tests + the `phase2-exit-gate` / `callsite-audit` lean-migration tests), and 9 legacy FE components (`AssignmentsTable`, `BulkAssignmentResults`, `AssignmentTable`, `useAssignmentDetails`, `workflow-progression`, `ProposalBuilderDrawer`, `ProposalReviewPanel`, `StaffingRequestDrawer`, `StaffingRequestForm` + its validation module). `grep -rE 'from.*api/assignments|from.*api/staffing-requests' frontend/src` returns zero (V2-done criterion 8 met).
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
- **AuditLog retention:** ✅ retention policy + purge cron shipped (`audit-retention-sweep.service.ts`) — Sprint F-5 (D-168).

### 2.6 Notifications + nudge + outbox

- **In-app notifications:** shipped. PersonNotificationPreference (HD-8 era).
- **Outbox seam:** ✅ schema landed (HD-7); producers + publisher wired (`outbox-event-publisher.service.ts`), gated by `flag.outboxEnabled` (ON since Sprint F-6.5 / D-142). Producer contract test in place.
- **Nudge sweeper:** HD-8 chunk 8.3 — NudgeSweeperService runs per-tick scan (60min), emits `nudge.proposal_acknowledgment_overdue` + `nudge.timesheet_submission_overdue` events through outbox seam.
- **Approver nudge button:** ✅ `NudgeButton.tsx` + `POST /notifications/nudge` with 24h rate-limit — wired into manager-dashboard approval queue rows (21-09 — Sprint F-3.4 / PR #35).
- **SLA pre-breach:** HD-10 — assignment SLA sweep at 50%/75% pre-breach + breach.
- **Email channels:** generic + ms_teams_webhook + email shipped (HD-8 chunk 8.1).

### 2.7 Help Center + onboarding

- **Help Center MVP:** HD-9 closed 2026-05-09 (admin editor + public list + article detail + feedback widget + onboarding tour). Per Cat-2 plan, may be flag-gated per-bank with `flag.helpCenter.enabled`.

### 2.8 Performance + caching

- **DB pool:** ✅ env-driven `connection_limit` + `pool_timeout` in `src/shared/persistence/prisma.service.ts` — Sprint F-6.6 (D-143).
- **FK indexes:** ✅ 16 FK indexes + ratchet guardrail shipped via migration `20260515_d110_fk_indexes` — Sprint F-6.1 (D-110).
- **MV bundle:** ❌ read-model layer not consumed by app code (T-13 in Cat-2; not needed at bank-IT 200-2,000 person scale). MVs themselves exist in the `read_models` schema (DM-8-8 migration).
- **Cache headers:** ❌ tenant-shared metadata serves `no-store` (T-13 D-148 in Cat-2).
- **Hot-path queries:** ✅ top-3 unbounded findMany caps, PvA per-id loop → batch, workforce-planner via PlatformSettingsService — Sprint F-6.2/6.3/6.4 (D-144/145/146).

### 2.9 Locale + currency + fiscal

- **Tenant timezone, weekStartDay, currency, fiscalYearStart:** ✅ consumed — tenant-tz/week-aware `getWeekStart` (`src/shared/temporal/week-of.ts`, D-161), `Intl` + `date-fns-tz` formatters (`frontend/src/lib/locale.ts`, D-165), FiscalCalendar entities flag-gated (D-160b). Sprint F-7.
- **FxRate model:** ✅ exists, service flag-gated — Sprint F-7 (D-164).
- **PublicHoliday:** ✅ multi-region via tenant setting; `'AU'` is only the final fallback (`public-holiday.service.ts`) — Sprint F-7 (D-163).

### 2.10 GDPR + compliance

- **Right-to-erasure:** ✅ redact-payload v1 shipped (`redact-person-admin.controller.ts`, `setup/domain/redact.ts`) — Sprint F-5 (D-167). Cryptographic forgetting (per-row encryption + key-shred) remains Cat-3 (D-167 v2).
- **Soft-delete model:** dual `archivedAt` + `deletedAt`; default `archivedAt` as live column (D-96 in Cat-1.8).

### 2.11 Observability

- **prom-client + `/metrics`:** HD-11 closed. Counters/gauges for outbox + assignment SLA + nudge sweep.
- **Health probes:** `/api/health`, `/api/readiness`, `/api/health/deep` (12-aggregate probe).
- **OpenTelemetry / structured logging:** structured JSON logging + correlation ids; OTel exporters not yet wired.

### 2.12 Local-LLM scaffolding

- ✅ Generic OpenAI-compatible client wrapper shipped at `src/shared/llm/` (`llm-client.ts`, `openai-compatible-client.ts`, `llm.module.ts`) — Sprint F-4 (NEW C1-LLM-SCAFFOLD). No AI features built on top of it yet.

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

## 5. Highest-value remaining gaps (post SoT PR 17b, 2026-06-10)

**V2 lean-migration residuals (top of stack, per SoT v2-source-of-truth-2026-06-09):**

1. **SoT PR 19 — soak monitor** — instrument a 7-day green parity soak on staging for the dropped legacy tables + the new `ProjectPosition`-only read/write paths; emits `lean-migration-soak` Grafana panel + Slack alert on >0 errors from the dropped-aggregate audit. Effort: 1–2d. Critical-path gate to PR 20.
2. **SoT PR 20 — `dsRefresh` C0 flip** — flip the `dsRefresh` feature flag default from OFF to ON in prod once PR 19 completes a full green soak. This is the LAST step per `feedback-v2-build-fully-before-cutover.md`. Effort: 0.5d (config + rollback playbook only).

**Known infra debt (5 pre-existing missing-package flakes — non-blocking for V2 cutover):**

The frontend test infrastructure has 5 long-standing missing-package errors that surface as "module not found" but are gated behind dynamic imports and do not break runtime: `html2canvas`, `jspdf`, `pptxgenjs` (PDF/PPTX export in `ProjectRadiator`), `react-markdown` (Help Center article body — installed in `package.json` but not resolvable in the local test runner under certain Docker rebuild states), and `@ladle/react` (Ladle story runner — optional dev tool). These do not affect production builds, do not affect any persona's critical JTBDs, and are tracked separately from V2 lean-migration scope.

**Cat-1 / Cat-2 / Cat-3 long-tail (orthogonal to V2 cutover; see `MASTER_TRACKER.md` + Appendix A of `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`):**

1. **20c-09 / 20c-10 / 20c-11 — DTO + type-safety hygiene** — 25+ inline `@Body()` without DTOs; `any`/`as unknown as` cleanup. Cat-1 hygiene. Effort: 5–7d.
2. **DM-2.5-8..12 — publicId top-down rollout** — controller-uuid-leak baseline 55 → 0. CLAUDE.md memory rule + security boundary. Effort: 8–12d.
3. **D-167 v2 — cryptographic forgetting** — moves redact-payload v1 to per-row encryption + key-shred. Required for high-bar EU/UK banks. Cat-3. Effort: 10–14d.
4. **Outbox consumer audit (post-F-6.5)** — verify `flag.outboxEnabled` flip actually moved fan-out off the request thread on staging. Effort: 2–3d.
5. **20c-15 — split god dashboard pages (PM/Director/HR)** — internal velocity. Cat-3. Effort: 4–6d.
6. **DM-5-2 / DM-5-5 — temporal-column rename + uniform createdBy/updatedBy** — schema hygiene. Cat-2. Effort: 3–4d.

The plan-mandated Cat-1 stack (Locale-agnostic, SSO/OIDC, FxRate, FiscalCalendar, RBAC, redact-payload v1, FK indexes, hot-path queries, outbox producers, approval-flow + admin gap completion) is **shipped**.
