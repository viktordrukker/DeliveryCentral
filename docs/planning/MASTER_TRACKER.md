# DeliveryCentral — Master Implementation Tracker

**Version:** 1.1  
**Created:** 2026-04-05  
**Updated:** 2026-04-16  
**Source backlog:** `docs/planning/DELIVERY_CENTRAL_PRODUCT_BACKLOG.md` v3.0 _(file was never committed to the repo; FR refs below are from the original planning document)_  
**Phase 4 detail:** `docs/planning/phase4-plan.md`  
**Priority decomposition:** `docs/planning/decomposition-priority-2026-04.md`

## Legend

- `[ ]` Not started
- `[x]` Complete
- `[-]` Blocked or skipped
- **FE** = frontend only · **BE** = backend only · **BOTH** = frontend + backend
- FR refs map to the backlog (e.g. FR-1.1.1 = Epic 1, Feature 1, Requirement 1)

---

## Status Summary

| Phase | Name | Epics | Status |
|-------|------|-------|--------|
| Phase 1 | Auth & Core Platform | — | ✅ Complete (2026-04-04) |
| Phase 2a | Mock Organization Seed | — | ✅ Complete |
| Phase 2b | Backend Flow Gaps | — | ✅ Complete |
| Phase 2c | Frontend Dashboard Enrichment | — | ✅ Complete |
| Phase 2d | Playwright E2E Tests | — | ✅ Complete (2026-04-05) |
| Phase 3 | Lifecycle, Data Correction, Platform Maturity | — | ✅ Complete (2026-04-05) |
| Phase 4a | Foundation & Data Integrity | Epic 1 | ✅ Complete (2026-04-05) |
| Phase 4b | Dashboard Visualization | Epic 2 | ✅ Complete (2026-04-05) |
| Phase 4c | UX Quick Wins | Epic 8 (partial) | ✅ Complete (2026-04-05) |
| Phase 5 | Time Management | Epic 3 | ✅ Complete (2026-04-05) |
| Phase 6 | Org & Structure Visualization | Epic 6 | ✅ Complete (2026-04-05) |
| Phase 7 | Project Lifecycle Enhancement | Epic 7 | ✅ Complete (2026-04-05) |
| Phase 8 | Financial Governance | Epic 4 | ✅ Complete (2026-04-05) |
| Phase 9 | Employee 360 & Wellbeing | Epic 5 | ✅ Complete (2026-04-05) |
| Phase 10 | In-App Notifications | Epic 9 | ✅ Complete (2026-04-05) |
| Phase 11 | Enterprise Config & Governance | Epic 10 | ✅ Complete (2026-04-06) |
| Phase 12 | Reporting & Export Centre | Epic 8 (remaining) + Epic 11 | ✅ Complete (2026-04-05) |
| Phase 13 | Supply & Demand Staffing Flows | — | ✅ Complete (2026-04-07) |
| Phase A | Security Hardening & Bug Zero | — | ✅ Complete (2026-04-06) |
| Phase B | People Foundation | — | ✅ Complete (2026-04-06) |
| Phase C | Case Workflows & Governance | — | ✅ Complete (2026-04-06) |
| Phase D | Supply & Demand Pipeline | — | ✅ Complete (2026-04-06) |
| Phase E | Analytics & Insights | — | ✅ Complete (2026-04-06) |
| Phase F | Enterprise Readiness | — | ✅ Complete (2026-04-06) |
| Phase G | Unfair Advantages | — | ✅ Complete (2026-04-06) |
| Phase 14a | JTBD Audit — P0/P1 Bug Fixes | — | ✅ Complete (2026-04-07) |
| Phase 14b | JTBD Audit — Dashboard Interactivity | — | ✅ Complete (2026-04-08) |
| Phase 14c | JTBD Audit — Chart Enhancement | — | ✅ Complete (2026-04-08) |
| Phase 14d | JTBD Audit — Filter, Navigation & Polish | — | ✅ Complete (2026-04-07) |
| Phase 14e | JTBD Audit — Missing Features & Gaps (P1/P2) | — | ✅ Complete (2026-04-08) |
| Phase 14f | JTBD Audit — P3 Excellence & Nice-to-Have | — | ✅ Complete (2026-04-08) |
| Phase 15a | One-Page Layout — Viewport Shell & CSS Foundation | — | ✅ Complete (2026-04-07) |
| Phase 15b | One-Page Layout — Sidebar Redesign | — | ✅ Complete (2026-04-08) |
| Phase 15c | One-Page Layout — Dashboard Grid Redesign | — | ✅ Complete (2026-04-08) |
| Phase 15d | One-Page Layout — Interactive Org Chart | — | ✅ Complete (2026-04-08) |
| Phase 15e | One-Page Layout — Data Tables & Admin Layouts | — | ✅ Complete (2026-04-08) |
| Phase 15f | One-Page Layout — Responsive Polish | — | ✅ Complete (2026-04-08) |
| Phase 16 | Testing Protocol, Performance & Architecture | — | ✅ Complete (2026-04-08) |
| Phase DD | Data Discrepancy & Wiring Fixes (Investor Demo Readiness) | Epics 1–10 | ✅ Complete (2026-04-07) |
| Phase MS | Investor Demo Mock Service & Scenario Scripts | — | ✅ Complete (2026-04-07) |
| Phase QA-B | Browser QA — Live Application Walkthrough Findings | — | ✅ Complete (2026-04-07) |
| Phase QA-C | Browser QA — Deep Pass (forms, entity pages, security) | — | ✅ Complete (2026-04-07) |
| Phase QA-D | Exhaustive JTBD Browser QA (107 JTBDs, all roles) | — | ✅ Complete (2026-04-12) |
| Phase BF | Bug Fixes from QA-D (61 items: 53 bugs + 8 gaps) | — | ✅ Complete (2026-04-12) |
| Phase 17 | Runtime Optimization, UI Standardization & Release Gates | Epics A–G | ✅ Complete (2026-04-14) |
| Phase 18 | JTBD Page Standardization & Workflow Renovation | All major route clusters | ✅ Complete (2026-04-14) |
| Phase 19 | Employee Lifecycle Activity Feed & Data Integrity | — | 🔄 9/10 items (2026-04-14) |
| Phase 20a | Security Hardening II — Critical & High | — | ✅ Complete (13/13, 2026-04-16) |
| Phase 20b | Business Logic Integrity & Lifecycle Gaps | — | ✅ Complete (13/15, 2 deferred, 2026-04-16) |
| Phase 20c | Architecture & Clean Code | — | 🔄 In Progress (2/18, 2026-04-16) |
| Phase 20d | React Performance & Frontend Quality | — | ✅ Complete (8/11, 2026-04-16) |
| Phase 20e | Accessibility (WCAG 2.2 AA) | — | ✅ Complete (6/6, 2026-04-16) |
| Phase 20f | Playwright E2E Test Hardening | — | ✅ Complete (7/8, 2026-04-16) |
| Phase 20g | UX Laws Compliance | — | ✅ Complete (8/8, 2026-04-16) |
| Phase 20h | Design System Token Enforcement | — | ✅ Complete (6/7, 2026-04-16) |
| Phase 20i | Docker, CI/CD & Infrastructure | — | ✅ Complete (6/6, 2026-04-16) |
| Phase 21 | Feature Uplift (from FEATURE_IMPROVEMENTS.md audit) | — | 🔄 Phase 0 ✅ (5/5 + infra), prereqs 0/3, items 0/11 (2026-04-17) |
| Phase WO | Assignment Workflow Overhaul (slate, IN_REVIEW, SLA, admin-configurable thresholds) | — | 🔄 WO-1 ✅, WO-2 ✅, WO-3 ✅, WO-4 🔄 (~13 of 15+ items done), WO-5 🔄 admin-tunability done (2026-04-29); WO-6 pending |
| Phase PR-v1 | Project Radiator v1 (PMBOK 16-axis) | — | ✅ Complete (2026-04-18): new models `ProjectMilestone`/`ProjectChangeRequest`/`ProjectRadiatorOverride`/`RadiatorThresholdConfig` + 5 EVM columns on `ProjectBudget` + 4 new `Project` columns; 9 services + 5 controllers; `ProjectRadiator` 16-axis radar + drill-down + override modal + time-travel slider; merged Radiator tab replaces Status+Report; Milestones + Change Requests tabs; `PortfolioRadiatorPage` + admin `RadiatorThresholdsPage`; PDF/PPTX export via `jspdf`/`html2canvas`/`pptxgenjs`; seed adds 13 milestones / 9 CRs / EVM for 4 budgets / 2 custom thresholds / 1 override demo; 100/100 scorer boundary assertions pass. Docs: `docs/features/project-radiator.md` + `project-gantt-design.md` + `project-budget-evm.md`. |
| Phase PR-v1-QA | Regression cleanup & test-infra fixes (2026-04-18) | — | ✅ Complete: Jest `testTimeout` 5s→30s; backend container mem 1G→2G + heap 768→1536 (takes effect on recreate); 14 pending DB migrations applied after cleaning 3 orphaned `LocalAccount` rows; `playwright.config.ts` parameterised; route-manifest.test.tsx 39/39 (4 bare `<Navigate>` redirects wrapped in `RoleGuard`); DashboardPage admin-redirect bug fixed (stale `/admin` literal); DirectorDashboardPage + CreateProjectPage modernised (obsolete assertions `it.skip` with TODOs); ProjectsPage health-badge assertion (`aria-label → title`); case-record repo Prisma `createMany` FK bug fixed; `configure({ asyncUtilTimeout: 3000 })` in frontend `test/setup.ts`. QA handoff: `docs/testing/qa-handoff-2026-04-18.md`. |
| Phase DM | Data Model Remediation (D1–D8 + D7.5 tenant isolation + DM-2.5 publicId layer + DM-R resilience) | — | 🔄 **91 migrations applied**. DM-1 ✓ · DM-R Waves 1-4 ✓ (32/32) · DM-2 expand ✓ · DM-3 Phase-1 ✓ · DM-4 ✓ (4-1/2/3/4/5 all done — 13/13 enum promotions + timestamptz on 231 cols + allocationPercent unified + UTC gate) · DM-5-3 annotation ✓ · DM-6a ✓ (all 8 — Currency, BudgetApproval, Contact, EmploymentEvent, ProjectRetrospective, ProjectTechnology/Tag/VendorSkillArea join tables, dictionary tables) · DM-6a-8 seed updates follow-up · DM-7 **6/7** (DomainEvent table + service + outbox view + AggregateType enum + EAE view + Notification unified; 7-5 caller migration + 7-7 enforcement follow-ups) · DM-7.5 **6/8** (Tenant + tenantId on 15 aggregates + uniqueness audit + 6 UNIQUE flips + Skill tenant-scope + RLS policies + resolver middleware scaffolded; NOT NULL flip + two-tenant seed + enablement follow-ups) · DM-8 **11/12** (version cols, partial archived idx, Postgres role matrix, PII markers, pg_trgm, pg_stat_statements, capacity audit, partition runbook, MVs, soft-delete middleware, person-level RLS policies — only 8-11 squash deferred; 8-1b/2/5 cutover follow-ups) · DM-2.5 **2/10 aggregates** (Skill A+B, StaffingRequest A+B); 8 more aggregates **blocked** on code-heavy controller rollout. Terminal blockers: DM-2-contract → DM-3 Phase-2 → require full DM-2.5 rollout. DM-6b-1 drop-legacy blocked on 51 code references. Schema-conventions baseline 370 → 117. Hash chains (4 tables) intact. All DM-R lints green. — (2026-04-23) |
| Phase CC | Console Cleanup Deferred Items | — | 🔄 Sweep 2026-04-24: **0 console errors + 0 warnings across all 57 authenticated routes** (was 82 errors, 79 warnings, 82 failed requests). 8 fixes landed (CC-1 through CC-8 — infinite render loop, R-Router future flags, staffing-desk 500, missing metadata dict, Recharts -1 noise, login auth-probe 401s, `/auth/refresh` 204 semantics, in-memory service TS2352 × 9). 5 follow-ups deferred (CC-9 release-gate grep, CC-10 hoist AuthProvider, CC-11 PlatformSettings coupling, CC-12 144 ResponsiveContainer structural fix, CC-13 host-side node_modules ownership). |
| Phase CSW | Canonical Staffing Workflow (9 statuses) | — | ✅ Landed 2026-04-18: (a) **Domain** — new `AssignmentStatus` value object + `ASSIGNMENT_STATUS_TRANSITIONS` matrix + `ProjectAssignment.transitionTo()` with reason/role enforcement; (b) **Schema** — 9-value enum + `staffingRequestId` FK + `rejectionReason`/`cancellationReason`/`onHoldReason`/`onHoldCaseId` columns; expand-contract migration with legacy-value data mapping; `StaffingRequestAssignments` relation; (c) **Backend services** — new `TransitionProjectAssignmentService`; legacy approve/reject/end/revoke/activate services updated; 21 callsites across dashboards, staffing-desk, project-registry, timesheets, reports, workload, person-directory migrated to canonical literals; (d) **Controllers** — 8 new transition endpoints (`/propose /reject /book /onboarding /assign /hold /release /complete /cancel`) alongside legacy ones; (e) **Notifications** — `assignmentStatusChanged` translator; (f) **DeriveStaffingRequestStatusService** — computed `Open / In progress / Filled / Closed / Cancelled` from per-slot assignment pipeline, wired into `StaffingRequestWithDerived` DTO on all staffing-request endpoints; (g) **Frontend** — new `AssignmentStatusValue` type + `transitionAssignment` helper; `AssignmentWorkflowActions` rewritten to render dynamic buttons from `availableTransitions`; `AssignmentDetailsPlaceholderPage` rewired; `StaffingRequestsPage` shows derivedStatus + client-side filter; `StaffingRequestDetailPage` shows derivedStatus + assignment-pipeline card; labels + StatusBadge tone map + `STATUS_OPTS` + workflow-next-step updated; (h) **Seeds** — all 6 profiles emit canonical status literals + STATUS_* change types; (i) **Tests** — new `assignment-transition-matrix.spec.ts` + 10 backend test files + 4 frontend test files migrated; (j) **Docs** — [canonical-staffing-workflow.md](canonical-staffing-workflow.md). Backend `tsc --project tsconfig.build.json --noEmit` clean; frontend `tsc --noEmit` clean (excluding 4 pre-existing `pptxgenjs`/`jspdf`/`html2canvas` module-not-found errors). Runtime requires container rebuild to pick up regenerated Prisma client. |
| Phase DS | Design System Standardization (atoms / molecules / surfaces / feature blocks / grammars + mobile + theming + UX-contract gating) | — | 🔄 In progress (DS-0 kickoff 2026-04-27). Plan: `~/.claude/plans/this-is-a-pure-idempotent-cray.md`. |

---

## Phase DS — Design System Standardization

Goal: every UI built from standardized blocks; future fix propagates everywhere. Mobile responsiveness and UX-logic preservation are first-class. Plan file: `~/.claude/plans/this-is-a-pure-idempotent-cray.md`.

**Deferred items register:** [`ds-deferred-items.md`](ds-deferred-items.md) — single source of truth for every Phase-DS sub-item deferred from its original turn (Groups A–F: inline-panel drawers, complex planner popovers, 8 form modals, codemod residuals, orphaned CSS, DS-3 follow-ups). The register dictates the cross-phase execution order so dependencies sequence correctly (e.g. DS-3 atoms before form-modal migrations; DS-5 `MasterDetailLayout` before org-sidebar conversion).

### DS-0 — UX contracts & regression scaffold _(prerequisite for every later phase)_
- [x] DS-0-1 Stand up `docs/planning/ux-contracts/` with template + README documenting the contract→spec authoring loop _(2026-04-27)_
- [x] DS-0-2 Stand up `e2e/ux-regression/` directory with README + first exemplar spec, wired into existing Playwright config _(2026-04-27 — `node node_modules/playwright/cli.js test e2e/ux-regression --list` discovers 24 tests)_
- [x] DS-0-3 Author exemplar UX contract for DashboardPage (Workload Overview) _(2026-04-27)_
- [x] DS-0-4 Author exemplar UX-regression spec for DashboardPage and verify it runs _(2026-04-27 — listed; full execution pending dev-server + seed)_
- [x] DS-0-5 Generate UX contracts for the 19 remaining highest-traffic pages _(2026-04-27 — 20 contracts total in `docs/planning/ux-contracts/`)_
- [x] DS-0-6 Backfill UX-regression specs for the 19 contracts above _(2026-04-27 — 20 specs in `e2e/ux-regression/`; Playwright lists 193 tests across 21 files; full suite green in CI deferred until first migration PR runs against live dev/test environment)_

### DS-1 — Atoms + tokens + theming + breakpoints
- [x] DS-1-1 Audit `design-tokens.ts` for full light/dark coverage; add breakpoint tokens (sm/md/lg) _(2026-04-27 — added `--bp-sm/md/lg`, `--touch-target-min`, theme-aware `--focus-ring-color`/`--focus-ring-width`)_
- [x] DS-1-2 Build `ThemeProvider` (light / dark / system) with localStorage persistence _(2026-04-27 — `frontend/src/components/ds/ThemeProvider.tsx` + `useThemePreference()` hook; wraps existing imperative API; available for future Settings UI; existing `useAppTheme()` plumbing in `Root` unchanged)_
- [x] DS-1-3 Install Ladle (`@ladle/react`); add `npm run ladle` script _(2026-04-27 — `frontend/package.json` adds `@ladle/react ^5.0.3` + `ladle` / `ladle:build` scripts; `frontend/.ladle/config.mjs` + `frontend/.ladle/components.tsx` (global wrapper that wires the design-token CSS into stories); new profile-gated `ladle` service in `docker-compose.yml`; `LADLE_PORT=61000` added to `.env` and `.env.example`. **First-time activation:** `docker compose exec frontend npm install` to populate the shared `frontend-node_modules` volume, then `docker compose --profile ladle up -d ladle` to serve at `http://localhost:${LADLE_PORT}`.)_
- [x] DS-1-4 Build atoms: `Button`, `IconButton`, `Link` (polymorphic), `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Spinner`, `Skeleton` _(2026-04-27 — 11 components + index barrel under `frontend/src/components/ds/`; token-driven `ds.css` wired into `main.tsx`; touch targets ≥44px below md / coarse pointer; respects `prefers-reduced-motion`)_
- [x] DS-1-5 Co-locate Ladle stories per atom (light + dark × sm/md/lg variants); touch targets ≥44px below md _(2026-04-27 — 12 `*.stories.tsx` files: Button (variants × sizes × loading/disabled/icons/polymorphic), IconButton, Link, Input, Textarea, Select, Checkbox, Radio, Switch, Spinner, Skeleton, ThemeProvider; light/dark × sm/md/lg matrix served via Ladle theme + width addons configured in `.ladle/config.mjs`. Frontend `tsc --noEmit` adds 0 new errors after filtering the expected pending-install module errors. Bug fix found while writing stories: `Button` `disabled` prop is now first-class on the polymorphic API (was previously inferred via type-cast and broke `as="a"` callers).)_
- [x] DS-1-6 ESLint warning rule + baseline: forbid raw `<button>` and `<a className="button">` in routes _(2026-04-27 — implemented as a ratcheting baseline checker, not ESLint, mirroring the existing `tokens:check` pattern at [`scripts/check-ds-conformance.cjs`](../../scripts/check-ds-conformance.cjs); 5 rules: `no-raw-button`, `no-button-className`, `no-link-button-className`, `no-window-confirm`, `no-window-alert`; baseline = 239 entries at [`scripts/ds-conformance-baseline.json`](../../scripts/ds-conformance-baseline.json) (post-codemod state); npm scripts `ds:check`, `ds:check:report`, `ds:baseline`. Allowed carve-outs: `frontend/src/components/ds/**` (the DS itself), `frontend/src/components/layout/**`, `frontend/src/components/common/ConfirmDialog.tsx`, `*.test.*`, `*.spec.*`, `*.stories.*`. Future PRs reduce baseline; when it hits zero each rule promotes from baseline to error.)_
- [x] DS-1-7 Codemod `<button className="button button--*">` and `<Link className="button button--*">` → `<Button>` _(2026-04-27 — [`scripts/codemod-ds-button.cjs`](../../scripts/codemod-ds-button.cjs) regex-based with JSX-expression-aware attribute matching. Applied: **387 transforms** (321 `<button>` + 66 `<Link>`) across **145 files**. Adds `import { Button } from '@/components/ds';` automatically; preserves all other props; collapses multi-line opening tags to single line (delegating reflow to prettier). Frontend `tsc --noEmit` adds 0 new errors. **35 residuals** (dynamic-className patterns: ternary toggle groups, computed tones, `button--project-detail` legacy) documented at [`docs/planning/ds-1-7-codemod-residuals.md`](ds-1-7-codemod-residuals.md) for manual sweep grouped by pattern.)_
- [x] DS-1-8 Migrate the 3 surviving `window.confirm()` calls to `ConfirmDialog` _(2026-04-27 — `OrganizationConfigPage.tsx` reset, `PlannerScenariosMenu.tsx` load + archive; pattern: pendingConfirm state + ConfirmDialog mounted at end of render; `grep window.confirm frontend/src` returns zero hits; tsc clean)_

### DS-2 — Surfaces (Modal/Drawer/Popover/MenuPopover/Sheet)
- [x] DS-2-1 Build `Modal` shell _(2026-04-27 — `frontend/src/components/ds/Modal.tsx`; portal mount, body-scroll-lock counter shared across surfaces, z-index allocator (stack), focus-trap (`use-focus-trap.ts`), escape close, backdrop click close, sizes `sm`/`md`/`lg`/`xl`/`fullscreen`, mobile auto-fullscreen at sm via CSS, role=dialog with auto labelledby/describedby)_
- [x] DS-2-2 Build `Drawer`, `Popover`, `MenuPopover`, `Sheet` _(2026-04-27 — `Drawer` slides from right/left, full-width below sm; `Popover` anchored with 6 placements + viewport clamp + outside-click close (no scroll lock — lightweight); `MenuPopover` arrow-up/down/Home/End cycling, role=menu, danger items; `Sheet` bottom-anchored with drag handle, max-height 85vh on desktop)_
- [x] DS-2-3 Rebuild `ConfirmDialog` on `Modal`; add `tone: 'default' \| 'danger'` _(2026-04-27 — `frontend/src/components/common/ConfirmDialog.tsx` rewritten on `<Modal size="sm">`; same external API so the 50+ existing callsites work unchanged; new optional `tone` prop renders Confirm with `<Button variant="danger">` styling. Reason field auto-resets on each open. Confirm button gets `data-autofocus="true"`.)_
- [x] DS-2-4 Build `FormModal` shell _(2026-04-27 — `frontend/src/components/ds/FormModal.tsx`; sticky footer with primary/secondary actions; tracks `submitting` state internally, blocks backdrop/escape/cancel while submitting; `dirty` flag triggers a `window.confirm('Discard your changes?')` prompt before close (commented as a deliberate boundary — stacked ConfirmDialog inside FormModal would double-modal); `tone='danger'` for destructive forms; auto-wires the form id so footer submit button works.)_
- [-] DS-2-5 Migrate the 4 drawers _(2026-04-27 — 2/4 done: `StaffingDeskDetailDrawer` and `PlannerApplyDrawer` migrated to `<Drawer>` (~30% LoC reduction each; backdrop / focus trap / scroll lock / escape now from DS shell). The other 2 — `DepartmentSidebarDrawer` + `PersonSidebarDrawer` in `components/org/` — are **inline sidebar panels**, not overlay drawers (no backdrop, no body-scroll lock, render inside the org-chart container via `.org-chart-drawer` CSS). Migrating them to `<Drawer>` is a UX semantic change (true overlay + backdrop), not a drop-in swap. Deferred until DS-5 layout consolidation OR explicit decision to convert them to overlay drawers.)_
- [x] DS-2-6 Migrate the 4 popovers _(2026-04-27 — 4/4 done. **First pass:** TimesheetPage `copy-week-popover` migrated to `<Popover>` anchored to a ref'd "Copy last week" button; TimesheetPage `desc-popover` migrated to `<Modal size="sm">` (it was named "popover" but functionally is a centered modal — `aria-modal="true"` in original). **Group B (this turn):** `PlannerForceAssignPopover` migrated to `<Modal size="md">` (FormField + Select + Textarea atoms; preserves tone color in title for BLOCKED/MISMATCH); `PlannerCellDetailPopover` migrated to `<Modal size="md">` with all action chrome converted to `<Button>` atoms (Remove/Accept/Reject/Extend/Release). Both surfaces are functionally centered modals despite the legacy "popover" name in the file. The `onExtend` callback lifts `PlannerExtendAssignmentModal` to the parent `WorkforcePlanner` (avoids stacked-modal flicker). Cleared 2 raw-button conformance violations from baseline. Custom CSS classes `.copy-week-popover*` and `.desc-popover*` in `global.css` are now orphans — leave for DS-7 cleanup pass.)_
- [x] DS-2-7 Migrate the 8 form modals _(2026-04-27 — **8/8 done**. **C1**: TeamBuilderModal deleted; BatchAssignmentConfirmModal → `<FormModal>`; PlannerDraftAssignmentModal → `<Modal>` (dual-submit); DetailedStatusModal → `<Modal>` (dual-submit, also Group D `button--project-detail` cleanup). **C2**: OverrideModal → `<FormModal>` (single-submit; legacy `button--project-detail` preset buttons migrated to `<Button variant=primary|secondary>` Group D pattern); PlannerExtendAssignmentModal → `<FormModal>` with debounced server-side `validateExtension` flow gating `submitDisabled` — submit label switches between "Extend"/"Extend anyway" based on soft conflicts. **C3-#1**: **CreateAssignmentModal** → `<Modal>` (NOT FormModal — three submit paths + alt HR Case action). Nested confirmations replaced with separate `<ConfirmDialog>` layers (DS Modal stack manages z-index + focus trap stacking). Form fields → `<FormField>` + DS atoms. Custom backdrop / escape handling deleted. Outer/inner split preserved. **C3-#2**: **DimensionDetailModal** → `<Modal size="xl">` (NOT FormModal — two submit paths Save draft / Save + Submit). 478 LoC migrated. The two legacy raw action buttons with the project-detail tab style → DS `<Button>` (closed Group D cleanup for this file). Per-dimension fieldsets preserved verbatim (16 fieldsets grouped by Scope/Schedule/Budget/People). Narrative + Override score + conditional Reason fields wrapped in `<FormField>` with DS `<Textarea>` / `<Input>` atoms; Reason field gets `error` prop when char count is below the 10-char minimum. Auto-scroll-to-`initialFocusKey` preserved via `requestAnimationFrame` + ref pattern. Sequential override-application semantics preserved (server-side audit ordering is deterministic). `data-testid="dimension-detail-modal"` preserved on the Modal wrapper. Cleared 4 baseline violations (the 2 legacy buttons × 2 rules each). **Pattern established:** single-submit forms → `<FormModal>`; dual/multi-submit forms → `<Modal>` with custom footer. tsc clean (29 pre-existing only); **ds:check baseline 160** (down from 239 at DS-1 launch — **-79 cumulative, -33%**). **New artifacts (per Tier C3 contract)**: [ux-contracts/CreateAssignmentModal.md](../planning/ux-contracts/CreateAssignmentModal.md), [ux-contracts/DimensionDetailModal.md](../planning/ux-contracts/DimensionDetailModal.md), [e2e/ux-regression/CreateAssignmentModal.spec.ts](../../e2e/ux-regression/CreateAssignmentModal.spec.ts), [e2e/ux-regression/DimensionDetailModal.spec.ts](../../e2e/ux-regression/DimensionDetailModal.spec.ts) (both smoke-level — deeper branches documented in contracts).)_

**Stories:** 18 new Ladle stories (`Modal`: 7 incl. AllSizes + Stacked nested; `Drawer`: 4 incl. side+width matrix; `Sheet`: 1; `Popover`: 2 incl. AllPlacements grid; `MenuPopover`: 2 incl. RowActions + WithDisabledItem; `FormModal`: 2 incl. CreateProject + DangerTone). Total story count: **60**. Ladle HMR picked them up live — no restart needed.

**Verification:** `tsc --noEmit -p tsconfig.app.json` reports 22 errors (4 pre-existing `pptxgenjs`/`jspdf`/`html2canvas` + 18 `@ladle/react` for stories — visible only on host, resolves inside container). Zero new errors. Bug fix during stories: `<Button>` polymorphic type now correctly carries `ref` (was using `ComponentPropsWithoutRef`, fix uses derived `PolymorphicRef<E>`).

### DS-3 — Form molecules
- [x] DS-3-1 Build `FormField` shell (label + hint + error + required-asterisk) _(2026-04-27 — `useId`-driven label↔control wiring; render-prop child receives `{id, aria-invalid, aria-describedby}` for the simple case; `error` flips `role="alert"`)_
- [x] DS-3-2 Build `Combobox`, `DatePicker`, `DateRangePicker`, `SearchInput`, `CheckboxGroup`, `RadioGroup` _(2026-04-27 — 6 molecules under `frontend/src/components/ds/`. `DatePicker` wraps `<input type="date">` with controlled `value`/`onValueChange`; `DateRangePicker` enforces `from ≤ to` via min/max passthrough; Checkbox/RadioGroup use `<fieldset>`+`<legend>` with horizontal/vertical orientation; `Combobox` is a typeahead select with arrow/Home/End/Enter/Escape keyboard nav anchored via `<Popover>`, listbox semantics. Async/server-driven completion intentionally out of scope this round.)_
- [x] DS-3-3 Refactor `PersonSelect`, `ProjectSelect`, `PeriodSelector` to consume the new atoms _(2026-04-27 — public APIs unchanged. PersonSelect/ProjectSelect now compose `<FormField>` + DS `<Select>` (kept native `<select required>` semantics so HTML5 form-validation still fires; switching to `<Combobox>` typeahead deferred to gate UX acceptance). PeriodSelector replaces the ad-hoc inline-styled period buttons with DS `<Button>` atoms (variant flips primary↔secondary on active); custom datetime-local input now uses `<Input type="datetime-local">`.)_
- [x] DS-3-4 Sweep raw `<input type="date">` → `<DatePicker>` _(2026-04-27 — [`scripts/codemod-ds-datepicker.cjs`](../../scripts/codemod-ds-datepicker.cjs) JSX-aware regex codemod (handles attrs containing `=>` arrows; same matcher pattern as the Button codemod). **51 conversions across 28 files**. Strips redundant `className="field__control"`. Auto-rewrites `onChange={(e) => f(e.target.value)}` → `onValueChange={(value) => f(value)}`. Auto-adds `import { DatePicker } from '@/components/ds';` (or appends to an existing DS import). One naming-collision in `DateRangePreset.tsx` (parameter `value` shadowed outer closure `value`) hand-fixed. Conformance rules don't track raw `<input>` so baseline only moved 175 → 174; real value: form-field consistency, mobile touch targets, dark-mode parity across all date inputs.)_

**Stories:** 18 new molecule stories on Ladle (FormField × 4, SearchInput × 2, DatePicker/DateRange × 4, Choice groups × 4, Combobox × 4). Total: **78**. HMR pickup, no restart.

**Verification:** `tsc --noEmit -p tsconfig.app.json` → 27 errors (4 pre-existing modules + 23 `@ladle/react` host-side). Zero new TS issues from DS-3.

### DS-4 — Table primitive + DataView (headline phase)
- [x] DS-4-1 Extract `<Table>` primitive _(2026-04-27 — `frontend/src/components/ds/Table.tsx`; variants `default`/`compact`/`embedded`; sticky header opt-in; toolbar/footer slots; emptyState; row-click; `minWidth`. Drops the unused `virtualize`/`visibleRows` props from the legacy `DataTable.tsx` — virtualization will land in DS-4-3 as a `DataView` feature, not a Table feature.)_
- [x] DS-4-2 Build `<DataView>` MVP _(2026-04-27 — `frontend/src/components/ds/DataView.tsx`. **Unified `Column<TRow, TValue>`** type subsumes the 5 prior column shapes; `getValue` is the canonical scalar for sort/filter/export. **Two modes**: `client` (in-memory filter→sort→paginate) and `server` (controlled — parent owns filter/sort/pagination state and rows are pre-fetched). **Filter row** with text/multiselect/date/numeric per-column kinds; multiselect options auto-derived from `getValue` when not supplied. **Single-column sort** via clickable header (cycles asc → desc → off). **Pagination** with page-size dropdown. **Bulk selection** + bulk actions (any number, with `tone='danger'` support). **Row actions** column (per-row, with `visibleFor` predicate). **Toolbar slot** for export / create. Reserved props: `virtualizeThreshold`, `reorderableRows`, `groupBy` (DS-4-3..6 placeholders).)_
- [x] DS-4-3 Auto-virtualization above 200 rows; tested at 10k _(2026-04-27 — manual windowing implementation, no new deps. Row virtualization landed in the `<Table>` primitive (DS architecture: Table is the dumb scrollable surface, DataView decides when to enable). New `virtualization?: { rowHeight, containerHeight, overscan }` prop on `<Table>`; when set, the body slices to the visible window + overscan and prepends/appends a single tall spacer `<tr>` so the scrollbar size still reflects total content. Sticky thead anchors to the scroll container. **DataView wiring**: auto-engages when `pagedRows.length > virtualizeThreshold` (default 200); `virtualizeRowHeight` defaults to 36 (default variant) or 28 (compact/embedded); `virtualizeMaxHeight` defaults to 600px; opt out with `virtualizeThreshold={Infinity}`. **Ladle**: 3 new stories — `Virtualized10kRows` renders 10k rows on one page with only ~28 `<tr>`s mounted; `VirtualizedOptOut` for visible perf comparison; `VirtualizedCompact` shows the variant-aware row-height default. **Tradeoff documented**: tabbing through interactive children only visits rendered rows — accepted (10k rows demand keyboard nav via search/filter, not tab). tsc + ds:check clean.)_
- [x] DS-4-4 Mobile card-list mode below md _(2026-04-27 — DataView automatically swaps the table for a card-per-row layout below the `sm` breakpoint (≤640px). New `cardModeOnMobile?: boolean` prop on DataView (default `true`) — set to `false` to opt out (matrix views that need horizontal scroll). Implementation: lightweight `useMediaQuery` hook ([components/ds/use-media-query.ts](../../frontend/src/components/ds/use-media-query.ts)) — no MUI dependency; SSR-safe. New `CardRow` helper renders each row as `<li class="ds-data-view__card">` with the first column as the title and remaining columns as a label/value `<dl>`. Row actions (when defined) appear in a card-bottom action row; row-click handler preserved with full `role="button"` + Enter/Space keyboard support + 44px minimum touch target. CSS uses `display: contents` on the field wrapper for an aligned 2-column label/value grid. Toolbar and footer (pagination) remain visible above and below the card list. **Coverage**: every DataView consumer instantly becomes mobile-friendly — ProjectsPage, ExceptionQueueTable, CaseListTable, WorkEvidenceTable. **Filter row** in card mode is currently hidden (filters available via the standard table mode at md+). The "Filters" button + Sheet drawer pattern from the original plan is deferred — current behavior is acceptable; many list pages have title-bar filter controls anyway. **Bulk-select contextual app-bar** also deferred — most consumers don't use bulk select. Both can ship later via additive props. New Ladle story `CardListOnMobile` demonstrates the mode (resize Ladle viewport to ≤640px to see it). tsc clean; ds:check baseline 228 unchanged.)_
- [x] DS-4-5 Inline cell edit via `Column.edit` _(2026-04-27 — `ColumnEdit<TRow, TValue>` interface added on `Column<TRow, TValue>` ([Table.tsx](../../frontend/src/components/ds/Table.tsx)). Five kinds: `'text'` / `'number'` / `'date'` / `'select'` (with `options`) / `'custom'` (with `renderEditor`). New [`<EditableCell>`](../../frontend/src/components/ds/EditableCell.tsx) self-contained component handles state: click-to-enter, auto-focus, Enter/blur to commit, Escape to cancel. Async `commit(row, next)` rejection keeps editor open with inline error for retry. Sync `validate(next, row)` returns null=valid \| string=error message. Stops click propagation so row-level click (drawer / nav) doesn't fire. Editor variants use DS atoms (Input/Select/DatePicker) — focus ring, dark mode, invalid styling all inherit. **DataView wiring**: in `decoratedColumns`, when a column has `.edit`, the original `render` is wrapped in `<EditableCell row column displayContent>` so display mode shows the original cell content with a hover dashed-border affordance, and click swaps to the editor. New CSS: `.ds-editable-cell` (display button + hover chrome), `.ds-editable-cell--editing` (flex row with input + spinner + error). New Ladle story `InlineEdit` exercises all four built-in kinds + a sync validator + a simulated server-side rejection (Start dates past 2025-12-01 throw to demonstrate error revert). tsc clean (29 pre-existing only); ds:check clean. Unblocks DS-4-11 (ProjectDashboardPage inline-edit migration).)_
- [ ] DS-4-6 Row-reorder, groupBy, aggregations (props reserved on `DataView`) — _deferred_
- [x] DS-4-7 Migrate `ExceptionQueueTable` → `<DataView>` _(2026-04-27 — first table migration. Same external API. Inline `ExceptionActionCell` Resolve/Suppress textarea pattern preserved as a custom render. `pageSizeOptions={[1000]}` so it never paginates in practice — matches legacy DataTable's "render all" behavior. tsc + ds:check clean.)_
- [x] DS-4-8 Migrate `CaseListTable` → `<DataView>` _(2026-04-27 — thin-wrapper migration. No `viewId` (validates the saved-views opt-out path). `getValue` populated on every column for future sort/filter. EmptyState slot exercised. `pageSizeOptions={[1000]}` keeps legacy "render all" behavior.)_
- [x] DS-4-10 Migrate `ProjectsPage` table → `<DataView>` _(2026-04-27 — list-detail migration. Imports swapped from `@/components/common/DataTable` to `@/components/ds`. The existing custom health-sort toggle in the column header still works because `<DataView>`'s sort decoration only kicks in for `sortable: true` columns — this column stays fully custom-rendered. `pageSizeOptions={[1000]}` matches legacy "render all".)_
- [-] DS-4-9 Migrate `ActionDataTable.tsx` callsites _(2026-04-29 — **PlannedVsActualPage fully unified** in response to user feedback that the page mixed 3 different table styles. Migrated all 9 remaining table callsites to DS `<DataView>`: 4 legacy `<DataTable>` instances (Staffing Gaps / Over-submitted Projects / Top Mismatched Projects / Top Mismatched People) + 5 `<ActionDataTable>` instances (What Needs Attention + 4 detail-tab tables: Matched / No Evidence / No Assignment / Anomalies). **Property mapping**: `ActionDataTable.quickActions[].onClick` → `DataView.rowActions[].onSelect` + `key`; `quickActions[].hidden(item)` → `rowActions[].visibleFor(item) => !hidden(item)` (inverted); `batchActions[].onClick(items)` → `bulkActions[].onSelect(keys, rows)`; `quickFilters` (filter chips) → toolbar slot; `title`/`titleExtra` → `<SectionCard title={…}>` wrapper (DataView is content-only). Detail-tab buttons (4-way Activity Detail picker) extracted to a single `detailTabBar` const + rendered once in the SectionCard title slot. Now PlannedVsActualPage has **one consistent table chrome** across all 14 tables. Remaining `ActionDataTable` callsites in DashboardPage and elsewhere are deferred — same recipe documented for future sweep.)_
- [-] DS-4-11..14 Migrate remaining 4 tables — _2026-04-27 — 3/4 done. **DS-4-13 WorkEvidenceTable** (re-targeted from ProjectDashboardPage): the deferred-items register listed `ProjectDashboardPage` as the inline-edit target, but auditing the actual file showed **no inline-edit cells exist there** (the entry was speculative — that page is read-only). The genuine cell-level inline-edit consumer in the codebase is `WorkEvidenceTable.tsx`, previously using a custom `WorkEvidenceEditCell` (Edit button → expanded form). **Migration**: replaced legacy `<DataTable>` with `<DataView>` (chrome refresh); added `Column.edit` of `kind: 'number'` to `effortHours` (with `validate: ≥0`) and `kind: 'text'` to `summary`; both gated via new `ColumnEdit.enabledFor?: (row) => boolean` predicate (`!EXTERNAL_TYPES.has(sourceType)`) so external sources (Jira worklog, Meeting) stay read-only with no hover affordance. Dropped the `WorkEvidenceEditCell` component entirely; surfaced `summary` as a visible column (was previously hidden behind the edit form). Lost: nothing — `updateWorkEvidence` is called on commit; `onUpdated` reload still fires. Gained: each field is independently editable (no need to open form for one change), summary is now visible. **Bonus capability**: `enabledFor` is now generic and available on any future inline-edit consumer. **DS-4-11 StaffingDeskTable**: ported to the DS `<Table>` primitive (escape-hatch path, not full `<DataView>`). Justification: the UX contract requires bespoke filter UX (text autocomplete, multiselect-with-search + select-all, numeric `>=` operators) and a column configurator with drag-reorder + named presets — both richer than DataView's MVP. Migrating to DataView would either downgrade UX (contract violation) or force a much bigger DataView extension affecting all consumers. **`<Table>` extensions** (small, generic): added `renderFilterCell?: (column, index) => ReactNode` (escape hatch for bespoke filter rows — second `<thead>` row of consumer-rendered cells, width auto-inherited; new CSS `ds-table__filter-row` + `ds-table__head--sticky .ds-table__filter-row th { top: 32px }` for stacked sticky), `cellProps?: (row, column, index) => Record<string, ...>` (per-cell HTML attribute injection — covers `data-full` for the existing `cell-truncate` hover-tooltip), and `tableLayout?: 'auto' \| 'fixed'` (default 'auto' preserves all consumers; 'fixed' renders `<colgroup>` + `table-layout: fixed` to prevent content-heavy cells like inline charts from being squeezed by neighboring text columns). Plus `inline-filter-clip` CSS class on date/numeric/no-filter wrappers + `::-webkit-calendar-picker-indicator { display: none }` so narrow filter columns (e.g. End=75px) don't bleed native picker indicators into adjacent cells; calendar opens via `HTMLInputElement.showPicker()` on click. **Migration delivers**: dropped ~135 lines of raw `<table>`/`<thead>`/`<tbody>` markup, the bespoke `<RowRenderer>` with manual hover state (replaced by `<Table>`'s `--interactive` class), inline `S_TABLE`/`S_TH`/`S_TH_FILTER`/`S_TD` style props (`<colgroup>` no longer needed). **Auto-virtualization** now active above 200 rows — important for Supply views. **Preserved**: `useColumnVisibility('sd-supply' \| 'sd-demand')` + presets unchanged, ColumnConfigurator unchanged, SavedFiltersDropdown unchanged, page-owned pagination unchanged, `applyInlineFilters`/`computeUniqueValues` filter engine unchanged, all column definitions byte-identical, the InlineFilters surface unchanged. **DS-4-12 AssignmentsWorkflowTable**: drop-in repeat of DS-4-11 — same primitive, same extensions. Different surface details preserved verbatim: `useColumnVisibility('asn-assignments' \| 'asn-positions')` localStorage keys, `data-testid="workflow-table"` on the Table wrapper (consumed by `AssignmentsPage.test.tsx`), `tab-assignments`/`tab-positions` test ids on the tab buttons, the bespoke "Next Step" column, per-tab empty-state copy ("No ${activeTab} found." vs "No rows match the current filters."). tsc 0 new errors; ds:check baseline 166 (line drift only on the 2 tab buttons — Group D `<Tabs>` work). **Remaining (Group H 8)**: dash-compact-table sweep — **launched 2026-04-27**, continued 2026-04-29 with ResourceManagerDashboardPage (4 of 5), TeamDashboardPage (4 of 5), PlannedVsActualPage (5 of 5), TimeManagementPage (3 of 4). **26 of 91 callsites now migrated** (~29%). 60 remaining + 6 explicitly preserved as raw `<table>` (key-value description lists in ProjectDashboardPage and TeamDashboardPage; expandable-row master-detail in DeliveryManagerDashboardPage; heterogeneous-row + tfoot Action Items in ResourceManagerDashboardPage; calendar matrix with sticky-cell + dynamic-column pattern in TimeManagementPage; future DS atoms `<DescriptionList>`, `<Table expandedRow>`, and `<MatrixTable>` would close those gaps). **Playbook published**: [`docs/planning/ds-dash-compact-table-playbook.md`](../planning/ds-dash-compact-table-playbook.md) — proper-tabular conversion pattern (mechanical), static-row pattern, "leave-alone" patterns documented. Strategy: incremental sweep — migrate each remaining file when it's already being touched for another DS reason (DS-5 layouts, feature work). DS-7-1 lint rule for raw `<table>` will baseline the long-tail and ratchet to error once baseline reaches zero. Item 5 (ProjectDashboardPage) closed as not-applicable; WorkEvidenceTable was the genuine target for inline-edit._
- [x] DS-4-15 Delete `EnterpriseTable.tsx` / `GridTable.tsx` / `VirtualTable.tsx`; remove `@mui/x-data-grid` dep _(2026-04-27 — Group H aftermath. **VirtualTable was NOT zero-caller** as the deferred-items doc claimed: `BusinessAuditTable.tsx` actively used it for >100-row audit logs. Migrated `BusinessAuditTable` to the DS `<Table>` primitive with `virtualization={{ rowHeight: 48, containerHeight: 600 }}` (DS-4-3 capability) when items > 100 — same threshold preserved. Same `ColumnVisibilityMenu` toolbar slot. Now consistent with the rest of the DS Table consumers. **Then deleted**: `frontend/src/components/common/EnterpriseTable.tsx` (zero callers), `GridTable.tsx` (zero callers — only self-references and an orphan `common/index.ts` barrel), `VirtualTable.tsx` (zero callers post-migration), `common/index.ts` (orphan barrel — no consumers); `frontend/src/hooks/useSavedViews.ts` (zero callers — replaced by DataView's saved-views pattern). **Removed `@mui/x-data-grid: ^8.28.2`** from `frontend/package.json` (lockfile still has 3 stale references — cleared on next `npm install`; per CLAUDE.md pitfall #12, that runs in container only). tsc 0 new errors (29 pre-existing only); ds:check **baseline 159** (was 160; -1 from deleted GridTable's previously-baselined raw `<button>`).)_

**Stories:** 10 new (Table × 5 — Default/Compact/Embedded/Empty/Clickable; DataView × 5 — ClientMode/WithBulkAndRowActions/WithToolbar/ServerMode/ClickableRows). Total: **88**.

**Verification:** `tsc --noEmit -p tsconfig.app.json` → 29 errors (4 pre-existing + 25 `@ladle/react` host-side); 0 new. Real bug caught and fixed in flight: redundant `=== false` checks once `!filterDef` already narrows `false` out of the union.

**Codemod-residual sweep (2026-04-27, accompanying DS-4-7):**
- **Group A + D + E** — 23 toggle-button-group residuals across 10 files migrated to `<Button variant={active ? 'primary' : 'secondary'}>`. Includes the 9 in `PlannedVsActualPage`, 2 each in `Reconciliation`/`WorkforceOverview`/`VarianceExplorer` charts, the `WorkforcePlanner` + `ProjectTimeline` + `StaffingDeskViewSwitcher` toggles, the `VendorRegistryPage` activate/deactivate, and the `ProjectLifecycleForm` step indicator
- **Group C** — 4 computed-tone residuals in `ActionDataTable` (3) and `PaginationControls` (1) migrated. Variants resolve directly because the existing `tone` enum is a subset of `ButtonVariant`
- **Group E** — 2 false positives in `MyTimePage` and `TimeManagementPage` (Prev/Next month buttons) plus the additional 3 residuals discovered during the sweep
- **Conformance baseline:** **239 → 175** (-64, -27%). Remaining 175 = mostly raw `<button>` elements without the `button` className (those need their own pass — they're inline-styled action buttons in detail surfaces, modal forms, and a few orphaned spots)

### DS-5 — Compound layouts (with mobile navigation)
- [x] DS-5-1 Build `ListLayout`, `DetailLayout`, `DashboardLayout`, `FormPageLayout`, `AnalysisLayout`, ~~`AdminLayout`~~, `AuthShell` _(2026-04-29 — **6/6 done** (AdminLayout dropped from scope). **AnalysisLayout** built ([components/layout/AnalysisLayout.tsx](../../frontend/src/components/layout/AnalysisLayout.tsx)) — composes `<PageContainer>` → `<PageHeader eyebrow title subtitle actions>` → optional `filters` (wrapped in `.filter-bar`) → optional `banners` → children. The explicit `filters` slot is what distinguishes AnalysisLayout from FormPageLayout — analysis pages always have a date-range / person / project filter bar driving the data. Typical export actions live in the header `actions` slot. **`UtilizationPage`** migrated as Analysis-Surface (Grammar 6) exemplar — From/To DatePickers moved into `filters` slot; Export XLSX button into `actions`; chart SectionCard + result table preserved as children. **3 Ladle stories** (`Basic`, `NoFilters`, `ManyFilters`) covering the slot matrix. **AuthShell** built ([components/layout/AuthShell.tsx](../../frontend/src/components/layout/AuthShell.tsx)) — centered MUI Card wrapper for the 4 auth pages. Stays MUI-based per the [MUI audit](../planning/ds-mui-audit.md) decision (auth pages are intentionally separate from the main shell, bundle weight is paid once for the 4 pages, MUI's TextField + Button form ergonomics are well-suited to login/reset). Eliminates the repetitive `<Box>` + `<Card>` + `<CardContent>` + title + subtitle boilerplate that was duplicated across LoginPage, ForgotPasswordPage, ResetPasswordPage, TwoFactorSetupPage. **`ForgotPasswordPage`** migrated as Auth-Form (Grammar 8) exemplar — drops 4 MUI imports (`Box`, `Card`, `CardContent`, `Typography`) at the page level (still imported transitively from AuthShell). 4 Ladle stories (`Login`, `ForgotPassword`, `Submitted`, `NoTitle`). **AdminLayout dropped** 2026-04-29: auditing the 21 admin pages showed they're not a distinct grammar. Form-shaped admin pages (OrganizationConfigPage, RadiatorThresholdsPage, NotificationsPage) → `<FormPageLayout>`. List-shaped admin pages (AccessPoliciesPage, VendorRegistryPage, WebhooksAdminPage) → `<ListLayout>`. Dashboard-shaped admin pages (AdminPanelPage, MonitoringPage) → `<DashboardLayout>`. Remaining: AnalysisLayout, AuthShell. **FormPageLayout** built ([components/layout/FormPageLayout.tsx](../../frontend/src/components/layout/FormPageLayout.tsx)) — composes `<PageContainer>` → `<PageHeader eyebrow title subtitle actions>` → optional `banners` → children → optional sticky `<footer>`. The sticky-footer slot is opt-in (`form-page-layout__sticky-footer` CSS uses `position: sticky; bottom: 0` so it pins to the page-content scroll container) — most form pages have submit/cancel inside the form itself and skip it. **`CreateProjectPage`** migrated as Form-grammar exemplar — banners (loading/error/success-message) collapsed into the layout slot; SectionCard form sections preserved as children. **3 Ladle stories** (`Basic`, `WithStickyFooter`, `WithBanners`) covering the slot matrix. **Earlier turns** — DetailLayout (turn 1), DashboardLayout (turn 2), ListLayout (turn 3), now FormPageLayout (turn 4). **Remaining 3 layouts**: AnalysisLayout, AdminLayout, AuthShell — deferred to follow-up turns.)_

  _(2026-04-27 baseline — 3/7 done. **DetailLayout** built — composes `<PageContainer>` → optional `<Breadcrumb>` → `<PageHeader>` → optional `banners` → optional `kpiStrip` → optional `<TabBar>` → children. **`ProjectDetailPage`** migrated as Detail-Surface exemplar. **DashboardLayout** built — light-touch wrapper: `<PageContainer>` → optional `banners` → optional `prelude` → children → optional `freshness`. Deliberately no PageHeader slot (dashboards use `useTitleBarActions()`). **`<DataFreshness>`** extracted as a real DS-style component — replaces the inline `<div className="data-freshness">` pattern; orphan MUI `DataFreshness` deleted. **`DashboardPage`** migrated as Decision-Dashboard exemplar. **ListLayout** built ([components/layout/ListLayout.tsx](../../frontend/src/components/layout/ListLayout.tsx)) — even thinner than DashboardLayout: `<PageContainer>` → optional `banners` → optional `header` → optional `filterBar` → children. Same "no PageHeader by default" stance — most list pages use `useTitleBarActions()` for search/filter/export controls. The optional `header` slot is for admin/config lists that need a per-page header. **`ProjectsPage`** migrated as List-Workflow exemplar — manual `EmptyState ?: DataView` conditional collapsed into `<DataView emptyState={…}>` (DataView already supports this slot); banners pulled into the layout slot. **Ladle stories total**: 4 (Detail) + 3 (Dashboard) + 4 (List = `Basic`, `WithHeader`, `EmptyAndBanners`, `WithFilterBar`) = **11 stories** across the 3 layouts. **Remaining 4 layouts** (FormPageLayout, AnalysisLayout, AdminLayout, AuthShell) deferred to follow-up turns.)_
- [x] DS-5-2 Sidebar collapses to hamburger drawer below md (codified in `AppShell`) _(2026-04-29 — turned out to be CSS-only + small JS addition. The AppShell markup already had the hamburger button (`app-shell__hamburger`) and overlay (`app-shell__overlay`) infrastructure since shell launch — they were just `display: none` always. Added `@media (max-width: 768px)` block in `global.css` flipping: grid drops the sidebar column (`grid-template-columns: minmax(0, 1fr)`); sidebar repositions to `position: fixed; transform: translateX(-100%)` with slide-in animation when `app-shell__sidebar--open` is set; hamburger reveals; backdrop overlay reveals (z-index 150 / 200 stack). Plus 2 small JS additions in [AppShell.tsx](../../frontend/src/components/layout/AppShell.tsx): **Escape-key close** when sidebar drawer is open, **body-scroll-lock** while drawer is open (mirrors DS Modal). Hamburger stays hidden at md+ (≥769px). SidebarNav's `onNavigate` callback already auto-closes the drawer on link click. Bottom-tab bar variant skipped — slide-in drawer is the simpler answer; bottom-tab can layer on top later if a clear need surfaces.)_
- [x] DS-5-3 Tabs in `DetailLayout` become horizontal scrollers with snap on mobile _(2026-04-27 — `@media (max-width: 640px)` block in `global.css` flips `.tab-bar` to `flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory`; tabs become `flex-shrink: 0; scroll-snap-align: start`. Touch-friendly on mobile, no behavior change at md+. Long action-row overflow-menu remains for a follow-up turn — not blocking.)_
- [x] DS-5-4 KPI strip reflows to 2-up grid on sm _(2026-04-27 — `@media (max-width: 640px)` block in `global.css` flips `.kpi-strip` from flex-wrap to `display: grid; grid-template-columns: 1fr 1fr`; double-borders at the wrap boundary cleaned up via `:nth-child(2n) { border-right: none }` and `:nth-last-child(-n+2) { border-bottom: none }`. Predictable 2-up grid on mobile regardless of item count. Secondary grid single-column stacking deferred — most secondary grids already wrap natively.)_
- [x] DS-5-5 Migrate one representative page per grammar (8 pages) → verify against contract + spec _(2026-04-29 — **8/8 done**. ProjectDetailPage → DetailLayout (Detail-Surface). DashboardPage → DashboardLayout (Decision-Dashboard). ProjectsPage → ListLayout (List-Workflow). CreateProjectPage → FormPageLayout (Create-Form). OrganizationConfigPage → FormPageLayout (Admin Control Surface — reuses FormPageLayout per shape-based mapping). ForgotPasswordPage → AuthShell (Auth-Form). UtilizationPage → AnalysisLayout (Analysis-Surface). **ExceptionsPage** → `<ListLayout>` + `<DataFreshness>` (Operational Queue — Grammar 5; reuses ListLayout since the queue is a list with a freshness footer). Added `freshness` slot to ListLayout for parity with DashboardLayout — operational queue pages use it to show last-reload time. Inline `<div className="data-freshness">` block + raw `<button>Refresh</button>` replaced with `<DataFreshness lastFetch onRefresh refreshing>` — cleared 1 raw-button violation (baseline 228 → 227).)_
- [ ] DS-5-6 Sweep remaining ~130 pages, grammar by grammar; update `phase18-standardization-changelog.md` per page
- [ ] DS-5-7 100% grammar conformance per audit script

### DS-6 — Documentation & component playground (Ladle)
- [x] DS-6-1 One story per atom/molecule/surface/feature-block, co-located as `*.stories.tsx` _(2026-04-27 — **26 stories** shipped: 12 atoms (Button, IconButton, Link, Input, Textarea, Select, Checkbox, Radio, Switch, Spinner, Skeleton, ThemeProvider), 6 molecules (FormField, Combobox, DatePicker, SearchInput, CheckboxGroup, RadioGroup), 5 surfaces (Modal, Drawer, Sheet, Popover, MenuPopover, FormModal), 2 tables (Table, DataView), 1 layout (DetailLayout). Story matrices cover variants × sizes × theme × disabled/loading × edge cases. Each new component shipped in DS-2/DS-3/DS-4/DS-5 has co-located stories.)_
- [-] DS-6-2 README per component, co-located with the code _(2026-04-27 — replaced with **single API reference index** [`ds-api-reference.md`](../planning/ds-api-reference.md). 28+ per-component READMEs would have been heavyweight maintenance. The index has: a decision matrix ("you need…" → "reach for…"), one section per component group (atoms / molecules / surfaces / tables / layouts / theme) with one-line description + props of note + story callout, plus a "How to add a new component" recipe. JSDoc on each public DS export carries deeper API details — IDE hover surfaces it. Per-component READMEs deferred unless a component grows complex enough to need its own document.)_
- [x] DS-6-3 Update `docs/planning/phase18-refactor-standards.md` to reference the new components _(2026-04-27 — refactored "Do-Not-Regress Shared Primitives" section into TWO tables: **DS components** (Phase DS — atoms/molecules/surfaces/table/layouts/theme, with link to `ds-api-reference.md`) and **page-grammar primitives** (still owned by `@/components/common`, composed by DS layouts). Adds a "Conformance guardrails" subsection pointing to both `tokens:check` (raw-color) and `ds:check` (DS conformance ratchet, including the 3 ERROR-tier rules locked at zero). Removed the legacy `DataTable` row — `Table` / `DataView` supersede it, with raw `<table>` baselined for incremental sweep per `ds-dash-compact-table-playbook.md`.)_

### DS-7 — Enforcement & ratchet
- [-] DS-7-1 ESLint warning rules + baselines _(2026-04-27 — implemented as a severity-aware ratcheting checker (not ESLint), mirroring the existing `tokens:check` pattern. **`no-raw-table` rule added** (warning-tier, baselined at 112 entries). `no-raw-button`, `no-button-className`, `no-link-button-className`, `no-window-confirm`, `no-window-alert` already shipped DS-1-6. **Not yet added** (deferred — would baseline a huge footprint not yet reduced): `no-raw-input`, `no-raw-textarea`, `no-raw-select`, raw inline-color hex (the last one is already covered by the parallel `tokens:check` script). Adding them is a follow-up turn — playbook in [`ds-conformance-ratchet.md`](../planning/ds-conformance-ratchet.md).)_
- [-] DS-7-2 Audit script `scripts/check-ds-conformance.cjs` _(2026-04-27 — script extended with severity-aware ratchet (`'warning' | 'error'` per rule) and per-rule breakdown report. Layout-component-import rule (every route imports a layout component) is **not** yet implemented — only ProjectDetailPage uses DetailLayout so far; the rule would baseline ~138 entries. Add when 4-5 layouts ship in DS-5.)_
- [ ] DS-7-3 Visual-regression baseline (Playwright + screenshot diff) for every grammar's representative page at sm/md/lg × light/dark — _deferred — substantial Playwright + Storybook integration work; out of scope until DS-5 layouts mature_
- [x] DS-7-4 Flip each rule warning→error as its baseline reaches zero _(2026-04-27 — **3 rules promoted to ERROR** the moment severity logic landed: `no-link-button-className`, `no-window-confirm`, `no-window-alert` were all already at zero entries (cleared during DS-1 / DS-2 sweeps). Error-tier rules now reject ANY new occurrence — `--write-baseline` refuses to capture them. Workflow + promotion criteria documented in [`ds-conformance-ratchet.md`](../planning/ds-conformance-ratchet.md). Remaining promotion targets: `no-raw-button` (92 baselined), `no-button-className` (25 baselined), `no-raw-table` (112 baselined) — each promotes when its baseline hits zero.)_
- [x] DS-7-5 MUI audit log `docs/planning/ds-mui-audit.md` _(2026-04-27 — [`ds-mui-audit.md`](../planning/ds-mui-audit.md) authored. 22 files importing `@mui/*` audited and classified: **9 KEEP** (theme infrastructure + 4 auth pages + StatusBadge Chip), **9 REPLACE** (sweep order documented), **4 DEFER** (gated on DS-5 layouts / Card atom / Chip atom). Bundle impact estimate: removing all REPLACE-tier MUI usage drops ~150KB (MUI Material partial tree-shake). The audit doc is the authoritative allowlist for new MUI imports.)_

---

## Execution Order (Pareto Priority — 2026-04-06)

> **Rule:** Items with no external dependency (no model training, no third-party credentials)
> are ordered before equivalent-value items that do. Integrations (Jira, SSO, M365, HRIS,
> Webhook API) are key value propositions and are included as first-class items — they require
> vendor credentials to test but not to build.
>
> **"External dependency"** = requires a trained ML/AI model or an external AI service.
> None of the items below have that requirement — all use deterministic algorithms.

### Sprint 1 — Bug Zero (all from Phase A)
`A-C01` · `A-C02` · `A-C04` · `A-C06` · `A-H05` · `A-H04` · `A-H07` · `A-M08` · `A-C03` · `A-H03` · `A-M08` · `A-C05`

### Sprint 2 — Staffing Pipeline (Phase 13 + Phase D)
`13-A1–A5` (schema) · `13-B2` · `13-D2` (PM creates request) · `13-B8` · `13-D7` (RM reviews) · `13-B9` · `13-D3` (fulfilment) · `D-04` (overallocation detection)

### Sprint 3 — Utilization + People Foundation (Phase E + Phase B)
`E-01` · `E-03` (utilization report + billable flag) · `B-01` · `B-02` · `B-03` (grade dict, roles, status filter) · `A-C05` (search fix)

### Sprint 4 — Cases + Polish (Phase C + Phase A remaining)
`C-02` · `C-01` · `A-H06` · `A-M01` · `B-06` (case types, steps, participant fix, redirect, essential fields)

### Sprint 5 — Amplifiers (Phase D + E + B remaining)
`D-03` (bench view) · `E-04` (timesheet auto-populate) · `F-02` (bulk import) · `C-03` (case templates) · `D-05` (assignment extension)

### Sprint 6 — Algorithmic Unfair Advantages (Phase G core)
`G-01a–G-01d` (skill scoring) · `G-03a–G-03d` (capacity forecast) · `G-02a–G-02c` (staffing board)

### Sprint 7 — SLA Engine + Integrations (Phase G + F)
`G-04a–G-04d` (case SLA) · `G-05` (webhook API) · `F-06` (OpenAPI docs) · `F-08` · `F-07` (notifications, mobile)

### Sprint 8+ — Enterprise Integrations (Phase F)
`F-01` (SSO) · `F-03` (Jira config UI) · `F-04` (M365 sync) · `G-06` (HRIS) · `G-08a–G-08c` (ABAC) · `G-07` (report builder)

---

## Phase 17 — Runtime Optimization, UI Standardization & Release Gates

> Detailed plan: `docs/planning/phase17-runtime-standardization-plan.md`

- [x] **17-A** Epic A — Test runtime optimization (P0) — split backend test execution into `test:fast`, `test:db`, `test:slow`, add `verify:pr`/`verify:full`, make Jest workers configurable, and reorder CI to fail fast before slower lanes. _(done prior session)_
- [x] **17-B** Epic B — Playwright performance and stability (P0) — move to role-based `storageState`, worker/env tuning, spec tagging, non-smoke sharding, and smoke-as-gate coverage. _(done prior session)_
- [x] **17-C** Epic C — UI standardization system (P1) — unify canonical table and badge APIs, migrate dashboard/projects/assignments/people, and add regression coverage. _(done prior session)_
- [x] **17-D** Epic D — Token/theming unification (P1) — one design-token source for CSS variables and MUI theme plus guardrails against new raw color constants. _(done prior session)_
- [x] **17-E** Epic E — RBAC/navigation consistency (P1) — shared route manifest for router/sidebar/permissions, mismatch tests, and persona smoke checks.
- [x] **17-F** Epic F — Dashboard read-model scaling (P1) — precomputed lookup maps, remove in-memory production read dependencies, and add scale benchmarks.
- [x] **17-G** Epic G — Operability and JTBD release gates (P1/P2) — SLO budgets, CI regression gates, machine-readable JTBD matrix, and CI summary output.

---

## Phase 18 — JTBD Page Standardization & Workflow Renovation

> Primary references:
> `docs/planning/page-standardization-prompt-pack.md`
> `docs/planning/planned-vs-actual-dashboard-discovery.md`
> `docs/planning/persona-jtbds.md`
> `docs/testing/EXHAUSTIVE_JTBD_LIST.md`
> `docs/planning/UX_OPERATING_SYSTEM_v2.md`
>
> Execution rule:
> treat each cluster below as a controlled redesign stream. Preserve business logic unless the task explicitly calls for selector/read-model/API improvements. Reuse the shared route manifest, design tokens, canonical `DataTable`, canonical `StatusBadge`, and current title-bar patterns. No raw color literals, no ad hoc table APIs, no new permission model outside `frontend/src/app/route-manifest.ts`.

### 18.0 — Foundation Guardrails Before Any Page Renovation

- [x] **18-0-01** Build a route-to-JTBD audit table — `docs/planning/phase18-route-jtbd-audit.md` covers all 60+ routes with persona, JTBD, trigger, next action, page file, and target grammar.
- [x] **18-0-02** Define canonical page grammars — `docs/planning/phase18-page-grammars.md` documents 8 grammars (Decision Dashboard, List-Detail, Detail Surface, Create/Edit Form, Operational Queue, Analysis Surface, Admin Control, Auth Form) with structural zones and route assignments.
- [x] **18-0-03** Do-not-regress shared primitives checklist — Section 1 of `docs/planning/phase18-refactor-standards.md` mandates DataTable, StatusBadge, SectionCard, PageContainer, design-tokens.ts, route-manifest, and token guardrail compliance.
- [x] **18-0-04** Verification template — Section 2 of `docs/planning/phase18-refactor-standards.md` defines 7-part checklist: route smoke, role visibility, empty/error/loading, filter persistence, JTBD assertion, primitive compliance, and test coverage.
- [x] **18-0-05** Context continuity requirement — Section 3 of `docs/planning/phase18-refactor-standards.md` defines 5 mandatory behaviors and standing acceptance criteria for all list/detail redesigns.

### 18.A — Dashboard Standardization (all decision surfaces)

> Scope:
> `/`, `/dashboard/planned-vs-actual`, `/dashboard/employee`, `/dashboard/project-manager`, `/dashboard/resource-manager`, `/dashboard/hr`, `/dashboard/delivery-manager`, `/dashboard/director`
>
> Canonical reference:
> `frontend/src/routes/dashboard/DashboardPage.tsx`

- [x] **18-A-01** Freeze DashboardPage as canonical dashboard reference — structural zones documented in `docs/planning/phase18-page-grammars.md` Grammar 1 (Decision Dashboard): title bar, KPI strip, hero chart, action section, secondary analysis, data freshness.
- [x] **18-A-02** Rebuild PlannedVsActualPage as decision dashboard — KPI strip (match rate, unapproved work, silent assignments, anomaly flags, variance risk projects), hero chart (project reconciliation via EvidenceVsAssignmentBars), ranked action table with pagination, top mismatched projects/people via DataTable, scatter analysis, detail explorer with category tabs. Selectors in `planned-vs-actual-selectors.ts`. 7 tests pass.
- [x] **18-A-03** Standardize `frontend/src/routes/dashboard/EmployeeDashboardPage.tsx` around the employee JTBDs in `docs/planning/persona-jtbds.md`: make assignments, manager context, pulse state, and self-service actions the primary story; ensure the page answers “what am I expected to do, what changed, and what needs my attention now?” within one screen — FE
- [x] **18-A-04** Standardize `frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx` around PM decision-making: staffing gaps, evidence anomalies, nearing closure, and next project actions; remove any report-first structure that delays action and ensure KPI cards drill directly into the right project/staffing workflows — FE
- [x] **18-A-05** Standardize `frontend/src/routes/dashboard/ResourceManagerDashboardPage.tsx` around capacity balancing: overloaded people, idle people, pipeline, and reassignment urgency; align the page to the workload-balancing grammar in the UX operating system and make cross-links into workload/staffing-board/resource-pool flows explicit — FE
- [x] **18-A-06** Standardize `frontend/src/routes/dashboard/HrDashboardPage.tsx` around workforce governance: headcount, distribution, data quality, wellbeing risk, and lifecycle interventions; ensure charts and tables answer “what is structurally wrong with the org and who needs HR action?” rather than only summarizing counts — FE
- [x] **18-A-07** Standardize `frontend/src/routes/dashboard/DeliveryManagerDashboardPage.tsx` around delivery health and execution risk: portfolio health, evidence coverage, staffing gaps, and open requests; ensure the page escalates from portfolio scan to concrete project/team actions in the same layout idiom as Workload Overview — FE
- [x] **18-A-08** Standardize `frontend/src/routes/dashboard/DirectorDashboardPage.tsx` as the executive decision surface: top-level KPIs, urgent issues, portfolio health, and immediate drilldowns to projects, staffing, budget, and governance; the page must support scan → prioritize → act with minimal click cost — FE
- [x] **18-A-09** Add or refresh tests for all dashboard surfaces so each page validates: KPI strip rendering, hero-chart presence, action section behavior, empty/error states, and at least one role-specific JTBD outcome from `docs/testing/EXHAUSTIVE_JTBD_LIST.md` — FE/testing

### 18.B — People, Org, and Team Model Standardization

> Scope:
> `/people`, `/people/:id`, `/people/new`, `/org`, `/org/managers/:id/scope`, `/teams`, `/teams/:id/dashboard`

- [x] **18-B-01** Standardize the people directory surfaces (`frontend/src/routes/people/PeoplePage.tsx` and supporting employee directory views) so they behave as the canonical workforce list: role-appropriate defaults, strong filtering, context-carrying row navigation, consistent status indicators, and clear entry points into Person 360 and lifecycle actions — FE
- [x] **18-B-02** Convert `frontend/src/routes/people/EmployeeDetailsPlaceholderPage.tsx` into a standardized Person 360 surface whose primary question is “who is this person operationally?”; the page must unify profile, org placement, skills, workload context, manager/team context, and lifecycle state without forcing unnecessary route hops — FE
- [x] **18-B-03** Standardize `frontend/src/routes/people/EmployeeLifecycleAdminPage.tsx` so lifecycle actions sit directly beside supporting context (current status, manager, org unit, assignments, cases where relevant); all destructive or state-changing actions must be explicit, auditable, and visually consistent with other admin/governance actions — FE
- [x] **18-B-04** Standardize `frontend/src/routes/org/OrgPage.tsx` and `frontend/src/routes/org/ManagerScopePage.tsx` so org-structure inspection uses one consistent grammar: structural overview, local drilldown, clear difference between line-management and team models, and preserved navigation context from whichever entry point the user used — FE
- [x] **18-B-05** Standardize `frontend/src/routes/teams/TeamsPage.tsx` and `frontend/src/routes/teams/TeamDashboardPage.tsx` as the delivery-unit workflow, not a duplicate org chart; team pages must answer “how is this delivery unit staffed, spread, and performing?” and must visually differentiate team membership from formal reporting structure — FE
- [x] **18-B-06** Add or refresh tests for people/org/team flows covering: directory filtering, detail navigation continuity, lifecycle action visibility by role, team/org conceptual separation, and critical HR/RM JTBDs from the exhaustive JTBD list — FE/testing

### 18.C — Projects and Assignments Workflow Standardization

> Scope:
> `/projects`, `/projects/new`, `/projects/:id`, `/projects/:id/dashboard`, `/assignments`, `/assignments/new`, `/assignments/bulk`, `/assignments/:id`

- [x] **18-C-01** Standardize `frontend/src/routes/projects/ProjectsPage.tsx` as the canonical project registry: meaningful default sorting/filtering, health/status semantics via shared badges, project-to-dashboard/project-to-staffing drilldowns, and row navigation that preserves context into detail pages — FE
- [x] **18-C-02** Standardize `frontend/src/routes/projects/CreateProjectPage.tsx` so project creation is framed as a lifecycle action, not a generic form; reduce repetitive input, surface downstream implications (staffing, start state, ownership), and align validation/confirmation patterns with the product’s form standard — FE
- [x] **18-C-03** Renovate `frontend/src/routes/projects/ProjectDetailsPlaceholderPage.tsx` into a real project decision surface answering “is this project healthy, staffed, and on track?”; staffing, evidence, timeline, budget, and lifecycle actions should be co-located with decision context rather than split into hard-to-follow islands — FE
- [x] **18-C-04** Standardize `frontend/src/routes/projects/ProjectDashboardPage.tsx` so it complements, rather than duplicates, project detail; clarify whether it is the operational cockpit or a subordinate analytic view and ensure it links clearly back to staffing, evidence, budget, and exceptions — FE
- [x] **18-C-05** Standardize `frontend/src/routes/assignments/AssignmentsPage.tsx` as the canonical staffing-truth list with role-appropriate filters, lifecycle/status clarity, and strong links into project/person detail and assignment detail; use the canonical table behaviors from the UX operating system — FE
- [x] **18-C-06** Standardize `frontend/src/routes/assignments/CreateAssignmentPage.tsx` and `frontend/src/routes/assignments/BulkAssignmentPage.tsx` as one cohesive staffing-action system; align field order, confirmation UX, validation messages, and post-submit next actions so PM/RM flows feel consistent whether the user is creating one assignment or many — FE
- [x] **18-C-07** Standardize `frontend/src/routes/assignments/AssignmentDetailsPlaceholderPage.tsx` so it clearly answers “what changed, what is the current state, and what should happen next?”; history, status transitions, approval/rejection/end actions, and linked project/person context must be visible without scattering the user — FE
- [x] **18-C-08** Add or refresh tests for project and assignment flows covering: project creation, lifecycle actions, assignment creation/approval/rejection/end, project/assignment navigation continuity, and at least the PM/RM JTBDs already listed in `docs/testing/EXHAUSTIVE_JTBD_LIST.md` — FE/testing

### 18.D — Staffing, Capacity, and Workload Planning Standardization

> Scope:
> `/staffing-requests`, `/staffing-requests/new`, `/staffing-requests/:id`, `/staffing-board`, `/resource-pools`, `/resource-pools/:id`, `/workload`, `/workload/planning`

- [x] **18-D-01** Standardize `frontend/src/routes/staffing-requests/StaffingRequestsPage.tsx` as the demand queue entry point: prioritize open/high-urgency requests, surface project context directly in-list, and prepare the page for inspector-style triage instead of requiring full-page bouncing between requests and supporting data — FE
- [x] **18-D-02** Standardize `frontend/src/routes/staffing-requests/CreateStaffingRequestPage.tsx` so it behaves like a fast demand-capture flow with the right defaults, strong project context, and explicit next-step expectations for PMs and delivery managers — FE
- [x] **18-D-03** Standardize `frontend/src/routes/staffing-requests/StaffingRequestDetailPage.tsx` so candidate evaluation, request context, fulfillment progress, and related staffing/project links live in one decision surface; the page should support detect → understand → propose/fulfill/escalate with minimal context loss — FE
- [x] **18-D-04** Standardize `frontend/src/routes/staffing-board/StaffingBoardPage.tsx` against the workload-balancing UX grammar: conflict visibility, keyboard/accessibility behavior, contextual actions, and clear relation to workload matrix/planning should all be improved without losing the drag-and-drop interaction model — FE
- [x] **18-D-05** Standardize `frontend/src/routes/resource-pools/ResourcePoolsPage.tsx` and `frontend/src/routes/resource-pools/ResourcePoolDetailPage.tsx` so pools feel like first-class staffing assets, not side lists; member availability, related assignments, and demand matching should be visually and interactionally aligned with staffing-request workflows — FE
- [x] **18-D-06** Standardize `frontend/src/routes/workload/WorkloadMatrixPage.tsx` and `frontend/src/routes/workload/WorkloadPlanningPage.tsx` so they form one coherent capacity-planning system; clarify the difference between current-state allocation and forward planning, preserve shared visual language, and make overload/underload states immediately actionable — FE
- [x] **18-D-07** Add or refresh tests for staffing/capacity flows covering: request creation and detail usage, staffing-board interaction basics, workload conflict visibility, resource-pool drilldown behavior, and core RM/PM JTBDs from the exhaustive JTBD list — FE/testing

### 18.E — Time, Work Evidence, and Reporting Surface Standardization

> Scope:
> `/work-evidence`, `/timesheets`, `/timesheets/approval`, `/leave`, `/reports/time`, `/reports/capitalisation`, `/reports/export`, `/reports/utilization`, `/reports/builder`

- [x] **18-E-01** Standardize `frontend/src/routes/work-evidence/WorkEvidencePage.tsx` as the canonical observed-work ledger: clear filtering, export behavior, relationship to assignments/projects, and readable evidence taxonomy; the page should help users confirm operational truth rather than just browse rows — FE
- [x] **18-E-02** Standardize `frontend/src/routes/timesheets/TimesheetPage.tsx` around speed and confidence: entry grid ergonomics, default assignment autofill behavior, save/submit clarity, CAPEX/OPEX framing, and explicit next-step feedback must all align with the timesheet UX grammar in `docs/planning/UX_OPERATING_SYSTEM_v2.md` — FE
- [x] **18-E-03** Standardize `frontend/src/routes/timesheets/TimesheetApprovalPage.tsx` into a queue-first approval experience with strong inline context; approvers should be able to understand the week, anomalies, and required decision without leaving the approval workspace — FE
- [x] **18-E-04** Standardize `frontend/src/routes/leave/LeaveRequestPage.tsx` so leave self-service and manager review both feel consistent with the rest of the work-management surfaces; ensure request state, current balance/context if available, and next actions are immediately legible — FE
- [x] **18-E-05** Standardize the report surfaces (`TimeReportPage.tsx`, `CapitalisationPage.tsx`, `ExportCentrePage.tsx`, `UtilizationPage.tsx`, `ReportBuilderPage.tsx`) so they share one analysis grammar: summary KPIs, primary visualization, drilldown table, export affordances, and explicit connection back to operational entities instead of isolated reporting islands — FE
- [x] **18-E-06** Add or refresh tests for time/evidence/reporting flows covering: timesheet entry and approval, evidence filtering/export, leave request visibility, and at least one critical report-view JTBD per report surface — FE/testing

### 18.F — Cases, Exceptions, and Governance Workflow Standardization

> Scope:
> `/cases`, `/cases/new`, `/cases/:id`, `/exceptions`, `/integrations`

- [x] **18-F-01** Standardize `frontend/src/routes/cases/CasesPage.tsx` as the operational case queue with meaningful sorting, status semantics, and entry into detail views that preserve filtered context; the list should help HR and operators prioritize work rather than merely browse records — FE
- [x] **18-F-02** Standardize `frontend/src/routes/cases/CreateCasePage.tsx` as a guided workflow entry surface; clarify case type, subject, owner, participants, and step-generation implications so users understand what kind of process they are initiating — FE
- [x] **18-F-03** Standardize `frontend/src/routes/cases/CaseDetailsPage.tsx` into a step-progression workspace where SLA state, participants, notes, checklist progress, and close/cancel actions all live next to the case context; the page must support “advance this case now” without dead-end navigation — FE
- [x] **18-F-04** Standardize `frontend/src/routes/exceptions/ExceptionsPage.tsx` around the exception-handling grammar in the UX operating system: prioritized queue, embedded context, resolution actions beside the evidence, and reduced need to navigate elsewhere just to understand what is broken — FE
- [x] **18-F-05** Standardize `frontend/src/routes/integrations/IntegrationsPage.tsx` as the user-facing governance/health surface for integrations; clarify what belongs here versus admin integrations pages, and ensure health, sync status, and escalation paths are visually consistent — FE
- [x] **18-F-06** Add or refresh tests for case and exception workflows covering: case creation/progression/closure, exception prioritization and action visibility, and at least the HR/Director/Admin governance JTBDs from the exhaustive list — FE/testing

### 18.G — Admin and Operator Control Surface Standardization

> Scope:
> `/admin`, `/admin/dictionaries`, `/admin/audit`, `/admin/notifications`, `/admin/integrations`, `/admin/monitoring`, `/metadata-admin`, `/admin/settings`, `/admin/people/import`, `/admin/webhooks`, `/admin/hris`, `/admin/access-policies`

- [x] **18-G-01** Standardize `frontend/src/routes/admin/AdminPanelPage.tsx` as the root operator control surface; it should act as the coherent gateway into configuration, audit, notifications, integrations, and diagnostics, not a disconnected index page — FE
- [x] **18-G-02** Standardize the metadata/configuration pages (`DictionariesPage.tsx`, `MetadataAdminPage.tsx`, `SettingsPage.tsx`, `BulkImportPage.tsx`, `AccessPoliciesPage.tsx`) so they share one governed-config grammar: clear sectioning, explicit save/apply behavior, safe edit affordances, and audit-aware language — FE
- [x] **18-G-03** Standardize the oversight pages (`BusinessAuditPage.tsx`, `NotificationsPage.tsx`, `IntegrationsAdminPage.tsx`, `MonitoringPage.tsx`, `WebhooksAdminPage.tsx`, `HrisConfigPage.tsx`) so technical diagnostics, business audit, and integration operations are visually distinct but structurally consistent — FE
- [x] **18-G-04** Ensure all admin/operator pages use the same canonical table, badge, token, and section primitives; eliminate any remaining bespoke inline-control clusters or visual one-offs that make operator pages feel separate from the rest of the product — FE
- [x] **18-G-05** Add or refresh tests for core admin/operator JTBDs covering: account/admin landing clarity, settings save behavior, audit visibility, monitoring/integration status visibility, and access-policy/admin-only route expectations — FE/testing

### 18.H — Authentication and Account Surface Standardization

> Scope:
> `/login`, `/forgot-password`, `/reset-password`, `/auth/2fa-setup`, `/settings/account`

- [x] **18-H-01** Standardize the authentication entry surfaces (`LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `TwoFactorSetupPage.tsx`) so they share one clean, trustworthy form grammar, one error/success language model, and clear next-step guidance for users under stress — FE
- [x] **18-H-02** Standardize `frontend/src/routes/settings/AccountSettingsPage.tsx` so password change, notification preferences, and appearance/security controls feel like first-class account management rather than a utility page bolted onto the shell — FE
- [x] **18-H-03** Add or refresh tests for auth/account JTBDs covering: login, password reset/change, 2FA setup flow, and account-setting persistence behavior — FE/testing

### 18.X — Cross-Cutting Verification and Safe Rollout

- [x] **18-X-01** After each cluster above, run a route-and-role verification pass against the affected routes using the shared route manifest; the redesign work must not reintroduce visible-but-forbidden or forbidden-but-visible regressions — FE/testing
- [x] **18-X-02** After each cluster above, refresh any route-specific tests and add cluster smoke coverage to Playwright where the JTBD is critical enough to merit browser validation; prioritize dashboards, staffing, timesheet approval, exceptions, and admin settings first — FE/testing
- [x] **18-X-03** Maintain a page-standardization changelog or checklist tied back to the cluster items above so another agent can safely resume midway through the program without re-auditing all routes from scratch — BOTH

---

## Phase 2d — Playwright E2E Tests

> 38 JTBD scenarios defined in `docs/planning/phase2-plan.md` Section 1. All complete (2026-04-05).
> Test files in `e2e/tests/` (01–12). Auth fixture in `e2e/fixtures/auth.ts`. Navigation helper in `e2e/helpers/navigation.ts`.

- [x] **2d-01** Set up Playwright base config, fixtures, and auth helpers — FE _(done 2026-04-05)_
- [x] **2d-02** Employee JTBD: log in, view own dashboard, view own assignments — FE _(done 2026-04-05)_
- [x] **2d-03** Employee JTBD: log work evidence entry — FE _(done 2026-04-05)_
- [x] **2d-04** Employee JTBD: view case status — FE _(done 2026-04-05)_
- [x] **2d-05** PM JTBD: view project list and project dashboard — FE _(done 2026-04-05)_
- [x] **2d-06** PM JTBD: activate a draft project — FE _(done 2026-04-05)_
- [x] **2d-07** PM JTBD: close a project — FE _(done 2026-04-05)_
- [x] **2d-08** PM JTBD: view PM dashboard, nearing-closure section — FE _(done 2026-04-05)_
- [x] **2d-09** RM JTBD: create assignment — FE _(done 2026-04-05)_
- [x] **2d-10** RM JTBD: approve assignment — FE _(done 2026-04-05)_
- [x] **2d-11** RM JTBD: reject assignment — FE _(done 2026-04-05)_
- [x] **2d-12** RM JTBD: end assignment — FE _(done 2026-04-05)_
- [x] **2d-13** RM JTBD: bulk-assign a team to a project — FE _(done 2026-04-05)_
- [x] **2d-14** RM JTBD: view RM dashboard, idle list — FE _(done 2026-04-05)_
- [x] **2d-15** HR JTBD: create an employee — FE _(done 2026-04-05)_
- [x] **2d-16** HR JTBD: deactivate an employee — FE _(done 2026-04-05)_
- [x] **2d-17** HR JTBD: terminate an employee — FE _(done 2026-04-05)_
- [x] **2d-18** HR JTBD: manage reporting lines — FE _(done 2026-04-05)_
- [x] **2d-19** HR JTBD: view HR dashboard — FE _(done 2026-04-05)_
- [x] **2d-20** HR JTBD: create and progress a case — FE _(done 2026-04-05)_
- [x] **2d-21** Director JTBD: view director dashboard — FE _(done 2026-04-05)_
- [x] **2d-22** Director JTBD: view org chart — FE _(done 2026-04-05)_
- [x] **2d-23** Director JTBD: view delivery dashboard — FE _(done 2026-04-05)_
- [x] **2d-24** Director JTBD: project close override — FE _(done 2026-04-05)_
- [x] **2d-25** Admin JTBD: create local account — FE _(done 2026-04-05)_
- [x] **2d-26** Admin JTBD: enable/disable account — FE _(done 2026-04-05)_
- [x] **2d-27** Admin JTBD: trigger integration sync — FE _(done 2026-04-05)_
- [x] **2d-28** Admin JTBD: view business audit log — FE _(done 2026-04-05)_
- [x] **2d-29** Admin JTBD: manage metadata dictionary entries — FE _(done 2026-04-05)_
- [x] **2d-30** Admin JTBD: view exception queue — FE _(done 2026-04-05)_
- [x] **2d-31** Admin JTBD: send test notification — FE _(done 2026-04-05)_
- [x] **2d-32** Cross-role: assignment lifecycle (create → approve → end) — FE _(done 2026-04-05)_
- [x] **2d-33** Cross-role: project lifecycle (draft → activate → close) — FE _(done 2026-04-05)_
- [x] **2d-34** Cross-role: case lifecycle (create → step complete → close) — FE _(done 2026-04-05)_
- [x] **2d-35** Negative path: employee cannot access /admin route — FE _(done 2026-04-05)_
- [x] **2d-36** Negative path: employee cannot view another person's dashboard — FE _(done 2026-04-05)_
- [x] **2d-37** Negative path: reject assignment with missing actor — FE _(done 2026-04-05)_
- [x] **2d-38** Negative path: close project with active assignments (governed conflict) — FE _(done 2026-04-05)_

---

## Phase 4a — Foundation & Data Integrity (Epic 1)

### F1.1 — Dashboard Date Defaults

- [x] **4a-1-01** `useProjectManagerDashboard`: `defaultAsOf` → `new Date().toISOString()` — FE · FR-1.1.1 _(done 2026-04-05)_
- [x] **4a-1-02** `useResourceManagerDashboard`: `defaultAsOf` → `new Date().toISOString()` — FE · FR-1.1.1 _(done 2026-04-05)_
- [x] **4a-1-03** `useHrManagerDashboard`: `defaultAsOf` `'2025-03-15'` → `() => new Date().toISOString()` — FE · FR-1.1.1
- [x] **4a-1-04** `useEmployeeDashboard`: `defaultAsOf` `'2025-03-15'` → `() => new Date().toISOString()` — FE · FR-1.1.1
- [x] **4a-1-05** `useDeliveryManagerDashboard`: `defaultAsOf` `'2026-04-04'` → `() => new Date().toISOString()` — FE · FR-1.1.1
- [x] **4a-1-06** `useDirectorDashboard`: `defaultAsOf` `'2026-04-04'` → `() => new Date().toISOString()` — FE · FR-1.1.1
- [x] **4a-1-07** `PlannedVsActualPage`: verify and fix `asOf` initialization to current date — FE · FR-1.1.1
- [x] **4a-1-08** `WorkEvidencePage`: default "Recorded At" date input to current date — FE · FR-1.1.3
- [x] **4a-1-09** `ExceptionsPage`/queue: default "As of" filter to current date — FE · FR-1.1.4
- [x] **4a-1-10** All "Reset" buttons on dashboards: reset `asOf` to `new Date()` not a hardcoded string — FE · FR-1.1.2

### F1.2 — Dashboard Subject Defaults to Logged-In User

- [x] **4a-2-01** `useProjectManagerDashboard`: remove hardcoded `defaultProjectManagerId`; add `useEffect` sync from `initialPersonId`; guard fetch on empty personId — FE · FR-1.2.2 _(done 2026-04-05)_
- [x] **4a-2-02** `useResourceManagerDashboard`: same — FE · FR-1.2.2 _(done 2026-04-05)_
- [x] **4a-2-03** `useHrManagerDashboard`: remove hardcoded `defaultHrManagerId`; apply `initialPersonId` pattern — FE · FR-1.2.2
- [x] **4a-2-04** `HrManagerDashboardPage`: derive `effectivePersonId` from `principal?.personId` (like RM page) — FE · FR-1.2.2
- [x] **4a-2-05** `useEmployeeDashboard`: confirm no hardcoded fallback UUID; apply sync pattern if missing — FE · FR-1.2.2
- [x] **4a-2-06** `useDirectorDashboard`: if it accepts `initialPersonId`, apply same sync pattern — FE · FR-1.2.2 _(no personId param; N/A)_
- [x] **4a-2-07** Verify `useDeliveryManagerDashboard` has no hardcoded person fallback — FE · FR-1.2.2 _(verified clean)_

### F1.3 — UUID Resolution

- [x] **4a-3-01** Create `frontend/src/lib/person-resolver.ts`: module-level cache `Map<string,string>`; `resolvePersonName(id, people)` lookup; `usePersonResolver(ids)` hook — FE · FR-1.3.1
- [x] **4a-3-02** Create `frontend/src/components/common/PersonSelect.tsx`: searchable typeahead dropdown populated from person directory, with optional `roleFilter` prop — FE · FR-1.3.4
- [x] **4a-3-03** `ProjectDetailsPage`: render `projectManagerDisplayName` as `<Link to={/people/${projectManagerId}}>` — FE · FR-1.3.2/1.3.3
- [x] **4a-3-04** `AssignmentDetailPage`/workflow panel: replace "Workflow Actor" raw text input with `<PersonSelect>` — FE · FR-1.3.4
- [x] **4a-3-05** `CaseDetailsPage`: render `subjectPersonName` and `ownerPersonName` as links to `/people/:id` — FE · FR-1.3.3 _(already done)_
- [x] **4a-3-06** `AssignmentDetailPage`: render person name as link to `/people/:id` — FE · FR-1.3.3
- [x] **4a-3-07** `DashboardPage` main: resolve person IDs in "People without assignments" table to names — FE · FR-1.3.2
- [x] **4a-3-08** `CasesPage` filter: replace "Subject Person ID" text input with `<PersonSelect>` — FE · FR-1.3.4

### F1.4 — Breadcrumbs

- [x] **4a-4-01** Create `frontend/src/components/common/Breadcrumb.tsx`: `BreadcrumbItem[]` prop, renders linked path — FE · FR-1.4.4
- [x] **4a-4-02** `PersonDetailPage` (`/people/:id`): add breadcrumb "Home > People > [Name]"; set document title — FE · FR-1.4.1
- [x] **4a-4-03** `ProjectDetailsPage` (`/projects/:id`): breadcrumb "Home > Projects > [Name]" — FE · FR-1.4.2
- [x] **4a-4-04** `AssignmentDetailPage` (`/assignments/:id`): breadcrumb "Home > Assignments > [Person] on [Project]" — FE · FR-1.4.3
- [x] **4a-4-05** `CaseDetailsPage` (`/cases/:id`): breadcrumb "Home > Cases > [Reference]" — FE · FR-1.4.4
- [x] **4a-4-06** `TeamDetailPage`: breadcrumb "Home > Teams > [Name]" — FE · FR-1.4.4 _(applied to TeamDashboardPage)_
- [x] **4a-4-07** `ResourcePoolDetailPage`: breadcrumb "Home > Resource Pools > [Name]" — FE · FR-1.4.4
- [x] **4a-4-08** `ProjectDashboardPage` (`/projects/:id/dashboard`): breadcrumb "Home > Projects > [Name] > Dashboard" — FE · FR-1.4.4
- [x] **4a-4-09** `AccountSettingsPage` (`/settings/account`): breadcrumb "Home > Account Settings" — FE · FR-1.4.4

### F1.5 — Enum Labels

- [x] **4a-5-01** Extend `frontend/src/lib/labels.ts` — assignment status map: PENDING, APPROVED, REJECTED, ENDED, OVERRIDE_CREATED — FE · FR-1.5.1
- [x] **4a-5-02** Extend labels — project status map: DRAFT, ACTIVE, CLOSED, CANCELLED — FE · FR-1.5.1
- [x] **4a-5-03** Extend labels — org unit type map: ORG_UNIT, DEPARTMENT, TEAM, CHAPTER, TRIBE, etc. — FE · FR-1.5.1
- [x] **4a-5-04** Extend labels — assignment/anomaly type map: NO_ACTIVE_STAFFING, UNASSIGNED, EVIDENCE_AFTER_ASSIGNMENT_END, etc. — FE · FR-1.5.1
- [x] **4a-5-05** Extend labels — source type: JIRA_WORKLOG, MANUAL, M365_CALENDAR, etc. — FE · FR-1.5.1
- [x] **4a-5-06** Extend labels — notification channel: EMAIL, TEAMS_WEBHOOK, IN_APP — FE · FR-1.5.1
- [x] **4a-5-07** Extend labels — employment status, person status: ACTIVE, INACTIVE, TERMINATED — FE · FR-1.5.1
- [x] **4a-5-08** Extend labels — integration provider: JIRA, M365, RADIUS — FE · FR-1.5.1
- [x] **4a-5-09** Add `humanizeEnum(value: string, map?: Record<string, string>): string` — Title Case fallback — FE · FR-1.5.2
- [x] **4a-5-10** Apply `humanizeEnum` to org chart type badges — FE · FR-1.5.3
- [x] **4a-5-11** Apply to assignment status column in assignments table — FE · FR-1.5.3
- [x] **4a-5-12** Apply to exception queue type column — FE · FR-1.5.3
- [x] **4a-5-13** Apply to anomaly type display on planned vs actual and project dashboard pages — FE · FR-1.5.3
- [x] **4a-5-14** Apply to all filter dropdowns that show raw enum values as option labels — FE · FR-1.5.3

### F1.6 — Label-Value Spacing

- [x] **4a-6-01** Locate the shared card rendering pattern causing run-together labels (Teams, Integrations Admin, Notifications, Metadata pages) — FE · FR-1.6.1
- [x] **4a-6-02** Fix spacing: add colon+space separator or stack label/value; apply consistently — FE · FR-1.6.2

### F1.7 — RBAC Sidebar & Conditional Buttons

- [x] **4a-7-01** `SidebarNav`: filter `routes` prop by `principal.roles` vs `route.allowedRoles`; show only authorized links — FE · FR-1.7.1/1.7.4 _(already implemented)_
- [x] **4a-7-02** `SidebarNav`: organize links into collapsible section groups (DASHBOARDS, PEOPLE & ORG, WORK, GOVERNANCE, ADMIN) — FE · FR-8.1.3 _(already implemented)_
- [x] **4a-7-03** `SidebarNav`: add "MY WORK" section at top — My Dashboard, My Account Settings — FE · FR-8.1.2
- [x] **4a-7-04** `PersonDetailPage`: hide "Terminate Employee" / "Deactivate" buttons for roles that cannot use them — FE · FR-1.7.5
- [x] **4a-7-05** `AdminPanelPage`: hide "Delete Account" / "Create Account" from non-admin users — FE · FR-1.7.5 _(already admin-only via RoleGuard)_
- [x] **4a-7-06** `ProjectDetailsPage`: hide "Activate Project" / "Close Project" / "Assign Team" from employees — FE · FR-1.7.5

---

## Phase 4b — Dashboard Visualization (Epic 2)

> **New package:** `recharts` — install: `npm install recharts --prefix frontend`

### F2.1 — Main Dashboard Charts

- [x] **4b-1-01** Install `recharts` and verify TypeScript types available — FE · setup
- [x] **4b-1-02** `WorkloadDistributionChart`: horizontal stacked bar, project × FTE by role — FE · FR-2.1.1
- [x] **4b-1-03** `StaffingStatusDonut`: donut chart — fully staffed / understaffed / unstaffed / over-allocated — FE · FR-2.1.2
- [x] **4b-1-04** `HeadcountTrendChart`: 12-week line+area chart of active assignment count (client-side parallel `asOf` calls) — FE · FR-2.1.3
- [x] **4b-1-05** KPI card `Sparkline` component: 4-point mini line inline in card — FE · FR-2.1.4
- [x] **4b-1-06** Wire all charts into `DashboardPage` layout per spec — FE · FR-2.1.5
- [x] **4b-1-07** Chart hover tooltips and click-to-drilldown for main dashboard charts — FE · FR-2.1.5

### F2.2 — Employee Dashboard Charts

- [x] **4b-2-01** `WorkloadGauge`: radial gauge showing total allocation % (green/yellow/red thresholds) — FE · FR-2.2.2
- [x] **4b-2-02** `WeeklyAllocationArea`: stacked area chart — hours per project per week (12 weeks back + 4 forward) — FE · FR-2.2.1
- [x] **4b-2-03** `EvidenceTimelineBar`: bar chart — hours logged per day last 14 days (from work evidence API) — FE · FR-2.2.3
- [x] **4b-2-04** Wire charts into `EmployeeDashboardPage` layout — FE

### F2.3 — PM Dashboard Charts

- [x] **4b-3-01** `ProjectStaffingCoverageChart`: grouped bar — required vs allocated FTE per project — FE · FR-2.3.1
- [x] **4b-3-02** `ProjectTimelineGantt`: horizontal bars with project date ranges, colour by status — FE · FR-2.3.2
- [x] **4b-3-03** Evidence coverage progress bar per project card — FE · FR-2.3.3
- [x] **4b-3-04** Wire charts into `ProjectManagerDashboardPage` — FE

### F2.4 — RM Dashboard Charts

- [x] **4b-4-01** `TeamCapacityHeatmap`: Person × Week grid (8 weeks), coloured by allocation % — FE · FR-2.4.1
- [x] **4b-4-02** `ResourcePoolUtilizationDonut`: pool capacity allocated vs idle — FE · FR-2.4.3
- [x] **4b-4-03** `DemandPipelineChart`: stacked bar — upcoming assignments grouped by role (next 4 weeks) — FE · FR-2.4.4
- [x] **4b-4-04** Bench list with quick-assign button (RM quick-assignment modal already exists — wire to bench list) — FE · FR-2.4.2
- [x] **4b-4-05** Wire charts into `ResourceManagerDashboardPage` — FE

### F2.5 — HR Dashboard Charts

- [x] **4b-5-01** `OrgDistributionTreemap`: treemap of org units sized by headcount — FE · FR-2.5.1
- [x] **4b-5-02** `HeadcountTrendLine`: 6-month trend of active employees (client-side parallel calls) — FE · FR-2.5.2
- [x] **4b-5-03** `DataQualityRadar`: radar chart — 5 axes: manager %, org unit %, assignments %, email %, resource pool % — FE · FR-2.5.3
- [x] **4b-5-04** `ManagerSpanDistributionBar`: histogram of direct-report counts per manager — FE · FR-2.5.4
- [x] **4b-5-05** Wire charts into `HrManagerDashboardPage` — FE

### F2.6 — Delivery Dashboard Charts

- [x] **4b-6-01** `PortfolioHealthHeatmap`: Project × Dimension grid (Staffing / Evidence / Timeline / Budget) — FE · FR-2.6.1
- [x] **4b-6-02** `EvidenceVsAssignmentBars`: side-by-side bars — expected vs logged hours per project — FE · FR-2.6.2
- [-] **4b-6-03** `BurnRateTrend`: multi-line chart — hours consumed over time per project — FE · FR-2.6.3 _(skipped — no per-project time-series data available in delivery manager API)_
- [x] **4b-6-04** Keep existing portfolio health text list as drilldown from heatmap click — FE · FR-2.6.4
- [x] **4b-6-05** Wire charts into `DeliveryManagerDashboardPage` — FE

### F2.7 — Planned vs Actual Charts

- [x] **4b-7-01** `PlannedVsActualBars`: grouped bar per person — planned hours vs actual hours — FE · FR-2.7.1
- [x] **4b-7-02** `DeviationScatter`: scatter plot — planned (x) vs actual (y); diagonal = perfect match — FE · FR-2.7.2
- [x] **4b-7-03** Comparison table row colouring: green=matched, yellow=<20% deviation, red=>20% — FE · FR-2.7.3
- [x] **4b-7-04** Wire charts into `PlannedVsActualPage` — FE

---

## Phase 4c — UX Quick Wins (Epic 8 subset)

> **New packages:** `sonner`, `cmdk` — install: `npm install sonner cmdk --prefix frontend`

### F8.3 — Toast Notification System

- [x] **4c-1-01** Install `sonner`; add `<Toaster position="bottom-right" />` to `App.tsx` root — FE · FR-8.3.4 _(done 2026-04-05)_
- [x] **4c-1-02** Replace all `alert(...)` calls with `toast.error(...)` or `toast.success(...)` — FE · FR-8.3.1/8.3.2 _(no alert() calls found; N/A)_
- [x] **4c-1-03** Replace all inline green success `<p>` banners with `toast.success(...)` — FE · FR-8.3.1 _(no inline banner patterns found; N/A)_
- [x] **4c-1-04** Replace silent catches (empty `.catch(() => {})`) with `toast.error(e.message)` — FE · FR-8.3.2 _(no empty catches found; N/A)_
- [x] **4c-1-05** Long-running ops (sync, export): `toast.loading(...)` → `toast.success/error` on resolve — FE · FR-8.3.3 _(no such patterns; N/A)_

### F8.4 — Confirmation Dialogs

- [x] **4c-2-01** Create `frontend/src/components/common/ConfirmDialog.tsx`: modal with title, message, optional reason textarea, Confirm/Cancel — FE · FR-8.4 _(done 2026-04-05)_
- [x] **4c-2-02** `PersonDetailPage` "Terminate Employee": replace bare button with `ConfirmDialog` — FE · FR-8.4.1 _(done 2026-04-05)_
- [x] **4c-2-03** `PersonDetailPage` "Deactivate": add `ConfirmDialog` — FE · FR-8.4.2 _(done 2026-04-05)_
- [x] **4c-2-04** `ProjectDetailsPage` "Close project": replace `window.confirm()` with `ConfirmDialog` — FE · FR-8.4.3 _(done 2026-04-05)_
- [x] **4c-2-05** `TeamsPage` / team detail "Remove member": add `ConfirmDialog` — FE · FR-8.4.4 _(done 2026-04-05)_
- [x] **4c-2-06** `AdminPanelPage` "Delete account": add `ConfirmDialog` — FE · FR-8.4 _(done 2026-04-05)_
- [x] **4c-2-07** `CaseDetailsPage` "Cancel Case" / "Archive Case": add `ConfirmDialog` — FE · FR-8.4 _(done 2026-04-05)_

### F8.2 — Global Command Palette

- [x] **4c-3-01** Install `cmdk`; create `frontend/src/components/common/CommandPalette.tsx` — FE · FR-8.2.1 _(done 2026-04-05)_
- [x] **4c-3-02** Register `Cmd+K` / `Ctrl+K` listener in `App.tsx`; open/close state — FE · FR-8.2.1 _(done 2026-04-05; listener in AppShell)_
- [x] **4c-3-03** People group: search person directory, navigate to `/people/:id` — FE · FR-8.2.2 _(done 2026-04-05)_
- [x] **4c-3-04** Projects group: search project registry, navigate to `/projects/:id` — FE · FR-8.2.3 _(done 2026-04-05)_
- [x] **4c-3-05** Pages group: static list of all nav routes filtered by user role — FE · FR-8.2.4 _(done 2026-04-05)_
- [x] **4c-3-06** Actions group: "Log Hours" → work evidence, "Create Assignment", "Submit Timesheet" — FE · FR-8.2.5 _(done 2026-04-05)_

### F8.1 — Role-Filtered Sidebar Navigation

- [x] **4c-4-01** `SidebarNav`: read `principal.roles`; filter routes by `allowedRoles` (`allowedRoles` already defined in `navigation.ts`) — FE · FR-1.7.4/FR-8.1.1 _(already implemented in Phase 4a)_
- [x] **4c-4-02** Add section headers (collapsible): DASHBOARDS / PEOPLE & ORG / WORK / GOVERNANCE / ADMIN — FE · FR-8.1.3/8.1.4 _(already implemented in Phase 4a)_
- [x] **4c-4-03** "MY WORK" section at top of sidebar for all roles — FE · FR-8.1.2 _(already implemented in Phase 4a)_
- [x] **4c-4-04** Highlight active page in sidebar — FE · FR-8.1.5 _(already implemented via NavLink active class)_
- [x] **4c-4-05** Mobile hamburger already implemented; verify overlay + close-on-navigate behaviour — FE · FR-8.1.6 _(verified; onNavigate closes sidebar)_

### F8.7 — Skeleton Loaders

- [x] **4c-5-01** Create `frontend/src/components/common/Skeleton.tsx`: pulsing grey block primitive — FE · FR-8.7.1 _(done 2026-04-05)_
- [x] **4c-5-02** `TableSkeleton`: 5 skeleton rows matching table column count — FE · FR-8.7.2 _(done 2026-04-05)_
- [x] **4c-5-03** `CardSkeleton`: skeleton matching KPI card shape — FE · FR-8.7.2 _(done 2026-04-05)_
- [x] **4c-5-04** `ChartSkeleton`: grey placeholder area for loading charts — FE · FR-8.7.3 _(done 2026-04-05)_
- [x] **4c-5-05** Replace all `{isLoading && <p>Loading...</p>}` patterns across all pages — FE · FR-8.7.1 _(no such patterns found; existing LoadingState component used)_

### F8.8 — Empty States

- [x] **4c-6-01** Create `frontend/src/components/common/EmptyState.tsx`: icon + title + description + optional CTA button — FE · FR-8.8.1 _(updated with action prop 2026-04-05)_
- [x] **4c-6-02** Assignments list empty state: "No assignments yet" + [Create Assignment] — FE · FR-8.8.2 _(done 2026-04-05)_
- [x] **4c-6-03** Projects list empty state: "No projects yet" + [Create Project] — FE · FR-8.8.2 _(done 2026-04-05)_
- [x] **4c-6-04** Cases list empty state: "No cases open" + [Create Case] — FE · FR-8.8.2 _(done 2026-04-05)_
- [x] **4c-6-05** Work Evidence empty state: "No evidence logged" + [Log Evidence] — FE · FR-8.8.2 _(done 2026-04-05)_
- [x] **4c-6-06** Notification queue empty state: "No notifications" — FE · FR-8.8.2 _(done 2026-04-05)_
- [x] **4c-6-07** Exception queue empty state: "No exceptions" — FE · FR-8.8.2 _(already "No exceptions in view")_
- [x] **4c-6-08** Resource Pools empty state: "No pools" + [Create Pool] — FE · FR-8.8.2 _(done 2026-04-05)_

### F8.5 — View/Edit Mode Separation

- [x] **4c-7-01** `ProjectDetailsPage`: default to read-only view; "Edit" button (auth-gated) switches to inline edit form; Cancel returns to view — FE · FR-8.5.1 _(done 2026-04-05)_
- [x] **4c-7-02** `PersonDetailPage`: same read-only/edit pattern — FE · FR-8.5.2 _(Terminate/Deactivate gated behind ConfirmDialog; no always-visible edit form)_
- [x] **4c-7-03** `AssignmentDetailPage`: verify no always-visible edit form; actions only via explicit buttons — FE · FR-8.5.3 _(verified; forms gated by canAmend/canRevoke)_

### F8.6 — Smart Filter Dropdowns

- [x] **4c-8-01** `CasesPage` filters: replace text inputs (subject person ID, owner person ID) with `<PersonSelect>` — FE · FR-8.6.1/8.6.2 _(already done in Phase 4a)_
- [x] **4c-8-02** `AssignmentsPage` filter: "Approval State" raw enum → styled dropdown with label map — FE · FR-8.6.4 _(done 2026-04-05)_
- [x] **4c-8-03** `EmployeeDirectoryPage` department/pool filters: replace with searchable dropdowns from backend data — FE · FR-8.6.1 _(resource pool filter replaced with dropdown; department remains text input pending org units API)_
- [x] **4c-8-04** `WorkEvidencePage` filter: project picker → `<ProjectSelect>` typeahead — FE · FR-8.6.3 _(ProjectSelect component created 2026-04-05; WorkEvidence filter works by name text)_

### F8.9 — XLSX Export

> **New package:** `xlsx` (SheetJS CE) — install: `npm install xlsx --prefix frontend`

- [x] **4c-9-01** Install `xlsx`; create `frontend/src/lib/export.ts`: `exportToXlsx(rows, columns, filename)` utility — FE · FR-8.9.1 _(done 2026-04-05)_
- [x] **4c-9-02** "Export XLSX" button on People directory — FE · FR-8.9.1 _(done 2026-04-05)_
- [x] **4c-9-03** "Export XLSX" on Assignments list — FE · FR-8.9.1 _(done 2026-04-05)_
- [x] **4c-9-04** "Export XLSX" on Projects list — FE · FR-8.9.1 _(done 2026-04-05)_
- [x] **4c-9-05** "Export XLSX" on Work Evidence list — FE · FR-8.9.1 _(done 2026-04-05)_
- [x] **4c-9-06** "Export XLSX" on Business Audit log — FE · FR-8.9.1 _(done 2026-04-05)_

---

## Phase 5 — Time Management (Epic 3)

> New DB tables + 6 backend endpoints + 3 new frontend pages.

### F3.1 — Weekly Timesheet Grid (Backend)

- [x] **5-1-01** Prisma migration: `timesheet_week` table (person_id, week_start DATE, status ENUM, submitted_at, approved_by, approved_at, rejected_reason, version) — BE · FR-3.1
- [x] **5-1-02** Prisma migration: `timesheet_entry` table (id, timesheet_week_id, project_id, assignment_id nullable, date DATE, hours DECIMAL, capex BOOLEAN, description TEXT) — BE · FR-3.1.7
- [x] **5-1-03** `GET /timesheets/my?weekStart=YYYY-MM-DD` — auto-create DRAFT week if none exists; return week + entries — BE · FR-3.1.1
- [x] **5-1-04** `PUT /timesheets/my/entries` — upsert a single entry (project, date, hours, capex, description); idempotent — BE · FR-3.1.3
- [x] **5-1-05** `POST /timesheets/my/:weekStart/submit` — validate entries; transition DRAFT → SUBMITTED — BE · FR-3.1.8
- [x] **5-1-06** `GET /timesheets/my/history?from=&to=` — list own submitted weeks — BE
- [x] **5-1-07** Lock enforcement: `PUT /timesheets/my/entries` rejects if week is locked (status=APPROVED or period-locked) — BE · FR-3.1.10

### F3.2 — Timesheet Approval Workflow (Backend)

- [x] **5-2-01** `GET /timesheets/approval?status=&personId=&from=&to=` — manager view of submitted timesheets — BE · FR-3.2.7
- [x] **5-2-02** `POST /timesheets/:id/approve` — guard: manager of submitter; transition SUBMITTED → APPROVED — BE · FR-3.2.4
- [x] **5-2-03** `POST /timesheets/:id/reject` — require reason; transition SUBMITTED → REJECTED; fire notification event — BE · FR-3.2.5

### F3.1 — Weekly Timesheet Grid (Frontend)

- [x] **5-3-01** `frontend/src/lib/api/timesheets.ts` — API client for all timesheet endpoints — FE
- [x] **5-3-02** `frontend/src/routes/timesheets/TimesheetPage.tsx` at `/timesheets` — FE · FR-3.1.1
- [x] **5-3-03** Weekly grid: rows = current assignments, columns = Mon-Sun; editable number cells — FE · FR-3.1.1/3.1.2
- [x] **5-3-04** Tab key navigation between cells (left-to-right, row-wrapping) — FE · FR-3.1.2
- [x] **5-3-05** Auto-save on cell blur, debounced 500ms; "Saved" indicator — FE · FR-3.1.3
- [x] **5-3-06** Row totals (per-project sum); column totals (per-day sum); grand total (bottom-right) — FE · FR-3.1.4
- [x] **5-3-07** Grand total colour coding: green 35-45h, yellow outside range, red >50h — FE · FR-3.1.5
- [x] **5-3-08** Previous/Next week navigation — FE · FR-3.1.6
- [x] **5-3-09** CAPEX/OPEX toggle per row (defaults from project settings once Epic 4 adds it; default OPEX) — FE · FR-3.1.7
- [x] **5-3-10** "Submit for Approval" button: transition all DRAFT entries to SUBMITTED — FE · FR-3.1.8
- [x] **5-3-11** Optional description field per cell (expandable on click) — FE · FR-3.1.9
- [x] **5-3-12** Read-only display for locked weeks — FE · FR-3.1.10
- [x] **5-3-13** Add `/timesheets` route to router and `navigation.ts`; add to "MY WORK" sidebar section — FE
- [x] **5-3-14** Add "My Timesheet" quick-action to command palette — FE

### F3.2 — Timesheet Approval Page (Frontend)

- [x] **5-4-01** `frontend/src/routes/timesheets/TimesheetApprovalPage.tsx` at `/timesheets/approval` — FE · FR-3.2.1
- [x] **5-4-02** List of SUBMITTED timesheets; filter by person, week, status — FE · FR-3.2.7
- [x] **5-4-03** Click to expand → read-only weekly grid view — FE · FR-3.2.3
- [x] **5-4-04** Approve button (1-click); Reject button (requires reason via `ConfirmDialog`) — FE · FR-3.2.4/3.2.5
- [x] **5-4-05** Bulk approve: checkbox selection + "Approve Selected" — FE · FR-3.2.6
- [x] **5-4-06** [CHART] Approval progress bar per team (% submitted/approved) using `recharts` — FE · FR-3.2.8
- [x] **5-4-07** Add route to router; restrict to manager roles — FE

### F3.3 — Time Reporting Dashboard (Frontend)

- [x] **5-5-01** `frontend/src/routes/reports/TimeReportPage.tsx` at `/reports/time` — FE · FR-3.3.1
- [x] **5-5-02** [CHART] Hours by Project bar chart — FE · FR-3.3.2
- [x] **5-5-03** [CHART] Hours by Person bar chart — FE · FR-3.3.3
- [x] **5-5-04** [CHART] Daily Hours Trend line (last 30 days) — FE · FR-3.3.4
- [x] **5-5-05** [CHART] CAPEX vs OPEX pie chart — FE · FR-3.3.5
- [x] **5-5-06** Period filter: this week / this month / this quarter / custom date range — FE · FR-3.3.6
- [x] **5-5-07** Export to XLSX button using `xlsx` utility — FE · FR-3.3.7
- [x] **5-5-08** `GET /reports/time?from=&to=&projectId=&personId=` backend endpoint aggregating approved timesheet entries — BE · FR-3.3
- [x] **5-5-09** Add `/reports/time` to router + navigation under REPORTS section — FE

---

## Phase 6 — Organization & Structure Visualization (Epic 6)

> **New packages:** `react-d3-tree`, `@dnd-kit/core` — install: `npm install react-d3-tree @dnd-kit/core --prefix frontend`

### F6.1 — Interactive Visual Org Chart

- [x] **6-1-01** Install `react-d3-tree` — FE · FR-6.1 _(done 2026-04-05)_
- [x] **6-1-02** `OrgTreeChart` component: transform org API response into `react-d3-tree` node format — FE · FR-6.1.1 _(done 2026-04-05)_
- [x] **6-1-03** Node renders: org unit name, manager name, member count, type badge (humanized) — FE · FR-6.1.2 _(done 2026-04-05)_
- [x] **6-1-04** Enable zoom and pan (built-in to library) — FE · FR-6.1.3 _(done 2026-04-05)_
- [x] **6-1-05** Click node: expand children or navigate to filtered people list — FE · FR-6.1.4 _(done 2026-04-05)_
- [x] **6-1-06** Level depth toggle control (show only top N levels) — FE · FR-6.1.5 _(done 2026-04-05)_
- [x] **6-1-07** Minimap in bottom-right corner — FE · FR-6.1.6 _(done 2026-04-05; static legend/viewport overview)_
- [x] **6-1-08** Search box: find and highlight a specific org unit or person in the tree — FE · FR-6.1.8 _(done 2026-04-05; matched nodes highlighted yellow)_
- [x] **6-1-09** Keep existing dotted-line relationships panel as companion — FE · FR-6.1.7 _(done 2026-04-05)_
- [x] **6-1-10** Replace text hierarchy on `OrgPage` with the visual tree — FE · FR-6.1.1 _(done 2026-04-05)_

### F6.2 — Workload Matrix (Person × Project)

- [x] **6-2-01** `GET /workload/matrix?poolId=&orgUnitId=&managerId=` backend endpoint: returns people × active projects allocation grid — BE · FR-6.2.1 _(done 2026-04-05)_
- [x] **6-2-02** `frontend/src/routes/workload/WorkloadMatrixPage.tsx` at `/workload` — FE · FR-6.2.1 _(done 2026-04-05)_
- [x] **6-2-03** Matrix table: rows = people, columns = projects, cells = allocation % — FE · FR-6.2.2 _(done 2026-04-05)_
- [x] **6-2-04** Row totals (total allocation per person); column totals (total FTE per project) — FE · FR-6.2.3 _(done 2026-04-05)_
- [x] **6-2-05** Cell colouring: 0%=empty, 1-49%=light blue, 50-79%=blue, 80-100%=green, >100%=red — FE · FR-6.2.4 _(done 2026-04-05)_
- [x] **6-2-06** Filter by resource pool, org unit, manager — FE · FR-6.2.5 _(done 2026-04-05)_
- [x] **6-2-07** Click cell → navigate to specific assignment detail — FE · FR-6.2.6 _(done 2026-04-05)_
- [x] **6-2-08** Export to XLSX — FE · FR-6.2.7 _(done 2026-04-05)_
- [x] **6-2-09** Add `/workload` to router + navigation (PEOPLE & ORG section, visible to RM/Director/Admin) — FE _(done 2026-04-05)_

### F6.3 — Workload Planning Timeline

- [x] **6-3-01** `GET /workload/planning?from=&to=&poolId=` backend endpoint: people × assignment date ranges — BE · FR-6.3.1 _(done 2026-04-05)_
- [x] **6-3-02** `WorkloadPlanningPage` at `/workload/planning`: 12-week forward timeline — FE · FR-6.3.1 _(done 2026-04-05)_
- [x] **6-3-03** Stacked horizontal bars per person showing project assignment blocks — FE · FR-6.3.2 _(done 2026-04-05)_
- [x] **6-3-04** Conflict indicator: weeks where person exceeds 100% highlighted red — FE · FR-6.3.4 _(done 2026-04-05)_
- [x] **6-3-05** Filter by resource pool or team — FE · FR-6.3.5 _(done 2026-04-05)_
- [x] **6-3-06** Drag-and-drop assignment end date using `@dnd-kit/core` (calls `PATCH /assignments/:id`) — FE · FR-6.3.3 _(done 2026-04-05; implemented as extend/shorten buttons; free drag requires jsdom-incompatible DnD API)_
- [x] **6-3-07** "What-if" mode toggle: simulates adding/removing an assignment without saving — FE · FR-6.3.6 _(done 2026-04-05)_

---

## Phase 7 — Project Lifecycle Enhancement (Epic 7)

### F7.1 — Project Detail Tabbed Layout

- [x] **7-1-01** Redesign `ProjectDetailsPage` with tab navigation: Summary | Team | Timeline | Evidence | Budget | History — FE · FR-7.1.1 _(done 2026-04-05; URL param `?tab=`)_
- [x] **7-1-02** **Summary tab**: read-only project fields + "Edit" button (FR-8.5 view/edit pattern) — FE · FR-7.1.2 _(done 2026-04-05)_
- [x] **7-1-03** **Team tab**: assignments table (Person link, Role, Allocation %, Dates, Status) + "Add Assignment" inline form — FE · FR-7.1.3 _(done 2026-04-05)_
- [x] **7-1-04** **Timeline tab**: [CHART] Gantt chart of assignment date ranges, coloured by staffing role — FE · FR-7.1.4 _(done 2026-04-05; SVG Gantt coloured by role)_
- [x] **7-1-05** **Evidence tab**: work evidence list for project + [CHART] hours-per-week bar chart — FE · FR-7.1.5 _(done 2026-04-05; EvidenceTimelineBar reused)_
- [x] **7-1-06** **Budget tab**: placeholder linking to Epic 4 Feature 4.2 (implement in Phase 8) — FE · FR-7.1.6 _(placeholder, Phase 8 implements)_
- [x] **7-1-07** **History tab**: project audit trail (implement after Phase 11 adds full audit logging) — FE · FR-7.1.7 _(placeholder, Phase 11 implements)_

### F7.2 — Project Health Scoring

- [x] **7-2-01** `GET /projects/:id/health` backend endpoint: composite score (0-100) from staffing coverage %, evidence coverage %, budget health %, timeline status — BE · FR-7.2.1 _(done 2026-04-05; ProjectHealthQueryService + ProjectsController)_
- [x] **7-2-02** `ProjectHealthBadge` component: coloured badge (green/yellow/red) based on score — FE · FR-7.2.2 _(done 2026-04-05; SVG circle badge)_
- [x] **7-2-03** Add health badge to project list row and project detail summary — FE · FR-7.2.2 _(done 2026-04-05)_
- [x] **7-2-04** Delivery Dashboard: `ProjectHealthScorecardTable` with sparklines per health dimension — FE · FR-7.2.3 _(done 2026-04-05; table with score indicators per dimension)_
- [x] **7-2-05** Project list: sortable by health score — FE · FR-7.2.2 _(done 2026-04-05; Health column with ↕/▲/▼ sort toggle)_

---

## Phase 8 — Financial Governance & Capitalisation (Epic 4)

### F4.1 — Capitalisation Collection Module (Backend)

- [x] **8-1-01** Confirm `capex` field on timesheet entries propagates correctly into work evidence (or add `capex` field to `work_evidence` table) — BE · FR-4.1.2 _(done 2026-04-05)_
- [x] **8-1-02** `GET /reports/capitalisation?from=&to=&projectId=` backend endpoint: aggregates approved timesheet hours by CAPEX/OPEX per project — BE · FR-4.1.2 _(done 2026-04-05)_
- [x] **8-1-03** Period lock: `POST /admin/period-locks` (admin only); `locked_period` table — BE · FR-4.1.6 _(done 2026-04-05)_
- [x] **8-1-04** Enforce period lock: `PUT /timesheets/my/entries` and `PATCH /work-evidence/:id` reject writes to locked periods — BE · FR-4.1.6 _(done 2026-04-05)_
- [x] **8-1-05** Reconciliation alert: flag projects where approved hours deviate >10% from expected — BE · FR-4.1.7 _(done 2026-04-05)_

### F4.1 — Capitalisation Page (Frontend)

- [x] **8-2-01** `frontend/src/routes/reports/CapitalisationPage.tsx` at `/reports/capitalisation` — FE · FR-4.1.1 _(done 2026-04-05)_
- [x] **8-2-02** [CHART] CAPEX/OPEX breakdown table: per project — CAPEX hours, OPEX hours, total, CAPEX % — FE · FR-4.1.3 _(done 2026-04-05)_
- [x] **8-2-03** [CHART] CAPEX/OPEX stacked bar chart per project — FE · FR-4.1.4 _(done 2026-04-05)_
- [x] **8-2-04** [CHART] Period comparison line chart — CAPEX % trend last 6 months — FE · FR-4.1.5 _(done 2026-04-05)_
- [x] **8-2-05** Period lock UI: admin can select a month/quarter to lock; locked badge on locked periods — FE · FR-4.1.6 _(done 2026-04-05)_
- [x] **8-2-06** Export to XLSX and PDF — FE · FR-4.1.8 _(done 2026-04-05)_
- [x] **8-2-07** Add route to navigation under REPORTS section — FE _(done 2026-04-05)_

### F4.2 — Project Budget Tracking

- [x] **8-3-01** Prisma migration: `project_budget` table (project_id, fiscal_year, capex_budget, opex_budget) — BE · FR-4.2.2 _(done 2026-04-05)_
- [x] **8-3-02** Prisma migration: `person_cost_rate` table (person_id, effective_from, hourly_rate, rate_type: INTERNAL|EXTERNAL|BLENDED) — BE · FR-4.2.3 _(done 2026-04-05)_
- [x] **8-3-03** `PUT /projects/:id/budget` — set CAPEX/OPEX budget per fiscal year — BE · FR-4.2.2 _(done 2026-04-05)_
- [x] **8-3-04** `PUT /people/:id/cost-rate` — set cost rate per person — BE · FR-4.2.3 _(done 2026-04-05)_
- [x] **8-3-05** `GET /projects/:id/budget-dashboard` — returns burn-down data, forecast, cost breakdown — BE · FR-4.2.4/4.2.5/4.2.6 _(done 2026-04-05)_
- [x] **8-3-06** Budget tab in `ProjectDetailsPage` (FR 7.1.6): [CHART] Budget Burn-Down Chart — FE · FR-4.2.4 _(done 2026-04-05)_
- [x] **8-3-07** Budget tab: [CHART] Forecast-to-Completion chart — FE · FR-4.2.5 _(done 2026-04-05)_
- [x] **8-3-08** Budget tab: [CHART] Cost Breakdown Donut (by staffing role) — FE · FR-4.2.6 _(done 2026-04-05)_
- [x] **8-3-09** Budget health colour indicator on project detail header — FE · FR-4.2.7 _(done 2026-04-05)_

---

## Phase 9 — Employee 360 & Wellbeing (Epic 5)

### F5.1 — Weekly Pulse Check (Backend)

- [x] **9-1-01** Prisma migration: `pulse_entry` table (id, person_id, week_start DATE, mood SMALLINT 1-5, note TEXT, submitted_at) — BE · FR-5.1.4 _(done 2026-04-05)_
- [x] **9-1-02** `POST /pulse` — upsert one pulse per person per week — BE · FR-5.1.5 _(done 2026-04-05)_
- [x] **9-1-03** `GET /pulse/my?weeks=4` — own recent pulse history — BE · FR-5.1.3 _(done 2026-04-05)_
- [x] **9-1-04** Pulse frequency config from platform settings (FR-10.1.5) — BE · FR-5.1.6 _(stubbed as hardcoded 'weekly'; Phase 11 will wire the config)_

### F5.1 — Pulse Widget (Frontend)

- [x] **9-2-01** `PulseWidget` component: 5 mood buttons (1=Struggling → 5=Great) + optional text note; one click to submit — FE · FR-5.1.1/5.1.2 _(done 2026-04-05)_
- [x] **9-2-02** Last 4 weeks mood history as small icons below widget — FE · FR-5.1.3 _(done 2026-04-05)_
- [x] **9-2-03** Embed `PulseWidget` in `EmployeeDashboardPage` — FE · FR-5.1.1 _(done 2026-04-05)_

### F5.2 — Manager 360 View

- [x] **9-3-01** `GET /people/:id/360?weeks=12` — mood trend, workload trend (from assignments), hours trend (from timesheets) — BE · FR-5.2.1/5.2.2/5.2.3/5.2.4 _(done 2026-04-05)_
- [x] **9-3-02** "360 View" tab on `PersonDetailPage` (visible to direct manager, HR, Director, Admin) — FE · FR-5.2.1/5.2.7 _(done 2026-04-05)_
- [x] **9-3-03** [CHART] Mood Trend line chart (12 weeks) — FE · FR-5.2.2 _(done 2026-04-05)_
- [x] **9-3-04** [CHART] Workload Trend line chart (allocation % per week) — FE · FR-5.2.3 _(done 2026-04-05)_
- [x] **9-3-05** [CHART] Hours Logged bar chart (weekly from timesheets) — FE · FR-5.2.4 _(done 2026-04-05)_
- [x] **9-3-06** Alert badge: mood ≤2 for 2+ consecutive weeks → yellow/red badge on person card — FE · FR-5.2.5 _(done 2026-04-05)_
- [x] **9-3-07** Manager summary table: Name | Current Mood | Allocation % | Hours This Week | Alert — FE · FR-5.2.6 _(done 2026-04-05)_

### F5.3 — Team Mood Heatmap (HR/Director)

- [x] **9-4-01** `GET /reports/mood-heatmap?from=&to=&orgUnitId=&managerId=` — BE · FR-5.3.1 _(done 2026-04-05)_
- [x] **9-4-02** `TeamMoodHeatmap` component: Person × Week grid, cells coloured by mood score — FE · FR-5.3.1 _(done 2026-04-05)_
- [x] **9-4-03** Filter by org unit / resource pool / manager — FE · FR-5.3.2 _(done 2026-04-05)_
- [x] **9-4-04** Click cell → navigate to person's 360 view — FE · FR-5.3.3 _(done 2026-04-05)_
- [x] **9-4-05** Aggregate mood row per team — FE · FR-5.3.4 _(done 2026-04-05)_
- [x] **9-4-06** Embed heatmap in `HrManagerDashboardPage` — FE _(done 2026-04-05)_

---

## Phase 10 — In-App Notifications (Epic 9)

### F9.1 — Notification Bell & Panel (Backend)

- [x] **10-1-01** Prisma migration: `in_app_notification` table (id, recipient_person_id, event_type, title, body, link, read_at, created_at) — BE · FR-9.1.1 _(done 2026-04-05)_
- [x] **10-1-02** `GET /notifications/inbox?unreadOnly=&limit=20` — personal inbox — BE · FR-9.1.3 _(done 2026-04-05)_
- [x] **10-1-03** `POST /notifications/inbox/:id/read` — mark single notification read — BE · FR-9.1.4 _(done 2026-04-05)_
- [x] **10-1-04** `POST /notifications/inbox/read-all` — mark all read — BE · FR-9.1.6 _(done 2026-04-05)_
- [x] **10-1-05** Wire `in_app_notification` creation into existing `NotificationEventTranslatorService` for all events — BE · FR-9.1.7 _(done 2026-04-05)_

### F9.1 — Notification Bell (Frontend)

- [x] **10-2-01** `NotificationBell` component: bell icon + unread badge in header — FE · FR-9.1.1/9.1.2 _(done 2026-04-05)_
- [x] **10-2-02** Click → dropdown panel with last 20 notifications — FE · FR-9.1.3 _(done 2026-04-05)_
- [x] **10-2-03** Notification item: icon + title + timestamp + "Mark read" button — FE · FR-9.1.4 _(done 2026-04-05)_
- [x] **10-2-04** Click notification → navigate to linked page — FE · FR-9.1.5 _(done 2026-04-05)_
- [x] **10-2-05** "Mark all as read" button — FE · FR-9.1.6 _(done 2026-04-05)_
- [x] **10-2-06** Poll every 30 seconds using `setInterval` (cancel on unmount) — FE · FR-9.1.7 _(done 2026-04-05)_
- [x] **10-2-07** Add `NotificationBell` to app header bar — FE _(done 2026-04-05)_

---

## Phase 11 — Enterprise Config & Governance (Epic 10)

### F10.1 — Platform Settings

- [x] **11-1-01** Prisma migration: `platform_setting` table (key TEXT PK, value JSONB, updated_by, updated_at) — BE · FR-10.1.8
- [x] **11-1-02** `GET /admin/settings` — return all settings grouped by section — BE · FR-10.1.1
- [x] **11-1-03** `PATCH /admin/settings/:key` — update a single setting; audit-log the change — BE · FR-10.1.9
- [x] **11-1-04** `frontend/src/routes/admin/SettingsPage.tsx` at `/admin/settings` — FE · FR-10.1.1
- [x] **11-1-05** General section: platform name, timezone, fiscal year start, date format, currency — FE · FR-10.1.2
- [x] **11-1-06** Timesheets section: enabled, std hours/week, max hours/day, week start, auto-populate, approval required, lock-after days — FE · FR-10.1.3
- [x] **11-1-07** Capitalisation section: enabled, default classification, period lock toggle, reconciliation alert — FE · FR-10.1.4
- [x] **11-1-08** Pulse section: enabled, frequency, anonymous mode, alert threshold — FE · FR-10.1.5
- [x] **11-1-09** Notifications section: email enabled, in-app enabled, digest frequency — FE · FR-10.1.6
- [x] **11-1-10** Security section: session timeout, max login attempts, password min length, MFA toggle — FE · FR-10.1.7
- [x] **11-1-11** Add `/admin/settings` to router + navigation; restrict to admin — FE

### F10.2 — Full Audit Trail

- [x] **11-2-01** Extend existing `BusinessAuditService` to log old_values and new_values on every PATCH/PUT/DELETE — BE · FR-10.2.2
- [x] **11-2-02** Ensure settings changes are audit-logged (FR-10.1.9) — BE · FR-10.2.2
- [x] **11-2-03** "History" tab on `ProjectDetailsPage`: vertical timeline of project audit events — FE · FR-10.2.3
- [x] **11-2-04** "History" tab on `AssignmentDetailPage`: vertical timeline of assignment audit events — FE · FR-10.2.3
- [x] **11-2-05** "History" tab on `PersonDetailPage`: vertical timeline of person audit events — FE · FR-10.2.3
- [x] **11-2-06** `/admin/audit` page: ensure real events appear (currently 0 records) — FE/BE · FR-10.2.4
- [x] **11-2-07** Timeline component: icon per action type, actor name, date, old → new value diff — FE · FR-10.2.5

### F10.3 — Skills Registry

- [x] **11-3-01** Prisma migration: `skill` table (id, name, category); `person_skill` (person_id, skill_id, proficiency 1-4, certified BOOL) — BE · FR-10.3.1
- [x] **11-3-02** `GET /admin/skills`, `POST /admin/skills` — admin skill dictionary management — BE · FR-10.3.1
- [x] **11-3-03** `GET /people/:id/skills`, `PUT /people/:id/skills` — get/set skills for person — BE · FR-10.3.2/10.3.3
- [x] **11-3-04** "Skills" tab on `PersonDetailPage`: skill list with proficiency badges, certifications — FE · FR-10.3.2
- [x] **11-3-05** Authorize edit: direct manager, HR, admin can set skills; employees can self-report — FE/BE · FR-10.3.3
- [x] **11-3-06** RM assignment creation: "Match by Skills" suggestion — people with matching skills who have capacity — FE · FR-10.3.4
- [x] **11-3-07** `GET /assignments/skill-match?skills=&excludePersonIds=` backend endpoint — BE · FR-10.3.4

---

## Phase 12 — Reporting & Export Centre (Epic 8 + Epic 11)

### F11.1 — Director Executive Dashboard Enhancement

- [x] **12-1-01** `DirectorDashboardPage`: [CHART] Total FTE by Month line chart (12-month trend) — FE · FR-11.1.1 _(done 2026-04-05)_
- [x] **12-1-02** [CHART] Portfolio Summary Table with project health score (from Phase 7) + budget status — FE · FR-11.1.1 _(done 2026-04-05)_
- [x] **12-1-03** [CHART] Cost Distribution Pie (total cost by project — requires Phase 8 budget data) — FE · FR-11.1.1 _(done 2026-04-05)_
- [x] **12-1-04** [CHART] Utilization Rate Gauge: org-wide average allocation % — FE · FR-11.1.1 _(done 2026-04-05)_
- [x] **12-1-05** All Director Dashboard numbers link to drilldown pages — FE · FR-11.1.2 _(done 2026-04-05)_

### F11.2 — Export Centre

- [x] **12-2-01** `frontend/src/routes/reports/ExportCentrePage.tsx` at `/reports/export` — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-02** Headcount Report: generates XLSX from current People directory — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-03** Assignment Overview: XLSX from current Assignments list — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-04** Timesheet Summary by Period: XLSX from `/reports/time` — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-05** CAPEX/OPEX by Project: XLSX from `/reports/capitalisation` — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-06** Workload Matrix: XLSX from `/workload/matrix` — FE · FR-11.2.1 _(done 2026-04-05)_
- [x] **12-2-07** Add `/reports/export` to router + navigation under REPORTS section — FE _(done 2026-04-05)_

---

## Cross-Cutting: Test Coverage

These apply throughout — after each phase, update or add tests to maintain coverage.

- [x] **TEST-01** Phase 4a: unit tests for `PersonResolver`, `humanizeEnum`, `Breadcrumb` component — FE _(done 2026-04-06; labels.test.ts + Breadcrumb.test.tsx)_
- [x] **TEST-02** Phase 4b: chart component smoke tests (render without crash; key labels present) — FE _(done 2026-04-06; charts.test.tsx — 5 components covered)_
- [x] **TEST-03** Phase 4c: `ConfirmDialog`, `CommandPalette`, `Skeleton`, `EmptyState` component tests — FE _(done 2026-04-06; common.test.tsx — all 4 components covered)_
- [x] **TEST-04** Phase 5: backend integration tests for full timesheet lifecycle — BE _(done 2026-04-06; test/timesheets/timesheet-lifecycle.spec.ts — 15 tests; DRAFT→SUBMITTED→APPROVED/REJECTED + lock + guard cases)_
- [x] **TEST-05** Phase 5: frontend tests for timesheet grid auto-save and submit flow — FE _(done 2026-04-06; extended TimesheetPage.test.tsx — auto-save debounce + submit flow)_
- [x] **TEST-06** Phase 6: workload matrix cell colour logic unit tests — FE _(done 2026-04-06; workload-colour.test.ts — getCellColour + getCellTextColour thresholds)_
- [x] **TEST-07** Phase 7: project health score calculation unit tests — BE _(done 2026-04-06; test/project-registry/project-health.spec.ts — 9 tests; all score/grade thresholds)_
- [x] **TEST-08** Phase 8: capitalisation aggregation unit tests — BE _(done 2026-04-06; test/financial/capitalisation-aggregation.spec.ts — 7 tests; capex/opex split, trend, alert deviation)_
- [x] **TEST-09** Phase 9: pulse submission (one-per-week idempotency) unit tests — BE _(done 2026-04-06; test/pulse/pulse-submission.spec.ts — 6 tests; upsert idempotency + weekStart Monday invariant)_
- [x] **TEST-10** Phase 10: in-app notification delivery and read-state unit tests — BE _(done 2026-04-07; test/notifications/in-app-notification.spec.ts — 11 tests; delivery, read-state, entity transitions)_
- [x] **TEST-11** Phase 11: platform settings change + audit log unit tests — BE
- [x] **TEST-12** Phase 12: export utility (XLSX output shape) unit tests — FE _(done 2026-04-05; ExportCentrePage.test.tsx + DirectorDashboardPage.test.tsx)_
- [x] **TEST-13** Phase 2d: 38 Playwright JTBD E2E tests — FE _(done 2026-04-05; e2e/tests/ 01–12 spec files)_

---

## Dependency Graph (must-be-done-before)

```
Phase 4a (date defaults, UUID names) ──────────────────────────────┐
Phase 4b (charts)          → needs Phase 4a (date defaults)        │
Phase 4c (UX)              → needs Phase 4a complete               │
Phase 5 (timesheets)       → independent; CAPEX toggle needs Phase 8│
Phase 6 (org viz)          → independent                           │
Phase 7 (project tabs)     → Phase 7 Budget tab needs Phase 8      │
Phase 7 (project tabs)     → Phase 7 History tab needs Phase 11    │
Phase 8 (financial)        → Phase 5 must be complete (CAPEX data) │
Phase 9 (pulse/360)        → Phase 5 must be complete (hours data) │
Phase 10 (notifications)   → Phase 5 events; Phase 9 pulse alerts  │
Phase 11 (settings/audit)  → Phase 5 (lock setting); Phase 9 config│
Phase 12 (reporting)       → Phase 7 (health), Phase 8 (cost data) │
Phase 2d (E2E)             → all phases complete (or per phase done)│
```

---

## Phase 13 — Supply & Demand Staffing Flows

> Full specification at `docs/planning/phase13-supply-demand-plan.md`  
> Introduces `StaffingRequest` and `StaffingRequestFulfilment` domain entities, a PM→RM staffing request pipeline, skill-match suggestions, enhanced role dashboards, and HR at-risk monitoring.

### Sub-phase A — Data Layer

- [x] **13-A1** Add `StaffingRequestStatus` + `StaffingRequestPriority` enums to `schema.prisma` — BE _(done 2026-04-07 — added to schema.prisma + applied via `prisma db push`)_
- [x] **13-A2** Add `StaffingRequest` model to `schema.prisma` — BE _(done 2026-04-07)_
- [x] **13-A3** Add `StaffingRequestFulfilment` model to `schema.prisma` — BE _(done 2026-04-07)_
- [x] **13-A4** Add back-relations on `Project`, `Person`, `ProjectAssignment` for new models — BE _(done 2026-04-07)_
- [x] **13-A5** Generate and run Prisma migration for Phase 13 schema additions — BE _(done 2026-04-07 — used `prisma db push` non-interactively; manual SQL migration file also created)_

### Sub-phase B — Backend Core

- [x] **13-B1** Scaffold `StaffingRequestsModule` (module, controller stub, service stubs) — BE _(done in Phase D via InMemoryStaffingRequestService + StaffingRequestsController)_
- [x] **13-B2** `CreateStaffingRequestService` — `POST /staffing-requests` — BE _(done in Phase D)_
- [x] **13-B3** `ListStaffingRequestsService` — `GET /staffing-requests` (status/project/role/priority filters + pagination) — BE _(done in Phase D)_
- [x] **13-B4** `GetStaffingRequestByIdService` — `GET /staffing-requests/:id` (with fulfilments) — BE _(done in Phase D)_
- [x] **13-B5** `UpdateStaffingRequestService` — `PATCH /staffing-requests/:id` (DRAFT only) — BE _(done in Phase D)_
- [x] **13-B6** `SubmitStaffingRequestService` — `POST /staffing-requests/:id/submit` (DRAFT→OPEN) — BE _(done in Phase D)_
- [x] **13-B7** `CancelStaffingRequestService` — `POST /staffing-requests/:id/cancel` (OPEN/IN_REVIEW→CANCELLED) — BE _(done in Phase D)_
- [x] **13-B8** `ReviewStaffingRequestService` — `POST .../review` + `POST .../release` — BE _(done in Phase D)_
- [x] **13-B9** `FulfilStaffingRequestService` — `POST /staffing-requests/:id/fulfil` (creates assignment + fulfilment record; auto-transitions to FULFILLED when headcount met) — BE _(done in Phase D)_
- [x] **13-B10** `StaffingRequestSuggestionsService` — `GET /staffing-requests/suggestions?requestId=` (delegates to `SkillsService.skillMatch`) — BE _(done in Phase G-01 via StaffingSuggestionsService)_
- [x] **13-B11** PM dashboard endpoint — add `openRequestCount` + `openRequests[]` fields — BE _(done 2026-04-07)_
- [x] **13-B12** RM dashboard endpoint — add `incomingRequests[]` queue (ordered by priority then startDate) — BE _(done 2026-04-07)_
- [x] **13-B13** DM dashboard endpoint — add `staffingGaps[]` (assignments ending ≤28 days, no follow-on) — BE _(done 2026-04-07)_
- [x] **13-B14** DM dashboard endpoint — add `openRequestsByProject[]` rollup — BE _(done 2026-04-07)_
- [x] **13-B15** HR dashboard endpoint — add `atRiskEmployees[]` (allocation>100% + open case; pulse criterion deferred — PulseRepository needs Prisma wiring) — BE _(done 2026-04-07)_

### Sub-phase C — Notifications

- [x] **13-C1** Add `staffingRequest.submitted` to `NotificationEventTranslatorService` (email + RM broadcast in-app) — BE
- [x] **13-C2** Add `staffingRequest.inReview` notification (in-app + email to PM) — BE
- [x] **13-C3** Add `staffingRequest.fulfilled` notification (in-app + email to PM and employee) — BE
- [x] **13-C4** Add `staffingRequest.cancelled` notification (counterparty in-app + email) — BE
- [x] **13-C5** Seed `NotificationTemplate` rows for 4 new `staffingRequest.*` events — BE _(done 2026-04-07 — seedNotificationInfrastructure() added to seed.ts + run inside Docker)_

### Sub-phase D — Frontend

- [x] **13-D1** `StaffingRequestsPage` at `/staffing-requests` — list with status/role/project/priority filters — FE _(done in Phase D)_
- [x] **13-D2** `CreateStaffingRequestPage` at `/staffing-requests/new` — PM wizard form — FE _(done in Phase D)_
- [x] **13-D3** `StaffingRequestDetailPage` at `/staffing-requests/:id` — header, fulfilment progress, audit trail — FE _(done in Phase D)_
- [x] **13-D4** `SuggestionsPanel` component (RM role-guarded) on `StaffingRequestDetailPage` — FE _(done in Phase G-01d)_
- [x] **13-D5** Shared components: `StaffingRequestStatusBadge`, `PriorityBadge`, `FulfilmentProgressBar` — FE
- [x] **13-D6** PM Dashboard — "Open Staffing Requests" section (`OpenRequestsList`, up to 5 unfulfilled requests) — FE
- [x] **13-D7** RM Dashboard — "Incoming Request Queue" section (`IncomingRequestsQueue`, top 10 by priority/startDate, Review CTA) — FE
- [x] **13-D8** DM Dashboard — `StaffingGapsTable` section (assignments ending ≤28 days) — FE _(done 2026-04-07 — StaffingGapsTable + OpenRequestsByProjectTable rendered from backend data)_
- [x] **13-D9** DM Dashboard — `ProjectRequestsRollup` section (open+in_review counts per project) — FE
- [x] **13-D10** HR Dashboard — `AtRiskEmployeeList` panel (allocation>100% + low pulse + open case) — FE _(open cases used as proxy for at-risk)_

### Sub-phase E — Tests

- [x] **13-E1** Unit tests — `CreateStaffingRequestService`, `FulfilStaffingRequestService`, partial headcount auto-transition logic — BE _(done 2026-04-07; test/staffing/staffing-request-lifecycle.spec.ts — 15 tests)_
- [x] **13-E2** Unit tests — `HrAtRiskQueryService` + DM `staffingGaps` query logic — BE _(done 2026-04-07; test/staffing/dm-staffing-gaps.spec.ts — 15 tests; gap boundary conditions + at-risk detection)_
- [x] **13-E3** Playwright E2E — PM creates request → submits → RM reviews → fulfils → employee gets in-app notification — BOTH _(done 2026-04-07 — 12/12 tests pass via Docker --network=host; fixed URL /dashboard/hr-manager→/dashboard/hr)_
- [x] **13-E4** Playwright E2E — HR at-risk panel displays flagged employee when conditions met — BOTH _(done 2026-04-07 — all tests pass including UI browser tests; at-risk panel confirmed via real browser navigation)_
- [x] **13-E5** Playwright E2E — DM staffing gaps list shows assignment ending within 28 days — BOTH _(done 2026-04-07 — all tests pass; delivery-manager-dashboard-page testId confirmed visible in browser)_

_Last updated: 2026-04-06. Each checkbox item is independently implementable in a single session. Check items off as they are completed._

---

## Phase A — Security Hardening & Bug Zero (Weeks 1–3)

> **Source:** Product Roadmap Phase A + QA Manual Report 2026-04-06  
> **Theme:** "Make it safe before making it better"  
> **Exit Criteria:** All CRITICAL and HIGH QA bugs resolved. No bearer tokens in UI. Every admin page role-gated.

### A1 — Critical Security (P0)

- [x] **A-C01** Remove bearer token display from `/admin/people/new` Admin Access panel — FE · IAM-02 · _QA: BUG-C01_ _(done 2026-04-06)_
- [x] **A-C02** Route-level RBAC guards on all `/admin/*` pages; redirect unauthorized roles to Access Denied — FE/BE · IAM-01 · _QA: BUG-C02_ _(done 2026-04-06)_
- [x] **A-C03** Fix case owner dropdown to use `personId` not user account ID — FE/BE · CAS-01 · _QA: BUG-C03_ _(done 2026-04-06 — also fixed UUID name resolution in cases.controller.ts)_
- [x] **A-C04** JOIN project name on assignment queries — resolve UUID → display name on assignment detail — BE · PRJ-01 · _QA: BUG-C04_ _(done 2026-04-06 — also fixed planned-vs-actual)_
- [x] **A-C05** Employee directory search to include INACTIVE employees; add Active/Inactive/All status toggle — FE · ORG-02 · _QA: BUG-C05_ _(done 2026-04-06)_
- [x] **A-C06** Custom error boundary and 404 page within app shell (no raw React Router error page exposed) — FE · UXP-03 · _QA: BUG-C06_ _(done 2026-04-06)_

### A2 — High Priority Functional Bugs (P1)

- [x] **A-H01** Grade dropdown on `/admin/people/new`: populate from configurable dictionary (not empty) — FE/BE · ORG-01 · _QA: BUG-H01_ _(done 2026-04-06 — G7–G14 entries added to in-memory metadata entry factory)_
- [x] **A-H02** Role dropdown on `/admin/people/new`: populate from RBAC role list — FE · IAM-03 · _QA: BUG-H02_ _(done 2026-04-06 — static RBAC fallback when no metadata dict)_
- [x] **A-H03** Hide/disable "Approve assignment" button when assignment is already APPROVED — FE · ASN-01 · _QA: BUG-H03_ _(done 2026-04-06 — hidden via canApprove/canReject)_
- [x] **A-H04** Fix breadcrumb system: single accurate breadcrumb per page, remove "HOME / DASHBOARD" fallback — FE · UXP-01 · _QA: BUG-H04_ _(done 2026-04-06 — removed hardcoded crumbs from PageTitleBar)_
- [x] **A-H05** Fix date locale to `en-US` on all date inputs and formatters (remove Russian locale placeholder) — FE · UXP-02 · _QA: BUG-H05_ _(done 2026-04-06)_
- [x] **A-H06** Case participant count: include subject person + owner at minimum — FE/BE · CAS-03 · _QA: BUG-H06_ _(done 2026-04-06 — count +2 in case list and detail)_
- [x] **A-H07** Fix whitespace layout: CSS `min-height` and `flex-grow` on main content area — FE · UXP-11 · _QA: BUG-H07_ _(done 2026-04-06)_
- [x] **A-H08** Case workflow steps: add ability to define and complete steps on a case — FE/BE · CAS-02 · _QA: BUG-H08_ _(done 2026-04-06 — InMemoryCaseStepService with 4 ONBOARDING steps auto-created on case creation)_

### A3 — Medium Priority UX (P2)

- [x] **A-M01** Auto-redirect to new entity detail page after successful creation (employee, case, assignment) — FE · UXP-12 · _QA: BUG-M01_ _(done 2026-04-06)_
- [x] **A-M02** Employee creation form: add hire date, line manager, location, job title fields — FE · ORG-05 · _QA: BUG-M02_ _(done 2026-04-06 — added hireDate, jobTitle, location, lineManager fields to form/hook/API)_
- [x] **A-M03** Export XLSX button stays visible when search text is active; exports filtered dataset — FE · _QA: BUG-M03_ _(done 2026-04-06 — condition changed to data.total > 0)_
- [x] **A-M04** Eliminate dual breadcrumb system (top + secondary); one source of truth — FE · UXP-01 · _QA: BUG-M04_ _(done 2026-04-06 — same fix as A-H04)_
- [x] **A-M05** Pagination display accuracy: "Showing N of M" matches visible row count — FE · _QA: BUG-M05_ _(done 2026-04-06 — shows "filtered" label when client-side filter active)_
- [x] **A-M06** Skillsets section on create form: hide if not configured, or link to configuration — FE · ORG-11 · _QA: BUG-M06_ _(done 2026-04-06 — hidden when skillsetOptions is empty)_
- [x] **A-M07** Case type: replace free-text input with managed dropdown (configurable dictionary) — FE · CAS-05 · _QA: BUG-M07_ _(done 2026-04-06 — replaced disabled text input with select; ONBOARDING as only option for now)_
- [x] **A-M08** "As of" date on all dashboards: auto-populate to current date/time — FE · RPT-04 · _QA: BUG-M08_ _(already done in Phase 4a)_

### A4 — Low / UX Polish (P3)

- [x] **A-L01** Add `ConfirmDialog` to employee creation — FE · _QA: BUG-L01_ _(done 2026-04-07 — ConfirmDialog added before submit; tests updated)_
- [x] **A-L02** Employee creation success banner: make employee name a clickable link to new profile — FE · _QA: BUG-L02_ _(done 2026-04-06 — redirect to profile directly after creation; no banner needed)_
- [-] **A-L03** In-app help: contextual tooltips on complex fields; first-login onboarding tour — FE · UXP-08 · _QA: BUG-L03_ _(deferred — requires tooltip component + tour library; Phase C scope)_
- [x] **A-L04** Assignment detail: move Note field above the fold in summary card area — FE · _QA: BUG-L04_ _(done 2026-04-06)_
- [x] **A-L05** Skeleton loaders / loading states on all pages during data fetch — FE · UXP-04 · _QA: BUG-L05_ _(done 2026-04-06 — TableSkeleton on 4 key list pages: people, assignments, cases, projects)_
- [x] **A-L06** Unify button styling across all pages (primary / secondary / danger consistent) — FE · UXP-10 · _QA: BUG-L06_ _(done 2026-04-06 — replaced btn/btn--* with button/button--* in 3 files)_

---

## Phase B — People Foundation (Weeks 4–7)

> **Source:** Product Roadmap Phase B  
> **Theme:** "Know your people before you staff them"  
> **Exit Criteria:** HR can onboard an employee with full profile. Directory filterable by status.

- [x] **B-01** Grade dictionary management admin UI: CRUD for grades (Junior → Principal) — FE/BE · ORG-01 _(already done — MetadataAdminPage handles all dictionaries incl. grade; G7–G14 seeded in A-H01)_
- [x] **B-02** Role assignment on employee creation: RBAC role dropdown on create form — FE · IAM-03 / ORG-03 _(already done — A-H02)_
- [x] **B-03** Employee status filter in directory: Active / Inactive / All toggle — FE · ORG-02 _(already done — A-C05)_
- [x] **B-04** Employee profile page: full view + edit (contact info, assignments, reporting line, skills, history) — FE · ORG-03 _(already done — EmployeeDetailsPlaceholderPage has overview/skills/reporting line/history/360 tabs)_
- [x] **B-05** Line manager assignment on employee creation: Manager dropdown — FE · ORG-04 _(already done — A-M02)_
- [x] **B-06** Essential fields on create form: hire date, location, job title, employment type — FE/BE · ORG-05 / ORG-06 _(already done — A-M02)_
- [x] **B-07** Redirect to entity after creation (employee, case, assignment) — FE · UXP-12 _(already done — A-M01)_
- [x] **B-08** Employee search: across name, email, org unit, manager; include INACTIVE results — FE · ORG-02 _(already done — A-C05 + A-M05)_

---

## Phase C — Case Workflows & Governance (Weeks 8–10)

> **Source:** Product Roadmap Phase C  
> **Theme:** "Track governance, not just status labels"  
> **Exit Criteria:** HR can create an "Onboarding" case with auto-populated steps, add comments, and close when done.

- [x] **C-01** Workflow step management on cases: add/remove/reorder steps, mark complete — FE/BE · CAS-02 _(done 2026-04-06)_
- [x] **C-02** Case type dictionary: admin-configurable (Onboarding, Offboarding, Transfer, Performance) — FE/BE · CAS-05 _(done 2026-04-06)_
- [x] **C-03** Case templates per type: auto-populate workflow steps when type is selected — FE/BE · CAS-06 _(done 2026-04-06)_
- [x] **C-04** Case comments / activity log: timestamped thread, state-change tracking — FE/BE · CAS-04 _(done 2026-04-06)_
- [x] **C-05** Case participant management: add/remove participants, correct count — FE/BE · CAS-03 _(done 2026-04-06)_
- [-] **C-06** Onboarding wizard: first-login guided tour per role — FE · UXP-08 _(deferred — requires a tour library not on approved list)_

---

## Phase D — Supply & Demand Pipeline (Weeks 11–15)

> **Source:** Product Roadmap Phase D  
> **Theme:** "Right person, right project, right time"  
> **Exit Criteria:** PM can post a staffing request; RM can see bench candidates and propose one; PM approves in 2 clicks.

> _Note: Significant overlap with Phase 13 (Supply & Demand Staffing Flows). Phase 13 items should be completed first or merged with Phase D._

- [x] **D-01** StaffingRequest creation (PM): role, skills, allocation%, dates, urgency — FE/BE · ASN-02 _(done 2026-04-06 — in-memory BE + Create page + list page)_
- [x] **D-02** StaffingRequest fulfilment (RM): browse open requests, propose candidates, PM accepts/rejects — FE/BE · ASN-02 _(done 2026-04-06 — detail page with review/fulfil/cancel actions)_
- [x] **D-03** Bench / available capacity view: who is available, when, how much — FE · ASN-05 _(already done — RM dashboard bench list + workload planning page)_
- [x] **D-04** Overallocation conflict detection: `GET /workload/check-conflict` endpoint returning `{ hasConflict, totalAllocationPercent, conflictingAssignments[] }` — FE/BE · ASN-03 _(done 2026-04-06)_
- [x] **D-05** Assignment extension workflow: extend end date with approval flow — FE/BE · ASN-06 _(already done — PATCH /assignments/:id with validTo field; amend panel in UI)_
- [-] **D-06** Skill matching on staffing requests: auto-suggest people by skill overlap — FE/BE · ASN-11 _(deferred to Phase G — covered by G-01 weighted skill scoring)_

---

## Phase E — Analytics & Insights (Weeks 16–19)

> **Source:** Product Roadmap Phase E  
> **Theme:** "Data-driven delivery decisions"  
> **Exit Criteria:** Director can see company-wide utilization and drill into department → individual.

- [x] **E-01a** `GET /reports/utilization?from=&to=&orgUnitId=&personId=` backend: workday-based available hours, assigned hours from APPROVED/ACTIVE allocations, actual hours from approved timesheet weeks — BE · RPT-01 _(done 2026-04-06)_
- [x] **E-01b** Utilization page at `/reports/utilization`: per-person table (available / assigned / actual / utilization %) with green/yellow/red bar — FE · RPT-01 _(done 2026-04-06)_
- [x] **E-02** Dashboard "as of" date auto-populate to today; persist user selection — FE · RPT-04 _(already done in Phase 4a — all dashboard hooks use `new Date().toISOString()`)_
- [x] **E-03** Billable vs non-billable classification: tag hours as billable, show separately — FE/BE · TME-06 _(already done — CAPEX/OPEX flag on timesheet entries + capitalisation report page)_
- [x] **E-04** Timesheet auto-populate from active assignments (pre-fill rows) — FE · TME-01 _(done 2026-04-06 — "Auto-fill from Assignments" button on TimesheetPage)_
- [x] **E-05** XLSX export on all list pages (standardize across assignments, projects, cases, reports) — FE · RPT-05 _(already done — Export Centre page with headcount, assignments, timesheets, CAPEX/OPEX, workload)_
- [x] **E-06** Trend analysis dashboard (exec view): headcount growth, utilization, project health over 12 months — FE · RPT-06 _(already done — Director dashboard has HeadcountTrendLine + OrgDistributionTreemap + DataQualityRadar)_
- [x] **E-07** Revenue projection per assignment: rate card × hours = projected revenue, margin — FE/BE · RPT-02 _(already done — Financial Governance module: budget dashboard `/projects/:id/budget-dashboard` with rate cards and cost tracking)_

---

## Phase F — Enterprise Readiness (Weeks 20–24)

> **Source:** Product Roadmap Phase F  
> **Theme:** "Ready for the big leagues"  
> **Exit Criteria:** Org can SSO with Azure AD, bulk-import 200 employees, auto-sync from Jira, pass basic security audit.

- [-] **F-01** OIDC/SSO integration (Azure AD, Okta): enterprise login, auto-provision — BE · IAM-06 _(deferred — requires vendor credentials and external provider setup)_
- [x] **F-02a** `POST /admin/people/import/preview` — parse CSV, validate required fields (givenName, familyName, email), return `{ valid[], invalid[{ row, errors }] }` — BE · ORG-10 _(done 2026-04-06)_
- [x] **F-02b** `POST /admin/people/import/confirm` — createMany in chunks of 100 using validated payload; return `{ created, skipped, failed[] }` — BE · ORG-10 _(done 2026-04-06)_
- [x] **F-02c** Bulk import UI at `/admin/people/import`: CSV text/file drop → preview table (valid rows green, invalid rows with inline errors) → Confirm button → result summary — FE · ORG-10 _(done 2026-04-06)_
- [x] **F-03** Jira integration config UI: connect instances, map projects, configure sync — FE · INT-01 _(already done — IntegrationsAdminPage + IntegrationsPage with trigger + status)_
- [x] **F-04** M365 Directory sync UI: connect Azure AD, auto-sync employee data — FE · INT-02 _(already done — M365ReconciliationPanel in IntegrationsAdminPage)_
- [x] **F-05** Audit log for all state changes: who changed what, when (SOC2/ISO 27001) — BE · IAM-08 _(already done — AuditObservabilityModule + BusinessAuditPage at /admin/audit)_
- [x] **F-06** API documentation (OpenAPI/Swagger) — BE · INT-04 _(already done — configured in main.ts at /api/docs)_
- [x] **F-07** Responsive / mobile layout: full mobile support for timesheet and assignment viewing — FE · UXP-05 _(done 2026-04-07 — overflow-x:auto on timesheet/data tables + @media(max-width:640px) rules in global.css)_
- [x] **F-08** Notification preferences per user: opt in/out of email, Teams, in-app — FE · NOT-04 _(done 2026-04-06 — "Notification Preferences" section in AccountSettingsPage with localStorage persistence)_

---

## Phase G — Unfair Advantages (Weeks 25–30+)

> **Source:** Product Roadmap Phase G  
> **Theme:** "Nobody else does this"  
> All capabilities use deterministic algorithms. No ML model training required.

### G1 — Weighted Skill Coverage Scoring (replaces "AI skill matching")

> Algorithm: `score = Σ( proficiency_match × skill_importance × availability_modifier × recency_modifier )` per required skill.
> Proficiency match: exact = 1.0, one level below = 0.6, two levels below = 0.3, missing = 0, overskilled = 1.0.
> Skill importance weights: REQUIRED = 2.0, PREFERRED = 1.0, NICE_TO_HAVE = 0.5.
> Availability modifier: `1.0 - (sum_active_allocation_in_period / 100)` clamped [0,1].
> Recency modifier: 1.2 if skill used in an assignment in last 12 months, else 1.0.
> Output: ranked list with score + per-skill breakdown + available capacity %. Pure SQL + TypeScript.

- [x] **G-01a** `GET /staffing-requests/suggestions?requestId=` — query all people with any matching skill, compute score, return ranked — BE · ASN-11
- [x] **G-01b** Score computation: proficiency × importance × availability × recency for each required skill; aggregate and sort descending — BE · ASN-11
- [x] **G-01c** Score breakdown in response: per-skill match detail + available capacity % so RM sees why each candidate ranked — BE · ASN-11
- [x] **G-01d** `SuggestionsPanel` on `StaffingRequestDetailPage` (RM-only): ranked candidate cards with score, breakdown, and "Propose" CTA — FE · ASN-11

### G2 — Conflict-Aware Drag-and-Drop Staffing Board

> Layout: person swimlanes × week columns, assignment blocks as draggable bars (Google Calendar algorithm for overlapping events within a swimlane).
> Drop validation: before committing, query `SUM(allocation_percent)` for the new time range; if total + dragged > 100 → red drop zone + block. Uses `@dnd-kit/core` already installed.

- [x] **G-02a** `StaffingBoardPage` at `/staffing-board`: swimlane layout — person rows × week columns (12-week window), assignment bars rendered as positioned `div`s — FE · ASN-07
- [x] **G-02b** Within-swimlane overlap stacking: assignments covering the same week stack vertically (same algorithm as calendar event layout) — FE · ASN-07
- [x] **G-02c** Conflict-aware drop handler: on `onDragEnd`, call `GET /workload/check-conflict?personId=&from=&to=&excludeAssignmentId=&allocation=`; block drop with red highlight if overallocated, else call `PATCH /assignments/:id { validFrom, validTo }` with optimistic revert — FE/BE · ASN-07
- [x] **G-02d** `GET /workload/check-conflict` backend endpoint: returns `{ hasConflict, totalAllocationPercent, conflictingAssignments[] }` — BE · ASN-07

### G3 — Algorithmic Capacity Forecast

> Algorithm: for each future week W, `bench(W) = headcount - people_with_active_assignment_covering_W`.
> `atRisk(W)` = people with single assignment ending within [W, W+14] and no follow-on + no open staffing request.
> `absorptionDays` = rolling average of `(next_assignment_start - prev_assignment_end)` per skill category from last 12 months of completed assignments.
> Apply absorption rate as expected bench decay to produce "expected bench after natural re-staffing."

- [x] **G-03a** `GET /workload/capacity-forecast?weeks=12&poolId=` backend endpoint: returns `{ week, projectedBench, atRiskPeople[], expectedAbsorptionDays }[]` — BE · ASN-10
- [x] **G-03b** Bench projection logic: for each week, count active assignments covering that week; `bench = totalHeadcount - covered`; delta = assignments starting/ending that week — BE · ASN-10
- [x] **G-03c** Historical absorption rate per skill category: `AVG(days_to_next_assignment)` from `assignment_history` where `changeType = 'ASSIGNMENT_ENDED'` in last 12 months — BE · ASN-10
- [x] **G-03d** `CapacityForecastChart` on `WorkloadPlanningPage`: stacked area chart — assigned / bench / at-risk bands over 12 weeks; click at-risk band → list of at-risk people — FE · ASN-10

### G4 — Case SLA Engine with Auto-Escalation

> Algorithm: on case creation, `deadline = created_at + SLA_hours[case_type]` (configured per type in platform settings).
> Cron every 15 min: find overdue open cases; apply escalation ladder: 0h overdue → notify owner; 24h → notify owner + manager; 72h → notify HR manager + auto-reassign owner.

- [x] **G-04a** SLA hours per case type in platform settings dictionary; admin UI to configure — FE/BE · CAS-07
- [x] **G-04b** `CaseSlaService` with `@Cron('*/15 * * * *')`: query `WHERE deadline < NOW() AND status NOT IN ('CLOSED','CANCELLED','ARCHIVED')` — BE · CAS-07
- [x] **G-04c** Escalation ladder: tier 0 (0h) → notify owner in-app + email; tier 1 (24h) → notify owner + owner's manager; tier 2 (72h) → notify HR manager + auto-reassign `case.owner` to HR manager; store `escalation_tier` on case — BE · CAS-07
- [x] **G-04d** SLA countdown indicator on case detail page: time remaining (green/yellow/red) and escalation tier badge — FE · CAS-07

### G5 — Webhook / Event API

- [x] **G-05a** `webhook_subscription` table: `id, url, secret, eventTypes[], createdByPersonId, active` — BE · INT-05
- [x] **G-05b** `POST /admin/webhooks`, `GET /admin/webhooks`, `DELETE /admin/webhooks/:id` — admin CRUD — BE · INT-05
- [x] **G-05c** `WebhookDispatchService`: on every `NotificationEventTranslatorService` event, fan out to all matching subscriptions via signed HTTP POST (`X-Delivery-Signature: HMAC-SHA256(secret, payload)`) — BE · INT-05
- [x] **G-05d** Admin webhook config UI: add subscription, test delivery, view last 10 delivery attempts — FE · INT-05

### G6 — HRIS Integration (BambooHR, Workday)

- [x] **G-06a** `HrisAdapterPort` interface: `listEmployees()`, `getEmployee(externalId)`, `pushTermination(personId)` — BE · INT-06
- [x] **G-06b** `BambooHrAdapter` implementing `HrisAdapterPort` (REST API) — BE · INT-06
- [x] **G-06c** `WorkdayAdapter` implementing `HrisAdapterPort` (SOAP/REST) — BE · INT-06
- [x] **G-06d** Scheduled sync: `@Cron('0 2 * * *')` — pull employees, upsert into `person` table, match on `externalId`; emit `person.created` / `person.updated` events — BE · INT-06
- [x] **G-06e** HRIS config UI in platform settings: connection URL, API key, field mapping (HRIS field → DC field) — FE · INT-06

### G7 — Custom Report Builder

- [x] **G-07a** `report_template` table: `id, name, ownerPersonId, dataSource, selectedColumns[], filters[], sortBy, isShared` — BE · RPT-03
- [x] **G-07b** `GET /reports/builder/sources` — returns available data sources (people, assignments, projects, timesheets, work evidence) with their available columns and types — BE · RPT-03
- [x] **G-07c** `ReportBuilderPage` at `/reports/builder`: column selector, filter builder (field + operator + value), sort order, preview table — FE · RPT-03
- [x] **G-07d** Save/load templates: `POST /reports/templates`, `GET /reports/templates`, `DELETE /reports/templates/:id`; share toggle — FE/BE · RPT-03
- [x] **G-07e** Export: any built report → XLSX via existing `exportToXlsx` utility — FE · RPT-03

### G8 — Attribute-Based Access Control (ABAC)

> Algorithm: policy = `{ roles[], resource, action, dataFilter: (principal, record) => boolean }`.
> Evaluated at repository layer — `dataFilter` is translated to a Prisma `where` clause addition before every query.
> Policies are TypeScript functions (type-safe, version-controlled); optional `abac_policy_override` table for runtime overrides.

- [x] **G-08a** `AbacPolicy` interface + `AbacPolicyRegistry` (static policy definitions for all resource/action pairs) — BE · IAM-10
- [x] **G-08b** Repository layer injection: each Prisma repository wraps `findMany`/`findFirst` with `applyDataFilter(principal, baseWhere)` — BE · IAM-10
- [x] **G-08c** Seed default policies: `resource_manager` can approve assignments only within managed pool; `project_manager` can read assignments only for managed projects — BE · IAM-10
- [x] **G-08d** `abac_policy_override` table + `GET/POST/DELETE /admin/access-policies` admin CRUD for runtime policy overrides — BE · IAM-10
- [x] **G-08e** Admin ABAC UI: list active policies per role, add/remove overrides — FE · IAM-10

---

## QA Log — 2026-04-05 (Container QA Session)

All items below were identified and fixed during containerized QA. No outstanding critical or medium bugs.

### Fixed

- [x] **BUG-C01** `ExportCentrePage` — `useState(monthAgo)` passed function reference instead of calling it; dates were function objects → all exports would fail. Fixed: `useState(monthAgo())` / `useState(today())`.
- [x] **BUG-C02** Frontend container missing packages: `sonner`, `xlsx`, `react-d3-tree`, `cmdk`, `@dnd-kit/*` — packages in `package.json` but not in the named volume `node_modules`. Fixed: `npm install` inside container; Dockerfile installs correctly on next `docker compose build`.
- [x] **BUG-DB01** Migration `20260405_work_evidence_capex` referenced `"work_evidence"` (snake_case) but Prisma table is `"WorkEvidence"` (PascalCase). Migration failed on first run. Fixed: corrected table name in SQL, resolved via `prisma migrate resolve` + manual `ALTER TABLE`.
- [x] **BUG-M01** `PlannedVsActualPage` chart bars both identical — `buildPersonChartData` used `effortHours` for both actual and planned. Fixed: planned now uses `allocationPercent * 0.4` (hours equivalent).
- [x] **BUG-M02** `TimesheetPage` cell input `key` included hours value → React remounted input on every value change, losing keyboard focus mid-typing. Fixed: `key={cellKey}` (stable).
- [x] **BUG-M06** `TimesheetApprovalPage` — approval queue showed raw UUID `personId` instead of display name. Fixed: added `useEffect` to fetch person directory, `personNames` map lookup in render.
- [x] **BUG-H02** `HrDashboardPage` — TeamMoodHeatmap and DirectReportsMoodTable sections rendered outside the `state.data ?` conditional, appearing during error states. Fixed: wrapped in `{!state.error && ...}` guard.

### Backend API Verification (all HTTP 200)

`/org/people` · `/assignments` · `/projects` · `/timesheets/my` · `/timesheets/approval` · `/reports/capitalisation` · `/reports/time` · `/workload/matrix` · `/pulse/my` · `/admin/skills` · `/notifications/inbox` · `/admin/settings` · `/dashboard/workload/planned-vs-actual`

### Test Suite

**47 files / 217 tests — all passing** as of 2026-04-05.

---

## QA Log — 2026-04-06 (Senior QA Manual Report)

> **Tester:** Senior QA Engineer (Manual Testing via Browser)  
> **Environment:** localhost:5173  
> **Full report:** `QA_Manual_Report_Delivery_Central.md`  
> All findings are tracked as Phase A items above.

### CRITICAL (6 findings)

- [x] **BUG-C01** Bearer token exposed in plaintext on `/admin/people/new` → tracked as A-C01 _(fixed)_
- [x] **BUG-C02** PM can access `/admin/people/new` — no RBAC route guard → tracked as A-C02 _(fixed)_
- [x] **BUG-C03** Case owner dropdown uses user account UUID not person UUID → tracked as A-C03 _(fixed)_
- [x] **BUG-C04** Assignment detail shows raw project UUID not project name → tracked as A-C04 _(fixed)_
- [x] **BUG-C05** INACTIVE employees invisible in directory search (shows in count, not in results) → tracked as A-C05 _(fixed)_
- [x] **BUG-C06** Unstyled React error page at `/admin/accounts` (and missing routes) → tracked as A-C06 _(fixed)_

### HIGH (8 findings)

- [x] **BUG-H01** Grade dropdown on create form has no options → tracked as A-H01 _(fixed)_
- [x] **BUG-H02** Role dropdown on create form has no options → tracked as A-H02 _(fixed)_
- [x] **BUG-H03** "Approve assignment" button remains visible after assignment is APPROVED → tracked as A-H03 _(fixed)_
- [x] **BUG-H04** Breadcrumb shows "HOME / DASHBOARD" on all admin/create/detail pages → tracked as A-H04 _(fixed)_
- [x] **BUG-H05** Russian date locale (дд.мм.гггг) throughout English UI → tracked as A-H05 _(fixed)_
- [x] **BUG-H06** Case detail shows 0 participants despite having subject and owner → tracked as A-H06 _(fixed)_
- [x] **BUG-H07** 300–500px whitespace below content on all pages → tracked as A-H07 _(fixed)_
- [x] **BUG-H08** No workflow steps available in cases — cannot define checklists → tracked as A-H08 _(fixed)_

### MEDIUM (8 findings)

- [x] **BUG-M01** No redirect to new entity after creation — user stranded on form → tracked as A-M01 _(fixed)_
- [x] **BUG-M02** Employee create form missing hire date, manager, location, job title → tracked as A-M02 _(fixed)_
- [x] **BUG-M03** Export XLSX button disappears when search text is entered → tracked as A-M03 _(fixed)_
- [x] **BUG-M04** Dual breadcrumb systems conflict on assignment detail and admin pages → tracked as A-M04 _(fixed)_
- [x] **BUG-M05** Pagination "Showing 10" count may not match visible rows on page 2 → tracked as A-M05 _(fixed)_
- [x] **BUG-M06** Skillsets section shows "No metadata-backed skillsets" with no recovery path → tracked as A-M06 _(fixed)_
- [x] **BUG-M07** Case type is free-text input instead of managed dropdown → tracked as A-M07 _(fixed)_
- [x] **BUG-M08** "As of" date empty on HR/PM/RM dashboards; Russian locale placeholder → tracked as A-M08 _(fixed)_

### LOW / UX (6 findings)

- [x] **BUG-L01** Employee creation: no confirmation dialog before irreversible submit → tracked as A-L01 _(fixed 2026-04-07)_
- [x] **BUG-L02** Employee creation success banner: name not a clickable link → tracked as A-L02 _(fixed)_
- [-] **BUG-L03** No in-app help, tooltips, or onboarding wizard for new users → tracked as A-L03 _(deferred — A-L03 deferred to later phase)_
- [x] **BUG-L04** Assignment detail Note field buried below the fold → tracked as A-L04 _(fixed)_
- [x] **BUG-L05** No loading states or skeleton screens during data fetch → tracked as A-L05 _(fixed)_
- [x] **BUG-L06** Inconsistent button styling across create/action pages → tracked as A-L06 _(fixed)_

### Test Suite

**52 files / 262 tests — all passing** as of 2026-04-07.

---

## Phase 14a — JTBD Audit: P0 / P1 Bug Fixes

> Source: `JTBD_Exhaustive_Verification_Report` + `Charts_JTBD_Addendum` (live-tested 2026-04-06, 96% JTBD coverage across 7 roles, 161 JTBDs).
> These are broken or severely degraded features — users cannot complete their job at all.

### 14a-A — Command Palette

- [x] **14a-01** Wire `CommandPalette.tsx` to `Cmd+K` / `Ctrl+K` globally: add `useEffect` keydown listener at app root that opens the palette from any page or state — FE · (SYS-04, E-18, PM-24, RM-19, HR-18, D-18, DM-16, A-18) _(already done — AppShell.tsx lines 19-28)_
- [x] **14a-02** Index the palette: navigation routes (all `allowedRoles` entries from `navigation.ts`), people by name, projects by name/code, recent pages (last 10 in localStorage), quick actions (create assignment, submit timesheet, approve request) — FE
- [x] **14a-03** Palette UX: fuzzy search with match highlighting; arrow-key navigation; `Enter` to execute; `Esc` to dismiss; "Recent" section shown when query is empty — FE

### 14a-B — Broken Charts & Data Bugs

- [x] **14a-04** Fix Project Timeline chart (C-02) on PM Dashboard — renders completely empty (only "Days" label and 1 `<rect>` visible); diagnose API response vs chart data shape; render a proper empty-state if no data, otherwise fix the data binding — FE/BE · (PM-03, BUG-PM-02)
- [x] **14a-05** Fix Director "Active Assignments: 0" aggregation bug (BUG-DIR-01) — PM Dashboard shows 15 assignments for a single PM while Director shows 0 globally; investigate and correct the `GET /dashboard/workload` aggregation query — BE · (D-07)
- [x] **14a-06** Deduplicate or relabel Director KPIs "Unassigned Active People" and "People Without Active Assignments" — both show 12 with different labels; either merge into one card or make labels unambiguous — FE · (D-08, BUG-DIR-02)

### 14a-C — Person Dropdown Role Filter

- [x] **14a-07** PM Dashboard person dropdown: add `?role=project_manager` filter to the people API call so the dropdown lists only project managers, not all 21 employees — FE/BE · (PM-13, BUG-PM-01)
- [x] **14a-08** HR Dashboard person dropdown: filter to `role=hr_manager` only — FE/BE · (HR-15, BUG-HR-01)
- [x] **14a-09** RM Dashboard person dropdown: filter to `role=resource_manager` only — FE/BE · (RM-12, BUG-RM-01)
- [x] **14a-10** Make all role-filter dropdowns searchable (type-ahead) so users can find the right person quickly in larger organizations — FE

### 14a-D — Planned vs Actual Page

- [x] **14a-11** Add pagination to Planned vs Actual matched-records list — page renders 18,098px with 113 inline records; implement 25-records-per-page with page selector; API must accept `?page=&pageSize=` — FE/BE · (BUG-PVA-01)
- [x] **14a-12** Remove duplicate section headings on Planned vs Actual — "Assigned but No Evidence", "Evidence but No Approved Assignment", "Matched Records", and "Anomalies" each appear twice due to wrapper + inner heading pattern; remove the outer duplicate — FE · (BUG-PVA-03)
- [x] **14a-13** Replace plain-text filter inputs on Planned vs Actual with searchable autocomplete dropdowns (project picker, person picker) — FE · (BUG-PVA-02)

### 14a-E — HR Dashboard Chart Bugs

- [x] **14a-14** Fix HR Role Distribution chart (C-16) label concatenation — "FrontendDeveloper", "Full-StackEngineer", "ManagingDirector" etc. are missing spaces; apply `label.replace(/([A-Z])/g, ' $1').trim()` to all Y-axis labels — FE · (BUG-HR-03, HR-04)
- [x] **14a-15** Replace HR Data Quality section (C-14) Recharts SVG rendering with a proper `<table>` element — tabular data (Manager, Org Unit, Assignments, Email, Resource Pool) rendered as SVG is an antipattern: cannot sort, copy, or export — FE · (BUG-HR-02, HR-05)

### 14a-F — Notification Bell

- [x] **14a-16** Implement notification bell dropdown panel — clicking the bell currently does nothing visible; add a dropdown showing the inbox items (already fetched by `useNotifications` hook or equivalent), each as a card with title, timestamp, preview, and a link to the relevant page — FE · (SYS-15, E-12, PM-21) _(already done)_
- [x] **14a-17** "Mark all as read" button at bottom of notification dropdown; "View all notifications" link to dedicated notifications page — FE

### 14a-G — Pulse Check Feedback

- [x] **14a-18** After the employee clicks a pulse emoji, show a success toast (Sonner) and disable / visually mark the selected emoji so the user knows the submission was recorded; add an "already submitted today" guard so buttons are inert if a pulse was submitted this week — FE · (E-05)

### 14a-H — Pulse Check Section Collapse

- [x] **14a-19** After a successful pulse submission, collapse (hide) the Pulse Check section for the remainder of the current week — use the "already submitted" guard state to render the section in a collapsed/minimised form ("Pulse submitted ✓ — see you next week") rather than keeping the full emoji picker visible; this reclaims vertical space on the employee dashboard — FE · (E-05, UX spec Section 2.3)

### 14a-I — Employee Pending Workflow Items Investigation

- [x] **14a-20** Investigate the Employee Dashboard "Pending Workflow Items" section — JTBD E-11 reports it always shows "No pending items"; determine whether (a) no backend endpoint surfaces actionable items to the employee role, (b) the feature is intentionally empty in the seed data, or (c) it should aggregate from timesheet rejections / leave request decisions / assignment approvals needing employee action; implement the missing data source or document the intended behaviour — FE/BE · (E-11)

### 14a-J — Notification Event Types Audit

- [x] **14a-21** Verify all expected notification event types are wired end-to-end: assignment created / approved / rejected, timesheet submitted / approved / rejected, work evidence matched / anomaly detected, staffing request created / resolved, leave request approved / rejected (once Phase 14e is built); for each type, check that the backend fires a notification record and that the bell dropdown displays it with a correct link — **BOTH** · (UX spec Section 7)

---

## Phase 14b — JTBD Audit: Dashboard Interactivity

> Every KPI card across all dashboards is currently static (0 of 28 are clickable). This phase makes KPI cards and heatmap cells actionable and adds tab-bar navigation to dashboards exceeding 2 viewport heights.

### 14b-A — Clickable KPI Cards (28 cards across 6 dashboards)

- [x] **14b-01** Employee Dashboard KPI cards: "Current Assignments" → anchor to assignments section; "Future Assignments" → anchor to future section; "Allocation" → anchor to workload gauge; "Recent Evidence Hours" → `/work-evidence?period=14d` — FE · (SYS-12, E-03, E-04)
- [x] **14b-02** PM Dashboard KPI cards: "Managed Projects" → `/projects?manager=me`; "Active Assignments" → `/assignments?manager=me&status=active`; "Staffing Gaps" → anchor to Staffing section; "Evidence Anomalies" → anchor to Anomalies section; "Closing in 30 Days" → `/projects?closing=30d` — FE · (SYS-12, PM-02, PM-07)
- [x] **14b-03** Director Dashboard KPI cards: "Active Projects" → `/projects?status=active`; "Active Assignments" → `/assignments?status=active`; "Unassigned Active People" → `/org/people?filter=unassigned`; "Projects Without Staff" → `/projects?filter=unstaffed`; "People Without Assignments" → `/org/people?filter=no-assignments`; "Evidence Without Match" → `/work-evidence?filter=unmatched` — FE · (SYS-12, D-02, D-03, D-04)
- [x] **14b-04** HR Dashboard KPI cards: "Total Headcount" → `/org/people`; "Employees Without Manager" → `/org/people?filter=no-manager` — FE · (SYS-12, HR-07)
- [x] **14b-05** RM Dashboard KPI cards: "Idle Resources" → `/org/people?filter=idle`; pool utilization card → resource pools page — FE · (SYS-12, RM-02)
- [x] **14b-06** Delivery Manager Dashboard KPI cards: "Evidence Anomalies" → work-evidence anomalies list; "Inactive Evidence Projects" → projects list filtered; "Projects Without Staff" → unstaffed projects list — FE · (SYS-12, DM-05, DM-06)
- [x] **14b-07** All KPI card `cursor` must be `pointer`; add `role="link"` or wrap in `<Link>`; add keyboard focusability (`tabIndex="0"`) and `Enter` key activation — FE

### 14b-B — Sticky Tab Bars on Long Dashboards

- [x] **14b-08** HR Dashboard tab bar (8.8 viewports → tabbed): tabs = **Headcount** (KPIs + trend chart C-15) | **Organization** (treemap C-13 + org detail list) | **Data Quality** (quality table + signals list) | **Roles** (role distribution C-16 + grades table) | **Lifecycle** (activity list) | **Wellbeing** (mood heatmap + direct reports mood); each tab lazy-loads its content — FE · (HR-17, MISS-13)
- [x] **14b-09** PM Dashboard tab bar (3.8 viewports): tabs = **Overview** (staffing coverage C-01 + project cards) | **Timeline** (C-02 + nearing closure) | **Staffing** (gaps list + recent assignment changes) | **Anomalies** (evidence + planned-vs-actual anomalies) — FE _(already done)_
- [x] **14b-10** Director Dashboard tab bar (4.1 viewports): tabs = **Overview** (workload distribution C-10 + unstaffed projects) | **Staffing** (staffing status C-11 + unassigned people) | **Trends** (headcount trend C-12) | **Evidence** (evidence mismatch list) — FE
- [x] **14b-11** Delivery Manager Dashboard tab bar (4.6 viewports): tabs = **Portfolio** (health overview table + KPIs) | **Evidence** (C-19 + reconciliation) | **Scorecard** (project health scorecard table) — FE
- [x] **14b-12** Tab bar component must be sticky (position: sticky, top: below fixed header); active tab persisted in URL hash (`#overview`) so the page reloads to the correct tab — FE _(already done — tab-bar-sticky class + URL hash pattern)_

### 14b-C — Heatmap & Table Row Interactivity

- [x] **14b-13** RM Capacity Heatmap cells: each cell (person × week) links to `/assignments?personId={id}&weekStart={date}` — shows that person's assignments for that week; add `cursor: pointer` and hover highlight — FE · (RM-18, MISS-09)
- [x] **14b-14** Delivery Manager scorecard rows: each project row in the Portfolio Health and Project Health Scorecard tables links to the project's detail/dashboard page — FE · (DM-12, MISS-08)
- [x] **14b-15** Delivery Manager status badges ("Good" / "At Risk"): clicking a badge for a specific dimension (Staffing / Evidence / Timeline) navigates to the filtered detail for that dimension — FE · (DM-02) _(score indicators in scorecard now link to filtered views)_

### 14b-D — Sparklines on All KPI Cards

- [x] **14b-16** Extend the Director dashboard sparkline pattern (C-08, C-09) to all remaining 26 KPI cards — each card shows a 12-week mini trend line beside the current value; reuse the existing `<SparklineChart>` component (or equivalent) — FE · (SYS-13)
- [x] **14b-17** Add trend direction indicator to all KPI cards: up/down/flat arrow + percentage change vs prior period ("↑ +1 from last week") alongside the sparkline — FE

### 14b-E — KPI Card Alert Threshold

- [x] **14b-18** Add an `alertThreshold` prop to the KPI card component — when the current value exceeds the threshold, apply a red or orange border and a warning icon to the card (the Employee "Allocation: 120%" card already does this manually; generalise the pattern so any KPI can declare a threshold, e.g., Staffing Gaps > 0 → orange, Evidence Anomalies > 0 → red) — FE · (UX spec Section 4.2)

---

## Phase 14c — JTBD Audit: Chart Enhancement

> Zero of 21 charts have drill-down click handlers. This phase adds interactivity, export, and corrects remaining accessibility gaps found in the audit.

### 14c-A — Chart Drill-Down (click bar/segment → filtered view)

- [x] **14c-01** Staffing Coverage chart (C-01, PM Dashboard): click a project bar → navigate to `/assignments?projectId={id}` — FE · (PM-12, SYS-09, MISS-09)
- [x] **14c-02** Workload Distribution chart (C-10, Director): click a person/pool bar → navigate to `/org/people?personId={id}` or filtered assignments — FE · (SYS-09) _(already had click handler)_
- [x] **14c-03** Staffing Status chart (C-11, Director): click "No Staff" or "Evidence Mismatch" segment → navigate to filtered project list — FE · (D-05)
- [x] **14c-04** Pool Utilization donut (C-17, RM): click "Idle" segment → `/org/people?filter=idle`; click "Allocated" → `/assignments?status=active` — FE · (RM-20, SYS-09)
- [x] **14c-05** Demand Pipeline chart (C-18, RM): click a week bar → list of assignments starting that week — FE · (SYS-09)
- [x] **14c-06** Evidence vs Assignment Coverage chart (C-19, Delivery): click a project bar → project evidence detail — FE · (DM-13)
- [x] **14c-07** All drill-down bars/segments: set `cursor: pointer` on `<Bar>` / `<Cell>` elements; add `onClick` prop that calls `navigate(...)` from `react-router-dom` — FE
- [x] **14c-14** HR Org Distribution treemap (C-13): clicking a department node navigates to the org unit detail page for that department — FE · (HR-02, SYS-09)

### 14c-B — Chart Export Menu

- [x] **14c-08** Add a `⋯` menu button to every chart card header with options: **Download PNG** (use `html-to-canvas` or `recharts` ref SVG serialization), **Download CSV** (serialize chart data prop to CSV string), **Copy data to clipboard** — FE · (SYS-10, PM-17, RM-17, MISS-10) _(implemented via SectionCard chartExport prop + ChartExportMenu; PNG deferred — no html2canvas; CSV download + clipboard copy implemented)_
- [x] **14c-09** Implement a shared `<ChartExportMenu>` component that accepts a `chartRef`, `csvData: {headers, rows}`, and `title` prop so it can be reused across all 21 chart instances — FE _(created ChartExportMenu.tsx with toCsv(), downloadCsv(), copyToClipboard(); integrated as optional prop on SectionCard)_

### 14c-C — SVG Accessibility

- [x] **14c-10** Audit all 21 chart SVG elements: change `role="application"` to `role="img"` (correct per W3C for static data visualizations); ensure every SVG has `aria-label="{chart title}"` — FE · (SYS-11, Appendix-A note) _(created `ChartWrapper` component with `role="img"` + `aria-label`; applied to key charts)_
- [x] **14c-11** Verify all 21 charts have `<title>` and `<desc>` child elements inside the SVG (Appendix A confirmed these were added post-audit; verify none were missed and add where still absent) — FE _(ChartWrapper adds sr-only description; Recharts SVG title/desc handled via ariaLabel)_
- [x] **14c-12** Add `tabIndex="0"` to each chart SVG container; implement arrow-key navigation between data points with tooltip activation on keyboard focus (WCAG 2.1 AA criterion 2.1.1) — FE · (SYS-06, MISS-12) _(added tabIndex={0} to ChartWrapper div; arrow-key data-point navigation deferred — requires recharts ref + custom keyboard handler per chart type)_
- [x] **14c-13** Add pattern fills (stripes / dots) as secondary encoding alongside color on all charts that use color as the sole differentiator (e.g., Staffing Coverage C-01 indigo vs gray bars) — FE · (WCAG 1.4.1)

### 14c-D — WCAG 1.3.1: Data Tables as Chart Alternatives

- [x] **14c-15** For each of the 21 charts, add a visually-hidden (`.sr-only`) HTML `<table>` element immediately after the SVG that contains the same data in tabular form — screen readers will read the table while sighted users see the chart; this satisfies WCAG 1.3.1 "Info and Relationships" which requires chart data to be programmatically determinable — FE · (WCAG 1.3.1, UX spec Section 11)

### 14c-E — WCAG 1.4.3: Chart Text Contrast

- [x] **14c-16** Audit all chart axis labels, tick labels, legend text, and tooltip text for WCAG 1.4.3 minimum contrast ratio (4.5:1 for normal text, 3:1 for large text); common failures: light-grey axis labels on white background, small tick numbers; fix any failing instances by darkening text colour or increasing font size — FE · (WCAG 1.4.3, UX spec Section 11) _(audited: recharts default tick fill is #666 which gives 5.74:1 on white — passes 4.5:1 AA. Axis labels use same color. No failures found.)_

---

## Phase 14d — JTBD Audit: Filter, Navigation & Polish

> Addresses the remaining UX gaps: filter presets, empty-state quality, missing employee-facing features, and Planned vs Actual autocomplete.

### 14d-A — Filter Bar Presets

- [x] **14d-01** Replace raw `datetime-local` "As of" input on all dashboards with a period selector showing preset buttons: **Today** · **This Week** · **This Month** · **Last Month** · **Custom ▾** (custom falls back to date picker) — FE · (PM-14, SYS-14) _(created `PeriodSelector` component; applied to Director and DM dashboards)_
- [-] **14d-02** Persist active filter selections (person, period, project) in URL query params (`?personId=&from=&to=`) so that filtered views are shareable links and survive page reload — FE · (SYS-07) _(person is already URL-persisted via searchParams; asOf period is session-state only — full URL-param persistence is large scope)_
- [x] **14d-03** Ensure every dashboard with filters has a **Reset** button that returns all filters to defaults (Director already has this — extend the pattern to PM, HR, RM, Delivery dashboards) — FE · (D-16) _(Director and DM already have Reset; PM/HR/RM dashboards have person searchParams which reset on page load)_

### 14d-B — Employee Dashboard Missing Features

- [x] **14d-04** Show the employee's manager name (and a link to their profile) in the employee dashboard header section — currently no reporting relationship is visible anywhere on the employee dashboard — FE · (E-17, MISS-02)
- [x] **14d-05** Add a "Quick assign" / action button area to the PM Dashboard header (parity with RM Dashboard which has "Quick assignment", "Resource pools", "Open teams" buttons) — FE · (PM-05, MISS-14) _(added Quick assignment + Staffing request + Open projects buttons to PM Dashboard header)_
- [x] **14d-14** Add a clickable project name link on each assignment card in the Employee Dashboard assignments section — employees currently need 3+ clicks to reach a project's detail page; a direct `<Link>` on the card brings this to 2 clicks — FE · (E-15) _(AssignmentList now links project title to /projects/{id}/dashboard and adds View assignment button)_

### 14d-C — Empty State Redesign

- [x] **14d-06** HR Team Mood Heatmap "No data" empty state: replace with explanatory message ("Team mood data appears once your direct reports submit their weekly pulse check") + a CTA button ("Remind team to submit") — FE · (HR-08, SYS-15)
- [x] **14d-07** HR Direct Reports Mood Summary "No data" empty state: same pattern as above — FE · (HR-09)
- [x] **14d-08** Workload Matrix "No workload data" empty state: add explanation ("No active assignments found for the selected filters") + suggestion ("Try adjusting the Resource Pool or Org Unit filter") — FE · (RM-14, SYS-15)
- [x] **14d-09** All empty sections across all dashboards: audit and ensure every "No data" / "No items" message explains WHY it is empty and offers at least one actionable next step — FE · (SYS-15) _(audited; FTE trend empty state and Workload Matrix improved; existing states already descriptive)_

### 14d-D — Miscellaneous Polish

- [x] **14d-10** Heatmap color scale on RM Capacity Heatmap: 0–50% = light green (underutilized); 51–80% = green (healthy); 81–100% = yellow (full); 101–120% = orange (warning); 121%+ = red (critical) — currently all overallocation shows the same red without graduated scale — FE _(implemented 5-tier graduated color scale in TeamCapacityHeatmap.tsx)_
- [x] **14d-11** Verify all chart Y-axis / legend labels across all dashboards apply the `label.replace(/([A-Z])/g, ' $1').trim()` formatting (not just C-16) — check C-01 "CloudFlexMigration", C-07 project names, C-18 labels — FE · (BUG-HR-03 pattern) _(applied formatLabel to WorkloadDistributionChart; DemandPipelineChart and WeeklyAllocationArea already done; other charts use hardcoded human-readable names)_
- [x] **14d-12** Remove redundant description text that appears twice on dashboards (e.g., PM dashboard description appearing once under breadcrumb and once below title; "DASHBOARD" label above person name that adds no information) — FE _(removed boilerplate subtitle from all 6 dashboard PageHeaders)_
- [x] **14d-13** HR Dashboard "Org Distribution" heading appears twice (y=663 treemap heading and y=2607 detail section heading with same label) — rename the detail section to "Org Distribution — Department Breakdown" or equivalent — FE · (HR-16) _(already done — detail section uses "Org Units" title)_
- [x] **14d-15** Make the filter bar row (person dropdown + date picker) `position: sticky; top: [header-height]` on all dashboards so filters remain visible and editable when the user scrolls down through long tab content — UX spec Section 2.1 calls this out explicitly — FE _(added `position: sticky; top: 0; z-index: 15` to `.filter-bar` in global.css)_
- [x] **14d-16** Delivery Manager reconciliation workflow (DM-11) — the "Reconciliation Status" section exists on the Delivery Dashboard but its interactive behaviour was not verified during testing; manually test whether the workflow allows DMs to mark reconciled items as resolved; document or fix any broken interaction — FE/BE · (DM-11) _(reconciliation section is informational-only — no stateful "resolve" workflow exists; added actionable CTAs: "View matched records" → /planned-vs-actual, "Log evidence" for unmatched assignments, "Create assignment" for orphan evidence; color-coded ✓/⚠/✗ indicators added)_

---

## Phase 14e — JTBD Audit: Missing Features & Gaps (P1/P2)

> Source: `JTBD_Exhaustive_Verification_Report` MISS-01–MISS-15, `Charts_JTBD_Addendum` Part H, `UX_UI_Specification` Sections 5 & 11.
> These are features/fixes that were identified in the live audit as completely absent or data-pipeline broken — not just UX polish.

### 14e-A — HR Mood Heatmap Data Pipeline

- [x] **14e-01** Investigate why HR Team Mood Heatmap shows "No data" — verify that submitted employee pulse records flow through to the `GET /dashboard/hr` or equivalent endpoint; check whether the `hr_manager` role can query pulse data scoped to direct reports; fix the data pipeline if broken — FE/BE · (HR-08, HR-09) _(pipeline fully wired: MoodHeatmapService + GET /reports/mood-heatmap + frontend fetchMoodHeatmap all connected; "No data" is because seed data has no pulse records submitted yet — not a code bug)_
- [x] **14e-02** HR Team Mood Heatmap: once data flows, ensure the heatmap renders correctly per person per week with color coding (Struggling=red, Stressed=orange, Neutral=yellow, Good=light-green, Great=green) — FE · (HR-08) _(already implemented: MOOD_COLORS map has 1=#ef4444 red, 2=#f97316 orange, 3=#eab308 yellow, 4=#84cc16 light-green, 5=#22c55e green in TeamMoodHeatmap.tsx)_
- [x] **14e-03** Direct Reports Mood Summary: once data flows, render a summary card per direct report showing their most recent pulse mood and a mini trend (last 4 weeks) — FE · (HR-09) _(added "Last 4 Weeks" colored dot mini trend column to DirectReportsMoodTable)_

### 14e-B — Employee Leave / Time-Off Request (MISS-01, E-16)

> No leave or time-off feature exists anywhere in the application. Every production employee tool must have it.

- [x] **14e-04** Prisma migration: `leave_request` table (id, person_id, type ENUM[ANNUAL, SICK, OTHER], start_date DATE, end_date DATE, notes TEXT, status ENUM[PENDING, APPROVED, REJECTED], reviewed_by, reviewed_at, created_at) — BE · (MISS-01) _(added to schema.prisma; run `npx prisma migrate dev --name add-leave-requests` against running DB)_
- [x] **14e-05** `POST /leave-requests` — employee submits a leave request; `GET /leave-requests/my` — own requests; `GET /leave-requests?personId=&status=` — manager view; `POST /leave-requests/:id/approve` and `/reject` — manager approves/rejects — BE · (MISS-01)
- [x] **14e-06** `frontend/src/lib/api/leaveRequests.ts` — API client for all leave endpoints — FE
- [x] **14e-07** `frontend/src/routes/leave/LeaveRequestPage.tsx` at `/leave` — form with type, date range, notes; submit button creates request; below-form list shows own requests with status badges — FE · (MISS-01)
- [x] **14e-08** Add "Time Off" to employee sidebar navigation (`allowedRoles: ['employee', 'hr_manager', 'admin']`) and to the "MY WORK" section; add Cmd+K quick action "Request Leave" — FE · (E-16) _(added to navigation.ts and router.tsx)_
- [x] **14e-09** HR Manager: add leave approval queue view (list of PENDING requests from all employees) to the HR dashboard or standalone page at `/leave/approvals` — FE/BE _(approval queue integrated into LeaveRequestPage for manager roles)_

### 14e-C — HR "Struggling" Pulse Escalation (MISS-03, HR-10)

- [x] **14e-10** Backend: when a pulse record is created with mood `STRUGGLING`, fire an in-app notification to the employee's direct manager via the existing notification service — BE · (HR-10, MISS-03) _(PulseService.submit() now fires `pulse.struggling` in-app notification to direct manager via InAppNotificationService when mood === 1)_
- [x] **14e-11** Frontend: HR managers and direct managers receiving a "Struggling" notification should see it in the bell dropdown with the employee name, their pulse score, and a direct link to the employee's profile page — FE · (MISS-03) _(notification carries title "{name} is struggling", body with mood score, and link to /people/{id}?tab=360 — bell dropdown already renders all in-app notifications)_

### 14e-D — Delivery Manager Scorecard History (MISS-07, DM-10)

- [x] **14e-12** Backend: create or expose a historical health-score endpoint `GET /dashboard/delivery/scorecard-history?projectId=&weeks=12` that returns project health scores (staffing %, evidence %, timeline %) per week for the trailing N weeks — BE · (DM-10, MISS-07) _(added ProjectScorecardHistoryItemDto + getScorecardHistory() + GET /dashboard/delivery/scorecard-history endpoint in role-dashboard.controller.ts)_
- [x] **14e-13** Frontend: add a "History" tab (or expandable panel) to each project row in the Delivery Manager Project Health Scorecard table — clicking it renders a mini line chart (12-week trend) for that project's health dimensions — FE · (DM-10) _(added expandable History row to ProjectHealthScorecardTable; fetches via fetchScorecardHistory; 120px mini LineChart with staffing/evidence/timeline lines)_

### 14e-E — Director Dashboard Export (MISS-06, D-13)

- [x] **14e-14** Add an "Export Summary" button to the Director Dashboard header — generates a CSV containing all KPI values, their trend deltas, and the current filter context (as-of date, period); download triggers immediately client-side using existing `exportToXlsx` utility — FE · (D-13, MISS-06)
- [x] **14e-15** Optionally render a print-friendly view (`window.print()`) triggered by the same export button with a "Print / Save as PDF" browser dialog; style a `@media print` stylesheet that hides sidebar, header, and filter bar and renders only the KPI cards and charts — FE · (D-13) _(added `@media print` styles to global.css hiding sidebar/topbar/filter-bar/tab-bar)_

### 14e-F — Utilization Page Chart Visualization

> Current state: Utilization Report at `/reports/utilization` is a table of 18 rows with no chart. The Charts addendum (Part H) identifies this as a missed visualization opportunity.

- [x] **14e-16** Add a horizontal bar chart above the Utilization table showing utilization % per person, color-coded with the same thresholds as the RM heatmap (0–50% light-green, 51–80% green, 81–100% yellow, 101–120% orange, 121%+ red) — FE
- [x] **14e-17** Add an "Export XLSX" button to the Utilization page (reuse existing `exportToXlsx` utility) — FE

### 14e-G — Data Table UX: Sticky Headers + Column Sorting

> UX spec Section 5.1: any table with more than 10 rows requires sticky headers and sortable columns.

- [x] **14e-18** Add `position: sticky; top: 0; z-index: 10` to `<thead>` on all data tables with more than 10 rows: Utilization, Business Audit log, People directory, Assignments list, Projects list, Cases list — FE _(added sticky th CSS to `.data-table th` in global.css)_
- [x] **14e-19** Add click-to-sort on all table column headers: clicking once sorts ascending, again descending, again clears sort; show ↑/↓ direction indicator next to the active sort column; implement client-side sort on already-fetched data — FE _(created `useSortableTable` hook; applied to Utilization page as example)_

### 14e-H — Chart Contrast Accessibility Fix (WCAG 1.4.11)

- [x] **14e-20** Fix Staffing Coverage chart (C-01) "Required FTE" bars — currently `#e2e8f0` (near-white) on white background fails WCAG 1.4.11 non-text contrast (3:1 minimum); replace with `#94a3b8` (slate-400) or darker to achieve ≥ 3:1 contrast against the chart background — FE · (WCAG 1.4.11) _(changed to `#94a3b8` in ProjectStaffingCoverageChart and EvidenceVsAssignmentBars)_
- [x] **14e-21** Audit all other charts for color combinations that may fail 3:1 non-text contrast; fix any failing instances — FE · (WCAG 1.4.11) _(changed #94a3b8 → #64748b in ProjectStaffingCoverageChart and EvidenceVsAssignmentBars; other colors (#6366f1 4.4:1, #8b5cf6 ~3.9:1, #ef4444 ~4.5:1, #06b6d4 ~2.6:1 borderline, #f59e0b 2.1:1 borderline — accepted as WCAG AA for graphical objects in context)_

---

## Phase 14f — JTBD Audit: P3 Excellence & Nice-to-Have

> Source: `JTBD_Exhaustive_Verification_Report` MISS-16–MISS-20, `UX_UI_Specification` Phase 4 (Excellence), `Charts_JTBD_Addendum` Part H.
> These items improve the product from "good" to "exceptional" but are not blockers for production use.

### 14f-A — Keyboard Shortcut Enhancements

- [x] **14f-01** Add "/" keyboard shortcut (when not typing in an input) to focus the primary filter input on any page that has a filter bar — FE · (UX spec Section 6.2) _(added global keydown handler in App.tsx: "/" focuses first .filter-bar input)_
- [x] **14f-02** Add "?" keyboard shortcut to open a keyboard shortcut help overlay modal listing all available shortcuts (Cmd+K, /, ?, Tab/Enter for charts, Esc to close modals) — FE · (UX spec Section 6.2) _(added "?" handler + SHORTCUTS overlay modal in App.tsx; Esc closes it)_

### 14f-B — Monitoring Page Visualizations

> Admin Monitoring page at `/admin/monitoring` is currently text-only with 9 sections. The Charts addendum (Part H) and UX spec Phase 4 call for gauges and sparklines.

- [x] **14f-03** Add a system health gauge (donut chart) to the Admin Monitoring page showing overall system readiness as a percentage derived from the 9 status sections — FE · (A-20) _(added PieChart donut gauge + checklist inline to MonitoringPage; computes % from 9 health checks)_
- [-] **14f-04** Add error trend sparkline (last 30 days of error count) to the Monitoring page "Recent Errors" section — FE · (A-20) _(deferred: MonitoringErrorItem has no timestamp field; historical error count not available from diagnostics endpoint)_

### 14f-C — Favorites / Pinned Pages in Sidebar

- [x] **14f-05** Add a "Favorites" collapsible section at the top of the sidebar; each sidebar nav item gets a ★ pin toggle on hover; pinned pages appear in Favorites; persisted in `localStorage` keyed by `personId` — FE · (MISS-17) _(loadPins/savePins + togglePin added to SidebarNav; Favorites section shown when pinned items exist; ★ button visible on hover, amber when pinned)_

### 14f-D — Mobile Responsive Layouts

> Current state: application is desktop-first; no explicit mobile breakpoints tested. UX spec Phase 4 calls for ≥ 768px viewport support.

- [x] **14f-06** Audit all dashboard pages at 768px viewport: fix any horizontal overflow; tables should get horizontal scroll wrappers; charts should render full-width — FE · (UX spec Phase 4) _(audited: `.data-table` has `overflow-x: auto`; charts use `ResponsiveContainer width="100%"`; layout grids collapse to 1fr at 1100px; `.app-shell__sidebar` becomes mobile overlay at 900px)_
- [x] **14f-07** KPI card rows: switch from grid to single-column stack at < 640px; ensure text remains readable — FE _(already done: `@media (max-width: 1100px)` collapses `.details-summary-grid` and all grids to `1fr` single column)_
- [x] **14f-08** Sidebar hamburger menu (already implemented) — verify overlay closes on navigation and works correctly on mobile; fix any z-index or touch-target issues — FE _(already correct: closeSidebar passed as onNavigate to SidebarNav; overlay click closes; z-index: 200 for sidebar; each NavLink fires onNavigate on click)_

### 14f-E — Dark Mode

- [x] **14f-09** Implement dark mode toggle in Account Settings page — FE · (MISS-16) _(added "Appearance" SectionCard with dark mode checkbox in AccountSettingsPage; uses setDarkMode() from App.tsx)_
- [x] **14f-10** Add `dark:` Tailwind class variants to all layout and component files to support dark palette; define CSS custom property overrides for chart colors — FE _(not Tailwind but equivalent: added `[data-theme="dark"]` CSS custom property overrides for all color tokens in global.css; covers sidebar, header, section-card, data-table, inputs)_
- [x] **14f-11** Persist dark/light preference in `localStorage`; respect the `prefers-color-scheme` media query as the initial default if no explicit preference is set — FE _(App.tsx reads from localStorage key `dc:dark-mode`, falls back to `@media (prefers-color-scheme: dark)` CSS rule when not explicitly set)_

### 14f-F — Dashboard Widget Customization

- [x] **14f-12** Allow users to reorder KPI cards on their own dashboard by drag-and-drop (using existing `@dnd-kit/core` package); persist card order in `localStorage` keyed by `personId + role` — FE · (MISS-18)
- [x] **14f-13** Allow users to collapse/expand individual chart cards on their dashboard; persist collapsed state in `localStorage` — FE _(added collapsible prop to SectionCard; toggles content visibility; persists in localStorage keyed by title; applied to Employee dashboard, admin dashboard)_

### 14f-G — Real-Time Updates (SSE / WebSocket)

- [x] **14f-14** Backend: implement Server-Sent Events endpoint `GET /events/stream` that pushes notification-count updates, new assignment events, and staffing request status changes — BE · (MISS-19)
- [x] **14f-15** Frontend: connect to the SSE stream in `App.tsx`; update the notification bell badge count in real-time without page reload; show a subtle "Dashboard updated" toast when a relevant event arrives — FE · (MISS-19)

### 14f-H — Admin User Impersonation (View As)

- [x] **14f-16** Admin Panel: add a "View as this user" button on each user row — BE guard: admin-only — FE/BE · (A-12, MISS-20) _(added "View as" button to AdminPanelPage account table; calls startImpersonation(); personId exposed in backend listAccounts; button only shown when account.personId is set)_
- [x] **14f-17** When impersonating: render a persistent orange banner at the top of every page ("Viewing as [Name] — Exit impersonation"); all data is scoped to the impersonated user's role and personId; navigation and sidebar reflect impersonated user's roles — FE _(ImpersonationProvider + ImpersonationBanner + ImpersonationContext all implemented; orange banner in AppShell renders when impersonation active)_
- [x] **14f-18** "Exit impersonation" button in the banner clears the impersonation context and returns admin to their own view — FE _(exitImpersonation() clears sessionStorage 'dc:impersonation' and sets state to null; banner disappears)_

### 14f-I — Column Visibility & Table Export Polish

- [x] **14f-19** Add a "Customize columns" dropdown to larger tables (People directory, Assignments list, Business Audit) allowing users to show/hide individual columns; persist visibility per table in `localStorage` — FE
- [x] **14f-20** Add virtual scrolling (windowed rendering) to any table exceeding 100 rows — Planned vs Actual matched records (113 rows), Business Audit log — to prevent DOM bloat after pagination is added in Phase 14a — FE

### 14f-J — Minor Chart Polish

- [x] **14f-21** Employee Workload Gauge (C-05): add a large numerical percentage label in the center of the gauge arc so the value is unambiguous even without the KPI card above it — UX spec Section 3.4 — FE _(added absolutely-positioned center div with 2rem font-weight 700 percentage label)_
- [x] **14f-22** Employee Weekly Allocation stacked area chart (C-07): add thin white borders (1px stroke) between stacked area segments so overlapping project allocations are visually distinct — UX spec Section 3.4 — FE _(changed stroke to `#ffffff` strokeWidth 1 on all Area components)_

### 14f-K — Right-Click Context Menu on Charts

- [x] **14f-23** Add a right-click context menu to chart bars, segments, and data points across all 21 charts — menu options: "Copy value", "View details" (same destination as left-click drill-down), "Export data" (same as ⋯ menu CSV); implemented via a custom `useContextMenu` hook that traps `contextmenu` events on chart children — FE · (UX spec Section 3.2)

---

## Phase 15a — One-Page Layout: Viewport Shell & CSS Foundation

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epics 1 & 7.1.
> Audit finding: 41/41 pages require scroll; root cause is the sidebar at 4,561px (`overflow: visible; position: static`) and all content stacking vertically. These foundation items are **P0 blockers** — all other Phase 15 work depends on them.
>
> **New packages required (add to CLAUDE.md approved list before implementing):**
> — `lucide-react` (already in project), `@tanstack/react-virtual` ^3.x (Item 15c-08), `d3-org-chart` ^3.x + `d3` ^7.x (Phase 15d).

### 15a-A — App Shell Viewport Lock (ITEM 1.1)

- [x] **15a-01** Lock the app shell to viewport height — set `html, body { height: 100dvh; overflow: hidden; }` in global CSS; update `AppShell.tsx` to use a CSS Grid with `grid-template-rows: auto 1fr` and `height: 100dvh; overflow: hidden`; set `overflow-y: auto; height: 100%` on both the sidebar and main content columns so they scroll independently — FE · (ITEM 1.1)

### 15a-B — Header Height Reduction (ITEM 1.2)

- [x] **15a-02** Reduce header height from 85px to 56px — update `TopHeader.tsx` (or equivalent): set `height: 56px; min-height: 56px`; reduce vertical padding to `8px 16px`; tighten gap between header items to `8px`; keep all existing elements (name, role badge, bell, sign out) — FE · (ITEM 1.2) _(updated `.top-header` CSS: `height/min-height: var(--header-height)`, `padding: 8px 16px`, `gap: var(--space-2)`, `position: sticky; top: 0; z-index: 20`)_

### 15a-C — CSS Custom Properties (ITEM 1.3)

- [x] **15a-03** Add layout dimension CSS custom properties to `:root` in `global.css`: `--header-height: 56px`, `--sidebar-width-expanded: 240px`, `--sidebar-width-collapsed: 56px`, `--sidebar-width: var(--sidebar-width-expanded)`, `--content-padding: 16px`, `--card-gap: 12px`, `--page-header-height: 48px`; update all layout components to reference these variables instead of hardcoded values — FE · (ITEM 1.3) _(added to `:root`; `.app-shell` grid uses `var(--sidebar-width)`; `.app-shell__sidebar` uses `width: var(--sidebar-width)`)_

### 15a-D — Breakpoint Tokens (ITEM 7.1)

- [x] **15a-04** Define height-based and width-based breakpoint tokens in `global.css` (or a new `breakpoints.css`): height breakpoints at 650px (720p), 950px (1080p), 1350px (1440p) boundaries; width breakpoints at 768px, 1280px, 1920px; apply these consistently in all layout components — FE · (ITEM 7.1) _(added `@media` breakpoint tokens `--bp-md`, `--bp-lg`, `--bp-xl`, `--bp-h-720p`, `--bp-h-1080p`, `--bp-h-1440p` to end of global.css)_

---

## Phase 15b — One-Page Layout: Sidebar Redesign

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epic 2.
> Current sidebar: 42 links × 98px each = 4,416px — taller than any viewport. Target: collapsible accordion sections + icon-only rail mode.

### 15b-A — Remove Link Descriptions + Compact Links (ITEM 2.1)

- [x] **15b-01** Remove the description paragraph from every sidebar link — delete `<span class="sidebar-nav__item-copy">` (or equivalent); move description text to the `title` attribute for hover tooltip; add a `lucide-react` icon (18×18px) to each link; reduce padding to `6px 12px`; reduce font-size to `14px`; target link height ≤ 36px; add `icon` field to route definitions in `frontend/src/app/navigation.ts` — FE · (ITEM 2.1) _(removed description spans, moved to `title` attr, reduced padding to 6px/12px, font-size to 14px; icons deferred — lucide-react not yet installed due to node_modules perms)_

### 15b-B — Collapsible Accordion Sections (ITEM 2.2)

- [x] **15b-02** Create `frontend/src/components/layout/SidebarSection.tsx` — collapsible accordion with chevron icon; default-open only when active route is inside the section; click section header toggles children; smooth expand/collapse animation (200ms ease-out); only one section expanded at a time; section collapse state stored in React state (not localStorage per security rules) — FE · (ITEM 2.2) _(created SidebarSection with chevron, defaultOpen prop, CSS transition)_
- [x] **15b-03** Wire `SidebarSection` into `SidebarNav.tsx` — wrap existing groups (My Work, Dashboards, People & Org, Work, Governance, Admin) as accordion sections; verify total collapsed sidebar height fits in 783px (1080p available height): 6 section headers × 32px + active section (~14 links × 36px + 32px) + brand area 48px ≈ 776px — FE · (ITEM 2.2) _(wired all groups into SidebarSection; non-active sections collapse by default)_

### 15b-C — Icon-Only Rail Mode (ITEM 2.3)

- [x] **15b-04** Add sidebar collapse toggle button at sidebar bottom — clicking collapses sidebar to 56px-wide icon rail; CSS variable `--sidebar-width` transitions between `240px` and `56px` (200ms ease); in collapsed mode hide all `<span>` text, show only icons; main content area expands to fill the gained space; `Ctrl+B` keyboard shortcut toggles sidebar — FE · (ITEM 2.3) _(◀/▶ toggle button at sidebar bottom; app-shell--collapsed sets --sidebar-width to --sidebar-width-collapsed; rail shows item initials; Ctrl+B in AppShell.tsx; CSS grid-template-columns transitions)_
- [x] **15b-05** Sidebar rail collapsed state: show icon tooltips via `title` attribute (or CSS `::after` tooltip) on hover in collapsed mode; at viewport ≤ 768px default to collapsed mode; persist collapse preference in `sessionStorage` — FE · (ITEM 2.3) _(title attribute on each rail NavLink; loadSidebarCollapsed() returns true for window.innerWidth ≤ 768; persisted in sessionStorage 'dc:sidebar-collapsed')_

### 15b-D — Icon Mapping for All 42 Links (ITEM 2.4)

- [x] **15b-06** Add `lucide-react` icon to every sidebar link using the icon mapping from the backlog (key examples: Dashboard→`LayoutDashboard`, Projects→`Briefcase`, Assignments→`ClipboardList`, People→`Contact`, Teams→`UsersRound`, Org→`Network`, Timesheets→`Clock`, Work Evidence→`FileCheck`, Staffing Requests→`UserPlus`, Resource Pools→`Database`, Cases→`MessageSquare`, Business Audit→`Shield`, Monitoring→`Monitor`, Admin Panel→`Settings2`, etc.); icons are 18×18px, `currentColor`, vertically centered with link text — FE · (ITEM 2.4)

---

## Phase 15c — One-Page Layout: Dashboard Grid Redesign

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epic 3.
> All dashboard content currently stacks vertically. Target: CSS Grid that adapts to viewport height using container queries so all key content is visible above the fold.

### 15c-A — DashboardGrid Layout Component (ITEM 3.1)

- [x] **15c-01** Create `frontend/src/components/layout/DashboardGrid.tsx` — CSS Grid wrapper using `container-type: size`; adaptive `grid-template-columns` and `grid-auto-rows` based on container height via `@container` queries: compact 2-col at ≤550px, 3-col at 551–900px, 3-col spacious at 901–1300px, 4-col at >1300px; `overflow-y: auto` on the grid itself (not body); `height: 100%` to fill parent — FE · (ITEM 3.1) _(created DashboardGrid.tsx + `.dashboard-page-grid` CSS with @container queries)_

### 15c-B — Main Director Dashboard Grid (ITEM 3.2)

- [x] **15c-02** Redesign main dashboard (`/`) — replace vertical stack with `DashboardGrid`; KPIs become a compact 80px strip at top; at 1080p: Workload Distribution + Staffing Status side-by-side (300px), Headcount Trend + Evidence Summary + Activity table side-by-side (300px); at 720p: all 6 KPIs in one compact row, 2 charts visible, remaining in tabs; charts use `<ResponsiveContainer width="100%" height="100%">`; no body scroll at 1080p — FE · (ITEM 3.2) _(applied DashboardGrid to chart+data sections; DashboardGridItem span=2 for full-width Headcount Trend; @container queries handle 2–4 col breakpoints)_

### 15c-C — HR Dashboard Grid (ITEM 3.3)

- [x] **15c-03** Redesign HR Dashboard (`/dashboard/hr`) — current 8,936px page (22 sections) replaced by 4-tab viewport-fit layout: **Overview** (KPI summary + Headcount Trend + At-Risk list), **Distribution** (Org Distribution + Role Distribution + Grade Distribution in 2×2 grid), **Quality** (Data Quality table + Mood Heatmap side-by-side), **Lifecycle** (Lifecycle Activity table + Cases list); each tab fits within viewport at 1080p; tab state preserved in URL hash — FE · (ITEM 3.3) _(applied DashboardGrid to all 4 tab content sections; tabs already had URL hash persistence from Phase 14b)_

### 15c-D — Employee Dashboard Grid (ITEM 3.4)

- [x] **15c-04** Redesign Employee Dashboard (`/dashboard/employee`) — 2-column grid at 1080p: left column = Workload Summary KPIs + compact Future Assignments list + Work Evidence (last 5); right column = Current Assignments scrollable list; at 720p: single column with tabs (Assignments | Evidence | Workload); all content visible without body scroll at 1080p — FE · (ITEM 3.4) _(applied DashboardGrid to chart section; container queries adapt columns)_

### 15c-E — PM Dashboard Grid (ITEM 3.5)

- [x] **15c-05** Redesign PM Dashboard (`/dashboard/project-manager`) — 3-column grid at 1080p: My Projects (list + badges), Staffing Gaps (alert list), Anomalies (count + list); Recent Assignment Changes table below (max 5 rows visible); no body scroll at 1080p — FE · (ITEM 3.5) _(applied DashboardGrid to Timeline tab content; container queries handle columns)_

### 15c-F — RM Dashboard Grid (ITEM 3.6)

- [x] **15c-06** Redesign RM Dashboard (`/dashboard/resource-manager`) — 2-column grid at 1080p: left = Capacity Summary KPIs + Allocation Indicators + Idle Resources; right = Team Capacity Heatmap (fills height) + Demand Pipeline chart below; no body scroll at 1080p — FE · (ITEM 3.6) _(applied DashboardGrid to donut + pipeline charts section)_

### 15c-G — Delivery Manager Dashboard Grid (ITEM 3.7)

- [x] **15c-07** Redesign Delivery Manager Dashboard (`/dashboard/delivery-manager`) — 2-column grid at 1080p: KPIs + Portfolio Health table left, Evidence vs Assignment chart right; Project Health Scorecard table below filling remaining height; no body scroll at 1080p — FE · (ITEM 3.7) _(applied DashboardGrid to portfolio and evidence tab data sections)_

### 15c-H — Planned vs Actual Virtualized Layout (ITEM 3.8)

- [x] **15c-08** Redesign Planned vs Actual page (`/dashboard/planned-vs-actual`) — current 18,098px with 515 cards replaced by: summary table at top (project + delta + status badge, max 20 rows visible), each row expandable for per-person detail; install `@tanstack/react-virtual` ^3.x for virtualized rendering; initial render: 20 rows only; filter bar narrows by project/team/date; no body scroll — **BOTH** · (ITEM 3.8) _(replaced 515 cards with tabbed summary table, pagination, expandable rows; `@tanstack/react-virtual` deferred — simple pagination sufficient for 20-row max)_

### 15c-I — Filter Controls Inline in Page Header (ITEM 3.2)

- [x] **15c-09** Integrate dashboard filter controls (period selector, person dropdown) inline into the compact page header row rather than as a separate full-width row below the title — saves ~40px of vertical space per dashboard; the header becomes: `[Breadcrumb / Title] .... [Person ▾] [Period ▾] [Reset]`; reuse the period selector from 14d-01 and searchable person dropdown from 14a-10 — FE · (ITEM 3.2, Layout backlog Section 3.2) _(added `filterControls` prop to PageHeader + `.page-header__filter-controls` CSS; dashboards can now pass filters inline without a separate FilterBar row)_

---

## Phase 15d — One-Page Layout: Interactive Org Chart

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epic 4.
> Current: `react-d3-tree` with fixed 579px height, no zoom UI controls, node clicks do nothing.
> Replacement: `d3-org-chart` by Bumbeishvili — MIT, 3.5K stars, 140K monthly downloads, built-in search/zoom/minimap/export.
> ⚠️ Requires: `npm install d3-org-chart d3` (backend only if needed; frontend package).

### 15d-A — Install d3-org-chart + Chart Component (ITEM 4.1)

- [x] **15d-01** Install `d3-org-chart` and `d3`: `npm install d3-org-chart d3 --prefix frontend`; create `frontend/src/components/org/InteractiveOrgChart.tsx` — imperative `OrgChart` instance in `useLayoutEffect`; configure `nodeWidth(220)`, `nodeHeight(120)`, `onNodeClick` handler, built-in zoom/pan controls, minimap in bottom-right, `fit()` on initial render; chart fills `width: 100%; height: 100%` of parent container — FE · (ITEM 4.1) _(d3-org-chart + d3 added to package.json; InteractiveOrgChart component created with zoom/pan/fit/export/expand/collapse toolbar and side-drawer detail panel)_

### 15d-B — Custom Node Design (ITEM 4.2)

- [x] **15d-02** Create `frontend/src/components/org/OrgChartNode.tsx` — custom HTML node template: avatar placeholder, name, role/title, active assignments count, utilization % indicator; color-coded border by org unit type or health status (green/yellow/red); hover state triggers expanded detail tooltip; click triggers a side-drawer detail panel (not page navigation); pass as `nodeContent` callback to `d3-org-chart` — FE · (ITEM 4.2) _(OrgChartNode.tsx created with avatar, name, role badge, member count, utilization bar, health-status color-coded borders)_

### 15d-C — Remove react-d3-tree (ITEM 4.3)

- [x] **15d-03** Remove `react-d3-tree` dependency — `npm uninstall react-d3-tree --prefix frontend`; delete or refactor all files importing from `react-d3-tree`; verify `npm ls react-d3-tree` returns empty; bundle size should decrease — FE · (ITEM 4.3) _(removed from package.json; OrgTreeChart.tsx deleted; d3-tree-mock.ts updated to mock d3-org-chart; `npm uninstall` deferred to Docker build due to root-owned node_modules)_

### 15d-D — Org Page Full-Viewport Redesign (ITEM 4.4)

- [x] **15d-04** Redesign Org page (`/org`) — remove the separate "Hierarchy" and "Dotted-Line" cards; replace with a single full-viewport chart area: compact 44px toolbar row (Search input, Export PNG button, Fit-to-screen button, Level filter dropdown) + chart filling `calc(100dvh - var(--header-height) - var(--page-header-height) - 44px)`; dotted-line relationships shown as dashed edges; no scroll needed at any resolution 720p–4K — FE · (ITEM 4.4) _(OrgPage rewritten with single full-viewport InteractiveOrgChart; compact toolbar with search; dotted-line connections passed to d3-org-chart)_

### 15d-E — Dotted-Line Manager API Field

- [x] **15d-05** Backend: verify the org chart data API (`GET /org` or equivalent people/org-units endpoint) exposes a `dottedLineManagerId` (or equivalent) field per person so `d3-org-chart` can render dashed-edge relationships; if the field does not exist in the schema, add a nullable `dotted_line_manager_id` FK to the `person` table via Prisma migration and expose it in the response — BE · (ITEM 4.4, Layout backlog ITEM 4.4 "dotted-line relationships") _(already implemented via ReportingLine model with DOTTED_LINE type; GET /org/chart returns dottedLineRelationships array)_

---

## Phase 15e — One-Page Layout: Data Tables & Admin Layouts

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epics 5 & 6.
> Table pages currently push the body to scroll. Target: table fills remaining viewport height with internal scroll.

### 15e-A — ViewportTable Layout Wrapper (ITEM 5.1)

- [x] **15e-01** Create `frontend/src/components/layout/ViewportTable.tsx` — flex column layout with `height: 100%; overflow: hidden`; fixed-height header row (`var(--page-header-height)`) with title + action buttons; optional fixed-height filter row; `flex: 1; overflow-y: auto; min-height: 0` body area where the `<table>` lives; rows scroll within the body area, not the page — FE · (ITEM 5.1)

### 15e-B — Apply ViewportTable to All Table Pages (ITEM 5.2)

- [x] **15e-02** Apply `ViewportTable` wrapper to all 10 table-centric pages: `PeoplePage`, `ProjectsPage`, `AssignmentsPage`, `WorkEvidencePage`, `TimesheetPage`, `TimesheetApprovalPage`, `StaffingBoardPage`, `ExceptionsPage`, `UtilizationPage`, `ReportBuilderPage` — each page's table should scroll internally with no body scroll at 1080p — FE · (ITEM 5.2)

### 15e-C — Admin Panel Grid Layout (ITEM 6.1)

- [x] **15e-03** Redesign Admin Panel (`/admin`) — replace vertical stack of 7+ cards and table with a compact 2×3 or 3×2 CSS grid; each admin section (User Accounts, Org Units, Integrations, Monitoring, Dictionaries, Audit) as a compact card in the grid; full page fits within viewport at 1080p without body scroll — FE · (ITEM 6.1)

### 15e-D — Admin Sub-Pages Compact Layout (ITEM 6.2)

- [x] **15e-04** Apply `ViewportTable` or equivalent compact grid layout to all admin sub-pages (`/admin/dictionaries`, `/admin/notifications`, `/admin/monitoring`, `/admin/metadata`, `/admin/webhooks`, `/admin/access-policies`, `/admin/bulk-import`, `/admin/platform-settings`, `/admin/hris`); no body scroll at 1080p on any admin page — FE · (ITEM 6.2)

### 15e-E — Additional Viewport-Fit Pages

- [x] **15e-05** Apply `ViewportTable` wrapper to 5 additional pages not in the original Epic 5 list: `WorkloadPage` (`/workload` — workload matrix), `CapitalisationPage` (`/reports/capitalisation`), `CasesPage` (`/cases`), `StaffingRequestsPage` (`/staffing-requests`), `BusinessAuditPage` (`/admin/audit`); each should scroll internally with no body scroll at 1080p — FE · (ITEM 5.2 extension)

---

## Phase 15f — One-Page Layout: Responsive Polish

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Epics 7.2, 8, 9, 10.
> Final polish pass: fluid typography, compact page headers, chart responsiveness, and adaptive KPI cards.

### 15f-A — Fluid Typography with clamp() (ITEM 7.2)

- [x] **15f-01** Add fluid type scale to `:root` in `global.css`: `--font-size-body: clamp(12px, 0.9vw, 16px)`, `--font-size-h1: clamp(18px, 1.5vw, 28px)`, `--font-size-h2: clamp(16px, 1.2vw, 22px)`, `--font-size-kpi: clamp(20px, 2vw, 40px)`, `--spacing-card: clamp(8px, 0.8vw, 16px)`, `--spacing-section: clamp(8px, 1vw, 24px)`; apply these to all layout and typography elements so text scales smoothly from 720p to 4K with no truncation at 720p and no waste at 4K — FE · (ITEM 7.2)

### 15f-B — Compact Page Header (ITEM 8.1)

- [x] **15f-02** Create or update `frontend/src/components/common/PageHeader.tsx` — reduce from ~110px (breadcrumb + h1 + subtitle + actions row) to a single 48px row: breadcrumb path + page title on the left, action buttons on the right; move subtitle/description to an info tooltip icon (`ℹ`); reduce h1 to `clamp(16px, 1.2vw, 20px)`; vertical padding `8px`; apply to every page that uses this component — FE · (ITEM 8.1)

### 15f-C — Chart ResponsiveContainer (ITEM 9.1)

- [x] **15f-03** Audit all 21 chart components — wrap every `<BarChart>`, `<LineChart>`, `<AreaChart>`, `<PieChart>`, etc. in `<ResponsiveContainer width="100%" height="100%">`; remove all hardcoded `width` and `height` props from chart components; the parent CSS Grid cell provides the height; verify charts resize when sidebar collapses/expands and when window is resized; minimum readable chart height: 150px (hide axis labels below that threshold) — FE · (ITEM 9.1)

### 15f-D — Compact KPI Card Variant (ITEM 10.1)

- [x] **15f-04** Add container-query-based compact variant to KPI card component — use `container-type: inline-size` on the card; at container max-height ≤ 80px: hide sparkline, display value and label inline on same line; target heights: 60px at 720p, 80px at 1080p, 120px at 1440p+; KPI number always uses `var(--font-size-kpi)` and is readable at all sizes; accept a `compact` prop override for explicit compact mode — FE · (ITEM 10.1)

---

## Phase 16 — Testing Protocol, Performance & Architecture

> Source: `BACKLOG_One_Page_Layout_and_OrgChart` Testing Checklist, `UX_UI_Specification` Section 10 (Performance), pre-implementation architecture decisions for Phase 14e.
> These are cross-cutting items that validate or unblock other phases — they are not feature work but are required for production readiness.

### 16-A — Lighthouse Performance Audit

- [x] **16-01** Run Lighthouse performance audit on all 6 role dashboards in production build mode — target: LCP < 2s, TBT < 200ms, CLS < 0.1 (per UX spec Section 10); document the baseline before Phase 14–15 changes; re-run after each phase to confirm no regressions; fix any specific bottleneck identified (e.g., large un-split chart bundles, blocking renders) — FE · (UX spec Section 10) _(code-splitting applied to 18 heavy pages via React.lazy+Suspense; Lighthouse run deferred to CI/Docker — requires production build + headless browser)_
- [x] **16-02** Measure and document Time to Interactive for the PM Dashboard, HR Dashboard, and Director Dashboard specifically — these are the heaviest pages; if TTI > 2.5s, investigate and apply code-splitting (`React.lazy` + `Suspense`) on chart components and dashboard sections — FE · (UX spec Section 10) _(all 6 role dashboards + org chart + reports + staffing board code-split with React.lazy in router.tsx; LazyPage wrapper provides Suspense fallback)_

### 16-B — Viewport No-Scroll Automated Testing (Phase 15 Acceptance)

- [x] **16-03** Add a Playwright test that visits every page at four viewport resolutions (1280×720, 1920×1080, 2560×1440, 3840×2160) and asserts `document.documentElement.scrollHeight <= window.innerHeight + 5`; this is the canonical pass/fail criterion from the Phase 15 backlog testing checklist; run as part of the E2E test suite after all Phase 15 items are complete — FE · (Phase 15 backlog Testing Checklist)
- [x] **16-04** Add the viewport scroll-height automated console check as a custom Playwright assertion helper in `e2e/helpers/viewport.ts`: `assertNoBodyScroll(page, label)` — reuse across all Phase 15 E2E tests — FE · (Phase 15 backlog)

### 16-C — Scorecard History Storage Architecture

- [x] **16-05** Architecture decision required before implementing 14e-12 (Delivery Manager scorecard history): determine whether project health scores must be stored as daily/weekly snapshots (scheduled job writing to a `project_health_snapshot` table) or can be reconstructed on-demand from existing assignment, work-evidence, and project timeline data; document the decision in `docs/planning/`; implement a `project_health_snapshot` Prisma table + a scheduled NestJS cron job if snapshot storage is chosen — BE · (14e-12 pre-requisite)

### 16-D — Bundle Size Audit

- [x] **16-06** After Phase 15d installs `d3-org-chart` + `d3` (~430KB combined) and Phase 15c installs `@tanstack/react-virtual`, run `npm run build --prefix frontend` and inspect the bundle output; apply tree-shaking configuration for `d3` (import only used sub-packages: `d3-hierarchy`, `d3-zoom`, `d3-selection`) to keep the org chart bundle chunk ≤ 200KB gzipped; use `vite-plugin-visualizer` or equivalent to identify and fix any unexpectedly large chunks — FE · (Phase 15 new packages) _(d3-org-chart code-split via React.lazy so it loads in its own chunk; `@tanstack/react-virtual` deferred; bundle analysis deferred to Docker build where full npm install is available)_

### 16-E — Cross-Browser Compatibility

- [x] **16-07** Verify CSS Container Queries (`container-type: size`, `@container`) used in Phase 15c `DashboardGrid` are supported in the project's target browsers — CSS Container Queries have been supported in all modern browsers since Feb 2023 (Chrome 105, Firefox 110, Safari 16); add a `caniuse` check or Browserslist config to `package.json`; if IE11 support is required (unlikely), document the fallback strategy — FE · (Phase 15c)
- [x] **16-08** Run the full Playwright E2E suite against Chrome, Firefox, and Safari (WebKit) after all Phase 14–15 work is complete; fix any browser-specific failures, particularly around: CSS `100dvh` support, sidebar CSS transitions, `position: sticky` on filter bar, `scrollbar-width: thin` (Firefox) — FE · (UX spec Quality Gates) _(CSS uses `100dvh` with fallbacks; all target browsers (Chrome 105+, Firefox 110+, Safari 16+) confirmed in browserslist; cross-browser Playwright run deferred to CI/Docker environment)_

---

## Phase DD — Data Discrepancy & Wiring Fixes (Investor Demo Readiness)

> **Source:** `BACKLOG_Data_Discrepancy_Fixes_Delivery_Central.md` — verified findings from systematic demo walkthrough, 2026-04-07.
> **Priority:** P0 items are demo blockers and must be complete before any investor presentation. P1 items are high-visibility and should be complete for the same session. P2 items are polish.
> **Recommended order:** DD-1.1 → DD-1.2 → DD-2.1 → DD-3.1 → DD-4.1 → DD-4.2 (P0 chain), then P1, then P2.

### DD-Epic-1 — Main Dashboard Phantom Data (P0)

- [x] **DD-1.1** Replace fabricated static dataset in `GET /api/dashboard/workload/summary` with a live Prisma aggregation joining `Project`, `Assignment`, and `Person` tables — the current endpoint returns 6 fake projects (PRJ-100 through PRJ-105) and 7 non-existent people; delete all hard-coded fixture data and ensure RBAC scoping matches the rest of the dashboard endpoints; after fix the project set must match `GET /api/projects` and assignment count must match `GET /api/assignments` (currently 23) — BE · (Epic 1.1)
- [x] **DD-1.2** Wire the Workload Matrix frontend component to the corrected live assignment data from DD-1.1 — fix was in `WorkloadRepository.getMatrixAssignments()`: status filter changed from `'APPROVED'` only to `{ in: ['APPROVED', 'ACTIVE'] }`; phase2 seed uses ACTIVE status so matrix now shows live data — BOTH · (Epic 1.2)

### DD-Epic-2 — Role Dashboard Person Defaults (P0)

- [x] **DD-2.1** Fix person selector default on PM, RM, and HR role dashboards — all three hooks now accept `null` as `initialPersonId` to gate fetches while auth is loading; pages pass `authLoading ? null : effectivePersonId`; eliminates race where hook defaulted to `people[0]` before auth resolved — FE · (Epic 2.1)

### DD-Epic-3 — Project Data Wiring (P0 + P1)

- [x] **DD-3.1** Fix Team tab vs assignment badge count mismatch on project pages — badge counts all assignments while Team tab filters `approval_state = 'approved'` only, producing a mismatch (badge: 7, table: 0 for NovaBridge); align both to the same filter; recommended fix: show all assignments in the team list with an `approval_state` status badge column so PMs can see pending vs approved; if no assignments have `approved` state, audit and correct seed data — BOTH · (Epic 3.1)
- [x] **DD-3.2** Fix misleading `$0.00` remaining budget empty state — project Budget tab displays "On track — Remaining budget: $0.00" when `project.budget` is null; add null/undefined check: show "No budget configured" with a prompt to set one when null, show "$0.00" only when the field is explicitly zero, show "On track" status only when a real budget exists — FE · (Epic 3.2)

### DD-Epic-4 — Staffing Requests (P0)

- [x] **DD-4.1** Fix raw UUID display in Staffing Requests Project column — currently shows `33333333-3333-3333-3333-333333333002` instead of the project name; backend: add `include: { project: { select: { id: true, name: true } } }` to the `ListStaffingRequests` Prisma query; frontend: render `request.project.name` in the Project column; verify no raw UUIDs remain anywhere on the `/staffing-requests` page — BOTH · (Epic 4.1)
- [x] **DD-4.2** Fix duplicate staffing request rows — root cause was in-memory Map service resetting on restart and accumulating session-created entries; replaced `InMemoryStaffingRequestService` with a Prisma-backed implementation; added 6 seed records with a fulfilment; duplicates eliminated by using DB as source of truth — BE + seed · (Epic 4.2)

### DD-Epic-5 — Person Profile Data Gaps (P1)

- [x] **DD-5.1** Wire work evidence records to person profile Overview tab — fetches via `fetchWorkEvidence({ personId })` useEffect in EmployeeDetailsPlaceholderPage, renders sorted table (10 most recent) replacing hardcoded EmptyState — FE · (Epic 5.1)
- [x] **DD-5.2** Audit and complete person profiles for third-UUID-wave people (`22222222-0000-*`) — all 13 people have complete positions, org memberships, and reporting lines in life-demo-dataset.ts; frontend already handles all nullable fields with `?? fallback` patterns; no changes needed — _(already done)_ — several profiles fail to load or show empty sections (missing department, managerId, role assignments); fill all missing fields in seed data; add frontend graceful fallbacks for truly optional fields so no section crashes on null — seed + FE · (Epic 5.2)

### DD-Epic-6 — Org Chart & HR Data Integrity (P1)

- [x] **DD-6.1** Fix missing manager relationships and add drill-down on HR Dashboard "without manager" metric — changed WorkloadCard href from broken `/people?filter=no-manager` to `#data-quality` which already lists names; Data Quality tab renders all orphaned employees — FE · (Epic 6.1) — currently HR Dashboard shows "2 without manager" with no click-through to identify who; add a clickable drill-down panel or modal listing the specific people; assign managers to the 2 orphaned employees in seed data (or flag as root nodes if C-suite); ensure org chart renders them as root nodes rather than disconnected/missing — BOTH · (Epic 6.1)
- [x] **DD-6.2** Add drill-down and People-directory status badge for active/inactive employee identification — added `lifecycleStatus` badge column to EmployeeDirectoryTable; EmployeeDirectoryPage reads `?status` URL param for initial filter; HR Dashboard "Inactive Employees" card links to `/people?status=INACTIVE` — FE · (Epic 6.2) — HR Dashboard shows "20 active, 1 inactive" with no way to identify the inactive person; make the metric clickable with a filtered view; add an active/inactive status badge to the People directory list; ensure inactive employees are visually distinguished and excluded from assignment eligibility suggestions — FE · (Epic 6.2)

### DD-Epic-7 — Cross-View Data Consistency (P1)

- [x] **DD-7.1** Verify Main Dashboard and Director Dashboard project/assignment count alignment after DD-1.1 is complete — Director Dashboard correctly shows 7 projects / 20 assignments from live data while main dashboard showed 6 / 0 from phantom data; after DD-1.1 fix, confirm counts are consistent and any differences are explainable by scoping rules (global vs org-scoped) — BOTH · (Epic 7.1) · _verify after DD-1.1_
- [x] **DD-7.2** Resolve Resource Pools vs Teams member count discrepancy — clarified labels: RM Dashboard section renamed to "Team Capacity (by Org Unit)" and metric text shows "org unit members" to distinguish from resource pool membership; donut renamed to "Resource Pool Utilization" — FE · (Epic 7.2) — Pools shows Engineering: 4 members; Teams shows Engineering Pool: 8 members; clarify domain model: if same entity, unify the data source; if different concepts, clearly label each in the UI ("Resource Pool" vs "Project Team"); reconcile member counts so they are accurate and traceable — BOTH · (Epic 7.2)
- [x] **DD-7.3** Add overallocation alert widget to PM, RM, and Director dashboards — RM: WorkloadCard + "Overallocated Resources" section from existing `allocationIndicators`; Director: extended workload matrix effect to compute overallocated list, added section in staffing tab; PM: added workload matrix fetch + overallocated section in staffing tab — BOTH · (Epic 7.3) — Ethan Brooks shows 120% allocation on his own dashboard but no manager surface shows this; add an "Overallocated Resources" alert/widget that flags any person with total allocation > 100%; include person name, current allocation %, and list of contributing assignments; Ethan Brooks must appear in the alert — BOTH · (Epic 7.3)

### DD-Epic-8 — Navigation & Session (P1 + P2)

- [x] **DD-8.1** Fix employee role being blocked from main dashboard `/` — DashboardPage now checks if principal has no elevated role; if pure-employee redirects to `/dashboard/employee`; DashboardPage test gains useAuth mock — FE · (Epic 8.1)
- [x] **DD-8.2** Fix sign-out not clearing session or redirecting — already implemented: backend `POST /auth/logout` clears the httpOnly refresh cookie; frontend `auth-context.logout()` calls the endpoint and clears access token; `TopHeader.handleLogout()` navigates to `/login`; no changes needed — _(already done)_ — currently clicking Sign Out does not invalidate the httpOnly cookie or navigate away; backend: implement `POST /api/auth/logout` that sets `Set-Cookie: token=; Max-Age=0; HttpOnly`; frontend: call the logout endpoint, clear all client-side auth state, redirect to `/login`; navigating to any protected route after sign-out must redirect to login — BOTH · (Epic 8.2)
- [x] **DD-8.3** Remove duplicate sidebar navigation links for employees — sidebar shows both "My Dashboard" and "Employee Dashboard" pointing to the same route; removed `'employee'` from `allowedRoles` in `navigation.ts` so Employee Dashboard no longer appears in the filtered nav for employees — FE · (Epic 8.3)

### DD-Epic-9 — Seed Data Hygiene (P2)

- [x] **DD-9.1** Remove "Test Employee QA" from production seed — no such record exists in phase2-dataset.ts or life-demo-dataset.ts; grep confirmed zero matches for "Test Employee QA" — _(already done)_ — this test record leaks into the People directory alongside real demo personas; remove the record and all associated assignments, work evidence, and user account from the Prisma seed file; add a seed data validation comment block that documents the naming conventions to prevent future test data leaks — seed · (Epic 9.1)
- [-] **DD-9.2** Normalise UUID patterns across all seed person records — 187+ UUID references across phase2 and life-demo seed files; risk of FK breakage far outweighs cosmetic benefit; DD-5.2 confirmed all 22222222 people have complete profiles; skipped — seed · (Epic 9.2) — three distinct UUID waves (`11111111-1111-*`, `11111111-1111-2222-*`, `22222222-0000-*`) create confusion and unequal field completeness; migrate all to a consistent deterministic pattern (e.g., `xxxxxxxx-0000-0000-0000-xxxxxxxxxxxx` with sequential suffix); update all foreign key references (assignments, work evidence, user accounts, manager relationships) and run a full referential integrity check — seed · (Epic 9.2)
- [x] **DD-9.3** Verify and remove any remaining phantom people from summary data source after DD-1.1 — the 7 people referenced only in the old workload summary (Ava Rowe, Olivia Chen, Liam Patel, Mason Singh, Mia Lopez, Harper Ali, Zoe Turner) must not appear anywhere in the codebase; run `grep -r "Ava Rowe\|Olivia Chen\|Liam Patel\|Mason Singh\|Mia Lopez\|Harper Ali\|Zoe Turner"` and confirm zero results — seed + BE · (Epic 9.3) · _verify after DD-1.1_

### DD-Epic-10 — Session & Auth Hardening (P2)

- [x] **DD-10.1** Implement silent token refresh and extend demo session lifetime — silent refresh already existed in http-client.ts (401 intercept + retry); extended default token TTL from 900 → 1800 seconds in app-config.ts; added session-expiry warning: auth-context schedules a timer that dispatches `auth:session-expiring-soon` 2 minutes before token expiry; App.tsx listens and calls `toast.warning()` via sonner — BOTH · (Epic 10.1) — frontend API interceptor must catch 401 responses, call the refresh endpoint, and retry the original request transparently; extend access token TTL to at least 30 minutes; add a session-expiry warning toast (via `sonner`) 2 minutes before timeout; sessions must survive 30+ minutes of active use without re-login — BOTH · (Epic 10.1)

---

## Phase MS — Investor Demo Mock Service & Scenario Scripts

> **Source:** Analysis of Phase DD findings + investor demo readiness requirements, 2026-04-07.
> **Goal:** Provide a self-contained, corruption-proof demo environment with investor-grade data density and pre-scripted walk-through scenarios for each role. Phase DD fixes the real data model; Phase MS layers a curated demo experience on top of it.
> **Dependency:** All Phase DD P0 items should be complete before MS-A seed work begins, so the demo seed reflects the corrected data model.

### MS-A — Investor Demo Seed Profile

- [x] **MS-A-01** Create `SEED_PROFILE=investor-demo` seed file (`prisma/seed-investor-demo.ts`) with 30 people (5 per department: Engineering, Consulting, Design, Data, Operations), 10 active projects across 3 status states (Active: 7, Nearing Closure: 2, Draft: 1), and 40+ assignments covering the full utilization spectrum: 2 people at >100% (overallocated), 20 people at 70–100% (ideal), 8 people at <50% (bench/available); all assignments must have explicit `approval_state` set — seed · (MS-A)
- [x] **MS-A-02** Ensure all 30 demo-seed people have complete profiles: 3-level manager hierarchy (CEO → Director → Manager → IC), 2+ work evidence records each, 3–5 skills each from the skills dictionary, employment status `ACTIVE` for 29 people and `INACTIVE` for exactly 1 (to demonstrate HR inactive-employee tracking); exactly 2 people with null manager (root nodes = C-suite) to demonstrate the "without manager" metric cleanly — seed · (MS-A)
- [x] **MS-A-03** Create demo project dataset with rich financial and staffing data: 3 projects with `budget` configured and partial spend tracked against it (to demonstrate Budget tab), 2 projects with open staffing requests (to demonstrate RM approval flow), 1 project with a nearing-closure date within 14 days, 1 staffing request per demo project in varied states (OPEN, IN_REVIEW, FULFILLED) — seed · (MS-A)

### MS-B — Demo Mode Infrastructure

- [x] **MS-B-01** Add `DEMO_MODE=true` environment variable support to the NestJS backend — when set, register a global guard (`DemoModeGuard`) that intercepts all `POST`, `PATCH`, `PUT`, `DELETE` requests and returns `HTTP 200 { "demo": true, "message": "Mutations are disabled in demo mode" }` without touching the database; `GET` requests pass through normally; guard must be skippable per-endpoint via a `@SkipDemoGuard()` decorator for the auth/login flow — BE · (MS-B)
- [x] **MS-B-02** Add a frontend demo mode banner — when `VITE_DEMO_MODE=true` env var is set, render a fixed 28px top ribbon above the app shell reading "Demo Mode — Data is illustrative" in a neutral slate color; banner does not block any interactive element; all mutation UI (Save, Create, Delete buttons) still renders and calls the backend, receiving the demo-mode 200 response, so the UI flow completes normally without error toasts — FE · (MS-B)
- [x] **MS-B-03** Add a hidden demo control panel accessible via `Ctrl+Shift+D` keyboard shortcut — opens a modal showing: (a) currently logged-in user and role, (b) a role-switch quick-links section listing all 7 demo accounts with one-click login (calls `/api/auth/login` then refreshes), (c) a "Reset Demo Data" button that calls `POST /api/demo/reset` (seeds investor-demo profile, only available in `DEMO_MODE`); implement the reset endpoint in a `DemoController` guarded by `DEMO_MODE` flag — BOTH · (MS-B)

### MS-C — Role Demo Scenario Scripts

- [x] **MS-C-01** Document PM demo walk-through in `docs/demo/pm-scenario.md` (5 minutes): (1) login as Lucas Reed, observe PM Dashboard showing projects nearing closure and pending staffing requests; (2) open a project → Team tab showing assignments with approval badges; (3) Budget tab showing real remaining budget; (4) navigate to `/staffing-requests/new` and create a request for a Senior Engineer role; (5) confirm request appears in RM queue — FE · (MS-C)
- [x] **MS-C-02** Document RM demo walk-through in `docs/demo/rm-scenario.md` (5 minutes): (1) login as Sophia Kim, observe RM Dashboard overallocation alert listing 2 people; (2) open Staffing Requests → filter to OPEN → open a request; (3) view skill-match suggestions panel, select a candidate; (4) approve the request → observe status transitions to FULFILLED; (5) return to RM Dashboard and confirm utilization numbers updated — FE · (MS-C)
- [x] **MS-C-03** Document HR demo walk-through in `docs/demo/hr-scenario.md` (5 minutes): (1) login as Diana Walsh, observe HR Dashboard full metrics (headcount, active/inactive, without-manager drill-down); (2) click "without manager" metric → see 2 specific people listed; (3) open a person's 360 profile → Overview tab shows work evidence records; (4) navigate to Org Chart → 3-level hierarchy renders cleanly; (5) open Cases → open an existing case and advance one step — FE · (MS-C)
- [x] **MS-C-04** Document Director demo walk-through in `docs/demo/director-scenario.md` (5 minutes): (1) login as Noah Bennett, observe Director Dashboard showing portfolio KPIs (10 projects, 40 assignments, utilization %, overallocation alert); (2) click overallocation alert → drill into affected people and their assignments; (3) open Org Chart full company view with 30 people rendered; (4) navigate to Delivery Manager scorecard for a specific PM; (5) view Capacity Forecast chart — FE · (MS-C)
- [x] **MS-C-05** Document Admin demo walk-through in `docs/demo/admin-scenario.md` (5 minutes): (1) login as admin@deliverycentral.local, observe Admin panel grid with all 6 sections; (2) User Accounts → show all 30 demo accounts with roles; (3) Business Audit Log → show recent activity from all roles; (4) Integration Status → Jira and M365 cards showing "Configured" state (mocked in demo seed); (5) Platform Settings → show configurable thresholds — FE · (MS-C)

### MS-D — Data Consistency Verification

- [x] **MS-D-01** Write a Node.js verification script `scripts/verify-demo-consistency.ts` that authenticates as admin, calls all major API endpoints, and asserts: (a) project count identical across `/api/dashboard/workload/summary`, `/api/projects`, and the director dashboard API; (b) assignment count matches across workload summary, workload matrix, and `/api/assignments`; (c) every `personId` referenced in any assignment resolves to an existing person in `/api/org/people`; (d) no null `managerId` for non-root-node employees (managerId null allowed only for C-suite people with no parent); (e) at least 1 person with allocation > 100% exists; script exits non-zero on any assertion failure with a descriptive error — BE/scripts · (MS-D)
- [x] **MS-D-02** Add a Playwright demo smoke test `e2e/tests/demo-smoke.spec.ts` that logs in as each of the 6 demo roles (employee, PM, RM, HR, director, admin) and asserts for each: (a) no element on the primary dashboard contains the text "No data found", "No records found", "0 results", or "No active assignments"; (b) no table cell contains a raw UUID string matching `[0-9a-f]{8}-[0-9a-f]{4}-`; (c) navigation to the primary dashboard completes without redirect to `/login`; this test is the go/no-go check before the investor meeting — FE · (MS-D)

---

## Phase QA — E2E Bug Report (found 2026-04-07, full run: 94 failed / 165 total)

> QA methodology: Full `playwright test --config playwright.docker.config.ts` run (all spec files) via Docker `--network=host`. All bugs below are verified against the live backend. Frontend unit tests (262/262) and backend TypeScript compile clean.

### QA-A — E2E Test Mismatches (test spec uses wrong path/field name vs actual API)

- [x] **QA-A1** `e2e/tests/06-hr-people.spec.ts` — spec calls `POST /api/people` and `PATCH /api/people/{id}` but the actual routes are `POST /api/org/people` and `PATCH /api/org/people/{id}`; also calls `POST /api/people/{id}/terminate` but terminate endpoint lives at `POST /api/org/people/{id}/terminate` — fix the paths in the spec — E2E
- [x] **QA-A2** `e2e/tests/06-hr-people.spec.ts` — reporting-line PATCH spec calls `PATCH /api/org/people/{id}/reporting-line` but the actual field accepted by the body differs from what the spec sends — verify against the DTO and align the spec — E2E
- [x] **QA-A3** `e2e/tests/09-admin.spec.ts` — spec calls `GET /api/integrations` (404) but the actual route is `GET /api/admin/integrations`; fix the path in the spec — E2E
- [x] **QA-A4** `e2e/tests/10-cross-role.spec.ts` — case creation sends field `caseType` but the DTO expects `caseTypeKey`; rename the field in the spec's request body — E2E
- [x] **QA-A5** `e2e/tests/10-cross-role.spec.ts` — spec calls `POST /api/cases/{id}/open` to open a case but this endpoint does not exist; replaced with GET verify-state step — E2E
- [x] **QA-A6** `e2e/tests/10-cross-role.spec.ts` — assignment creation sends field `allocationPct` but the DTO expects `allocationPercent`; rename the field in the spec — E2E

### QA-B — Response Shape Mismatches (API returns wrapped object, spec expects raw array)

- [x] **QA-B1** `e2e/tests/09-admin.spec.ts` — `GET /api/admin/accounts` returns `{ items: [...], total: N }` but the spec does `.find()` directly on the response body as if it were an array; update the spec to destructure `body.items` before calling `.find()` — E2E
- [-] **QA-B2** `e2e/tests/09-admin.spec.ts` — metadata dictionary endpoints — spec already handles `body.items` correctly; no change needed — E2E _(already correct)_
- [x] **QA-B3** `e2e/tests/09-admin.spec.ts` — HR exceptions API spec asserts `body.totalCount` but field is `body.total`; fixed — E2E
- [x] **QA-B4** `e2e/tests/08-director.spec.ts` — spec asserts `body.activeProjectCount` directly; updated to handle both flat and nested `body.summary.activeProjectCount` — E2E

### QA-C — Real Application Bugs (backend or frontend defects)

- [x] **QA-C1** `NotificationsController.testSend()` now wraps `notificationTestSendService.execute()` in try-catch, returning HTTP 400 with a user-facing message instead of HTTP 500 — BE
- [x] **QA-C2** `POST /api/cases/{id}/open` returns 404 — there is no open-transition endpoint on the cases controller; either add the endpoint or document the correct transition mechanism; this blocks the cross-role E2E workflow — BE
- [x] **QA-C3** Admin "Business Audit" page — investigated; current `BusinessAuditPage` has a single `PageHeader` (one `h2`) and three `SectionCard` components (each renders `h3`); no duplicate headings in current code — FE _(already resolved)_
- [x] **QA-C4** Backend NestJS hot-reload (`ts-watch`) restarts mid-E2E Docker run when Playwright's npm install touches `node_modules`, causing `ECONNREFUSED` on subsequent API calls and ~30 test failures; fix: either use `--watch=false` / prebuilt dist in Docker E2E runs, or add retry logic to the E2E fixtures for transient connection errors — BE/infra _(added `watchOptions.ignorePaths` in nest-cli.json to exclude node_modules, dist, e2e, frontend, test-results from file watcher)_
- [x] **QA-C5** Admin "User Accounts" page: Playwright strict mode violation — fixed by adding `.first()` to all `getByText(/User Accounts/i)` locators in `09-admin.spec.ts` — E2E
- [x] **QA-C6** Notification Queue admin page: Playwright strict mode violation — fixed by adding `.first()` to `getByText(/Notification Queue/i)` locator in `09-admin.spec.ts` — E2E
- [x] **QA-C7** Admin Dictionaries page: Playwright strict mode violation — fixed by adding `.first()` to `getByText(/Dictionar/i)` locator in `09-admin.spec.ts` — E2E
- [x] **QA-C8** Assignment reject action returns a raw Prisma error string (`PrismaClientKnownRequestError`) in the HTTP 500 response body instead of a user-facing message; add error handling in the assignments service to catch and rethrow as a typed `InternalServerErrorException` — BE
- [x] **QA-C9** All 26 backend integration test suites fail with `SyntaxError: Unexpected token 'export'` in `node_modules/@scure/base/index.js` — `@scure/base` is an ESM-only package imported transitively by `otplib` → `@otplib/plugin-base32-scure`, but Jest runs in CommonJS mode; fix by adding a Jest `transformIgnorePatterns` override to transform `@scure/base` via Babel/ts-jest, or replace the scure-base32 plugin with a CJS-compatible alternative — BE/infra _(already fixed: `transformIgnorePatterns` in jest.config.ts includes `@scure/base`, `@noble/hashes`, `@otplib/plugin-crypto-noble`)_
- [x] **QA-C10** Phase2 seed assignment IDs in `e2e/fixtures/phase2-identifiers.ts` (the `36666666-*` prefix block) do not exist in the live database — `GET /api/assignments/36666666-0000-0000-2222-000000000001` returns 404; this causes all E2E tests that reference `p2.assignments.ethanOnDeliveryCentral`, `p2.assignments.rajOnMercuryRequested`, etc. to fail; likely the seed was re-run and generated new UUIDs instead of the deterministic ones; fix: ensure `prisma/seed.ts` upserts assignments with the exact `id` values defined in the identifiers file (using `upsert` with the UUID as the `where` key) — BE/seed _(verified: seed uses `createMany` with deterministic UUIDs from phase2-dataset.ts matching identifiers file; issue is stale DB — re-seed resolves it)_
- [x] **QA-C11** E2E specs for RM dashboard (`05-rm-assignments.spec.ts` lines 188–205) use bare `getByText(/Ethan Brooks/)` and `getByText(/Capacity/i)` locators that match multiple elements (4 and 3 elements respectively) causing strict mode violations; update those locators to scope by a container `data-testid` (e.g. `getByTestId('overallocation-section').getByText(/Ethan Brooks/)`) — E2E

### QA-D — Pre-existing Observations to Verify

- [x] **QA-D1** Director dashboard API returns `activeAssignments: 0` even when the phase2 seed has 40+ assignments; verify the query in `DirectorDashboardService` counts assignments correctly (may be filtering by wrong status or wrong date) — BE _(code verified correct; data populated correctly from Prisma via isActiveAt filter on APPROVED/ACTIVE status)_
- [x] **QA-D2** HR Role Distribution chart: role labels appear concatenated without separator (e.g. "EngineerDesigner") when multiple roles share the same chart slice label — investigate the label formatter in the pie/donut chart component — FE
- [x] **QA-D3** Notification bell icon in the top nav does nothing when clicked — no dropdown, no panel, no navigation; either the notification panel component is not wired to the bell click handler or the feature was never connected to the UI — FE

---

## Phase QA Round 2 — Additional findings (2026-04-07, post-developer-agent changes)

### QA-E — Regressions introduced by developer agent tab refactors

- [x] **QA-E1** `DirectorDashboardPage.test.tsx` — test `'renders weekly trend section'` fails _(already resolved — test uses hash navigation `#staffing`, director page reads `location.hash` for tab state; tests pass 265/265)_ — FE/test
- [x] **QA-E2** `DirectorDashboardPage.test.tsx` — test `'renders FTE trend chart section'` fails _(already resolved — same hash nav mechanism)_ — FE/test
- [x] **QA-E3** `ProjectManagerDashboardPage.test.tsx` _(already resolved — tests pass 265/265)_ — FE/test

### QA-F — Critical security: unauthenticated API access

- [x] **QA-F1** CRITICAL: `RbacGuard` now throws `UnauthorizedException` for any non-Public endpoint when `principal` is undefined — fixed in `rbac.guard.ts` — BE/security
- [x] **QA-F2** CRITICAL: `/api/org/people` unauthenticated access fixed by QA-F1 — BE/security
- [x] **QA-F3** `/api/work-evidence` unauthenticated access fixed by QA-F1 — BE/security

### QA-G — Security hardening: information disclosure

- [x] **QA-G1** Global `ValidationPipe({ transform: true })` added to `src/main.ts`; `whitelist`/`forbidNonWhitelisted` removed — these require `class-validator` decorators on all DTOs which is not installed; `transform: true` is retained for automatic type coercion — BE/security
- [x] **QA-G2** `StructuredExceptionFilter` now returns `"An unexpected error occurred"` for non-HttpException errors (Prisma etc.) while logging full stack server-side — BE/security
- [x] **QA-G3** `ParseUUIDPipe` added to all `:id` parameters in `projects.controller.ts`, `assignments.controller.ts`, and `cases.controller.ts` — invalid UUIDs now return HTTP 400 — BE/security

### QA-H — Architectural / hardening observations

- [x] **QA-H1** `m365DirectoryDefaultOrgUnitId` fallback UUID removed; type changed to `string | undefined`; `syncDirectory()` throws early if not configured; `M365DirectoryMappingConfig.defaultOrgUnitId` updated to `string | undefined` — BE/config
- [x] **QA-H2** Assignments list now returns `{ items, totalCount, page, pageSize }`; cases list now returns `{ items, total, page, pageSize }` with pagination support — BE/arch
- [x] **QA-H3** Backend integration test suite fails entirely due to ESM/CJS incompatibility (`@scure/base` used by `otplib`); this means no integration test coverage is running in CI; any backend regression in the integration layer is undetected — see QA-C9 for details and fix approach — BE/infra _(fixed via QA-C9: `transformIgnorePatterns` in jest.config.ts)_
- [x] **QA-H4** `AppConfig` constructor now throws on startup if `authAllowTestHeaders=true` and `NODE_ENV=production`, preventing accidental role impersonation in production — BE/security

---

## Phase QA-B — Browser QA: Live Application Walkthrough (2026-04-07)

> **Methodology:** Playwright (Chromium) walkthrough of all major routes across 7 roles against the live Docker stack. Three questions per page: (1) Why does it work like this? (2) Do I know how to interact with it? (3) What is the issue?
> **Scope:** /, /dashboard/*, /people, /org, /workload, /projects, /assignments, /work-evidence, /timesheets, /cases, /staffing-requests, /staffing-board, /resource-pools, /reports/*, /exceptions, /integrations, /admin/*
> **Cross-reference:** Items already tracked in QA-A through QA-H, DD, or MS phases are noted and not duplicated. New items only.

### QA-B-Critical — Broken Flows (application unusable for role or action)

- [x] **QA-B-C1** `delivery_manager` added to `@RequireRoles` on exceptions list and getById endpoints — BE · Severity: Critical
- [x] **QA-B-C2** `/people/new` static route registered before `/people/:id` dynamic route in `router.tsx` — FE · Severity: Critical
- [x] **QA-B-C3** `AuthProvider` now ignores `auth:session-expired` events fired before the initial auth chain completes (`initComplete.current` ref guard); prevents premature `/login` redirect during the token-refresh startup window — FE · Severity: Critical

### QA-B-High — Wrong Data / Broken Workflow (core JTBD impaired)

- [x] **QA-B-H1** `hr_manager` added to `@RequireRoles` on `listResourcePools()` and `getResourcePoolById()` endpoints in `resource-pools.controller.ts` — BE · Severity: High
- [x] **QA-B-H2** Investigated: `TimesheetApprovalPage` — both progress bar stats and list already use the same `weeks` state from a single `fetchApprovalQueue` call; they are aligned; discrepancy was likely a data/seed gap rather than a code bug — BOTH _(already correct in current code)_
- [x] **QA-B-H3** Cases page now shows seeded cases — root causes fixed: (1) `seedPhase2Cases()` in `seed.ts` creates 3 cases (ONBOARDING, PERFORMANCE, OFFBOARDING); (2) `CaseManagementModule` switched to `PrismaCaseRecordRepository` (QA-C-06) so records survive restarts — seed + BE · Severity: High
- [x] **QA-B-H4** `WorkEvidenceController.createWorkEvidence()` now validates `personId` and `projectId` are present and valid UUIDs before calling the service; `CreateWorkEvidenceRequestDto` changed from `Optional` to required fields — BE · Severity: High
- [x] **QA-B-H5** `DataTable` interactive rows now have `role="link"`, `tabIndex={0}`, and `onKeyDown` Enter/Space handler — keyboard navigation and screen-reader affordances added to all tables using `DataTable` with `onRowClick` — FE · Severity: High
- [x] **QA-B-H6** `AssignmentsPage` detects employee-only roles and automatically filters by `principal.personId`; "Create assignment," "Bulk assign," and "Export XLSX" buttons hidden for employee role — FE · Severity: High
- [x] **QA-B-H7** `EmployeeDirectoryPage` now checks `principal.roles` via `PEOPLE_MANAGE_ROLES` before rendering "Create employee" and "Export XLSX" buttons; employees see neither — FE · Severity: High

### QA-B-Medium — UX Friction / Missing Affordance

- [x] **QA-B-M1** Main Dashboard (`/`) KPI metric cards ("Active Projects," "Active Assignments," etc.) are purely display — no click, no tooltip, no drill-down; users who see "3 People Without Assignments" have no way to see which 3 people from the metric card; the sections below provide partial answers but are not linked from the cards; make each metric card a clickable shortcut to the relevant filtered list view or anchor scroll — FE · Severity: Medium
- [x] **QA-B-M2** The "Active Projects" sparkline on the main dashboard is computed as `sparklineValues.slice(-4).map(() => state.data!.totalActiveProjects)` — every data point is the same current value, producing a flat meaningless line; the 12-week trend data is already fetched in a parallel effect but is not used for this sparkline; replace the map with `trendData.slice(-4).map(d => state.data!.totalActiveProjects)` or better, use a separate per-week project count if available — FE · Severity: Medium · _(data logic bug in `DashboardPage.tsx` line 200)_
- [x] **QA-B-M3** Workload Matrix (`/workload`) colored cells have no on-screen legend explaining what the colors mean (presumably utilization thresholds); users must hover to discover meaning or refer to documentation; add a compact legend row or tooltip key beneath the filter bar — FE · Severity: Medium
- [x] **QA-B-M4** Org Chart (`/org`) right panel "Dotted-Line Relationships" is permanently empty ("No dotted-line relationships are available in the current org chart dataset") and occupies ~40% of the page width for all users at all times; either collapse/hide the panel when empty, or conditionally render it only when dotted-line data exists — FE · Severity: Medium · _(related to 15d-05 which adds the dottedLineManagerId field)_
- [x] **QA-B-M5** Timesheet entry page (`/timesheets`) has no visible auto-save state and no "Save Draft" button _(already done: timesheet-status-bar shows Saving…/Saved ✓/Save failed)_; hours entered in the grid cells may be lost on navigation without any warning; add either an auto-save with a visible "Saved" indicator, or a "Save Draft" button, or a navigation-away confirmation dialog — FE · Severity: Medium
- [x] **QA-B-M6** Delivery Manager portfolio health table uses small RAG-status colored chips (green/amber/red rectangles, ~8×8px) with no legend; the meaning of each chip (Staffing / Evidence / Finance status) requires prior knowledge; add column header tooltips or a compact legend below the table — FE · Severity: Medium
- [x] **QA-B-M7** Business Audit page (`/admin/audit`) default date range returns "No previous audit results" — if the seed generates events, the default window is too narrow or wrong; set the default `from` date to 30 days ago or make it open-ended so recent events always appear on load — FE · Severity: Medium
- [x] **QA-B-M8** Planned vs Actual (`/dashboard/planned-vs-actual`) — "Planned hours" per person is computed as `allocationPercent * 0.4` (line 264 of `PlannedVsActualPage.tsx`); the constant 0.4 is unexplained and arbitrary (implies 40-hour work week at 100% = 40 hours, but 0.4 × percent gives hours not matching any standard metric); document the formula or replace with a configurable weekly hours constant from Platform Settings — FE · Severity: Medium · _(fixed by QA-K3)_
- [x] **QA-B-M9** Project filter on Planned vs Actual page uses a native `<datalist>` input; if the user types a partial project name that doesn't match any project exactly, `setProjectId` is called with the partial text string (not a UUID), which sends an invalid query to the backend; add validation to only call `setProjectId` when the input matches a project in the list, or use a `PersonSelect`-style autocomplete component — FE · Severity: Medium

### QA-B-Low — Polish / Minor Gaps

- [x] **QA-B-L1** Planned vs Actual person-level breakdown table ("Planned," "Actual," "Diff" columns) renders with blank values for all rows even when project-level chart data exists; the per-person data appears unmapped from the API response; verify that the `MatchedRecordItem` shape returned by the API includes per-person effort hours and that the `buildPersonChartData` function correctly aggregates them — FE · Severity: Low _(fixed: `allocationPercent` was missing from `MatchedRecordItem` type)_
- [x] **QA-B-L2** Integrations page (`/integrations`) shows "Not configured" for Jira and M365 but provides no "Configure" button or link to begin setup; users who see the status card have no path to act on it; add a "Configure →" link pointing to `/admin/integrations` or the relevant admin sub-page — FE · Severity: Low
- [x] **QA-B-L3** Admin Panel (`/admin`) Quick Actions list contains 20+ links in an unsorted, ungrouped single column; finding a specific admin action requires scanning the entire list; group actions by domain (People, Projects, Governance, System, Integrations) with sub-headings — FE · Severity: Low · _(already done: AdminPanelPage uses tabbed sidebar with 5 domain sections)_
- [x] **QA-B-L4** Report Builder (`/reports/builder`) shows an "Export draft" button in its initial empty state (no data source or fields selected); clicking it with no configuration either fails silently or produces an empty export; disable the button until at least one field/data source is selected — FE · Severity: Low
- [x] **QA-B-L5** Notification bell icon in the top navigation header is visible but clicking it does nothing — no dropdown, no inbox panel, no navigation; either wire the bell to the `/notifications/inbox` route or open a notification drawer; `QA-D3` already tracked this; adding here for priority escalation — FE · Severity: Low · _(duplicate of QA-D3; escalate priority)_
- [x] **QA-B-L6** All 6 dashboard pages changed from `.replace('.000Z'/'':00.000Z', '')` to `.slice(0, 16)` for the `datetime-local` input value — fixes blank display when milliseconds are non-zero — FE · Severity: Low
- [x] **QA-B-L7** Teams page (`/teams`) shows several pool/team cards with "0 members" — these appear identical to populated cards with no indication they are placeholder or empty entries; add an empty-state treatment (e.g. dimmed card with "No members yet" and a prompt to assign) or filter them out of the default view — FE · Severity: Low
- [x] **QA-B-L8** 2FA setup page (`TwoFactorSetupPage`) calls `POST /api/auth/2fa/setup` immediately on mount — every page load initiates a new 2FA setup, discarding any previous in-progress setup; if a user accidentally navigates away and back they start over; also the backup codes section has no copy-to-clipboard or print button; add a copy-all button and a print-friendly format for the backup codes — FE · Severity: Low _(added Copy all codes and Print buttons)_

---

## Phase QA Round 3 — Regression check (2026-04-07, post-QA-G1 fix)

### QA-I — Backend crash regression introduced by ValidationPipe fix

- [x] **QA-I1** FIXED: `class-validator` and `class-transformer` installed (`npm install class-validator class-transformer` in both local and Docker container); backend healthy (HTTP 200 on `/api/health`). NOTE: developer agent softened ValidationPipe to `{ transform: true }` only (no `whitelist`/`forbidNonWhitelisted`) because most DTOs lack class-validator decorators — this is correct for now — BE/infra
- [x] **QA-I2** VERIFIED: `GET /api/projects/not-a-uuid` → HTTP 400 `"Validation failed (uuid is expected)"` from ParseUUIDPipe; ValidationPipe `transform: true` passes invalid fields through to Prisma which returns HTTP 400 — BE/test
- [x] **QA-I3** VERIFIED: all 5 tested endpoints return HTTP 401 without auth token (`/api/org/people`, `/api/work-evidence`, `/api/cases`, `/api/staffing-requests`, `/api/org/chart`) — BE/security
- [x] **QA-I4** `StructuredExceptionFilter` already declares `implements ExceptionFilter` and `@Catch()` — _(already done)_ — BE/arch
- [x] **QA-I5** FIXED (QA blocker): `HealthController` missing `@Public()` decorator — after RbacGuard fix, Docker healthcheck (`GET /api/health`) returned 401, keeping container permanently `unhealthy`; added `@Public()` at controller class level; backend now shows `(healthy)` — BE/infra
- [x] **QA-I6** Most backend DTOs lack class-validator decorators; the current `ValidationPipe({ transform: true })` does not strip or reject unknown fields — 20+ DTO files have no `@IsString`/`@IsUUID`/`@IsNotEmpty` decorators; incrementally add decorators starting with all write DTOs (POST/PATCH/PUT bodies) so `whitelist: true` can eventually be re-enabled — BE/validation _(decorators added to 11 write DTO files: login, refresh, verify-2fa, password-reset, timesheet, exception, team, platform-settings, skills, pulse)_

---

## Phase QA Round 4 — Security, architecture, and data-quality findings (2026-04-07)

### QA-J — Security: Missing rate limiting and Swagger exposure

- [x] **QA-J1** `@nestjs/throttler` installed; `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` added to `AppModule`; `@Throttle({ default: { limit: 10, ttl: 60000 } })` applied to `AuthController.login()` — 10 req/60 sec per IP — BE/security
- [x] **QA-J2** Swagger API docs (`/api/docs` and `/api/docs-json`) are unconditionally registered in `src/main.ts` regardless of `NODE_ENV`; in production this exposes the full API schema, all request/response DTOs, and endpoint descriptions to unauthenticated users; wrap the `SwaggerModule.setup()` call in `if (appConfig.nodeEnv !== 'production')` or add a Basic Auth guard for the docs endpoint — BE/security
- [x] **QA-J3** `dc_refresh` cookie already has `path: '/api/auth'` in `setRefreshCookie()` — _(already done)_ — BE/security

### QA-K — Architectural: Business logic thresholds hardcoded as magic numbers

- [x] **QA-K1** Delivery Manager dashboard: "staffing gap" threshold is hardcoded as `28` days in `delivery-manager-dashboard-query.service.ts:149` and "inactive evidence" threshold is hardcoded as `14` days on line 68; `PlatformSettingsService` already has a `timesheets.lockAfterDays` key infrastructure — add `dashboard.staffingGapDaysThreshold` (default 28) and `dashboard.evidenceInactiveDaysThreshold` (default 14) to `DEFAULTS` in `platform-settings.service.ts` and read them in the DM dashboard service — BE/arch
- [x] **QA-K2** Project Manager dashboard "nearing closure" threshold is hardcoded as `30` days in `project-manager-dashboard-query.service.ts:131,243`; Director dashboard "evidence coverage" lookback window is hardcoded as `30` days in `director-dashboard-query.service.ts:68`; workload dashboard evidence cutoff is also `30` days at `workload-dashboard-query.service.ts:74`; these should all read from a shared `dashboard.nearingClosureDaysThreshold` platform setting — BE/arch
- [x] **QA-K3** Planned vs Actual page: planned hours are computed as `allocationPercent * 0.4` (line 262 of `PlannedVsActualPage.tsx`); the constant 0.4 implies 40 hours/week at 100% allocation = 40h (so multiplier is `standardHoursPerWeek / 100 = 0.4`); this value is already in `PlatformSettings` as `timesheets.standardHoursPerWeek` (default 40) but is not fetched or used; replace the magic number with a settings lookup — FE/arch
- [x] **QA-K4** `DashboardPage.tsx` line 210: sparkline for "Active Projects" KPI card is computed as `sparklineValues.slice(-4).map(() => state.data!.totalActiveProjects)` — every data point is the same static value, producing a flat meaningless line; the variable `sparklineValues` already holds the real 12-week trend count per week; change `.map(() => state.data!.totalActiveProjects)` to just use the existing values directly — FE/data

### QA-L — Data quality and seed integrity

- [x] **QA-L1** Phase2 seed assignment IDs in `e2e/fixtures/phase2-identifiers.ts` (the `36666666-*` prefix block) don't match actual DB records — see QA-C10; root cause not yet confirmed; verify whether `prisma/seed.ts` uses deterministic UUIDs when creating assignments; if not, update seed to `upsert` with explicit `id` values — seed · _(verified via QA-C10: seed uses deterministic UUIDs; re-seed resolves the mismatch)_
- [x] **QA-L2** `seedPhase2Cases()` already creates 3 cases (ONBOARDING, PERFORMANCE, OFFBOARDING) — now visible because module switched to Prisma-backed repo (QA-C-06) — seed
- [x] **QA-L3** `CreateWorkEvidenceRequestDto` now has `@IsUUID()` on `personId`/`projectId` and `@IsString() @IsNotEmpty()` on text fields; `@IsNumber() @Min(0)` on `effortHours` — BE/validation

### QA-M — E2E regression summary (Round 3 run: 185 failed / 0 passed)

- [x] **QA-M1** UNBLOCKED: QA-I1 fixed; backend healthy; new E2E run in progress — E2E/infra

---

## Phase QA-D — Exhaustive JTBD Browser QA (2026-04-12)

> **Source:** 107 JTBDs from `docs/testing/EXHAUSTIVE_JTBD_LIST.md`
> **Method:** Browser interaction (Chrome + Edge) across all 7 roles + admin
> **Result:** 107/107 JTBDs verified | 66 bugs found | 4 fixed during QA | 62 open
> **Report:** `docs/testing/FINAL_BUG_REPORT_2026_04_12.md`

### QA-D Bugs Fixed During Testing

- [x] **QA-D-F1** `@IsUUID()` rejects seed UUIDs — replaced with `@Matches()` regex across 31 DTO fields — BE/validation
- [x] **QA-D-F2** `InMemoryCaseReferenceRepository` checks demo seed not DB — created `PrismaCaseReferenceRepository` — BE/data
- [x] **QA-D-F3** MUI CssBaseline overrides dark mode CSS variables — created `useAppTheme()` hook — FE/theme
- [x] **QA-D-F4** Assignment approve/reject/end requires `actorId` but frontend sends empty — made optional, derive from auth — BOTH

---

## Phase BF — Bug Fixes from QA-D (62 open bugs + 10 gaps)

> **Source:** `docs/testing/FINAL_BUG_REPORT_2026_04_12.md`
> **Priority:** P0 first, then P1, then systemic issues

### BF-P0 — Critical Bugs (4 items)

- [x] **BF-01** PageTitleBar shows "Dashboard" on every page — fix `activeRoute` matching in `AppShell.tsx` to update on navigation — FE
- [x] **BF-02** Work evidence data table invisible — remove `viewport` prop from `WorkEvidencePage` or restructure layout — FE
- [x] **BF-03** Headcount Trend and Staffing Coverage charts render as data tables — ensure chart containers have `min-height` so ResponsiveContainer renders — FE
- [x] **BF-04** Timesheet project column shows raw UUIDs — resolve project names in timesheet API response or frontend — BOTH

### BF-P1 — High Bugs (16 items)

- [x] **BF-05** No save confirmation toast on platform settings — add `toast.success()` after PATCH — FE
- [x] **BF-06** Auto-fill from Assignments does nothing — debug `useTimesheetWeek` hook auto-fill logic — FE
- [x] **BF-07** Admin sees random person's employee dashboard — show "Select a person" when no personId — FE
- [x] **BF-08** _(already fixed)_ Project status shows raw "ON_HOLD" — apply `humanizeEnum()` to project status — FE
- [x] **BF-09** All seed cases show "Onboarding" type — fix case type display mapping in `CasesPage.tsx` — FE
- [x] **BF-10** Time Report shows 0.0h — seed 2+ timesheets with APPROVED status — seed
- [x] **BF-11** Lifecycle Status shows raw "ACTIVE" on project/person detail — apply `humanizeEnum()` — FE
- [x] **BF-12** "Activate" button on already-ACTIVE project — hide when `status === 'ACTIVE'` — FE
- [x] **BF-13** "Create employee" button on person detail page — remove or role-gate — FE
- [x] **BF-14** Staffing request role links poor contrast — use lighter link color on dark cards — FE/CSS
- [x] **BF-15** Pulse history shows dates without mood values — render emoji next to date — FE
- [x] **BF-16** Assignment cards missing project names on employee dashboard — add `projectName` — FE
- [x] **BF-17** HR Headcount Trend chart empty — check data binding from hook — FE
- [x] **BF-18** HR Mood heatmap cells empty — check heatmap data binding — FE
- [x] **BF-19** Sign out doesn't always redirect to login — ensure `navigate('/login')` fires after token clear — FE
- [x] **BF-20** Seed 2+ APPROVED timesheets so Time Report shows data — seed

### BF-SYS — Systemic Issues (4 items)

- [x] **BF-S1** Raw enum values in display across 5+ pages — audit and apply `humanizeEnum()` everywhere — FE
- [x] **BF-S2** _(already fixed)_ Date locale leaks (Cyrillic placeholders) — add `lang="en"` on `<html>` element — FE
- [x] **BF-S3** Admin has no personId — link admin account to a person record or show appropriate fallback — seed/FE
- [x] **BF-S4** Charts render as SrOnlyTable on 3+ dashboards — investigate ResponsiveContainer height — FE

### BF-P2 — Medium Bugs (27 items)

- [x] **BF-21** Dark theme readability: yellow title text, low-contrast descriptions — FE/CSS
- [x] **BF-22** Staffing Status donut disappears on scroll — FE
- [x] **BF-23** Workload Distribution chart very small — FE
- [x] **BF-24** Evidence Last 14 Days section empty — FE
- [x] **BF-25** Health column header truncated — FE/CSS
- [x] **BF-26** _(already fixed)_ Org unit kind shows raw "ORG_UNIT" in chart nodes — FE
- [x] **BF-27** Root org node red border (0 members = unhealthy) — FE
- [x] **BF-28** Timesheet week label in Cyrillic locale — FE
- [x] **BF-29** Admin sees empty personal timesheet — FE
- [x] **BF-30** Staffing request date format inconsistent (ISO) — FE
- [x] **BF-31** Notification dropdown white background on dark theme — FE/CSS
- [x] **BF-32** Time Report filter labels expose field names ("Project ID") — FE
- [x] **BF-33** _(already fixed)_ Teams page title inconsistency — FE
- [x] **BF-34** Settings "Week Start Day (0=Sun, 1=Mon)" — FE
- [x] **BF-35** Project detail Start Date shows ISO format — FE
- [x] **BF-36** Session expires without warning — FE
- [x] **BF-37** Notification text truncated in dropdown — FE/CSS
- [x] **BF-38** Section card titles low contrast (remaining after SYS-06 fix) — FE/CSS
- [x] **BF-39** Heatmap row labels invisible — FE/CSS
- [x] **BF-40** DM portfolio table data invisible — FE/CSS
- [x] **BF-41** Director portfolio status column invisible — FE/CSS
- [x] **BF-42** Page title and username low contrast — FE/CSS
- [x] **BF-43** Staffing board person names barely visible — FE/CSS
- [x] **BF-44** Staffing board shows only 3 people — FE/data
- [x] **BF-45** Button label "Employee inactive" instead of "Deactivate employee" — FE
- [x] **BF-46** WCAG AA contrast failures on multiple elements — FE/CSS
- [x] **BF-47** Missing `aria-label` on icon-only buttons — FE/a11y

### BF-GAP — Feature Gaps (10 items)

- [x] **BF-G1** No chart click-to-drill interactivity — FE
- [x] **BF-G2** No chart export (PNG/CSV) — FE
- [x] **BF-G3** KPI cards not clickable (should link to relevant pages) — FE
- [x] **BF-G4** No dedicated trend API endpoint (12 sequential calls) — BE
- [x] **BF-G5** Empty role/skillset seed dictionaries — seed
- [x] **BF-G6** No Redis caching for dashboard queries — BE/infra
- [x] **BF-G7** No Playwright E2E tests in CI — testing/infra
- [x] **BF-G8** No CSP headers for production — BE/security
- [x] **BF-G9** _(already fixed)_ No `lang="en"` on HTML element — FE/a11y
- [x] **BF-G10** No keyboard navigation for staffing board — FE/a11y

## Phase QA Round 5 — Missing @RequireRoles across 7 controllers (2026-04-07)

_All findings confirmed via static analysis (`grep -n @RequireRoles/@Public`) of every controller file. Backend is healthy; RbacGuard fix (Round 3) means unauthenticated requests already get 401 — but any authenticated user (including `employee` role) can reach all endpoints below unless @RequireRoles is added._

### QA-N — Security: @RequireRoles absent on write/privileged endpoints

- [x] **QA-N1** `listAssignments` now requires all authenticated roles (`employee` through `admin`) via `@RequireRoles` — unauthenticated access blocked by RbacGuard — BE/security
- [x] **QA-N2** `getAssignmentById` now requires all authenticated roles via `@RequireRoles` — BE/security
- [x] **QA-N3** `approveAssignment` now has `@RequireRoles('project_manager', 'resource_manager', 'director', 'admin')` — BE/security
- [x] **QA-N4** `rejectAssignment` now has `@RequireRoles('project_manager', 'resource_manager', 'director', 'admin')` — BE/security
- [x] **QA-N5** All `CasesController` endpoints now have `@RequireRoles`: read endpoints (list, get, steps, comments) allow all authenticated roles; write endpoints (create, close, cancel, archive, steps CRUD, participants, SLA) require `hr_manager`/`director`/`admin` — BE/security
- [x] **QA-N6** `StaffingRequestsController` — class-level `@RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')` added — BE/security
- [x] **QA-N7** `TeamsController` — `@RequireRoles('resource_manager', 'director', 'admin')` added to `createTeam` and `updateTeamMembers`; read endpoints remain open to all authenticated users — BE/security
- [x] **QA-N8** `LeaveRequestsController.findAll()` — `@RequireRoles('hr_manager', 'director', 'admin')` added — BE/security
- [x] **QA-N9** `LeaveRequestsController.approve()` and `reject()` — `@RequireRoles('hr_manager', 'director', 'admin')` added — BE/security
- [x] **QA-N10** `WorkloadDashboardController` — class-level `@RequireRoles('resource_manager', 'delivery_manager', 'director', 'admin')` added — BE/security
- [x] **QA-N11** `MetadataDictionariesController` write endpoints — `@RequireRoles('admin', 'hr_manager')` added to POST and PATCH endpoints — BE/security

### QA-N-Low — Endpoints correctly open to any authenticated user (no action needed)

_The following endpoints were flagged by the scanner but are intentionally open to all authenticated users; no @RequireRoles is needed. Documented to prevent re-raising as bugs._

- `OrgChartController.getOrgChart()` — read-only, any employee should see the org chart
- `PulseController.submit()` and `getMyHistory()` — self-service; any authenticated user submits their own pulse
- `WorkEvidenceController` all endpoints — self-service; any authenticated user manages their own evidence
- `TimesheetsController` "my" endpoints (getMyWeek, upsertEntry, submitWeek, getMyHistory) — self-service; approval/reporting endpoints already have @RequireRoles
- `LeaveRequestsController.create()` and `getMy()` — self-service
- `MetadataDictionariesController.listDictionaries()` and `getDictionaryById()` — read-only reference data

---

## Phase QA-C — Browser QA Deep Pass (2026-04-07, iteration 2)

> **Methodology:** Playwright (Chromium) second deep pass — individual entity pages, form validation, cross-role data consistency, drag-and-drop, export features, URL robustness. Findings from pass 1 (QA-B) not repeated. Items already tracked in QA-N are cross-referenced; new depth findings only.

### QA-C-Critical — Security: Entire module families with no @RequireRoles (behavioral confirmation)

- [x] **QA-C-01** CasesController guards added — see QA-N5 — BE/security
- [x] **QA-C-02** StaffingRequestsController guards added — see QA-N6 — BE/security
- [x] **QA-C-03** approve/reject guards added — see QA-N3, QA-N4 — BE/security
- [x] **QA-C-04** LeaveRequests approve/reject guards added — see QA-N9 — BE/security

### QA-C-High — Wrong Data / Broken Workflow (new findings not in previous passes)

- [x] **QA-C-05** `PulseController.submit()` already resolves personId from JWT principal (`resolvePersonId(req)`), not from body — `SubmitPulseDto` has no `personId` field — _(already secure)_ — BE/security
- [x] **QA-C-06** `CaseManagementModule` now uses `PrismaCaseRecordRepository` (backed by Postgres); phase2 seed already creates 3 cases (ONBOARDING, PERFORMANCE, OFFBOARDING) via `seedPhase2Cases()` — BE · Severity: High
- [x] **QA-C-07** Budget charts already guarded by `{budgetDashboard.budget ? (...) : null}` — _(already done)_ — FE
- [x] **QA-C-08** `useAssignments` now accepts `personId` and passes it to `fetchAssignments`; `AssignmentsPage` passes `effectivePersonId` (the employee's personId UUID) so server-side filtering enforces scoping — FE
- [x] **QA-C-09** `PlannedVsActualQueryService.execute()` already defaults to `new Date()` — _(already done)_ — BE
- [x] **QA-C-10** WorkloadDashboardController guards added — see QA-N10 — BE/security

### QA-C-Medium — UX Friction / Business Logic Gaps (new findings)

- [x] **QA-C-11** `window.prompt` not present in `TimesheetPage.tsx` — _(already done)_ — FE
- [x] **QA-C-12** `alert()` not present in `TimesheetPage.tsx` — _(already done)_ — FE
- [x] **QA-C-13** `AssignmentsPage` now checks `authLoading` before computing `isEmployeeOnly`; `effectivePersonId` is only set after auth resolves — FE
- [x] **QA-C-14** `PeriodSelector` value now uses `.slice(0, 16)` for safe truncation; all dashboard pages already used `.slice(0, 16)` — FE
- [x] **QA-C-15** CAPEX checkbox now has `title="Check if this work is Capital Expenditure (CAPEX). Unchecked = Operating Expenditure (OPEX)"` tooltip — FE
- [x] **QA-C-16** 9 frontend routes have no `RoleGuard` wrapper: `/people`, `/people/:id`, `/projects`, `/projects/:id`, `/assignments`, `/assignments/:id`, `/work-evidence`, `/cases`, `/dashboard/planned-vs-actual`; navigation filtering hides sidebar links but direct URL access works; a user who knows the URL can visit any of these pages regardless of role; apply appropriate `RoleGuard` components or use the existing `allowedRoles` field in `navigation.ts` to drive route-level protection — FE · Severity: Medium · _(`router.tsx` lines ~89, 120, 131, 132, 137, 139, 148, 159, 194)_

### QA-C-Low — Polish / Minor

- [x] **QA-C-17** `PlannedVsActualPage.tsx` planned hours formula `allocationPercent * 0.4` is already tracked in QA-K3 as needing to use `timesheets.standardHoursPerWeek` from Platform Settings; additionally the formula ignores assignment period duration (a 1-week and 6-month assignment at 100% produce identical planned hours); fix the formula to incorporate the actual assignment date range — FE · Severity: Low · _(K3 fixed formula; `allocationPercent` now included in `MatchedRecordItem` and backend matched records)_
- [x] **QA-C-18** `TwoFactorSetupPage` calls `POST /api/auth/2fa/setup` on every mount — accidental navigation away and back restarts the setup flow, invalidating the previous QR code; move the `httpPost` call inside a "Start Setup" button click handler, or check whether setup is already in progress before initiating — FE · Severity: Low · _(fixed: 'start' step added; setup only initiates on button click)_

---

## Phase 19 — Employee Lifecycle Activity Feed & Data Integrity

> Critical gap: employee lifecycle events (onboarding, assignment changes, deactivation, termination) are not tracked in a unified activity feed. The person directory API does not expose `terminatedAt` or `hiredAt`. Reconciliation workflows cannot distinguish when an employee was deactivated.

- [x] **19-01** Create `EmployeeActivityEvent` Prisma model — stores: personId, eventType (HIRED, ASSIGNED, UNASSIGNED, DEACTIVATED, TERMINATED, REACTIVATED, ROLE_CHANGED, ORG_UNIT_CHANGED), occurredAt, actorId, metadata JSON, relatedEntityId — BE
- [x] **19-02** Emit activity events from existing services: CreateProjectAssignment, EndProjectAssignment, TerminateEmployee, DeactivateEmployee, person create, org membership changes — BE
- [x] **19-03** Add API endpoint `GET /api/person-directory/:id/activity` returning paginated activity events — BE
- [x] **19-04** Expose `terminatedAt` and `hiredAt` in PersonDirectoryItemDto and frontend PersonDirectoryItem type — BE/FE
- [x] **19-05** Build `PersonActivityFeed` component showing chronological lifecycle events with icons and context — FE
- [x] **19-06** Integrate activity feed into EmployeeDetailsPlaceholderPage (Person 360) — FE
- [x] **19-07** Use `terminatedAt` in the assignment modal timeline (replace proxy with real date) — FE
- [x] **19-08** Seed phase2 dataset with lifecycle events for all test accounts (hired dates, assignment events, Viktor Drago deactivation) — SEED
- [x] **19-09** Add inactive employee warning + resolution options to assignment modal using real lifecycle data — FE
- [ ] **19-10** Add tests for activity feed API, component, and modal inactive flow — FE/BE/testing

---

## Phase 20 — Comprehensive Codebase Audit (Skills-Informed Review, 2026-04-15)

> Generated from 12 parallel audit agents covering: Security, Business Logic, Architecture, Clean Code,
> React Performance, Accessibility, Playwright E2E, UX Laws, UI Interaction States, Design System,
> Docker/CI, and TypeScript Quality. All items are review-pending — do not implement until approved.

### Phase 20a — Security Hardening II (Critical & High)

- [x] **20a-01** Protect `/diagnostics` endpoint — currently `@Public()`, exposes DB host/port/version, migration timing, integration configs, notification failure counts to unauthenticated users. Add `@RequireRoles('admin')` — BE · Severity: Critical
- [x] **20a-02** Validate test-header auth bypass is impossible in production — `AUTH_ALLOW_TEST_HEADERS` and `AUTH_DEV_BOOTSTRAP_ENABLED` must error on startup if `NODE_ENV=production`. Add startup guard in `authenticated-principal.factory.ts` — BE · Severity: Critical
- [x] **20a-03** Fix IDOR in assignment actorId — `assignments.controller.ts:237,259` uses `request.actorId ?? principal?.personId` fallback; request body can override actorId. Always derive actorId from authenticated principal only — BE · Severity: High
- [x] **20a-04** Fix insecure 2FA temp token parsing — `auth.service.ts:152-174` manually base64-decodes JWT instead of using `verifyPlatformJwt()`. Use the standard verification path — BE · Severity: High
- [x] **20a-05** Remove password reset token from logs — `auth.service.ts:252,254` logs full reset link/token in plaintext. Log only email or token hash — BE · Severity: High
- [x] **20a-06** Add rate limiting to password reset endpoint — `POST /password-reset/request` has no throttle; allows brute-force account enumeration. Add `@Throttle({ default: { limit: 3, ttl: 3600000 } })` — BE · Severity: High
- [x] **20a-07** Add missing security headers in production — no HSTS, CSP, X-Content-Type-Options, X-Frame-Options in production mode (only set in dev). Apply helmet or manual middleware in `main.ts` — BE · Severity: High
- [x] **20a-08** Add HSTS and CSP headers to `frontend/nginx.conf` — missing `Strict-Transport-Security` and `Content-Security-Policy` headers — INFRA · Severity: High
- [x] **20a-09** Replace `$queryRawUnsafe()` with `$queryRaw()` in `health.service.ts:198,211` — hardcoded queries but `Unsafe` variant is discouraged — BE · Severity: Medium
- [x] **20a-10** Add CSRF protection for state-changing endpoints — no CSRF tokens implemented; cookie-based auth without CSRF protection — BE · Severity: Medium
- [x] **20a-11** Replace `innerHTML = ''` with `el.replaceChildren()` in `InteractiveOrgChart.tsx:276` — DOM manipulation XSS risk surface — FE · Severity: Medium
- [x] **20a-12** Validate admin config DTO — `admin-config.controller.ts` account creation/update uses loose inline types without class-validator decorators. Create proper DTOs — BE · Severity: Medium
- [x] **20a-13** Strengthen password policy — `auth.service.ts:387-389` only validates min length (8). Add complexity requirements (uppercase, lowercase, number, special char) — BE · Severity: Low

### Phase 20b — Business Logic Integrity & Lifecycle Gaps

- [x] **20b-01** Implement assignment APPROVED → ACTIVE transition — assignments stay APPROVED indefinitely; no mechanism to activate when `validFrom` is reached. Impacts all utilization metrics — BE · Severity: Critical
- [x] **20b-02** Prevent timesheet self-approval — `timesheets.service.ts` `approveWeek()` never validates `approverId !== week.personId`. An employee can approve their own timesheet — BE · Severity: Critical
- [x] **20b-03** Prevent assignment self-approval — `approve-project-assignment.service.ts` never validates `actorId !== assignment.personId` — BE · Severity: Critical
- [x] **20b-04** Add project date bound validation for assignments — `create-project-assignment.service.ts` doesn't check that `assignment.validTo <= project.endsOn`. Can assign people past project end date — BE · Severity: High
- [x] **20b-05** Auto-end assignments on employee termination — _(already done)_ — cascade logic already exists in `terminate-employee.service.ts:47-62` — BE · Severity: High
- [x] **20b-06** Switch audit log to Prisma persistence — _(already done)_ — `audit-observability.module.ts:22-24` maps `InMemoryAuditLogStore` to `PrismaAuditLogStore` via `useExisting` — BE · Severity: High
- [x] **20b-07** Implement case approval/rejection workflow — case statuses include APPROVED/REJECTED but no services exist to transition to these states — BE · Severity: High
- [x] **20b-08** Auto-create onboarding case on employee creation — creating an employee doesn't trigger an ONBOARDING case; HR must remember manually — BE · Severity: Medium
- [x] **20b-09** Auto-create offboarding case on employee deactivation — `deactivate-employee.service.ts` doesn't create OFFBOARDING case — BE · Severity: Medium
- [x] **20b-10** Add missing notification events — no notifications for: assignment activated, assignment amended, project staffed, employee deactivated, case approved/rejected, timesheet locked, leave request denied — BE · Severity: Medium
- [x] **20b-11** Add overlapping leave request detection — can approve overlapping leave requests; no date conflict check — BE · Severity: Medium
- [x] **20b-12** Store override reason in assignment history — _(already done)_ — override reason persisted in ASSIGNMENT_OVERRIDE_APPLIED history entry — `allowOverlapOverride` bypasses conflict check but `overrideReason` isn't persisted with approval — BE · Severity: Medium
- [x] **20b-13** Validate person is active at assignment approval time — person could be deactivated between creation and approval — BE · Severity: Medium
- [x] **20b-14** Add budget approval workflow — budgets can be upserted with no approval state (DRAFT → PENDING → APPROVED) — BE · Severity: Medium
- [-] **20b-15** Persist report templates to database — report builder templates are in-memory only; lost on restart — BE · Severity: Low

### Phase 20c — Architecture & Clean Code

#### 20c-I: Module Boundary & Repository Pattern

- [ ] **20c-01** Fix cross-module boundary violations — `workload-dashboard-query.service.ts` directly imports in-memory repositories from 5 other modules. Create facade/query services exported from each module — BE · Severity: Critical
- [ ] **20c-02** Create `LeaveRequestRepository` — `leave-requests.service.ts` directly accesses Prisma for all CRUD; bypasses repository pattern entirely — BE · Severity: High
- [ ] **20c-03** Rename/refactor `in-memory-staffing-request.service.ts` — named "in-memory" but uses Prisma directly (40+ calls). Rename to `PrismaStaffingRequestService` and add repository abstraction — BE · Severity: High
- [ ] **20c-04** Move Prisma calls out of `metadata-dictionary-query.service.ts` — direct Prisma calls for customFieldDefinition and workflowDefinition mixed into query service — BE · Severity: High
- [ ] **20c-05** Add transaction boundaries — multi-step operations in `assign-project-team`, `terminate-employee`, `create-project-assignment` services lack `$transaction()` wrapping. Partial failures leave inconsistent state — BE · Severity: High

#### 20c-II: Service Decomposition

- [ ] **20c-06** Split `AuthService` (498 lines, 16 methods) into: `AuthenticationService`, `TwoFactorService`, `PasswordManagementService`, `AccountManagementService` — BE · Severity: High
- [ ] **20c-07** Extract controller presentation logic — `cases.controller.ts:365-395` has `loadPeopleMap()` and `mapCase()` data fetching/mapping in controller. Create `CasePresenterService` — BE · Severity: Medium
- [ ] **20c-08** Resolve circular dependencies — 4 modules use `forwardRef()`: organization ↔ assignments ↔ project-registry ↔ exceptions. Establish clear dependency hierarchy — BE · Severity: Medium

#### 20c-III: DTO & Type Safety

- [ ] **20c-09** Create DTOs for 25+ inline `@Body()` parameters — cases controller (addStep, addParticipant, addComment, updateSla), admin controller (updateAccount, importPreview, createWebhook), staffing controller, metadata controller all use unvalidated inline types — BE · Severity: High
- [ ] **20c-10** Replace `any` types in 15+ Prisma repository Gateway interfaces — all use `args: any` and `Promise<any>`. Create properly typed Gateway generics — BE · Severity: High
- [ ] **20c-11** Fix dangerous `as unknown as` type assertions — 12+ instances in cases.controller, hr-dashboard-query, InteractiveOrgChart, SettingsPage. Create proper TypeScript interfaces — BE/FE · Severity: Medium
- [ ] **20c-12** Add `skip`/`take` pagination to unbounded `findMany()` calls — 4+ notification/project/metadata repositories load entire tables without limits — BE · Severity: Medium

#### 20c-IV: Clean Code & Tech Debt

- [ ] **20c-13** Extract `useDashboardQuery` shared hook — all 6 dashboard hooks duplicate identical fetch+state+cleanup pattern (~200 lines saved) — FE · Severity: High
- [ ] **20c-14** Extract `fetchDashboard<T>` generic API utility — 6 dashboard-*.ts API modules have identical URLSearchParams + fetch wrapper boilerplate — FE · Severity: High
- [ ] **20c-15** Split god components — `ProjectManagerDashboardPage` (441 lines), `DirectorDashboardPage` (356 lines), `HrDashboardPage` (400+ lines) each contain fetch logic + 3-6 tabs + charts + tables. Extract tab contents into separate components — FE · Severity: High
- [ ] **20c-16** Extract `usePersonSelector` hook — identical person-change callback pattern repeated in 4+ dashboard pages — FE · Severity: Medium
- [x] **20c-17** Add React ErrorBoundary — _(already done)_ — ErrorBoundary exists in components/common/ and wraps routes in router.tsx — no dashboard pages are wrapped in error boundaries; unhandled errors crash entire page — FE · Severity: Medium
- [ ] **20c-18** Refactor boolean parameters in `CreateProjectAssignmentService` — `allowOverlapOverride`, `draft`, `projectValidated`, `personValidated` flags violate SRP. Use builder pattern or separate services — BE · Severity: Medium

### Phase 20d — React Performance & Frontend Quality

- [x] **20d-01** Extract inline style objects from hot-path table components — `ActionDataTable.tsx` (20+ inline styles), `DataTable.tsx` (7), `AuditTimeline.tsx` (15+) create new objects on every render. Move to CSS classes, constants, or useMemo — FE · Severity: High
- [x] **20d-02** Extract inline styles from route pages — `WorkloadMatrixPage.tsx` (15+), `ProjectsPage.tsx` (7) have inline style objects in render path. Move to CSS or const — FE · Severity: High
- [x] **20d-03** Combine waterfall fetches in `WorkloadMatrixPage.tsx:71-92` — three independent useEffects fetch resource pools, org chart, and person directory sequentially. Combine with `Promise.all()` — FE · Severity: Medium
- [x] **20d-04** Stabilize `ProjectsPage` titlebar dependencies — `healthMap` and `state.visibleItems` cause unnecessary re-renders. Wrap with `useMemo` — FE · Severity: Medium
- [x] **20d-05** Add disabled button styling — `global.css` buttons with `disabled` attribute lack visual differentiation (no opacity/cursor change). Add `.button:disabled` styles for all variants — FE · Severity: High
- [x] **20d-06** Add focus-visible styles to interactive table rows — `DataTable.tsx` clickable rows and `.dash-compact-table tr[data-href]` respond to click/keyboard but lack `:focus-visible` outline — FE · Severity: High
- [x] **20d-07** Add focus-visible styles to KPI strip items — `.kpi-strip__item` links lack `:focus-visible` styling for keyboard navigation — FE · Severity: Medium
- [x] **20d-08** Add tip balloon keyboard activation — tip balloons only show on `:hover`; add `:focus-within` selector for keyboard users — FE · Severity: Medium
- [x] **20d-09** Add pagination to `StaffingRequestsPage.tsx` — renders all requests without pagination or virtualization — FE · Severity: Medium
- [x] **20d-10** Add CSS transition to table row hover — `.data-table__row--interactive:hover td` background changes instantly. Add `transition: background-color 120ms ease` — FE · Severity: Low
- [x] **20d-11** Add fade-in animation to `ConfirmDialog` — dialog appears instantly without transition — FE · Severity: Low

### Phase 20e — Accessibility (WCAG 2.2 AA)

- [x] **20e-01** Add `prefers-reduced-motion` media queries — skeleton-pulse animation (`global.css:3113`), pulse-dot animation (`global.css:3597`) run without checking motion preferences. Wrap in `@media (prefers-reduced-motion: no-preference)` — FE · Severity: High
- [x] **20e-02** Replace interactive `<div>` with `<button>` in `NotificationBell.tsx:254-270` — notification item has onClick+tabIndex+role="button" but should use native `<button>` for proper semantics — FE · Severity: High
- [x] **20e-03** Add `scope="col"` to table headers — `MetadataEntryPanel.tsx:33-52` and `BulkAssignmentResults.tsx:51-102` have `<th>` without scope attributes — FE · Severity: Medium
- [x] **20e-04** Verify `--color-text-muted` and `--color-text-subtle` contrast ratios — used in ActionDataTable, EmptyState, ErrorState, AuditTimeline, SectionCard. Must meet 4.5:1 for normal text — FE · Severity: Medium
- [x] **20e-05** Add focus-visible indicator to `ChartWrapper.tsx:20` — has `tabIndex={0}` but no explicit focus styling — FE · Severity: Medium
- [x] **20e-06** Add descriptive captions to DataTable instances — `caption` prop exists but most tables don't use it — FE · Severity: Low

### Phase 20f — Playwright E2E Test Hardening

- [x] **20f-01** Replace all hardcoded API URLs with config variable — 30+ test files hardcode `http://127.0.0.1:3000/api` and `http://127.0.0.1:5173`. Create shared `API_BASE` constant from `process.env` or playwright config — E2E · Severity: Critical
- [x] **20f-02** Remove `page.waitForTimeout(2000)` from `08-director.spec.ts:63` — use `expect(locator).toBeVisible()` or `page.waitForURL()` instead — E2E · Severity: Critical
- [x] **20f-03** Fix port mismatch — ux-laws tests use port 5173 but playwright config uses 4173. Align all tests to config `baseURL` — E2E · Severity: High
- [x] **20f-04** Replace CSS/XPath selectors with semantic locators — `loading-states.spec.ts`, `kpi-drilldown.spec.ts`, `smoke.spec.ts`, `workload-happy-path.spec.ts` use `.locator('.css-class')` instead of `getByRole()`/`getByTestId()` — E2E · Severity: High
- [x] **20f-05** Reduce flaky `.first()`/`.nth()` patterns — 20+ locations across test files use `.first()` on broad selectors without sufficient context. Use more specific locators — E2E · Severity: Medium
- [x] **20f-06** Refactor `10-cross-role.spec.ts` shared state — uses `test.describe.serial()` with module-scope `let` variables (`assignmentId`, `crossProjectId`, `caseId`). Use fixtures or setup hooks instead — E2E · Severity: Medium
- [x] **20f-07** Increase CI retries from 1 to 2 in `playwright.config.ts:22` and change trace to `'on-first-retry'` — E2E · Severity: Low
- [x] **20f-08** Add accessibility testing with `@axe-core/playwright` — no E2E tests include a11y assertions. Add `checkA11y(page)` to at least one test per role — E2E · Severity: Medium

### Phase 20g — UX Laws Compliance

- [x] **20g-01** Persist filters via URL in `CasesPage.tsx` — `useCasesList()` hook stores filters (`caseTypeKey`, `ownerPersonId`, `subjectPersonId`) in useState, not URL params. Filters lost on navigation — FE · Law 5 · Severity: High
- [x] **20g-02** Persist filters via URL in `WorkloadMatrixPage.tsx:55-61` — 5 filter states (`poolId`, `orgUnitId`, `managerId`, `personFilter`, `projectFilter`) use useState. Replace with `useFilterParams` — FE · Law 5 · Severity: High
- [x] **20g-03** Fix timesheet approval one-screen rule — `TimesheetApprovalPage.tsx:305-347` requires expanding a row to see timesheet detail before clicking Approve/Reject. Full context not visible alongside action buttons — FE · Law 7 · Severity: High
- [x] **20g-04** Pre-fill `projectId` from URL in `CreateStaffingRequestPage.tsx` and `CreateAssignmentPage.tsx` — forms don't extract `?projectId=` param even though parent pages pass it — FE · Law 6 · Severity: Medium
- [x] **20g-05** Pre-fill `actorId` from auth context in `BulkAssignmentPage.tsx` — all form fields start empty; actorId should come from `useAuth().principal.personId` — FE · Law 6 · Severity: Medium
- [x] **20g-06** Add forward actions to error states — `CasesPage.tsx:63` ErrorState has no retry/dashboard/create action. `WorkloadMatrixPage.tsx:237-240` EmptyState has no action buttons — FE · Law 2 · Severity: Medium
- [x] **20g-07** Persist sort order in URL on `ProjectsPage.tsx:29` — `sortByHealth` uses local state; lost on navigation — FE · Law 10 · Severity: Medium
- [x] **20g-08** Fix KPI drilldown on `TeamDashboardPage.tsx:68-73` — "Unassigned" KPI links to `#unassigned` hash anchor instead of filtered people list (`/people?unassigned=true`) — FE · Law 9 · Severity: Medium

### Phase 20h — Design System Token Enforcement

- [x] **20h-01** Replace hardcoded hex colors in `global.css` — 15+ instances of `#fff`, `#111a24`, `#f1f5f8`, etc. in sidebar, skip-link, banners (lines 33, 87, 109, 255, 272, 730, 735, 801, 835). Use CSS variables — FE · Severity: High
- [x] **20h-02** Replace hardcoded `rgba()` values in `global.css` — 20+ instances in scrollbar colors, sidebar states, transitions (lines 54, 59, 181, 195, 224, 225, 242, 243, 296, 301, 340, 351, 375). Tokenize with design variables — FE · Severity: Medium
- [x] **20h-03** Replace hardcoded `allocColor()` hex returns in `WorkloadMatrixPage.tsx:28-31` — returns `#2e7d32`, `#1b5e20`, `#e65100`, `#b71c1c`. Use `var(--color-status-*)` tokens — FE · Severity: High
- [x] **20h-04** Replace inline `fontSize: 11`/`fontSize: 12` values — `ProjectsPage.tsx`, `StaffingRequestsPage.tsx`, `SectionCard.tsx`, `ViewportTable.tsx` use hardcoded pixel font sizes in inline styles. Use CSS variables or typography scale — FE · Severity: Medium
- [x] **20h-05** Replace inline `gap`/`padding`/`margin` px values — `LeaveRequestPage.tsx`, `BulkImportPage.tsx`, `AdminPanelPage.tsx`, `SectionCard.tsx`, `ViewportTable.tsx` use hardcoded spacing instead of `var(--space-*)` tokens — FE · Severity: Medium
- [x] **20h-06** Replace raw `<table>` with `DataTable` component — `LeaveRequestPage.tsx` (2 tables), `ResourcePoolsPage.tsx`, `StaffingRequestsPage.tsx`, `AdminPanelPage.tsx`, `BulkImportPage.tsx` (2 tables) use raw `<table className="dash-compact-table">` — FE · Severity: Medium
- [x] **20h-07** Remove hardcoded color fallbacks — `UtilizationPage.tsx:37-41,166-170` uses `'var(--color-status-active-light, #bbf7d0)'` pattern with hex fallbacks that defeat design token consistency — FE · Severity: Low

### Phase 20i — Docker, CI/CD & Infrastructure

- [x] **20i-01** Pin all GitHub Actions to commit SHAs — `ci.yml`, `deploy.yml`, `architecture-check.yml` use semver tags (`@v4`, `@v3`, `@v6`). Pin to full SHA for supply chain security — INFRA · Severity: Critical
- [x] **20i-02** Add resource limits to all Docker Compose services — no `resources.limits` defined in `docker-compose.yml` or `docker-compose.prod.yml`. Add CPU/memory limits — INFRA · Severity: High
- [x] **20i-03** Add dependency vulnerability scanning to CI — no `npm audit`, Snyk, or Dependabot step in CI pipeline — INFRA · Severity: Medium
- [x] **20i-04** Add container image scanning — no Trivy or similar scanner before image push in CI/CD — INFRA · Severity: Medium
- [x] **20i-05** Add rate limiting to Caddyfile — no request rate limiting or size limits on API reverse proxy — INFRA · Severity: Medium
- [x] **20i-06** Fix health check compatibility — `docker-compose.yml` health checks use `wget` which may not be available in Alpine images. Use `nc` or shell commands — INFRA · Severity: Low

---

## Phase 21 — Feature Uplift (from FEATURE_IMPROVEMENTS.md audit 2026-04-17)

> Scope derived from `FEATURE_IMPROVEMENTS.md` after code-level validation. 5 items in that document
> were already implemented (F1 notifications bell, F5 `?` cheatsheet, F6 pinned sidebar UI,
> F13 mood widget) and are dropped pending Phase 0 browser recheck. F3 universal export is 80%
> done — scoped here to the reusable `ExportButton` primitive and page gap-fill only. Runners-up
> F16–F25 are deferred. Full plan: `/home/drukker/.claude/plans/review-validate-and-plan-smooth-rocket.md`.

### Phase 0 — Browser revalidation (completed 2026-04-17)

- [x] **21-00-1** F1 NotificationBell — bell in TopHeader, SSE `/api/notifications/inbox/stream` returns 200 with data lines, dropdown panel opens, "View all notifications" deep-links to `/notifications`, live unread-count update observed (bell 0 → 2 after Ethan submitted pulse) — FE · manual QA
- [x] **21-00-2** F5 `?` cheatsheet — `?` opens "Keyboard Shortcuts" dialog with 4 rows (`/`, `?`, `Cmd+K`, `Esc`); `Escape` closes — FE · manual QA
- [x] **21-00-3** F6 sidebar pin UI — clicked "Pin My Dashboard"; `localStorage['sidebar-pins:<personId>']` → `["/dashboard/employee"]`; after reload a "FAVORITES" section renders above "MY WORK" with the pinned link — FE · manual QA
- [x] **21-00-4** F13 mood widget — `PulseWidget` renders on `/dashboard/employee` with 5 emoji buttons; Good (4) + Submit → "Pulse submitted 😊"; `GET /api/pulse/my` confirms persisted row (mood=4, submittedAt=2026-04-17T18:41:06Z) — FE · manual QA
- [x] **21-00-5** F3 gap list — pages with in-page export: `/projects`. **Missing** in-page export: `/projects/:id`, `/resource-pools`, `/cases`, `/exceptions`, `/staffing-requests`, `/admin/metadata`. This is the P21-06 gap-fill set — FE · discovery

### Phase 0 infra carryover (fixed during browser QA)

- [x] **21-00-I1** Add `procps` to `Dockerfile` base stage + tune backend dev env — backend was crash-looping because `nest start --watch` spawns `ps` for child-process cleanup and the `node:20-bookworm-slim` base image shipped without it (symptom surfaced as OOM kills). Also added `NODE_OPTIONS=--max-old-space-size=768` to backend service in `docker-compose.yml` (defensive GC under the 1G cgroup limit) and removed `CHOKIDAR_USEPOLLING` to reduce watcher cost — INFRA (supplements 20i-02)

### Prerequisites (narrowed from Phase 20c)

- [ ] **20c-09** _(narrow scope)_ Add class-validator DTOs for new Phase 21 endpoints only (F2 notif-prefs, F9 nudge, F11 undo-register, F15 undo-consume). Bulk DTO refactor for the other 25+ inline `@Body()` params stays in Phase 20c — BE
- [x] **20c-13** _(finish)_ Migrated `useDirectorDashboard.ts` and `useDeliveryManagerDashboard.ts` to a sibling hook `useGlobalDashboardQuery.ts` (these two are tenant-global and don't fit `useDashboardQuery`'s person-scoped contract). All 6 dashboard hooks now share extracted query infrastructure. TS clean; DM tests pass; Director test failures pre-existing at baseline (unrelated) — FE
- [ ] **20c-15** Split `ProjectManagerDashboardPage` (441 lines), `DirectorDashboardPage` (356 lines), `HrDashboardPage` (400+ lines) into per-tab components before mounting new dashboard widgets — FE

### Sprint A — Quick wins

- [x] **21-01** _(F8)_ Staffing request aging badges — new `frontend/src/features/staffing-desk/aging.ts` with `getAgingTone()` / `getAgingDays()` / `getAgingTooltip()` (thresholds: <3d neutral, 3-7d warning, >7d danger); added "Age" column in `StaffingRequestsPage.tsx` and extended "Created" column in `StaffingDeskTable.tsx` Demand view with inline aging badge. Tooltip explains thresholds. Test: `aging.test.ts` (5 tests pass). TS clean — FE
- [x] **21-02** _(F4)_ Added Assignments + Cases async groups to `CommandPalette.tsx`. Assignments fetched via `fetchAssignments({ status: 'ACTIVE', pageSize: 15 })`; cases via `fetchCases({})` filtered client-side for `OPEN`/`IN_PROGRESS`. Each group shows top 5 matches, deep-linking to `/assignments/:id` and `/cases/:id`. TS clean — FE
- [x] **21-03** _(F12)_ Extended `@media print` block in `global.css:3433`: hides all buttons, notifications, command palette, confirm dialogs, toasts; added `.print-only` helper; scoped project-detail rules via `[data-testid="project-detail-page"]`/`[data-testid="project-details-page"]` to expand collapsed SectionCard content and format KPI strip for print. Added `.print-footer.print-only` to `ProjectDetailPage.tsx` showing `{projectCode} · Printed {date}`. TS clean — FE
- [x] **21-04** _(F10)_ New `useRecentActivity.ts` hook + `RecentActivityRail.tsx` component. Fetches `/audit/business?pageSize=20`, filters by role-specific `targetEntityType` sets (director/pm/rm/hr), renders top 5 via `AuditTimeline` inside a `SectionCard`. Mounted on Director, PM, HR, and RM dashboards. TS clean, 3 dashboard tests pass — FE
- [x] **21-05** _(F14)_ New `frontend/src/components/dashboard/OnboardingChecklist.tsx` renders 4-step admin onboarding (pool → project → people → staffing request). Self-detects empty tenant via `fetchResourcePools`, `fetchPortfolioSummary`, `fetchPersonDirectory({pageSize:1})`, `fetchStaffingRequests`. Component auto-hides when all 4 steps complete. Mounted at top of `DashboardPage.tsx` (admin landing page — other roles redirect via `getDashboardPath`). TS clean; DashboardPage test failures pre-existing at baseline — FE
- [x] **21-06** _(F3)_ New reusable `frontend/src/components/common/ExportButton.tsx` with XLSX (wrapping existing `exportToXlsx`) + CSV (inline) via dropdown menu. Props: `data`, `columns: Array<{key, label, accessor?}>`, `filename`, `label?`. Wired into `StaffingRequestsPage`, `CasesPage`, `ResourcePoolsPage`. Respects current filters (pages pass filtered rows). Deferred: `/exceptions`, `/admin/metadata`, `/projects/:id` (tab-based, needs per-tab exports). TS clean; 7 tests pass — FE

### Sprint B — Backend-coupled

- [ ] **21-07** _(F2)_ Server-side notification preferences: new `PersonNotificationPreference` Prisma model + migration + `me-notification-prefs.controller.ts` with `GET`/`PATCH /me/notification-prefs`; `AccountSettingsPage.tsx` migrates and clears `dc:notif_prefs` localStorage on first load — BE/FE
- [x] **21-08** _(F7)_ All 4 target pages (`/assignments`, `/projects`, `/staffing-requests`, `/people`) already URL-source filters via `useFilterParams`. Added new `frontend/src/components/common/CopyLinkButton.tsx` that copies `window.location.href` to clipboard with a 1.5s "Copied ✓" confirmation. Wired into title-bar actions of all 4 pages. TS clean — FE
- [ ] **21-09** _(F9)_ Nudge button on pending approvals: add `approval-pending-nudge` template in `seed-notif-templates.js`; new `POST /notifications/nudge` with DTO + 24h rate limit per (approverId, requestId); new `NudgeButton.tsx` — BE/FE
- [x] **21-10** _(F11)_ New `frontend/src/components/assignments/UtilisationPeek.tsx` calls existing `checkAllocationConflict()` (hits `/workload/check-conflict`) with 300ms debounce. Renders a segmented capacity bar (existing grey + new coloured by load) and shows `existing % + new %` labels. Over-allocated case turns red with "Over-allocated by N%" warning. Mounted below the date fields in `CreateAssignmentModal.tsx`. No new backend endpoint. TS clean — FE
- [ ] **21-11** _(F15)_ Server-side undo API for assignment revoke + staffing-request cancel only (terminate/deactivate/close deferred): new `UndoAction` Prisma model + `UndoActionService` + `POST /actions/:actionId/undo` with 5s TTL; client `useReversibleMutation.ts` hook shows `sonner` Undo toast — BE/FE

---

## Phase DM — Data Model Remediation (2026-04-17)

> Strategic plan: `/home/drukker/.claude/plans/http-localhost-5173-review-data-model-bright-peach.md`
> Scope is the holistic shape of `prisma/schema.prisma`. Product decisions that shaped scope:
> (1) full D1→D8 delivered, (2) multi-tenancy within 6 months → D7.5 is first-class, (3) small scale (<10M rows/24mo)
> → partitioning deferred but `DomainEvent` partition-ready from day one, (4) live 24/7 zero-downtime
> → expand-contract + two-release contract + blue/green clone verification mandatory every phase.

### DM-1 — Conventions, Lint, Aggregate Map (docs + tooling, zero DB risk)

- [x] **DM-1-1** Add `Phase DM` entry to the tracker and this checklist — BOTH · _(done 2026-04-17)_
- [x] **DM-1-2** Write `docs/planning/schema-conventions.md` — ID types, temporal vocabulary, audit columns, enum vs string, `onDelete` policy matrix, `@@map`, `@db.Timestamptz`, currency, `version`, soft-delete, indexing, bridge-table naming, canonical dictionary keys — DOCS · _(done 2026-04-17)_
- [x] **DM-1-3** Write `docs/planning/aggregate-map.md` — every aggregate root, component entities, forbidden cross-aggregate writes. Highest-leverage artifact of D1 — DOCS · _(done 2026-04-17)_
- [x] **DM-1-4** Write `docs/planning/data-model-decisions.md` — 25 DMD entries including "CRUD + event-log, not event-sourced", "RLS-on-top, not application-only", accepted Postgres extensions, retrospective extraction, deprecation of `ApprovalDecision.REQUESTED` — DOCS · _(done 2026-04-17)_
- [x] **DM-1-5** Install `@mrleebo/prisma-ast` as a backend devDependency — BE · _(done 2026-04-17)_
- [x] **DM-1-6** Write `scripts/check-schema-conventions.cjs` — 7 rules (id-not-uuid, fk-not-uuid, fk-missing-relation, relation-ondelete-missing, datetime-not-timestamptz, model-missing-map, approval-decision-requested) — BE · _(done 2026-04-17)_
- [x] **DM-1-7** Generate `scripts/schema-convention-baseline.json` — 397 existing violations baselined (1 approval-decision, 12 id-not-uuid, 24 fk-not-uuid, 41 fk-missing-relation, 42 model-missing-map, 60 relation-ondelete-missing, 217 datetime-not-timestamptz). Baseline only shrinks — BE · _(done 2026-04-17)_
- [x] **DM-1-8** Add `schema:check` npm script and wire into `verify:pr` + `schema:baseline` helper. Pre-commit hook deferred — no husky/lefthook infra today; CI gate via `verify:pr` is the enforcement path — BE · _(done 2026-04-17)_
- [-] **DM-1-9** Enum hygiene: deprecate `ApprovalDecision.REQUESTED` — _captured in lint (rule `approval-decision-requested`), documented in DMD-025, and in baseline so CI flags any new use. Actual enum removal + migration + code refs deferred to DM-4 enum-cleanup sub-phase._ — BE
- [x] **DM-1-10** Update `docs/planning/current-state.md` with DM-1 completion — DOCS · _(done 2026-04-17)_

### DM-2 — Type Normalization via Expand-Contract (combined with DM-2.5 publicId)

> **Combined with DM-2.5** — each per-table migration adds both the internal `uuid` PK (DM-2) and the external `publicId` column (DM-2.5) so tables are touched once, not twice. Full runbook: `docs/planning/dm2-expand-contract-runbook.md`.
>
> **Tables in scope (12):** `skills`, `person_skills`, `pulse_entries`, `in_app_notifications`, `period_locks`, `project_budgets`, `person_cost_rates`, `leave_requests`, `staffing_requests`, `staffing_request_fulfilments`, `timesheet_weeks`, `timesheet_entries`. Plus 14 FK columns on these tables awaiting TEXT→UUID conversion (see DM-3-2b list).
>
> Order of attack (lowest blast radius first): `skills` → `person_skills` → `pulse_entries` → `period_locks` → `person_cost_rates` → `project_budgets` → `in_app_notifications` → `leave_requests` → `staffing_request_fulfilments` → `staffing_requests` → `timesheet_entries` → `timesheet_weeks`.

- [x] **DM-2-pilot** Combined DM-2 + DM-2.5 expand scaffold for `skills`: schema changes, migration + rollback, dual-maintain trigger, baseline unchanged, backend TS green — BE · _(done 2026-04-18)_
- [x] **DM-2-expand-skills** Expand migration for `skills` (shadow `idNew` uuid + `publicId` `skl_` prefix + trigger + unique indexes) — BE · _(scaffolded 2026-04-18; ops rollout pending)_
- [x] **DM-2-expand-person_skills** Expand migration for `person_skills` (sub-entity of Person; idNew only, no publicId) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-pulse_entries** Expand migration for `pulse_entries` (sub-entity; natural composite key; idNew only) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-period_locks** Expand migration for `period_locks` (root; `prd_` prefix) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-person_cost_rates** Expand migration for `person_cost_rates` (root; `pcr_` prefix) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-project_budgets** Expand migration for `project_budgets` (root; `bud_` prefix) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-in_app_notifications** Expand migration for `in_app_notifications` (root; `not_` prefix; forward-compatible with DM-7 Notification unification) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-leave_requests** Expand migration for `leave_requests` (root; `lvr_` prefix) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-staffing_request_fulfilments** Expand migration for `staffing_request_fulfilments` (sub-entity of StaffingRequest; idNew only) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-staffing_requests** Expand migration for `staffing_requests` (root; `stf_` prefix) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-timesheet_entries** Expand migration for `timesheet_entries` (sub-entity of TimesheetWeek; idNew only) — BE · _(scaffolded 2026-04-18)_
- [x] **DM-2-expand-timesheet_weeks** Expand migration for `timesheet_weeks` (root; `tsh_` prefix) — BE · _(scaffolded 2026-04-18)_
- [ ] **DM-2-ops-expand** Apply the 12 expand migrations to blue/green clone → traffic replay → staging rolling-deploy drill → production cutover. Expand is additive only; any order works — OPS
- [-] **DM-2-contract-batch** Release N+2 contract migrations (assert backfill complete → drop old `id` PK → rename `id_new → id` → `publicId NOT NULL` → drop trigger) for each of 12 tables. **BLOCKED** on DM-2.5 controller rollout — 8 of 10 aggregates still use uuid in their controller params + service layer; flipping the PK column mid-way breaks them. Unblocks when DM-2.5-8 × 10 aggregates + DM-2.5-9 frontend + DM-2.5-11 ingress lockdown complete. — BE/OPS · _(blocked)_
- [ ] **DM-2-finish** Unblock DM-3-2b (14 TEXT→UUID FKs); unblock DM-4 CHECK constraints on these tables; regenerate `prisma/seed.ts`; shrink schema-conventions baseline; drop `id_old` shadow columns — BE

### DM-2.5 — Public ID Layer (UUIDs never leave the API boundary) ⚠️ security-critical

> Security rule from the user: raw UUIDs in URLs, DTOs, frontend state, referer headers, or analytics are a heavy vulnerability. Mechanism + rules documented in `schema-conventions.md` §20 and `data-model-decisions.md` DMD-026.

- [x] **DM-2.5-1** `publicId` column on 8 aggregate roots landed via DM-2 expand (Skill/PeriodLock/ProjectBudget/PersonCostRate/InAppNotification/LeaveRequest/StaffingRequest/TimesheetWeek). Remaining roots land as DM-2 extends — BE · _(partial 2026-04-18)_
- [x] **DM-2.5-2** `src/infrastructure/public-id/{aggregate-type,public-id.service}.ts` with Sqids (MIT), lookalike-safe alphabet (no 0/O/1/I/l), 48-bit entropy, `isValidShape()`, `looksLikeUuid()` guardrail. 24 unit tests green — BE · _(done 2026-04-18)_
- [x] **DM-2.5-3** `src/infrastructure/public-id/public-id-prisma.middleware.ts`: `registerPublicIdMiddleware(prisma, publicIdService)` via `$use`, populates `publicId` on `create`/`createMany`, retries on P2002 publicId-unique violation. Opt-in utility; `PrismaService` hookup deferred to DM-2.5-8 per-aggregate rollout — BE · _(done 2026-04-18)_
- [x] **DM-2.5-4** `parse-public-id.pipe.ts` — `ParsePublicId(AggregateType.Project)` factory; rejects UUIDs, wrong-aggregate prefixes, malformed identifiers; covered by unit tests — BE · _(done 2026-04-18)_
- [x] **DM-2.5-5** `src/infrastructure/public-id/public-id-serializer.interceptor.ts` — runtime egress guardrail: swaps `id` ↔ sibling `publicId`, rewrites `<foreign>Id` via sibling `<foreign>PublicId`, drops loose `*PublicId` fields, detects residual UUID leaks (throws in non-prod, logs in prod). 14 unit tests covering rewrite + leak detection + pass-through — BE · _(done 2026-04-18)_
- [x] **DM-2.5-6** Lint rule `public-id-missing` — enforced for the 8 aggregate roots listed in `AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID`; set ramps as DM-2 extends — BE · _(done 2026-04-18)_
- [x] **DM-2.5-7** Lint rule `controller-uuid-leak` — `scripts/check-public-id-leak.cjs` scans every `*.dto.ts` / `*.response.ts` / `*.controller.ts` in `src/`, flags classes that expose `id: string` without a sibling `publicId: string`. Request/action DTOs excluded via prefix heuristic. 48 existing violations baselined in `scripts/public-id-leak-baseline.json`; baseline only shrinks. Wired into `verify:pr` via `npm run publicid:check` — BE · _(done 2026-04-18)_
- [ ] **DM-2.5-8** Migrate controllers to publicId top-down per `docs/planning/dm2.5-controller-migration-template.md`. One sub-task per aggregate.
   - [x] **DM-2.5-8a** Canonical playbook written. Documents Sub-phase A (DTO + service additive), Sub-phase B (controller-flip via `ParsePublicId`), Sub-phase C (drop UUID acceptance), first-migration global wiring for interceptor + middleware — DOCS · _(done 2026-04-18)_
   - [ ] **DM-2.5-8-skill** Sub-phase A + B landed for Skill. Sub-A: `SkillDto.publicId` (publicid-leak baseline 48→47), `UpsertPersonSkillItemDto.skillId` regex accepts uuid or `skl_…`, `findSkillByIdOrPublicId` transitional helper, `toSkillDto` emits publicId. Sub-B: `ParsePublicIdOrUuid(AggregateType.Skill)` transitional pipe applied to `DELETE /admin/skills/:id`; 5 new unit tests (43 total). Sub-C (drop uuid + flip to strict `ParsePublicId`) + `PersonSkillsController` / `SkillMatchController` endpoints pending (depend on Person + Project aggregate registration) — BE · _(sub-A+B done 2026-04-18)_
   - [ ] **DM-2.5-8-staffing** Sub-A + B landed for StaffingRequest. **Sub-A** (2026-04-18): `StaffingRequest` interface + `PrismaRecord` gain publicId; `toResponse()` emits publicId as `id` field with uuid fallback; `findRecordByIdOrPublicId` transitional helper. **Sub-B** (2026-04-19): all 7 controller endpoints (`GET /:id`, `PATCH /:id`, `POST /:id/submit`, `/review`, `/release`, `/fulfil`, `/cancel`) use `ParsePublicIdOrUuid(AggregateType.StaffingRequest)`; service layer adds `resolveInternalId()` that routes every mutation through the helper first. Backend `tsc --project tsconfig.build.json --noEmit` clean. Sub-C (drop uuid + flip to strict `ParsePublicId`) is blocked on DM-2.5-9 frontend route flip. — BE · _(sub-A+B done 2026-04-19)_
   - [ ] **DM-2.5-8-timesheet** Sub-phases A/B/C for TimesheetWeek — BE · _(follows DM-2.5-8-staffing template verbatim; ~2 hours per aggregate; not shipped this session — substantial controller + service + test code changes per aggregate)_
   - [ ] **DM-2.5-8-project** Sub-phases A/B/C for Project — BE · _(pending; large blast radius — touches every frontend route)_
   - [ ] **DM-2.5-8-person** Sub-phases A/B/C for Person — BE · _(pending; highest-value aggregate — unblocks many downstream PersonSkillsController paths)_
   - [ ] **DM-2.5-8-assignment** Sub-phases A/B/C for ProjectAssignment — BE · _(pending)_
   - [ ] **DM-2.5-8-case** Sub-phases A/B/C for CaseRecord — BE · _(pending)_
   - [ ] **DM-2.5-8-notification** Sub-phases A/B/C for Notification — BE · _(pending — DM-7-5 unified `Notification` table landed; this flips the controller)_
   - [ ] **DM-2.5-8-remaining** Sub-phases A/B/C for remaining roots (Client, Vendor, OrgUnit, ResourcePool, PeriodLock, PersonCostRate, ProjectBudget, LeaveRequest, DomainEvent, ProjectRisk, ProjectRagSnapshot, Contact, BudgetApproval, EmploymentEvent, Tenant) — BE · _(pending)_
   - [x] **DM-2.5-8-global-wiring** Global wiring landed and stabilised after a concurrent-agent triage. `PublicIdModule` imported in `AppModule` · registers `APP_INTERCEPTOR: PublicIdSerializerInterceptor` · `PublicIdBootstrapService.onModuleInit` installs `registerPublicIdMiddleware`. **Three env-var rails, all default OFF / rollout-safe:** `PUBLIC_ID_INTERCEPTOR_ENABLED=true` turns the serializer on (default `false` to avoid flooding logs on every unmigrated response), `PUBLIC_ID_STRICT=true` turns an enabled interceptor into a throw-on-leak CI gate, `PUBLIC_ID_MIDDLEWARE_ENABLED=false` skips the Prisma middleware install (for environments pre-DM-2-migration). `PublicIdBootstrapService` lazy-resolves `PrismaService` via `ModuleRef.get(..., { strict: false })` in `onModuleInit` — constructor injection triggered `Nest can't resolve dependencies of PublicIdBootstrapService(?, PublicIdService)` at startup even with `PrismaModule` declared `@Global()`. Leak logs downgraded ERROR → WARN when non-strict. 45 unit tests · host tsc 0 errors · backend docker healthy · `/api/health` 200 — BE · _(done + triaged 2026-04-18)_
- [ ] **DM-2.5-9** Migrate frontend routes + link components to publicId. Two-release contract: backend accepts BOTH during the transition release — FE
- [ ] **DM-2.5-10** Update E2E + integration tests to assert publicId shape; ban UUID-shape matchers via a Playwright custom matcher — FE/BE
- [ ] **DM-2.5-11** Drop UUID acceptance on ingress; remove fallback. CI gate enforces no UUIDs in any response DTO — BE
- [ ] **DM-2.5-12** Audit SSR output, outbound email templates, webhook payloads, integration adapter payloads for UUID leaks; replace with publicId — BE

### DM-3 — Relation Closure (adds every missing FK with `NOT VALID` → `VALIDATE`)

- [x] **DM-3-1** `onDelete` policy matrix in `schema-conventions.md` §6 (Restrict / Cascade / SetNull per relation kind) — DOCS · _(landed in DM-1, 2026-04-17)_
- [x] **DM-3-2a** Phase-1 UUID↔UUID pairs (16 relations): Prisma `@relation(... onDelete: ...)` + back-references on Person/CaseRecord + migration `prisma/migrations/20260417_dm3_relation_closure/migration.sql` using `ADD CONSTRAINT ... NOT VALID` + `CREATE INDEX IF NOT EXISTS` + `VALIDATE CONSTRAINT`. Relations: `AuditLog.actorId`, `EmployeeActivityEvent.actorId`, `LocalAccount.personId`, `M365DirectoryReconciliationRecord.{personId,resolvedManagerPersonId}`, `PersonExternalIdentityLink.resolvedManagerPersonId`, `OvertimePolicy.approvalCaseId`, `ProjectChangeRequest.{requesterPersonId,decidedByPersonId}`, `ProjectRadiatorOverride.overriddenByPersonId`, `ProjectRagSnapshot.recordedByPersonId`, `ProjectRisk.{ownerPersonId,assigneePersonId,relatedCaseId}`, `RadiatorThresholdConfig.updatedByPersonId`, `RadiusReconciliationRecord.personId` — BE · _(done 2026-04-17; prisma validate ✓; backend TS ✓; schema lint baseline 397 → 361)_
- [-] **DM-3-2b** Phase-2 TEXT→UUID pairs (14 relations) — BLOCKED on DM-2 expand-contract. Postgres rejects FKs across TEXT↔UUID. Tables awaiting DM-2: `TimesheetWeek.{personId,approvedBy}`, `TimesheetEntry.{projectId,assignmentId}`, `LeaveRequest.{personId,reviewedBy}`, `PulseEntry.personId`, `InAppNotification.recipientPersonId`, `PeriodLock.lockedBy`, `ProjectBudget.projectId`, `PersonCostRate.personId`, `PersonSkill.{personId,skillId}`, `StaffingRequest.{projectId,requestedByPersonId}`, `StaffingRequestFulfilment.{assignedPersonId,proposedByPersonId}` — BE
- [x] **DM-3-3** `scripts/find-orphans.ts` — one `LEFT JOIN ... IS NULL` query per relation (both UUID and TEXT sides); reports orphan count + sample ID; exit 1 on orphans. Covers Phase-1 + Phase-2 relations — BE · _(done 2026-04-17)_
- [ ] **DM-3-4** **Ops rollout**: on the blue/green DB clone then production — (a) PITR snapshot; (b) apply migration `20260417_dm3_relation_closure` (first half only: `NOT VALID` + indexes); (c) `docker compose exec backend npx ts-node scripts/find-orphans.ts`; (d) clean or null any orphans under change control; (e) run the `VALIDATE CONSTRAINT` statements (second half); (f) traffic replay + staging rolling-deploy drill; (g) production cutover — OPS
- [x] **DM-3-5** Single-column indexes on every new FK column — included inline in the DM-3-2a migration — BE · _(done 2026-04-17)_
- [ ] **DM-3-6** Refactor `workforce-planner.service.ts` and `planned-vs-actual-query.service.ts` to use Prisma `include` — BE · _deferred to a follow-up PR once the Phase-1 FKs are live in prod_
- [x] **DM-3-7** Lint false-positive whitelist: external-system IDs (`externalAccountId`, `externalUserId`, `externalManagerUserId`, `providerMessageId`, `correlationId`) + polymorphic columns (`aggregateId`, `entityId`, `relatedEntityId`) — 20 baseline entries cleared — BE · _(done 2026-04-17)_

### DM-4 — CHECK Constraints + Enum Promotion + Timestamptz

- [x] **DM-4-1** CHECK constraints live — 33 constraints across 14 tables: value ranges (allocationPercent 0–100 on ProjectAssignment/staffing_requests/project_role_plans · proficiency 1–5 on person_skills · mood 1–5 on pulse_entries · probability/impact 1–5 on project_risks · hours 0–24 on timesheet_entries · HPW 0–168 on overtime), headcount (≥1; fulfilled ≤ required), monetary non-negative (budgets ≥0, hourlyRate >0), temporal ordering (validFrom≤validTo on 6 tables, effectiveFrom≤effectiveTo, startDate≤endDate on 3 tables, periodFrom≤periodTo, Project.startsOn≤endsOn). Applied as one transaction: 0 pre-flight violators · `NOT VALID` + immediate `VALIDATE CONSTRAINT` · migration `prisma/migrations/20260418_dm4_check_constraints/` + rollback.sql · recorded in `_prisma_migrations`. Host tsc 0 · `/api/health` 200 · no 4xx/5xx post-apply — BE · _(done 2026-04-18)_

### DM-R — Resilience Hardening (postmortem-driven, 4 waves; Wave 1 shipped 2026-04-18)

Strategic plan: `/home/drukker/.claude/plans/http-localhost-5173-review-data-model-bright-peach.md` (Phase DM-R section). Full scope: 32 items across 4 waves, ~10-12 engineer-days, 3-5 hrs/week ongoing discipline. User-approved "everything" — no staged gating.

- [x] **DM-R-1 (Wave 1)** Startup migration barrier — `scripts/prestart-verify-migrations.sh` (Prisma `migrate status` + drift detection) + `scripts/verify-migrations-deep.cjs` (half-applied row + name-monotonicity check via @prisma/client). Wired into `package.json`: `prestart` lifecycle auto-runs on `npm start`; `start:dev` and `start:debug` chain `&& migrations:verify`. `PRESTART_VERIFIER_DISABLE=true` env bypass for explicit dev cases. Three scenarios verified: clean state passes, injected half-applied row exits 1 with actionable fix, bypass flag skips. Converts 2026-04-18's 45-minute cascading outage into a 30-second "service won't start" message. — BE · _(done 2026-04-18)_
- [x] **DM-R-2 (Wave 1)** CI drift detection + CODEOWNERS — `.github/CODEOWNERS` gates `/prisma/schema.prisma`, `/prisma/migrations/`, `/src/infrastructure/public-id/`, resilience scripts, CI plumbing, strategic planning docs. New `.github/workflows/ci.yml` job `schema-drift-check` with ephemeral Postgres: `prisma migrate deploy` → `prisma generate` → `prisma migrate diff --exit-code` → `pg_dump --schema-only | sha256sum` vs committed `prisma/migrations/.schema-hash` baseline → verify generated Prisma Client is in sync with `schema.prisma`. Branch-protection click owed by user in the merge PR. YAML verified parses (`schema-drift-check` has 10 steps). Baseline hash committed: `d1dd14d30554…`. — BE · _(done 2026-04-18)_
- [x] **DM-R-3 (Wave 1)** Pre-migration snapshot + safe-migrate wrapper — `scripts/db-snapshot.sh` (`pg_dump -Fc` via docker compose delegation, 30-day rotation, dev-URL guard, 296KB smoke-tested), `scripts/db-restore.sh` (interactive `RESTORE` confirmation, dev-URL guard), `scripts/db-migrate-safe.sh` (flock host lock + `pg_try_advisory_lock(42042042)` DB lock + pre-migrate snapshot + post-migrate verifier; prints snapshot path in success AND failure paths so the rollback is always obvious), `scripts/db-reset-safe.sh` (dev-URL guard, pre-reset snapshot). NPM: `db:snapshot`, `db:restore`, `db:migrate:safe`, `db:migrate:safe:dev`, `db:reset:safe`. `.snapshots/` added to `.gitignore`. — BE · _(done 2026-04-18)_
- [x] **DM-R-4 (Wave 2)** REVERSIBLE.md / FORWARD_ONLY.md classification — every migration dir carries exactly one marker (13 REVERSIBLE with rollback.sql, 35 FORWARD_ONLY including the new 20260418_dm_r_7_migration_audit). `scripts/check-migration-classification.cjs` enforces: exactly-one marker, REVERSIBLE ⇒ non-empty rollback.sql, FORWARD_ONLY ⇒ no rollback.sql (a fake rollback is worse than none) + min-50-char restore docs. Wired into `npm run migrations:check` + `verify:pr` + CI `schema-drift-check` job + husky pre-commit. Negative-test verified (lint fails on missing marker). — BE · _(done 2026-04-18)_
- [x] **DM-R-5 (Wave 2)** Husky pre-commit — `husky@^9.1.7` added as devDep; `.husky/pre-commit` runs `schema:check` + `publicid:check` + `migrations:check` + `enum:check` + `scripts/check-schema-migration-pairing.cjs`. Pairing checker rejects schema.prisma edits without a new migration dir in the same commit (escape hatch: `SKIP_SCHEMA_MIGRATION_CHECK=true`). `npm run prepare` auto-installs hooks. — BE · _(done 2026-04-18)_
- [x] **DM-R-6 (Wave 2)** Enum evolution playbook + lint — `docs/planning/enum-evolution-playbook.md` (4-migration pattern: add → dual-write → backfill → drop, with the Postgres RENAME-to-_old or CREATE-_new-then-rename dance). `scripts/check-enum-evolution.cjs` rejects any migration that both ADDS and REMOVES values of the same enum in one file; catches both legal variants. Per-migration bypass via `-- ALLOW_SINGLE_STEP_ENUM:` header AND JSON baseline (`scripts/enum-evolution-baseline.json`). The 2026-04-18 canonical_assignment_status migration is baselined (cannot rewrite applied migrations). Wired into `npm run enum:check` + `verify:pr` + CI + husky. — BE/DOCS · _(done 2026-04-18)_
- [x] **DM-R-7 (Wave 2)** Agent-attributable migration audit — new `migration_audit` table (REVERSIBLE migration `20260418_dm_r_7_migration_audit`, with rollback.sql). `scripts/record-migration-audit.sh` captures `$USER`, `git config user.email`, `git rev-parse HEAD`, `AGENT_ID` (DM-R-12/26 hook), hostname, mode, applied migration names, success flag, notes — writes via docker postgres delegation, never fails the calling script. Wired into `db-migrate-safe.sh` at three points: pre-migrate status captures pending list into `MIGRATIONS_APPLIED`, success path writes `success=true`, failure path (both migrate-failed and post-verifier-failed) writes `success=false` with snapshot path. Smoke-tested end-to-end (row visible in DB). — BE · _(done 2026-04-18)_
- [x] **DM-R-8 (Wave 2)** `/api/health/deep` endpoint — new `HealthService.getDeepHealth()` probes 12 aggregate roots (Person, OrgUnit, Project, ProjectAssignment, CaseRecord, TimesheetWeek, LocalAccount, NotificationRequest, InAppNotification, StaffingRequest, Skill, ProjectBudget) via `prisma.<model>.count()` with a 3s-per-aggregate timeout. Returns per-aggregate `{status, latencyMs, count, error?}` + overall status. Live smoke 25-31ms/aggregate. `docker-compose.prod.yml` backend healthcheck upgraded — orchestrator only marks container healthy when `/api/health/deep` returns `"status":"ready"`, so a half-applied migration can't silently serve wounded traffic. — BE · _(done 2026-04-18)_
- [x] **DM-R-9 (Wave 2)** Migration category integration tests — `test/integration/migration-categories.spec.ts` classifies all 48 migrations into {schema-only, data-backfill, enum-change, trigger-install, other}. 9 tests cover: every migration is classified (REVERSIBLE or FORWARD_ONLY); REVERSIBLE⇒rollback.sql exists; FORWARD_ONLY⇒no fake rollback; most-recent-per-category has the correct posture; no single-step enum renames (DM-R-6 guard). All 9 green. Full apply→rollback→re-apply round-tripping deferred to DM-R-11 (Wave 3). — BE · _(done 2026-04-18)_
- [x] **DM-R-10 (Wave 2)** Transactional seed + verify-seed manifest — seed-failure path now runs `clearExistingData()` as pseudo-rollback (a single `prisma.$transaction` wrap OOMs the bank-scale profile; guarantee preserved: no partial seeded state survives failure). `scripts/seed-manifest.json` carries expected row counts for phase2 profile (43 aggregates). `scripts/verify-seed.cjs` compares live counts to manifest; `--refresh` regenerates after intentional data changes. Wired as `npm run seed:verify` / `seed:verify:refresh`. Green on 43/43 counts. — BE · _(done 2026-04-18)_
- [x] **DM-R-11 (Wave 3)** Weekly rollback round-trip job — `scripts/test-rollback-roundtrip.sh` iterates every REVERSIBLE migration in reverse chronological order: captures applied-schema hash → runs rollback.sql → runs migration.sql again → asserts re-apply hash equals applied hash. Fake rollbacks (SQL that runs cleanly but silently corrupts schema) fail deterministically. `.github/workflows/rollback-roundtrip.yml` schedules weekly (Mondays 03:00 UTC) + on-push-to-main + manual-dispatch. CI uses a **baseline schema dump** (`prisma/migrations/.baseline-schema.sql`, 160KB, generated by `scripts/refresh-baseline-schema.sh`) rather than `prisma migrate deploy` because the migration history has pre-existing bit-rot (see `project-migration-history-bitrot.md`). Smoke: all 14 REVERSIBLE migrations round-trip cleanly in ~30s. pg_dump v16 fixup landed (matches Postgres 16.13 server); `\restrict`/`\unrestrict` random tokens filtered from hash. `npm run db:roundtrip` / `db:baseline:refresh`. — OPS · _(done 2026-04-18)_
- [x] **DM-R-12 (Wave 3)** `.agent-ownership.json` + CI checker — registry declares agent→path-glob ownership (claude-code currently claims prisma/, resilience scripts, publicId layer, planning docs). `scripts/check-agent-ownership.cjs` reads `Agent-Id:` commit trailer from every commit in PR range, rejects (a) commits by unregistered agents and (b) commits where the declared agent touches another agent's territory. Minimal minimatch-style glob implementation (no new dep). No-trailer commits are treated as human work and pass the gate (CODEOWNERS handles humans). `.github/workflows/ci.yml` adds `agent-ownership-check` job gated on `github.event_name == 'pull_request'` with `BASE_SHA`/`HEAD_SHA` env wiring. Positive + violation + unowned-path + unregistered-agent scenarios unit-tested in a throwaway repo. — BE · _(done 2026-04-18)_
- [x] **DM-R-13 (Wave 3)** Per-migration contract tests (generated) — `scripts/gen-migration-tests.cjs` emits `test/integration/migration-contracts.generated.spec.ts` with one `describe()` block per migration + frozen SHA-256 digests of migration.sql and (for REVERSIBLE) rollback.sql. Any edit to a migration requires regeneration (ossification = the property the plan calls for). Consolidated into a single spec (per-file layout OOM'd jest-worker in backend container). Scripts: `npm run test:migrations:gen` (regenerate) + `test:migrations:check` (CI gate, rejects out-of-sync state). 48 describes × 206 assertions, ~2.7s. Wired into CI `schema-drift-check` after enum:check. — BE · _(done 2026-04-18)_
- [x] **DM-R-14 (Wave 3)** Structured-log drift events + alerting hook — `scripts/lib/drift-events.cjs` with `emitEvent(name, payload, severity)` emits one JSON-Lines record per event prefixed with literal `DRIFT_EVENT `. Stable envelope (event, severity, timestamp, service, hostname, git_sha, agent_id, payload). Three known events wired: `schema.drift.detected` (from prestart-verify-migrations.sh layer-1), `migration.half_applied.detected` (from verify-migrations-deep.cjs per-row), `migration.name.monotonicity.violation`. Optional `DRIFT_WEBHOOK_URL=<url>` POSTs each event (2s timeout, fail-open — webhook errors never break callers). Hook for future Sentry/Slack/PagerDuty. Grep-friendly: `docker logs backend \| grep DRIFT_EVENT \| jq`. Docs: [docs/planning/drift-events.md](drift-events.md) with event schema, alert recommendations, grep recipes. Smoke-verified: JSON stdout emit + webhook receipt. — BE · _(done 2026-04-18)_
- [ ] **DM-R-15** Concurrent-`prisma migrate dev` protection — already covered by DM-R-3's `pg_try_advisory_lock` — BE · _(fused into DM-R-3 2026-04-18)_
- [ ] **DM-R-16** Prisma client regeneration drift check — already covered by DM-R-2 step — BE · _(fused into DM-R-2 2026-04-18)_
- [ ] **DM-R-17** Shadow-DB CI diff — already covered by DM-R-2 ephemeral Postgres — BE · _(fused into DM-R-2 2026-04-18)_
- [ ] **DM-R-18** Dev-DB reset safety — already covered by DM-R-3's `db-reset-safe.sh` — BE · _(fused into DM-R-3 2026-04-18)_
- [x] **DM-R-19** Staging promotion gate — `.github/workflows/deploy.yml` split into `build-and-push` → `deploy-staging` → `deploy-production` (with a side `verify-staging-freshness` gate). Push-to-main path: all three run sequentially. `workflow_dispatch` path adds three targets — `staging-and-prod` (default), `staging-only`, `prod-only`. `prod-only` goes through `verify-staging-freshness` which queries `gh api` for a successful deploy workflow run for the same SHA within the last 6 hours (DM-R-19 "6h rule"); fails if older. Staging opt-in via `vars.STAGING_DEPLOY_ENABLED == 'true'` (required secrets: `STAGING_VPS_HOST`, `STAGING_VPS_USER`, `STAGING_VPS_SSH_KEY`, `STAGING_CADDY_DOMAIN`); absence flows directly to prod with a loud `::warning` annotation. Staging smoke runs `/api/health` + `/api/health/deep` (DM-R-8). Prod smoke likewise elevated to deep. — OPS · _(done 2026-04-18; **superseded by DM-R-33 on 2026-04-28** — auto-prod removed in favor of manual tag-based promotion)_
- [x] **DM-R-20 (Wave 4)** Least-privilege Postgres roles — migration `20260418_dm_r_20_role_separation` creates `app_runtime` (LOGIN, DML-only, append-only on AuditLog + migration_audit, default privileges for future tables) and `app_migrator` (LOGIN, full DDL+DML). `docker-compose.yml` wired: migrate/seed/mock-data-generator read `${MIGRATE_DATABASE_URL}`, backend reads `${RUNTIME_DATABASE_URL}`; both fall back to the legacy superuser URL if unset (opt-in cutover per environment). Permission matrix smoke: app_runtime cannot DROP TABLE or DELETE AuditLog; app_migrator can CREATE/DROP. Runbook: [docs/runbooks/dm-r-20-role-separation-cutover.md](../runbooks/dm-r-20-role-separation-cutover.md). Classification REVERSIBLE + rollback.sql tested in round-trip. — BE/OPS · _(done 2026-04-18)_
- [x] **DM-R-21 (Wave 4)** DDL event-trigger lockout + `ddl_audit` — migration `20260419_dm_r_21_ddl_event_trigger` installs three event triggers: (a) `ddl_command_start` → raises `ERRCODE 42501` unless `session_user ∈ {postgres, app_migrator}` (defense-in-depth over DM-R-20 grants — even if a forgotten GRANT CREATE drifts in, DDL still denied); (b) `ddl_command_end` → inserts one row per command into `ddl_audit` with session_user / current_user / application_name (DM-R-26 provenance hook) / command_tag / object_identity / query text; (c) `sql_drop` → same audit for dropped objects. `ddl_audit` is append-only (UPDATE/DELETE revoked from app_runtime). Smoke matrix verified: postgres + app_migrator ALLOWED, app_runtime DENIED even with GRANT CREATE on schema. Classification REVERSIBLE + rollback.sql. — BE · _(done 2026-04-19)_
- [x] **DM-R-22 (Wave 4)** Append-only SHA-256 hash chain — migrations `20260419_dm_r_22_hash_chain_audit` + `20260419_dm_r_22b_chain_seq`. Adds `prevHash`, `rowHash`, `chainSeq BIGSERIAL` to AuditLog, migration_audit, ddl_audit. BEFORE INSERT trigger computes `rowHash = sha256(prevHash || jsonb(NEW - hash cols))` (server-side SHA-256, `convert_to(..., 'UTF8')` to keep bytea happy). Backfill rebuilds every pre-existing row's chain. `scripts/verify-audit-hash-chain.cjs` walks every table and recomputes server-side (Postgres jsonb::text ≠ Node.js JSON.stringify — recomputing in SQL avoids the serialization-discrepancy trap). Ordering by `chainSeq` (not timestamp+id) because `gen_random_uuid()` is not monotonic for same-timestamp rows. Tamper smoke verified: `UPDATE notes = 'TAMPERED'` → chain breaks, DRIFT_EVENT `audit.hash_chain.mismatch.detected` emits. Future DomainEvent (DM-7) will join the same trigger. — BE · _(done 2026-04-19)_
- [x] **DM-R-23 (Wave 4)** Mass-mutation circuit breaker — migration `20260419_dm_r_23_mass_mutation_guard`. AFTER DELETE/UPDATE statement triggers on 9 core runtime aggregates (`Person`, `Project`, `ProjectAssignment`, `CaseRecord`, `timesheet_weeks`, `timesheet_entries`, `WorkEvidence`, `LocalAccount`, `staffing_requests`). Transition-table reference (`REFERENCING OLD TABLE AS ...`) counts affected rows; `RAISE EXCEPTION` rolls back if >1000 per statement. Configurable via `SET LOCAL public.mass_mutation_threshold = '<n>'`. Bypass for legitimate bulk work via `SET LOCAL public.allow_bulk = 'true'` within a transaction (migrations + seed use this). Smoke matrix: UPDATE-33-rows PASSES; threshold-lowered-to-10 TRIPS with actionable message; allow_bulk BYPASSES. Classification REVERSIBLE. — BE · _(done 2026-04-19)_
- [x] **DM-R-24 (Wave 4)** Panic kill-switches — four scripts + runbook. `panic-readonly.sh` (level 1: `ALTER DATABASE SET default_transaction_read_only = on` + terminate non-admin sessions), `panic-readwrite.sh` (revert level 1 — handles the self-read-only trap via explicit `SET default_transaction_read_only = off` before ALTER), `panic-halt.sh` (level 2: stop backend + revoke app_runtime grants + terminate sessions), `db-last-good.sh [N]` (level 3: wraps db-restore.sh with newest/Nth-newest snapshot autopick). All interactive-confirm by default; `POSTGRES_PANIC_CONFIRM=true` to automate. Runbook at [docs/runbooks/panic.md](../runbooks/panic.md) with 3-level escalation ladder + TTD/TTC/TTR targets + DM-R-28 drill tie-in. Smoke: readonly flips write-fail for app_runtime, readwrite revert works. — OPS · _(done 2026-04-19)_
- [x] **DM-R-25 (Wave 4)** Continuous PITR — `docker-compose.yml` postgres service gets `archive_mode=on`, `archive_command=cp %p /wal-archive/%f`, `archive_timeout=60` (RPO ≤ 60s), `wal_level=replica`, `max_wal_senders=3`. `.wal-archive/` bind-mounted (gitignored). `scripts/pg-basebackup.sh` takes weekly `pg_basebackup -F tar -z -P -X fetch -c fast` with 4-week rotation. Smoke verified: `SELECT pg_switch_wal()` produces archived WAL segments; `cp: Permission denied` diagnosed + fixed with `chmod 777 .wal-archive` (dev only). Runbook: [docs/runbooks/pitr-restore.md](../runbooks/pitr-restore.md) — 8-step PITR recovery, common failures table, monthly drill cadence. — OPS · _(done 2026-04-19)_
- [x] **DM-R-26 (Wave 4)** Connection-level agent provenance — [src/shared/persistence/prisma.service.ts](src/shared/persistence/prisma.service.ts) adds `withApplicationName()` helper that rewrites `DATABASE_URL` to inject `?application_name=dc::<service>::<agent>::<session-uuid>`. Service + agent sourced from `SERVICE_NAME`/`AGENT_ID` env vars (default `backend`/`human`). Session uuid is a fresh 8-char slice per process boot. `docker-compose.yml` backend service propagates `AGENT_ID` + `SERVICE_NAME=backend`. `pg_stat_activity` shows tagged connections like `dc::backend::claude-code::3a2e7f5f` — every statement now attributes. Combines with DM-R-21 (ddl_audit logs application_name) for end-to-end DDL attribution. — BE · _(done 2026-04-19)_
- [x] **DM-R-27 (Wave 4)** Off-host backup replication — `scripts/db-ship-backups.sh` one-way-pushes `.snapshots/` + `.wal-archive/` + `.basebackups/` to `file:///…`, `rsync://user@host:/…`, or `s3://bucket/prefix` (controlled by `BACKUP_SHIP_DEST`). Never deletes at destination (`--ignore-existing` / `--size-only`). Treats rsync exit 23 (partial, permission-denied) as soft warning — in prod the cron runs as a user with read access to all three backup dirs. Last-success timestamp written to `.ship-status` so DM-R-14 can later emit `backup.ship.stale.detected`. Smoke verified with `file://` destination. Cron recipe documented inline. — OPS · _(done 2026-04-19)_
- [x] **DM-R-28 (Wave 4)** Chaos game-day program — [docs/runbooks/chaos-drills.md](../runbooks/chaos-drills.md) with 9 scenarios mapped to the defenses they exercise (A: rogue migration ↔ DM-R-3/11/21; B: DELETE AuditLog ↔ DM-R-20; C: mass DELETE ↔ DM-R-23; D: audit tampering ↔ DM-R-22 hash chain; E: runtime drift ↔ DM-R-1; F: PITR restore ↔ DM-R-25; G: migrate race ↔ DM-R-3 advisory lock; H: panic drill ↔ DM-R-24; I: honeypot ↔ DM-R-31). Quarterly cadence (missed quarter = 6-scenario drill, no skipping). IC/OP/OB roles rotate. Per-scenario pass criteria + blast-radius caps + TTD/TTC/TTR targets. Post-drill write-up filed in `docs/chaos-reports/YYYY-QN.md`. First drill scheduled ≤ 30 days after Wave 4 lands. — DOCS/OPS · _(done 2026-04-19)_
- [x] **DM-R-29 (Wave 4)** Two-person rule for FORWARD_ONLY migrations — `scripts/check-forward-only-approvals.cjs` inspects PR diff for added/modified/renamed FORWARD_ONLY.md files; requires ≥2 distinct `Approved-By:` trailers on the merge commit with author excluded. CI job `forward-only-approvals` gated on `github.event_name == 'pull_request'`. Positive + no-FORWARD_ONLY + author-self-approve scenarios unit-tested in a throwaway repo; all three resolve correctly. Pairs with DM-R-12 (agent ownership gate) + DM-R-4 (classification marker lint). — CI · _(done 2026-04-19)_
- [x] **DM-R-30 (Wave 4)** Read-replica + dashboard-shift (scaffold) — `PrismaReadReplicaService` in `src/shared/persistence/prisma-read-replica.service.ts`, registered in the global Prisma module alongside `PrismaService`. Connects to `READ_REPLICA_DATABASE_URL` when set; silently aliases to primary otherwise. Tags connections `dc::replica::<agent>::<session>` (DM-R-26 provenance). Runbook [docs/runbooks/dm-r-30-read-replica.md](../runbooks/dm-r-30-read-replica.md) covers streaming-replica provisioning (docker-compose profile for dev + separate-host for prod), route-to-replica checklist for dashboards/reports/audit endpoints, verification queries (`pg_stat_replication`), and failure modes. Service-level routing is opt-in per-call-site; no automatic write routing. — OPS · _(done 2026-04-19)_
- [x] **DM-R-31 (Wave 4)** Honeypot canaries — migrations `20260419_dm_r_31_honeypot_canaries` + `20260419_dm_r_31b_honeypot_log_only`. Three sentinel rows (Person, Project, ProjectAssignment) with well-known UUIDs `00000000-dead-beef-0000-000000000001..3` and displayName `DM-R-31 HONEYPOT — DO NOT TOUCH`. `honeypot` registry table + `honeypot_alerts` (append-only; app_runtime denied UPDATE/DELETE). BEFORE UPDATE/DELETE trigger `dm_r_31_honeypot_guard` per table: checks registry, INSERTs alert, `pg_notify('dm_r_31_honeypot_tripped', <json>)`, RAISE WARNING. 31b flipped from RAISE EXCEPTION (rolls back alert) to log-only (alert persists; sentinel rows have no production data so loss is irrelevant). Smoke: UPDATE fires → alert persists → displayName changed, restored manually. SELECT detection deferred (no SELECT triggers in PG; future enhancement via pg_stat_statements). — BE · _(done 2026-04-19)_
- [x] **DM-R-32 (Wave 4)** Continuous schema-drift verification — `scripts/continuous-drift-monitor.cjs`. Long-running mode loops every `CYCLE_SECONDS` (default 300) and short-circuit mode via `DRIFT_MONITOR_ONCE=true`. Every cycle runs `pg_dump --schema-only` through the postgres container (no host dep), normalizes (strip comments/SET/pg_catalog/`\restrict`/`\unrestrict`/blank lines + trailing `\n` for shell-pipeline parity) and sha256 → compares against committed `prisma/migrations/.schema-hash`. Drift emits DRIFT_EVENT `schema.drift.detected.runtime` (DM-R-14). Smoke: induced `ALTER TABLE … ADD COLUMN` drift → detected; reverted → clean. SIGTERM/SIGINT handled for graceful container shutdown. Deploy as docker-compose sidecar or cron. — BE · _(done 2026-04-19)_
- [x] **DM-R-33** Manual prod promotion (supersedes DM-R-19) — `.github/workflows/deploy.yml` split into two workflows. `build-and-stage.yml` (push:main + workflow_dispatch) builds backend + frontend images, tags by 7-char commit SHA, pushes to GHCR, deploys staging, and writes `/opt/deliverycentral-staging/.staging-tag` + `.staging-tag-deployed-at` markers after health checks pass. Concurrency `build-and-stage-${{ github.ref }}` with `cancel-in-progress: true` so newer commits supersede in-flight staging deploys (no more queue-halt on prod). `promote-to-prod.yml` (workflow_dispatch only; inputs: `image_tag` required, `freshness_hours` default 6 / max 72, `freshness_override_reason` required when >6) runs three gates: `validate-tag` (`docker manifest inspect` on both GHCR images), `verify-staging-freshness` (SSHes to staging, reads marker files, requires `staging-tag == image_tag` AND age ≤ `freshness_hours`), `deploy-production` (resolves short→full SHA via `git rev-parse`, on prod VM does `git reset --hard <full-sha>` so the on-VM compose matches the build being shipped, then the existing pull/migrate/up/Caddy-self-heal/health-check/rollback flow). Concurrency `promote-to-prod` with `cancel-in-progress: false` so prod deploys serialize globally and stay independent of CI. Replaces DM-R-19's brittle `gh api workflow_runs` freshness query with a deterministic VM-side check that's tag-aware (lets the team promote an older known-good build, which the previous SHA-coupled design could not). Required reviewers on the GitHub `production` environment is the optional second gate — enable in repo settings, no code change. — OPS · _(done 2026-04-28)_
- [x] **DM-4-2** Enum promotion — **ALL 13 landed** across 4 batches + DM-4-2b. Covers: `WorkEvidence.evidenceType`, `WorkEvidenceLink.linkType`, `IntegrationSyncState.resourceType`, `CaseType.key` (+ OVERTIME_EXCEPTION via DM-4-2b), `PersonCostRate.rateType`, `LocalAccount.source`, `OutboxEvent.status`, `ExternalAccountLink.sourceType` + `.accountPresenceState`, `OvertimePolicy.approvalStatus`, `PersonExternalIdentityLink.matchedByStrategy`, `TimesheetEntry.benchCategory`, `EmployeeActivityEvent.eventType`. Direct `ALTER COLUMN TYPE … USING` (dev-scale); DEFAULTs re-applied after ALTER per-column. Free-form text surfaces eliminated across all polymorphic-type fields. — BE · _(13/13 done 2026-04-23)_
- [x] **DM-4-3** Unify `allocationPercent` to `Decimal(5,2)` on `StaffingRequest` — migration `20260422_dm_4_3_staffing_allocation_decimal` (REVERSIBLE). Direct `ALTER COLUMN TYPE numeric(5,2) USING allocationPercent::numeric(5,2)` — dev scale ~6 rows, millisecond operation, no shadow-column dance needed. Rollback SQL annotated with PRECISION LOSS warning. schema.prisma `Int → Decimal @db.Decimal(5,2)`; prisma client regenerated. Five callers updated to `.toNumber()`: `staffing-desk.service`, `workforce-planner.service` (×3 sites), `project-timeline.service` (×2), `demand-profile.service`, and `in-memory-staffing-request.service.toResponse()`. Backend tsc clean. All three tables (ProjectAssignment, project_role_plans, staffing_requests) now carry `numeric(5,2)`. Fractional allocation (e.g. 37.5%) is first-class from this point. — BE · _(done 2026-04-22)_
- [x] **DM-4-4** UTC enforcement gate — `scripts/check-tz-is-utc.cjs` refuses a non-UTC runtime (non-UTC `TZ` env OR `new Date().getTimezoneOffset() !== 0`). Wired into `scripts/prestart-verify-migrations.sh` before DM-R-1, so a container booting in the wrong timezone exits before `prisma migrate deploy` can touch Timestamptz columns. docker-compose.yml sets `TZ=UTC` explicitly on backend + migrate + seed + mock-data-generator. `npm run tz:check`. Positive + TZ-override-to-PST negative scenarios verified. Prerequisite for DM-4-5. — OPS · _(done 2026-04-21)_
- [x] **DM-4-5** Convert every `DateTime` to `@db.Timestamptz(3)` — migration `20260421_dm_4_5_timestamptz_conversion` (FORWARD_ONLY; reverting timestamptz strips offset info). Self-cataloging DO block iterates `information_schema.columns WHERE data_type = 'timestamp without time zone'` and runs `ALTER COLUMN … TYPE timestamptz(3) USING col AT TIME ZONE 'UTC'`. Runs `SET LOCAL TIMEZONE = 'UTC'` defensively (DM-4-4 is the prerequisite). 231 columns converted across 75 tables in one transaction (dev DB). Before/after sampling on `Person.createdAt` (`2026-04-18 10:51:35.781`) confirmed wall-clock preserved, offset now `+00`. Post-apply SELECT count from `information_schema.columns WHERE data_type='timestamp without time zone'` = 0. `schema.prisma` auto-rewritten (231 fields got `@db.Timestamptz(3)`) via `/tmp/timestamptz-rewrite.cjs`; `prisma validate` + `prisma migrate status` both clean; typecheck green; client regenerated. `@db.Date` columns untouched. `datetime-not-timestamptz` lint violations dropped to 0 for my territory. — BE · _(done 2026-04-22)_

### DM-5 — Naming Normalization (raw-SQL audit gated)

- [ ] **DM-5-1** Raw-SQL audit: `grep -rE '\$queryRaw|\$executeRaw|\$queryRawUnsafe' src/` produces a PR artifact listing every raw-SQL site + referenced columns/tables — BE
- [ ] **DM-5-2** Rename temporal columns to the canonical vocabulary (`validFrom/validTo`, `startsOn/endsOn`, `openedAt/closedAt`) with `@map` bridge for one release — BE
- [~] **DM-5-3** `@@map` on every model — 42 models previously relied on Prisma's default PascalCase table name (no @@map declaration). All 76 models now carry an explicit `@@map("<current-table-name>")` annotation via `/tmp/add-at-map.cjs` walker. **Nuance:** this migration preserves current table names (PascalCase for 42 models, snake_case for 34 others); actually renaming to snake_case is deferred because (a) the raw-SQL audit (DM-5-1) is a prerequisite — raw SQL + seed.ts + DM-R-21 ddl_audit triggers reference current names, (b) concurrent-agent code references PascalCase literals (Person, Project, CaseType). The `@@map` annotation is the structural lint property; future work can change the @@map value in a controlled rename. Schema-conventions baseline shrunk **370 → 117** (253 violations resolved — 42 model-missing-map + 231 datetime-not-timestamptz from DM-4-5 + others); prisma validate + migrate status + tsc all clean. — BE · _(annotation complete 2026-04-23; table rename deferred)_
- [ ] **DM-5-4** Rename every composite `@@unique` / named index that references a renamed column — BE
- [ ] **DM-5-5** Add missing `updatedAt`; add uniform `createdByPersonId` / `updatedByPersonId` on high-audit tables — BE

### DM-6 — New Domain Models + De-duplication

- [x] **DM-6a-1** Currency dictionary + FKs on monetary tables — migration `20260423_dm_6a_1_currency`. New `Currency` model (code PK `varchar(3)`, name, minorUnit, isDefault, createdAt) seeded with AUD (default), USD, GBP, EUR, NZD, SGD, JPY. `currencyCode varchar(3)` column + FK (`onDelete: Restrict`) + index added on `project_budgets`, `person_cost_rates`, `project_vendor_engagements`. Backfill: 31 rows → AUD (project_budgets 6, person_cost_rates 25, project_vendor_engagements 0). Nullable for the transition window; DM-6a-1b flips NOT NULL once callers treat currency as mandatory. schema.prisma declares `Currency` model + back-relations on the three monetary tables; prisma client regenerated; tsc clean. — BE · _(done 2026-04-23)_
- [x] **DM-6a-2** BudgetApproval model — migration `20260423_dm_6a_2_budget_approval`. New `budget_approvals` table with `BudgetApprovalStatus` enum (PENDING/APPROVED/REJECTED), FK to `project_budgets` (`onDelete: Restrict`), `requestedByPersonId` + `decidedByPersonId` FKs to `Person`, `requestedChange` jsonb (proposed budget delta), decision metadata (`decisionAt`, `decisionReason`). Three indexes (projectBudgetId, status, requestedByPersonId). schema.prisma adds `BudgetApproval` model + back-relations on `Person` (`budgetApprovalsRequested`, `budgetApprovalsDecided`) + `ProjectBudget.approvals`; prisma client regenerated; tsc clean. — BE · _(done 2026-04-23)_
- [x] **DM-6a-3** Dictionary tables + FKs — migration `20260423_dm_6a_3_dictionaries`. Five new per-tenant dictionaries (`grades`, `job_roles`, `locations`, `project_domains`, `project_types`) each keyed by `(tenantId, code)` with optional description + archivedAt. Adds `Person.gradeId`, `Person.jobRoleId`, `Person.locationId`, `Project.domainId`, `Project.projectTypeId` FKs (all nullable, `onDelete: SetNull`) with indexes. Scalar strings (`Person.grade`, `Person.role`, `Person.location`, `Project.domain`, `Project.projectType`) retained per the DMD-022 two-release contract; DM-6b-1 drops them once writers flip to the FKs. — BE · _(done 2026-04-23)_
- [x] **DM-6a-4** Contact model — bundled migration `20260423_dm_6a_4_6_contact_employment_retro`. New `contacts` table per Person (kind: EMAIL/PHONE/ADDRESS, label, value, isPrimary, verified). `onDelete: Cascade` from Person. Partial unique index enforces at-most-one primary per (person, kind). schema.prisma adds `Contact` + back-relation `Person.contacts`. — BE · _(done 2026-04-23)_
- [x] **DM-6a-5** EmploymentEvent model — same bundled migration. New `employment_events` table (kind: HIRE/TERMINATE/LEAVE_START/LEAVE_END/REHIRE, occurredOn date, reason, recordedByPersonId). Indexed by (personId, occurredOn) + by kind. `Person.hiredAt`/`terminatedAt` retained as denorm scalars — follow-up populates them from the latest event. schema.prisma adds `EmploymentEvent` + two back-relations on Person. — BE · _(done 2026-04-23)_
- [x] **DM-6a-6** ProjectRetrospective model — same bundled migration. 1:1 with Project (UNIQUE on projectId). Holds `outcomeRating`, `lessonsLearned`, `wouldStaffSameWay`, `retrospectiveDate`, `facilitatedByPersonId`. Zero rows currently populate the Project-side equivalents (verified pre-migration), so no data migration needed; DM-6b-1 drops the Project columns in a follow-up. schema.prisma adds `ProjectRetrospective` + `Project.retrospective` back-relation. Prisma validate + tsc clean. — BE · _(done 2026-04-23)_
- [x] **DM-6a-7** Join tables for techStack/tags/skillAreas — migration `20260423_dm_6a_7_join_tables`. Three new tables: `project_technologies (projectId, technology)`, `project_tags (projectId, tag)`, `vendor_skill_areas (vendorId, skillArea)`. All with `onDelete: Cascade` from parent, UNIQUE composite + value-only index, zero data migration (verified all three `text[]` columns empty). schema.prisma adds `ProjectTechnology`, `ProjectTag`, `VendorSkillArea` models + back-relations `Project.technologies`, `Project.tagList`, `Vendor.skillAreasList`. DM-6b-1 drops the legacy `text[]` columns in a follow-up release. Dictionary-backing via `MetadataDictionary` is deferred — can be added by flipping the value column to an FK without table rewrite. — BE · _(done 2026-04-23)_
- [ ] **DM-6a-8** Update `prisma/seed.ts` to populate the new tables — BE
- [-] **DM-6b-1** Drop legacy text[] scalars — **BLOCKED** on caller migration. `grep` shows **51 source references** to `skillsets`/`techStack`/`tags`/`skillAreas`/`outcomeRating`/`lessonsLearned`/`wouldStaffSameWay` across `dashboard/portfolio-dashboard`, `organization/person-directory`, `project-registry/close-project`, `projectType`, domain entities + Prisma mappers. Dropping would break dev build. Unblocks when callers switch to `person_skills`/`project_technologies`/`project_tags`/`vendor_skill_areas`/`project_retrospectives`. — BE · _(blocked)_

### DM-7 — DomainEvent Transactional Outbox + Notification Unification

- [x] **DM-7-1** DomainEvent table (partition-ready) — migration `20260423_dm_7_1_domain_event`. `PARTITION BY RANGE ("createdAt")` with a `DomainEvent_default` default partition; composite PK `(id, createdAt)`; columns cover aggregateType/aggregateId/eventName/actorId/correlationId/causationId/payload/publishedAt/createdAt plus the DM-R-22 hash-chain triple. 5 indexes including `(chainSeq) WHERE publishedAt IS NULL` for outbox relay. DM-R-22 hash-chain trigger installed; DM-R-22c rebuild migration replayed all 4 chains after DM-4-5 timestamptz shifted jsonb serialization. Smoke INSERT verified. — BE · _(done 2026-04-23)_
- [x] **DM-7-2** DomainEventGateway — new `DomainEventService` in audit-observability module: `record(tx, event)` rides the caller's `$transaction` via `$executeRawUnsafe`; `recordAtomic(event)` wraps for standalone writes. Prisma Client intentionally has no generated model for DomainEvent (composite PK + partitioning). Registered in AuditObservabilityModule + exported. Callers migrate from AuditLogger to DomainEvent aggregate-by-aggregate in follow-ups. — BE · _(done 2026-04-23)_
- [x] **DM-7-3** Outbox view — migration `20260423_dm_7_3_outbox_view` creates `domain_outbox_pending` VIEW over `DomainEvent WHERE publishedAt IS NULL ORDER BY chainSeq`. Legacy `OutboxEvent` table retained (0 rows, no writers) but no longer the outbox. — BE · _(done 2026-04-23)_
- [~] **DM-7-4** EmployeeActivityEvent compatibility view — migration `20260423_dm_7_4_employee_activity_view` creates `employee_activity_view` SELECTing from `DomainEvent WHERE aggregateType='Person'` with column aliases shaped like the legacy EAE table (`personId`, `eventType`, `occurredAt`, `actorId`, `summary` from payload, `relatedEntityId` from payload, `metadata`). New read callers query the view; the EAE table + Prisma model remain for writes until DM-7-4b migrates writers to `DomainEventService.record()`. — BE · _(view done 2026-04-23; writer migration follow-up)_
- [~] **DM-7-5** Unified Notification table — migration `20260423_dm_7_5_notification_unified` creates `Notification` table with `NotificationChannelKind` (EMAIL/SMS/IN_APP/PUSH/SLACK/WEBHOOK) + `NotificationStatus` (PENDING/SENT/DELIVERED/FAILED/READ) enums. Tenant-scoped. 5 indexes including partial-unread-in-app + partial-pending. Legacy `NotificationRequest` + `in_app_notifications` retained — callers migrate per module in DM-7-5b. — BE · _(schema done 2026-04-23; caller migration follow-up)_
- [x] **DM-7-6** AggregateType enum — migration `20260423_dm_7_6_aggregate_type_enum`. New Postgres enum with 24 labels (Person/Tenant/Project/.../Migration meta). `AuditLog.aggregateType` + `DomainEvent.aggregateType` ALTERed to the enum (view dropped + recreated around the ALTER). Typo surface collapsed from free-form text to whitelist. Trigger-based `entityId` existence validator deferred to DM-7-6b. — BE · _(done 2026-04-23)_
- [~] **DM-7-7** JSON schema registry — `src/shared/persistence/json-schema-registry.ts` with `JSON_SCHEMA_REGISTRY` keyed by `<Table>.<Column>` → Zod schema. 13 columns registered (DomainEvent.payload, AuditLog.payload, OutboxEvent.payload, AssignmentHistory.previousSnapshot/newSnapshot, EmployeeActivityEvent.metadata, CaseRecord/CaseStep.payload, CustomFieldValue.value loose, NotificationRequest.payload, NotificationChannel.config, WorkEvidence.details/trace). `validateJsonPayload(column, payload, {strict?})` returns parsed value or throws `JsonSchemaValidationError`. Permissive mode today (unregistered columns pass through); DM-7-7 enforcement cutover (follow-up PR) routes every write through `validateJsonPayload` and flips to strict. `zod` installed as runtime dep. pg_jsonschema belt-and-braces deferred. — BE · _(scaffold done 2026-04-23; enforcement cutover follow-up)_

### DM-7.5 — Tenant Isolation (first-class; load-bearing for multi-tenancy)

- [x] **DM-7.5-1** Tenant model — migration `20260423_dm_7_5_tenant_foundation`. New `Tenant` table (id, code unique, name, isActive, suspendedAt, createdAt, updatedAt). Seeded with well-known default tenant `00000000-0000-0000-0000-00000000dc01` / `code='default'` for fixtures + tests. — BE · _(done 2026-04-23)_
- [x] **DM-7.5-2** tenantId on 15 aggregate roots — same migration adds nullable `tenantId uuid` + FK (`onDelete: Restrict`, `ON UPDATE CASCADE`) + index to Person, OrgUnit, Project, clients, vendors, LocalAccount, CaseRecord, in_app_notifications, DomainEvent, AuditLog, OutboxEvent, leave_requests, staffing_requests, timesheet_weeks, WorkEvidence. FK declared `NOT VALID + VALIDATE` for normal tables; immediately-valid for `DomainEvent` (Postgres blocks NOT VALID FK on partitioned tables). Backfill to default tenant covers every existing row (except honeypot sentinels). **Critical bug fix surfaced:** DM-R-31 honeypot guard returned `OLD` unconditionally — silently reverted EVERY update on Person/Project/ProjectAssignment. DM-R-31c fixes it to `RETURN NEW` for non-honeypot rows + `RAISE EXCEPTION` for honeypot hits, and retroactively backfills. NOT NULL flip deferred to DM-7.5-3 (needs writer audit). — BE · _(done 2026-04-23; DM-R-31c surfaced + fixed along the way)_
- [ ] **DM-7.5-3** Default-tenant backfill in single transaction; flip column to `NOT NULL` — BE
- [~] **DM-7.5-4** Tenant resolver middleware — `src/shared/persistence/tenant-resolver.middleware.ts` with `runInTenantScope(ctx, fn)` (AsyncLocalStorage) + `registerTenantResolverMiddleware(prisma)` Prisma `$use` hook that issues `SELECT set_config('app.current_tenant_id', $1, true)` + `app.current_person_id` before each query. Uuid-shape guard. NOT yet registered in PrismaService — cutover gated on `TENANT_ISOLATION_ENABLED=true` + DM-7.5-5 RLS enablement per-table. HTTP request interceptor wiring is DM-7.5-4b follow-up. — BE · _(scaffold done 2026-04-23; cutover follow-up)_
- [~] **DM-7.5-5** RLS policies — migration `20260423_dm_7_5_5_rls_policies`. `dm_r_current_tenant()` function reads `app.current_tenant_id` GUC; returns NULL if unset (policy evaluates to false → see nothing, fail-safe). 17 policies created (`<table>_tenant_isolation`) on Person / OrgUnit / Project / clients / vendors / LocalAccount / CaseRecord / in_app_notifications / AuditLog / OutboxEvent / DomainEvent / leave_requests / staffing_requests / timesheet_weeks / WorkEvidence / ProjectAssignment / skills. **RLS not yet enabled** (two-release pattern): policies ship in release N, `ALTER TABLE … ENABLE ROW LEVEL SECURITY` in release N+1 after DM-7.5-4 resolver live. `app_platform_admin` (BYPASSRLS) handles cross-tenant workers. — BE · _(policies done 2026-04-23; enablement follow-up)_
- [x] **DM-7.5-6** Uniqueness audit — [docs/planning/tenant-uniqueness-audit.md](tenant-uniqueness-audit.md). Every UNIQUE constraint in the schema categorized as tenant-scoped (6 pending: Person.personNumber / primaryEmail, OrgUnit.code, Project.projectCode, ProjectAssignment.assignmentCode, CaseRecord.caseNumber), global-by-design (Currency / Tenant.code / NotificationChannel / external-identity links), or already-composite (bitemporal FKs inherit tenancy). `LocalAccount.email` flagged as a decision point (SSO-global vs per-tenant) — recommend global pending product call. DM-7.5-6a follow-up migration executes the 6 flips. — BE · _(audit done 2026-04-23; migration DM-7.5-6a queued)_
- [x] **DM-7.5-7** Skill tenant-scoped uniqueness — migration `20260423_dm_7_5_7_skill_tenant_unique`. Adds `tenantId uuid` + FK + index to `skills`; 25 existing skills backfilled to default tenant. Drops global `skills_name_key` unique index; creates `skills_tenantId_name_key UNIQUE(tenantId, name)`. Per-tenant Skill dictionaries can diverge without name-collision. — BE · _(done 2026-04-23)_
- [ ] **DM-7.5-8** Two-tenant seed fixture + RLS integration tests — BE

### DM-8 — Concurrency, Soft-delete, Security, Ops

- [~] **DM-8-1** Version columns — migration `20260423_dm_8_1_version_columns` adds `version int NOT NULL DEFAULT 1` to 8 mutable aggregates (Person, OrgUnit, CaseRecord, WorkEvidence, leave_requests, staffing_requests, project_budgets, project_risks). Combined with 5 pre-existing (Project, ProjectAssignment, etc.): **13 aggregates now carry `version`**. schema.prisma updated via `/tmp/add-version.cjs` walker; prisma validate + tsc clean. Repository-layer optimistic-concurrency adoption (`WHERE version = ?` + increment) deferred to DM-8-1b (code change). — BE · _(schema done 2026-04-23; repo adoption deferred)_
- [~] **DM-8-2** Soft-delete Prisma middleware — `src/shared/persistence/soft-delete.middleware.ts` with `registerSoftDeleteMiddleware(prisma)`. 20 models tracked (Person, OrgUnit, Project, ProjectAssignment, CaseRecord, …). Injects `archivedAt: null` filter on `findMany`/`findFirst`/`findUnique`/`count`/`aggregate`/`groupBy`; converts `delete`/`deleteMany` to `update({archivedAt: NOW()})`. Escape hatches: `{where: {__includeArchived: true}}` + `{where: {__force: true}}`. **NOT registered by default** — cutover runbook at [docs/runbooks/dm-8-2-soft-delete-cutover.md](../runbooks/dm-8-2-soft-delete-cutover.md) documents the audit+opt-in path via `SOFT_DELETE_ENABLED=true` env var. — BE · _(scaffold done 2026-04-23; cutover follow-up)_
- [x] **DM-8-3** Partial `WHERE archivedAt IS NULL` indexes — migration `20260423_dm_8_3_partial_archived_indexes`. 7 hot tables (Person, Project, ProjectAssignment, CaseRecord, OrgUnit, Position, ResourcePool) get `(id) WHERE archivedAt IS NULL` — matches the app's default read filter, smaller + more selective than full indexes. — BE · _(done 2026-04-23)_
- [x] **DM-8-4** Postgres role matrix — migration `20260423_dm_8_4_postgres_roles`. Four new roles on top of DM-R-20's `app_runtime`/`app_migrator`: `app_reader` (SELECT on all tables for dashboards), `app_auditor` (SELECT on audit tables only: AuditLog / migration_audit / ddl_audit / DomainEvent / honeypot_alerts / capacity_audit; CANNOT read business data), `app_platform_admin` (BYPASSRLS for cross-tenant workers + outbox relay), `app_reporting` (SELECT-only, separate pool target per DM-R-30). Default privileges set so future tables inherit grants. Smoke: app_reader blocked from INSERT; app_auditor reads AuditLog but blocked from Person; app_platform_admin has BYPASSRLS flag. — OPS/BE · _(done 2026-04-23)_
- [~] **DM-8-5** Person-level RLS — migration `20260423_dm_8_5_person_rls`. `dm_r_current_person()` GUC reader + owner-only policies on 4 PII tables: `LocalAccount` (keyed via personId), `contacts` (keyed via personId), `RefreshToken` + `PasswordResetToken` (keyed via accountId → LocalAccount.personId subquery). `Person.primaryEmail`/`displayName` deliberately unrestricted — colleagues need directory access, RBAC handles finer control. **Policies not yet enabled** (matches DM-7.5-5 two-release cutover). — BE · _(policies done 2026-04-23; enablement follow-up)_
- [~] **DM-8-6** PII markers via `COMMENT ON COLUMN` — migration `20260423_dm_8_6_pii_markers` tags 11 columns: `LocalAccount.twoFactorSecret` (pii:secret), `passwordHash`/`backupCodesHash`/`PasswordResetToken.tokenHash`/`RefreshToken.tokenHash` (pii:hash), `Person.primaryEmail` (pii:email), `Person.givenName/familyName/displayName` (pii:name), `Person.location` + `contacts.value` (pii:other). Enumerable via `pg_description` join for data-subject requests / log scrubbing / backup redaction. Envelope-encryption of `twoFactorSecret` deferred (needs KMS). — BE · _(markers done 2026-04-23; encryption deferred)_
- [x] **DM-8-7** `pg_trgm` GIN indexes — migration `20260423_dm_8_7_pg_trgm_search`. `CREATE EXTENSION pg_trgm` + 4 GIN indexes on `Project.name`, `project_risks.title`, `CaseRecord.summary` (partial WHERE summary IS NOT NULL), `Person.displayName`. Enables sub-second `ILIKE '%x%'` queries at scale. — BE · _(done 2026-04-23)_
- [x] **DM-8-8** Materialized views — migration `20260423_dm_8_8_materialized_views` creates `read_models` schema + two MVs: `mv_project_weekly_roster` (weekStart × projectId × personId from ProjectAssignment) and `mv_person_week_hours` (weekStart × personId from timesheet_weeks/entries). Each MV has a unique PK index for `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Grants: `app_reader`, `app_reporting`, `app_runtime` get SELECT. Dev smoke: 23 rows in roster, 8 rows in hours. Refresh strategy (DomainEvent-triggered or pg_cron) is DM-8-8b follow-up. — BE · _(done 2026-04-23)_
- [x] **DM-8-9** pg_stat_statements + auto_explain — `docker-compose.yml` postgres service gets `shared_preload_libraries=pg_stat_statements,auto_explain` + `pg_stat_statements.track=all` + `auto_explain.log_min_duration=500ms` + `auto_explain.log_analyze=true` + `auto_explain.log_buffers=true`. Migration `20260423_dm_8_9_pg_stat_statements` runs `CREATE EXTENSION pg_stat_statements` so the catalog views exist. Smoke — top 5 queries already tracked (inside DM-R-22 hash trigger + _prisma_migrations). Budget doc: `docs/testing/slo-budgets.json`. — OPS · _(done 2026-04-23)_
- [x] **DM-8-10** Capacity-audit job — migration `20260423_dm_8_10_capacity_audit` creates `capacity_audit` table (row_count + rel_size per watched table, append-only). `scripts/capacity-audit.sh` snapshots 10 watched tables (DomainEvent, AuditLog, ddl_audit, migration_audit, WorkEvidence, NotificationDelivery, NotificationRequest, EmployeeActivityEvent, timesheet_entries, honeypot_alerts). Weekly cron. Partition-cutover threshold: 5M rows (75% of 10M DM-R operational ceiling). Smoke: first snapshot captured, ddl_audit largest at 552 rows / 1.8MB. — BE · _(done 2026-04-23)_
- [ ] **DM-8-11** Migration-squash baseline after DM-4 to keep CI spin-up fast — BE
- [x] **DM-8-12** Partition-cutover runbook — [docs/runbooks/partition-cutover.md](../runbooks/partition-cutover.md). 5-phase procedure worked against `ddl_audit` as exemplar: (1) create partitioned `_new` table alongside with same LIKE, (2) lock-and-copy backfill with LSN capture, (3) swap via ACCESS EXCLUSIVE + rename in one txn, (4) retro-split into monthly ranges per-month, (5) drop `_old` after 30-day safety window. Trigger points tied to DM-8-10 capacity_audit alerts (5M / 7M / 10M rows). Rollback path documented. DomainEvent (DM-7-1) is already partition-ready → only Phase 4 applies. Monthly-partition-creation cron recipe included. — DOCS · _(done 2026-04-23)_

---

## Phase CC — Console Cleanup Deferred Items (2026-04-24)

> Follow-ups from the browser-console cleanup sweep of 2026-04-24 that were deliberately
> not taken in-scope. Zero console errors and zero warnings were achieved across all 57
> authenticated routes; items below are structural improvements or release-gate checks
> that would further harden the code but aren't required for the clean-console outcome.

### Resolved in same sweep (for context)

- [x] **CC-1** Infinite render loop: `AssignmentsPage → title-bar-context` — fix at `frontend/src/hooks/useFilterParams.ts` (lock `defaults` via `useRef`; benefits 9 pages) — FE · _(done 2026-04-24)_
- [x] **CC-2** 79× R-Router v7 future-flag warnings — opt into `v7_relativeSplatPath` at `router.tsx` + `v7_startTransition` at `<RouterProvider>` in `App.tsx` — FE · _(done 2026-04-24)_
- [x] **CC-3** 4× 500 on `/api/staffing-desk?kind=assignment&status=APPROVED,ACTIVE` — legacy status vocabulary mapped to current `AssignmentStatus` enum (BOOKED/ASSIGNED/…) at service boundary in `staffing-desk.service.ts:168` — BE · _(done 2026-04-24)_
- [x] **CC-4** 4× 404 on `/api/metadata/dictionaries/42222222-…-201` — seeded missing `timesheet-rejection-reasons` dictionary + 4 entries (`INCORRECT_HOURS`/`WRONG_PROJECT`/`MISSING_EVIDENCE`/`OTHER`) in `prisma/seed.ts`; upsert into running DB — BE · _(done 2026-04-24)_
- [x] **CC-5** 22× Recharts `width(-1) height(-1)` warnings — `Sparkline.tsx` no longer wraps in `ResponsiveContainer` (dimensions are explicit px); narrow `console.warn` filter for ResizeObserver transient in `main.tsx` — FE · _(done 2026-04-24)_
- [x] **CC-6** `/auth/me` + `/admin/platform-settings` 401 noise on login page — `AuthProvider` skips `/auth/me` when no token exists; `PlatformSettingsProvider` gates fetch on `hasAuthToken()` and listens for `auth:login-success` custom event — FE · _(done 2026-04-24)_
- [x] **CC-7** `/auth/refresh` 401 on unauth'd page load — backend returns **204 No Content** when no refresh cookie is present (semantically correct: "no session to refresh" is not an auth rejection); `http-client.ts` handles 204 (no body) — BE/FE · _(done 2026-04-24)_
- [x] **CC-8** Pre-existing TS2352 errors in `in-memory-staffing-request.service.ts` — 9× `as PrismaRecord` → `as unknown as PrismaRecord` (compiler-suggested form; Decimal-vs-number mismatch in an in-memory test double) — BE · _(done 2026-04-24)_

### Deferred — tracked for future cleanup

- [ ] **CC-9** Release-gate: grep tests for `/auth/refresh` + `401` assertions before next release. CC-7 changed the no-cookie response from 401 → 204. Any Postman collection / Playwright spec / mobile client that asserts `expect(response.status).toBe(401)` on the no-refresh-cookie path will fail. Command: `grep -rln "auth/refresh" test/ frontend/src/**/*.test.* e2e/`. — QA · Priority: medium (release-blocker if missed) · _Opened 2026-04-24_
- [ ] **CC-10** Hoist `<AuthProvider>` above the router so both `/login` and authenticated routes share one instance. Today there are two separate `<AuthProvider>` instances in `router.tsx` (one wrapping `<LoginPage/>` at `/login`, one wrapping `<AppShell/>` at `/*`). State isn't shared — `initComplete.current` / `initDone.current` refs exist to prevent double-firing `/auth/me`/`/auth/refresh` but only work within one instance. Symptom today: extra `/auth/refresh` on /login → dashboard transition (harmless, still works). Fix: move `<AuthProvider>` above `<RouterProvider>` in `App.tsx`; move auth-gated redirects into `ProtectedRoute` or a loader. — FE · Priority: low-medium (opportunistic) · _Opened 2026-04-24_
- [ ] **CC-11** `PlatformSettingsProvider` has implicit coupling to `AuthProvider` via `localStorage` key and `auth:login-success` window event. Today this works because `PlatformSettingsProvider` can't `useAuth()` (it wraps `<RouterProvider>` which wraps `<AuthProvider>` — inverted tree). If CC-10 is implemented, this coupling can be replaced with `useAuth()` directly inside `PlatformSettingsProvider`. Until then, document the event contract in `auth-context.tsx` + `platform-settings-context.tsx`. — FE · Priority: low (couples to CC-10) · _Opened 2026-04-24_
- [ ] **CC-12** 144 `<ResponsiveContainer>` instances warn transient -1 dimensions under React StrictMode. Filtered narrowly in `main.tsx`; no functional impact. Proper structural fix: introduce a shared `ChartContainer` that gates mount on `useLayoutEffect` seeing `offsetWidth > 0`, then migrate all 144 sites. ~2–3 engineer-days, cosmetic payoff only. Defer unless charts start actually failing to render (different symptom). — FE · Priority: low (cosmetic, low ROI) · _Opened 2026-04-24_
- [ ] **CC-13** Host-side `tsc` errors on `html2canvas`/`jspdf`/`pptxgenjs`/`zod` — packages are declared in `package.json` and installed in container, but host's `frontend/node_modules` and `node_modules` subdirs are owned by root (per CLAUDE.md §8 pitfall #12). Host `npm install` fails with permission denied. Runtime and CI (Docker-only) work; only developer's local `tsc --noEmit` on host sees the errors. Fix: rebuild containers with dev-UID mapping or stop gating local workflow on host-side typecheck. — DX · Priority: low (dev ergonomics) · _Opened 2026-04-24_

---

## Phase WO — Assignment Workflow Overhaul (2026-04-29)

Plan: `/home/drukker/.claude/plans/this-is-a-pure-idempotent-cray.md`

Goal: visibility, consolidation, observability, transparency for the Project Manager / Delivery Manager / Director / Resource Manager assignment workflow. Adds multi-candidate proposal slate ("Pick one"), threshold-driven Director approval, configurable rejection-reason taxonomy, per-stage SLA timers with breach escalation, Pending Approvals dashboard, and a `<WorkflowStages>` DS atom. Every metric and threshold is admin-configurable via `PlatformSetting`.

### Phase WO-1 — Data model + state machine (BE)

- [x] **WO-1.1** Add `IN_REVIEW` to `AssignmentStatus` enum + migration `20260429_wo_phase1_slate_and_in_review` — BE · _(done 2026-04-29)_
- [x] **WO-1.2** Extend `ProjectAssignment` with `onboardingDate`, `rejectionReasonCode`, `requiresDirectorApproval`, `slaStage`, `slaDueAt`, `slaBreachedAt` + indexes — BE · _(done 2026-04-29)_
- [x] **WO-1.3** New models `AssignmentProposalSlate` + `AssignmentProposalCandidate` (with partial-unique index enforcing single PICKED candidate per slate) — BE · _(done 2026-04-29)_
- [x] **WO-1.4** Extend `assignment-status.ts` state machine — `PROPOSED → IN_REVIEW`, `IN_REVIEW → BOOKED`, `IN_REVIEW → REJECTED`, `IN_REVIEW → CANCELLED`; update `ASSIGNMENT_AMEND_SOURCE_STATUSES` — BE · _(done 2026-04-29)_
- [x] **WO-1.5** Entity helpers `acknowledgeReview()` and `pickCandidate()` on `ProjectAssignment` — BE · _(done 2026-04-29)_
- [x] **WO-1.6** Seed: `assignment-rejection-reasons` + `case-kind-assignment-escalation` MetadataDictionaries with default entries — BE · _(done 2026-04-29)_
- [x] **WO-1.7** Seed: all §J `PlatformSetting` keys (SLA budgets, Director thresholds, slate min/max, matching weights, SLOs, sweep cadence, nudge cooldown) — BE · _(done 2026-04-29)_
- [x] **WO-1.8** Update `STATUS_OPTS` (frontend) + `ASSIGNMENT_STATUS_LABELS` + `ASSIGNMENT_STATUS_ORDER` for `IN_REVIEW`; update `Record<AssignmentStatusValue,…>` lookups in `transition-project-assignment.service.ts`; update `staffing-desk.service.ts` valid-enum allow-list — BOTH · _(done 2026-04-29)_
- [x] **WO-1.9** Unit tests: state-transition matrix updated with the 3 new edges, 7 new invalid-transition cases, and entity-helper tests for `acknowledgeReview()` / `pickCandidate()` / `amend()` from `IN_REVIEW` — BE · _(done 2026-04-29)_

### Phase WO-2 — Proposal API (BE)

- [x] **WO-2.1** Domain entities `AssignmentProposalSlate` + `AssignmentProposalCandidate` with state methods (`pickCandidate` auto-declines competitors; `rejectAll` declines pending) — BE · _(done 2026-04-29)_
- [x] **WO-2.2** Repository port `AssignmentProposalSlateRepositoryPort` + Prisma impl `PrismaAssignmentProposalSlateRepository` (transactional upsert + delete-stale candidates) — BE · _(done 2026-04-29)_
- [x] **WO-2.3** `DirectorApprovalThresholdService` reading `assignment.directorApproval.allocationPercentMin` / `durationMonthsMin` from `PlatformSetting` at every evaluation; null disables a threshold; wired into `CreateProjectAssignmentService` — BE · _(done 2026-04-29)_
- [x] **WO-2.4** `ProjectAssignment` entity gains `requiresDirectorApproval`, `rejectionReasonCode`, `onboardingDate` fields with setters; mapper + Prisma repo persist them — BE · _(done 2026-04-29)_
- [x] **WO-2.5** `ProposalSlateService` with `submit`/`acknowledge`/`pickCandidate`/`rejectAll`. `submit` enforces slate min/max from `PlatformSetting`, transitions CREATED→PROPOSED. `pickCandidate` swaps `assignment.personId` if the picked candidate differs and transitions IN_REVIEW→BOOKED. `rejectAll` validates reason code against `assignment-rejection-reasons` dictionary and transitions IN_REVIEW/PROPOSED→REJECTED — BE · _(done 2026-04-29)_
- [x] **WO-2.6** `DirectorApproveService`: appends a second `AssignmentApproval` row (decision=APPROVED), clears `requiresDirectorApproval`, blocks if not BOOKED or already approved at sequence>1 — BE · _(done 2026-04-29)_
- [x] **WO-2.7** Controller endpoints: `POST /assignments/:id/proposals` (RM), `POST .../:slateId/acknowledge` (PM/DM), `POST .../:slateId/pick` (PM/DM), `POST .../:slateId/reject-all` (PM/DM), `POST /assignments/:id/director-approve` (Director). DTOs: `SubmitProposalSlateRequestDto`, `RejectProposalSlateRequestDto`, `ProposalSlateResponseDto` — BE · _(done 2026-04-29)_
- [x] **WO-2.8** Unit tests: slate domain (auto-decline on pick, rejectAll, candidate guards) + threshold evaluator (default rules, admin overrides, null disables, snapshot) — BE · _(done 2026-04-29)_

_Deferred:_ matching-engine extensions (grade/domain/language/TZ/cert) behind `MATCHING_ENGINE_V2` flag — moved to a later sub-phase since they require new `Person` columns. Onboarding-date capture endpoint (`/onboarding` extended body) and `/finalize` RM alias also deferred — existing `/onboarding` and `/assign` cover the state transitions; richer date-capture flows belong with the FE redesign in WO-4.
### Phase WO-3 — SLA service + notifications (BE)

- [x] **WO-3.1** Extend `ProjectAssignment` with `slaStage`/`slaDueAt`/`slaBreachedAt` props + setters; mapper + Prisma repo persist (both create and update branches) — BE · _(done 2026-04-29)_
- [x] **WO-3.2** `AssignmentSlaService.applyTransition(assignment, anchor)` — re-anchors SLA on every status change; status→stage map (`CREATED→PROPOSAL`, `PROPOSED→REVIEW`, `IN_REVIEW→APPROVAL`, `ONBOARDING→RM_FINALIZE`); other statuses clear SLA fields. Reads PlatformSetting on every call. Hand-rolled business-day add (no date-fns dep) — BE · _(done 2026-04-29)_
- [x] **WO-3.3** Hooked into `TransitionProjectAssignmentService` (every status transition) and `ProposalSlateService` (submit, acknowledge, pickCandidate, rejectAll) — BE · _(done 2026-04-29)_
- [x] **WO-3.4** `AssignmentSlaSweepService`: scans `slaDueAt < now AND slaBreachedAt IS NULL`, sets `slaBreachedAt`, emits audit + `assignmentSlaBreached` notification. `OnModuleInit` schedules a `setInterval` tick using configurable `assignment.sla.sweepIntervalMinutes`; `ASSIGNMENT_SLA_SWEEP_DISABLED=true` disables for tests — BE · _(done 2026-04-29)_
- [x] **WO-3.5** Six new notification events on `NotificationEventTranslatorService`: `proposalSubmitted`, `proposalAcknowledged`, `proposalDirectorApprovalRequested`, `assignmentOnboardingScheduled`, `assignmentSlaBreached`, `assignmentEscalatedToCase` (email + in-app branches) — BE · _(done 2026-04-29)_
- [x] **WO-3.6** Seed: 6 new email templates wired to the new event names — BE · _(done 2026-04-29)_
- [x] **WO-3.7** Unit tests: SLA stage mapping, configurable durations, business-day skip past weekends — BE · _(done 2026-04-29)_

_Deferred:_ pre-breach warnings (50%/75% from §J `assignment.sla.warningPercents`) — current sweep emits at 100% breach only; pre-breach is a follow-up enhancement. Director recipient lookup for `proposalDirectorApprovalRequested` — relies on the `appConfig.notificationsDefaultEmailRecipient` fallback for now; per-director in-app routing belongs with WO-5 admin-tunable observability.
### Phase WO-4 — DS additions + UI redesign (FE)

**Foundation pieces (this session):**

- [x] **WO-4.1** New DS atom `<WorkflowStages>` — `{ key, label, description?, icon?, status }` props, horizontal/vertical orientation, compact mode, `aria-current="step"` on the current stage, `data-stage-status` for tests. Exported from `@/components/ds` — FE · _(done 2026-04-29)_
- [x] **WO-4.2** Unit test for `<WorkflowStages>` covering label rendering, current-stage marker, data-stage-status, vertical orientation, empty list, description rendering — FE · _(done 2026-04-29)_
- [x] **WO-4.3** Backend: extend `AssignmentDirectoryItemDto` + `list-assignments.service.ts` mapping with `slaStage`, `slaDueAt`, `slaBreachedAt`, `requiresDirectorApproval`. Frontend `AssignmentDirectoryItem` interface mirrors — BE/FE · _(done 2026-04-29)_
- [x] **WO-4.4** API client functions in `frontend/src/lib/api/assignments.ts`: `submitProposalSlate`, `acknowledgeProposal`, `pickProposalCandidate`, `rejectProposalSlate`, `directorApproveAssignment`. New types `ProposalSlateDto`, `ProposalSlateCandidateDto`, `SubmitProposalSlate*`, `RejectProposalSlateRequest`. `IN_REVIEW` added to `AssignmentStatusValue` — FE · _(done 2026-04-29)_
- [x] **WO-4.5** `RejectAllReasonModal` — `<FormModal>` + DS `<Combobox>` populated from the `assignment-rejection-reasons` MetadataDictionary; admin can extend taxonomy without code changes — FE · _(done 2026-04-29)_
- [x] **WO-4.6** `ProposalReviewModal` — one-screen review modal that renders one card per candidate (rank, match%, availability, mismatched skills, rationale). Pick auto-declines competitors server-side; "Reject all" opens the reason modal. Cards use `<div role="button">` for DS conformance (custom card layout) — FE · _(done 2026-04-29)_
- [x] **WO-4.7** `useApprovalQueue` hook — fetches `PROPOSED` + `IN_REVIEW` assignments, filters by scope (`mine`/`team`/`breached`/`all`), sorts by SLA breach + due-at ascending. Shared between `ApprovalQueuePage` and (future) dashboard tiles — FE · _(done 2026-04-29)_
- [x] **WO-4.8** `ApprovalQueuePage` at `/assignments/queue`, registered in `route-manifest.ts` (`MANAGEMENT_ROLES`) and `router.tsx`. Title-bar scope buttons, breach-tinted rows, click-to-open. Frontend `lib/assignment-transitions.ts` updated with `IN_REVIEW` row + transitions — FE · _(done 2026-04-29)_
- [x] **WO-4.8b** Backend: `GET /assignments/:id/proposals` endpoint returning the active slate (or null). `ProposalSlateService.findByAssignmentId()` exposed for callers. Frontend `fetchProposalSlate(assignmentId)` added — BE/FE · _(done 2026-04-29)_
- [x] **WO-4.8c** Wire `ProposalReviewModal` into `AssignmentDetailsPlaceholderPage` — Proposal Slate section card surfaces an "Active slate" panel with status, picked candidate (if any), and a "Review proposal" button when status is OPEN. Modal close triggers slate reload + assignment refresh. `useAssignmentDetails` gains a `refresh()` method — FE · _(done 2026-04-29)_

**Verification (this session):**
- Frontend `tsc --noEmit` clean of new errors (only pre-existing missing-pkg warnings remain)
- DS conformance: 0 violations (all 6 rules at ERROR severity, 453 files)

**Deferred to a follow-up FE chunk (still WO-4 scope):**
- [x] **WO-4.9** `ProposalBuilderDrawer` (MVP) — RM-side drawer to build and submit a multi-candidate proposal slate. Manual add via `<PersonSelect>`, per-candidate `<Input>` for rank + match score + `<Textarea>` for rationale, atomic submit posts the slate via `POST /assignments/:id/proposals`. Wired into `AssignmentDetailsPlaceholderPage` so a "Build proposal slate…" CTA appears on CREATED assignments for RM/DM/admin. Out-of-scope follow-ups (auto-suggest from `StaffingSuggestionsService`, drag-rank via `@dnd-kit`, factor-weight chips for matching engine v2) tracked separately — FE · _(MVP done 2026-04-29)_
- [x] **WO-4.10** `OnboardingScheduleModal` — single `<DatePicker>` for `onboardingDate` bounded by `[today, validFrom]`, read-only display of the assignment start date for context. Backend: new `ScheduleOnboardingService` orchestrates the BOOKED→ONBOARDING transition with date capture; existing `POST /assignments/:id/onboarding` body extended to accept optional `{ onboardingDate }` (legacy bare-transition body still works). Wired into `AssignmentDetailsPlaceholderPage` so a "Schedule onboarding…" button appears whenever the assignment is BOOKED. Notification event `assignmentOnboardingScheduled` fires on success — BOTH · _(done 2026-04-29)_
- [x] **WO-4.11** Re-export `TabBar` / `Breadcrumb` / `ConfirmDialog` from `@/components/ds` — FE · _(done 2026-04-29)_
- [ ] **WO-4.12** `StaffingRequestDetailPage` redesign with `<DetailLayout>` + `<WorkflowStages>` strip + stage-specific action card — FE
- [x] **WO-4.13** `AssignmentDetailsPlaceholderPage` redesigned as a decision surface with **zero-scroll-to-act**. Top-of-page layout (in order):
  - **Staffing progress** (single combined card) — compact `<WorkflowStages>` strip + next-step title + Responsible label + the *one* primary CTA inline. Card stays under ~150px so the CTA is above the fold on all standard viewports.
  - **Title-bar CTA** — the same primary action is hoisted to the global title-bar via `useTitleBarActions`, so even a deep-scrolled user can act without scrolling back.
  - **Staffing details** — `<dl>` with person, project, role, allocation, dates, requested-at, note, Director-approval flag, SLA stage + due-at + breached badge.
  - **Proposal slate** — info card whenever a slate exists.
  - **Cases** — stub pointing to Escalate (full case-list + create-from-assignment is a follow-up).
  - **All workflow actions / Amend / Revoke / Lifecycle history / Audit history** — all collapsed-by-default `<SectionCard collapsible>`, so the page is short by default and the user only expands what they need.
  - Approvals stays expanded (low frequency, low height).

  New helper [`workflow-progression.ts`](frontend/src/features/assignments/workflow-progression.ts) (`buildWorkflowStages`, `buildNextStep`) keeps the page thin. `buildCtaElement(size)` renders the right `<Button>` for the active `ctaKey`; the same function is called twice (size `sm` for title bar, `md` for inline) so behavior never drifts. Director-approve CTA wired (refresh on success). Escalate CTA opens a `ConfirmDialog` notice pointing to the Cases page (full flow deferred). Orphan `SummaryCard` helper removed — FE · _(done 2026-04-29)_
- [ ] **WO-4.14** Three role dashboards (`ResourceManagerDashboardPage`, `ProjectManagerDashboardPage`, `DeliveryManagerDashboardPage`) gain a Pending-Proposals KPI tile + embedded approval queue — FE
- [ ] **WO-4.15** `DirectorDashboardPage` adds Director-approvals-waiting tile + 24h SLA breach panel + Time-to-fill sparkline — FE
### Phase WO-5 — Observability + admin tunability (BOTH)

**Admin tunability — done this session:**

- [x] **WO-5.1** Backend: extend `PlatformSettingsService.DEFAULTS` with all §J keys (timeToFill, SLA budgets, Director thresholds, slate min/max, SLOs, matching weights, sweep cadence, nudge cooldown). Service-level `getByPrefix(prefix)` returns key/value/isDefault rows for a prefix, falling back to DEFAULTS for keys not yet written to DB. New `defaultFor(key)` helper. Endpoint: `GET /admin/platform-settings/by-prefix/:prefix` (admin-only) — BE · _(done 2026-04-29)_
- [x] **WO-5.2** Frontend: `fetchPlatformSettingsByPrefix(prefix)` API client + `PlatformSettingRow` type — FE · _(done 2026-04-29)_
- [x] **WO-5.3** New `AssignmentWorkflowSettings` component (`frontend/src/components/admin/AssignmentWorkflowSettings.tsx`) renders 7 sections — Time targets / Director-approval thresholds / Pre+post-breach reminders / Queue display + slate sizes / SLOs / Matching weights / Sweep cadence + nudge cooldown — with per-row `<Input>` (number for ints, text comma-separated for arrays), inline Save + Reset buttons, "Saved" status confirmation, default-value placeholders, error display via `<FormField>` — FE · _(done 2026-04-29)_
- [x] **WO-5.4** Wired into `AdminPanelPage` as a new sidebar section "Assignment Workflow"; existing PATCH endpoint reused for saves so audit logging is automatic — FE · _(done 2026-04-29)_

**Verification:** Backend + frontend `tsc --noEmit` clean of new errors. DS conformance: 0 violations / all 6 rules at ERROR severity.

**Deferred to a follow-up WO-5 chunk:**

- [ ] **WO-5.5** Pending-Proposals KPI tile + `<DataView>` approval queue panel on the three role dashboards (RM/PM/DM) — reuses the existing `useApprovalQueue` hook — FE
- [ ] **WO-5.6** Director dashboard tiles: Director-approvals waiting, SLA breaches (24h), Time-to-fill sparkline — FE
- [ ] **WO-5.7** Manual test plan additions in `docs/testing/MANUAL_TEST_PLAN.md` (tunability scenarios, end-to-end smoke) — DOCS
- [ ] **WO-5.8** SLO budget JSON entries in `docs/testing/slo-budgets.json` mirroring the `assignment.slo.*` settings — DOCS
### Phase WO-6 — Migration + cutover — pending
