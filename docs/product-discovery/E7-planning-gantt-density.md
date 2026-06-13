---
area: "Planning / Gantt control consolidation + workspace density (project Plan tab + Staffing Desk / People / Bench / Cases)"
effort: L
---

# Planning / Gantt control consolidation + workspace density (project Plan tab + Staffing Desk / People / Bench / Cases)

**Effort:** L

## Current state

PROBLEM 1 — Plan tab control scatter (fully-built but fragmented). The dsRefresh-on project detail uses a 4-tab grammar (Pulse/Plan/Money/Cases) in `frontend/src/routes/projects/ProjectDetailPage.tsx`. Planning controls are split across THREE owners on the same screen:
(a) Page header `actions` slot (ProjectDetailPage.tsx:263-285): "Add milestone" (fires `milestoneAddSignal`), "Add change request" (fires `crAddSignal`), "Manage positions" (opens `ManagePositionsDrawer`), and always-on "Create Position" (opens `CreatePositionDrawer` via `?openCreatePosition=true`). These are tab-scoped (`activeTab === 'plan'`) but rendered far from the data they affect — top-right of the page header, violating UX Law 4 (action-data adjacency, 200px).
(b) `PlanTab.tsx` (36 lines) just stacks four full sections vertically with `gap: var(--space-5)`: `MilestonesTab`, `RisksIssuesTab`, `ChangeRequestsTab`, `TeamVendorsTab`.
(c) Each sub-section owns its OWN create affordance: `MilestonesTab.tsx:313-322` has an in-card "+ New Milestone" button in the SectionCard title; `RisksIssuesTab.tsx` has its own "Add risk" create form; `ChangeRequestsTab.tsx:53` has an `openCreateSignal`-driven form. So "create milestone" exists in TWO places (header signal + in-card button), "create change request" in TWO places, and risk creation only in-card. The Timeline (Gantt) is buried inside MilestonesTab as a `SectionCard collapsible defaultCollapsed` (MilestonesTab.tsx:292) — `InteractiveGantt` (355 lines, drag-to-reschedule, week/month zoom) or `MilestoneGanttSimple` fallback gated by `ganttEnabledFor(shape)`. Net: 3 different control patterns (header buttons / signal-driven hidden forms / in-card buttons), the Gantt collapsed by default, and duplicated create entry points. Backend is solid: `milestone.controller.ts`, `change-request.controller.ts`, `risk.controller.ts` under `@Controller('projects')` expose full CRUD; Prisma models `ProjectMilestone` (schema.prisma:3245), `ProjectChangeRequest` (3277), `ProjectRisk` (3353), `ProjectPosition` (3735).

PROBLEM 2 — workspace density (partial). All four pages render but waste horizontal space:
- Staffing Desk (`StaffingDeskPage.tsx`, 464 lines): SEVEN stacked full-width sections — PageHeader → TabStrip → JqlBar → 6-tile KpiStrip → Supply/Demand toggle → two "+ New Position" buttons → master Table → lifecycle legend → pagination. KPI strip + JQL bar + tab strip + toggle consume ~4 vertical bands before any data. Detail opens in a `StaffingDeskDetailDrawer` (overlay, not a persistent split-pane), so the wide table area is unused when inspecting.
- People (`EmployeeDirectoryPage.tsx`, 763 lines): uses `PageContainer viewport` + `ViewportTable`. Has a list-detail inspector only in the `flat`+`list` layout (`PersonDirectoryInspector`, columns `minmax(0,1fr) minmax(280px,360px)`); grid and grouped layouts navigate away (no split-pane). FilterBar has up to 8 controls in one wrapping row.
- Bench (`BenchEnrichedPanel.tsx`, 458 lines, the dsRefresh surface; `BenchPage.tsx` legacy fallback): 4-tile KPI strip + single SectionCard table; list-detail grid only appears AFTER a row is clicked (`BenchInspector`), so default view is a narrow table in a wide column with large empty right gutter.
- Cases (`CasesPage.tsx` 106 lines → `CasesPanel.tsx`): 3-tile KPI strip (with HARDCODED `breachedCount = 0` / `dueTodayCount = 0` placeholders, CasesPage.tsx:57-58 — SLA fields not yet on `CaseRecord` payload) + FilterBar + single SectionCard with `CaseListTable`; `CaseInspector` split-pane only after row click.

Design system is ready: DS `DataView` (`frontend/src/components/ds/DataView.tsx`), `Table`, `Drawer`, `Sheet` exist; `PageContainer viewport` + `.page-container--viewport` (global.css:611) give a flex/min-height-0 full-height shell; 8 page grammars documented in `docs/planning/phase18-page-grammars.md`. Live deployment (agentic.uz) runs with dsRefresh ON (the v2 surfaces above are what users see). `dsRefresh` default is false in `frontend/src/lib/feature-flags.ts:199` but v2 staging/prod build with `VITE_FORCE_FLAGS_ON`.

## Gaps

- No single planning-controls toolbar on the Plan tab: create-milestone and create-change-request each have two entry points (header signal + in-card button), risk creation has only an in-card form, and positions live in the page header — there is no one consistent place or pattern
- Gantt/Timeline is collapsed-by-default and nested inside the Milestones section (MilestonesTab.tsx:292), so the project's primary schedule view is hidden on the Plan tab the user opened to do planning
- Plan sub-sections use 3 different control idioms (header buttons, signal-driven hidden inline forms, in-card SectionCard-title buttons) — no uniform create/edit pattern
- Staffing Desk stacks 7 full-width chrome bands above the data; KPI strip + JQL bar + tab strip + Supply/Demand toggle push the table below the fold and the detail drawer overlays instead of using a persistent split-pane, wasting the wide table area
- Bench and Cases default to a narrow single-table layout in a full-width column — the list-detail split-pane only materializes after a row click, leaving a large empty right gutter at rest
- People directory only offers the inspector split-pane in one of three layout modes (flat+list); grid and grouped layouts still navigate away (context loss, weaker density)
- Cases KPI tiles 'Breached SLA' and 'Due today' are hardcoded to 0 (CasesPage.tsx:57-58) — SLA aging is not surfaced because CaseRecord payload lacks SLA fields
- No shared density/IA standard: each page invents its own chrome stack; there is no 'persistent split-pane List-Detail' grammar variant in phase18-page-grammars.md to standardize against
- No max-content-width discipline: wide tables run edge-to-edge while detail/KPI content leaves large gutters; no two-column 'work area' shell is reused across the four pages

## Product definition

JOB-TO-BE-DONE 1 (Plan tab): "When I open a project's Plan tab as a PM/DM, I want every planning lever — schedule the timeline, add/edit a milestone, raise a change request, log a risk, open/fill a position — in one predictable place with one consistent pattern, so I can run delivery planning without hunting across the header, section titles, and collapsed panels." Personas: Project Manager (primary, owns plan), Delivery Manager (oversight + escalation), Resource Manager (positions). User value: faster planning, no missed controls, no duplicate/ambiguous create buttons, schedule always visible.
JOB-TO-BE-DONE 2 (density): "When I work a queue/directory (Staffing Desk, People, Bench, Cases) on a wide monitor, I want the data and the item I'm inspecting both on screen at once, with chrome compressed, so I can triage rows without losing the list or scrolling past four banners." Personas: RM (Staffing Desk/Bench), HR (People/Cases), DM/Director (oversight).
MINIMAL VIABLE SCOPE: (1) Plan tab — introduce ONE planning toolbar at the top of the Plan tab (sticky), grouping all create actions (New milestone / New change request / New risk / New position / Manage positions) as a single uniform button cluster; promote the Timeline/Gantt to the FIRST section, expanded by default; remove the duplicate header signal buttons and in-card create buttons so each create has exactly one entry point inside the toolbar (in-row Edit/Delete stay for adjacency). (2) Density — define a reusable persistent List-Detail split-pane shell (list left, inspector right always reserved or collapsed-to-rail) and apply to Staffing Desk, People, Bench, Cases; collapse multi-band chrome into a single compact header+filter strip; cap KPI strip to one row. No backend changes required for MVP except optionally wiring Cases SLA fields.

## Recommendation

Design-led, two-track, sequenced to land Plan tab first (highest user pain, smallest blast radius), then the density grammar.

PHASE 1 (Plan tab consolidation, M): Add a `PlanToolbar` rendered once at the top of `PlanTab.tsx`. It owns all create/manage actions (New milestone, New change request, New risk, New position, Manage positions) using one DS `Button` cluster + `MenuPopover` for overflow. Drive each sub-tab's create form via the existing signal pattern (`openCreateSignal`) so the toolbar is the single source; DELETE the in-card '+ New Milestone' (MilestonesTab.tsx:313-322), the in-card change-request/risk create buttons, and the header `actions` planning buttons in ProjectDetailPage.tsx:271-277 (keep only a single overflow if needed). Promote Timeline to the first Plan section, `defaultCollapsed={false}`. Keep per-row Edit/Delete for action-data adjacency. Net: one toolbar, one pattern, schedule visible.

PHASE 2 (Density grammar, M): Add a 9th grammar to phase18-page-grammars.md — "Persistent List-Detail Workspace" — and build a reusable `ListDetailWorkspace` layout (or extend DS `DataView` + `Drawer` into an inline split). Compress chrome into one header row (title + badges + filter + view-switch + primary CTA). Apply to Bench and Cases first (smallest, already have inspectors), then People (extend split-pane to all layouts), then Staffing Desk (collapse the 7 bands; fold JQL into the filter row; make the detail an inline right pane instead of overlay drawer; keep one KPI row).

PHASE 3 (polish, S): Wire Cases SLA tiles to real data (requires adding SLA status to the case list payload) so 'Breached/Due today' stop being hardcoded zeros; add max-content-width discipline + density tokens.

Trade-offs considered — Option A (consolidate Plan into one inline toolbar, chosen): minimal code, keeps existing CRUD/components, fixes both duplication and adjacency. Option B (move all create into a single 'Add…' MenuPopover): cleanest but hides discoverability; use as overflow only. Option C (full Gantt-editor rebuild with inline milestone CRUD on the bars): high value but XL effort and risk — defer. For density, Option A (persistent split-pane shell) beats Option B (keep overlay drawers, just shrink chrome) because the wasted-space complaint is specifically the empty wide area when inspecting.

## Dependencies

- DS primitives: Button, MenuPopover, Drawer, Sheet, DataView, Table (@/components/ds) — already shipped
- DetailLayout header `actions`/`kpiStrip` slots (frontend/src/components/layout/DetailLayout.tsx) — must remove Plan header buttons here
- Existing signal pattern (milestoneAddSignal / changeRequestAddSignal / openCreateSignal) wired through ProjectDetailPage → PlanTab → sub-tabs
- phase18-page-grammars.md + phase18-refactor-standards.md must be updated with the new persistent List-Detail grammar (CLAUDE.md design-doc maintenance rule)
- phase18-standardization-changelog.md entries for each redesigned page
- dsRefresh flag ON (live build via VITE_FORCE_FLAGS_ON) — all redesign must target the dsRefresh-on branches
- tokens:check + ds:check ratchets must pass (no raw hex, no raw <button>)
- Cases SLA tiles depend on backend adding SLA status to the case-list DTO (CaseRecord payload) — blocks Phase 3 only
- Per-page test files (StaffingDeskPage / EmployeeDirectoryPage / BenchPage / CasesPage / MilestonesTab / ProjectDetailPage .test.tsx) must be updated, not broken

## Risks

- Removing the in-card '+ New Milestone' and header signal buttons will break existing tests (MilestonesTab.195/v2b6 tests, ProjectDetailPage.v2a1/w405 tests) — fixtures and assertions must be updated in the same change
- Plan controls are RBAC-gated by PROJECT_CREATE_ROLES; the consolidated toolbar must preserve canManage gating so non-managers don't see create actions
- Promoting the Gantt to first+expanded changes default page weight; InteractiveGantt needs explicit parent height (hero-chart gotcha in CLAUDE.md §9) or it collapses
- Converting Staffing Desk's overlay detail drawer to an inline split-pane risks regressing deep-link/back-nav (?openCreatePosition, positionIds, saved tabs) — filter-persistence (UX Law 5) must be preserved
- Density rework touches 4 high-traffic RM/HR pages on the LIVE agentic.uz deployment; staged rollout + visual round-trip verification required before cutover
- Cases SLA tiles currently show 0/0 — if surfaced as real data without backend SLA fields, they will mislead; keep hardcoded-zero hidden or gate until backend lands
- Adding a 9th page grammar must not contradict the existing 8 (List-Detail vs Operational Queue overlap) — needs an explicit decision on which routes migrate
- CIS/Uzbekistan banks (agentic.uz) — RTL/locale and tabular-nums must survive the denser layouts; date formatting already routes through locale.ts/date-fns-tz

## Claude Design prompt

```
Produce two redesigns for DeliveryCentral (bank-grade delivery/resource platform; dark+light DS tokens; existing primitives DS Button/MenuPopover/Table/DataView/Drawer/Sheet, common SectionCard/StatusBadge/PageHeader/FilterBar). Match the design tokens in frontend/src/styles/design-tokens.ts and the dashboard grammar in DashboardPage.tsx. No raw hex, no raw <button>, tabular-nums on numeric columns.

REDESIGN A — Project "Plan" tab planning toolbar (route /projects/:id?tab=plan):
Goal: consolidate ALL planning/Gantt controls into ONE consistent toolbar, remove duplicate/scattered create buttons, surface the schedule.
Layout top-to-bottom:
1. PlanToolbar (sticky, full width, single row): left = section label "Plan"; right = one uniform button cluster — primary "New position" + secondary "New milestone", "New change request", "New risk", and an overflow MenuPopover ("Manage positions", "Export plan"). All gated to project-create roles. This is the ONLY place create actions appear.
2. Timeline section FIRST, expanded by default: interactive Gantt (drag-to-reschedule milestones, week/month zoom toggle top-right of the card). Give the chart explicit min-height.
3. Milestones register (compact DS Table, sortable, per-row Edit/Delete inline — no card-level create button).
4. Risks & Issues register (compact table + small risk heat-map, per-row actions inline).
5. Change Requests register (compact table, per-row approve/reject inline).
6. Team & Vendors summary.
Each create action opens an inline form/drawer in-context (no navigation, no context loss). Show the consolidated toolbar in both states (manager / read-only). Deliver: desktop mock, the toolbar component spec (props, states, RBAC), and the empty/loading state.

REDESIGN B — Persistent List-Detail Workspace grammar, applied to Staffing Desk, People, Bench, Cases:
Goal: kill wasted horizontal space; show list + selected-item inspector together; compress chrome to one band.
Shell: single header row (eyebrow + title + count badges + compact filter chips + view-switch + ONE primary CTA) → optional single KPI row (max 4-6 tiles, each a drilldown link) → two-column work area: LEFT = compact data table (fills remaining height, sticky header, pagination footer), RIGHT = inspector pane that is ALWAYS reserved as a collapsible rail (collapsed = thin spine with "select a row" hint; expanded = 320-360px detail with prev/next stepper). No full-screen overlay drawer for the in-page detail. Cap KPI strip to one row; fold any JQL/query bar INTO the filter row.
Show 4 mocks (Staffing Desk with Supply/Demand toggle in the filter row; People directory list+inspector; Bench list+inspector with days-idle heat coloring; Cases queue with SLA aging tiles). Provide the reusable ListDetailWorkspace layout spec (slots: header, kpiRow, listPane, inspectorPane, pagination) plus collapsed/expanded/empty/loading states. Keep filters in URL (deep-link + back-nav). Deliver desktop mocks at 1440px and the density rationale (before: stacked full-width bands + empty right gutter; after: one chrome band + persistent split-pane).
```

---

# BA Analysis — Planning/Gantt Control Consolidation + Workspace Density

_Code-grounded product discovery. Live target: agentic.uz (CIS/Uzbekistan banks), running with `dsRefresh` ON._

## 1. Current State (grounded in code)

### Problem 1 — Plan tab control scatter

The dsRefresh-on project detail uses a 4-tab canvas grammar (Pulse / Plan / Money / Cases) in `frontend/src/routes/projects/ProjectDetailPage.tsx`. Planning controls are split across **three owners on one screen**:

| Owner | Location | Controls |
|-------|----------|----------|
| Page header `actions` slot | `ProjectDetailPage.tsx:263-285` (gated `activeTab === 'plan'`) | "Add milestone" (fires `milestoneAddSignal`), "Add change request" (fires `crAddSignal`), "Manage positions" (opens `ManagePositionsDrawer`), always-on "Create Position" (`?openCreatePosition=true` → `CreatePositionDrawer`) |
| `PlanTab.tsx` (36 lines) | stacks 4 sections, `gap: var(--space-5)` | `MilestonesTab`, `RisksIssuesTab`, `ChangeRequestsTab`, `TeamVendorsTab` |
| Each sub-section | in-card | `MilestonesTab.tsx:313-322` "+ New Milestone" in SectionCard title; `RisksIssuesTab.tsx` own "Add risk" form; `ChangeRequestsTab.tsx:53` `openCreateSignal` form |

Consequences:
- **Create milestone has two entry points** (header signal + in-card button). **Create change request has two** (header signal + in-card). **Risk create has one** (in-card only). Inconsistent and duplicative.
- **Three different control idioms**: header buttons / signal-driven hidden inline forms / SectionCard-title buttons.
- **The Gantt is hidden**: Timeline is a `SectionCard collapsible defaultCollapsed` nested INSIDE Milestones (`MilestonesTab.tsx:292`). `InteractiveGantt` (355 lines — drag-to-reschedule, week/month zoom) or `MilestoneGanttSimple` fallback, gated by `ganttEnabledFor(shape)`. The user opens "Plan" to plan, but the schedule is collapsed by default.
- This violates **UX Law 4** (action-data adjacency ≤200px): position/milestone create actions sit in the top-right page header, far from their tables.

Backend is fully built: `milestone.controller.ts`, `change-request.controller.ts`, `risk.controller.ts` (all `@Controller('projects')`) expose complete CRUD. Prisma: `ProjectMilestone` (schema.prisma:3245), `ProjectChangeRequest` (3277), `ProjectRisk` (3353), `ProjectPosition` (3735). **No backend work needed for consolidation.**

### Problem 2 — Workspace density (partial / wasted space)

| Page | File | Density issue |
|------|------|---------------|
| Staffing Desk | `StaffingDeskPage.tsx` (464 ln) | **7 stacked full-width bands**: PageHeader → TabStrip → JqlBar → 6-tile KPI strip → Supply/Demand toggle → 2× "+ New Position" buttons → Table → lifecycle legend → pagination. Detail opens in `StaffingDeskDetailDrawer` (overlay, not split-pane) → wide table area unused while inspecting |
| People | `EmployeeDirectoryPage.tsx` (763 ln) | `PageContainer viewport` + `ViewportTable`. List-detail inspector (`PersonDirectoryInspector`, `minmax(0,1fr) minmax(280px,360px)`) ONLY in `flat`+`list` layout; grid/grouped navigate away. FilterBar up to 8 controls wrapping |
| Bench | `BenchEnrichedPanel.tsx` (458 ln, the dsRefresh surface; `BenchPage.tsx` legacy) | 4-tile KPI + single SectionCard table. Split-pane (`BenchInspector`) only appears AFTER row click → default = narrow table, large empty right gutter |
| Cases | `CasesPage.tsx` (106 ln) → `CasesPanel.tsx` | 3-tile KPI (**`breachedCount=0`/`dueTodayCount=0` hardcoded**, CasesPage.tsx:57-58) + FilterBar + single SectionCard `CaseListTable`. `CaseInspector` split-pane only after row click |

Design system is ready: DS `DataView`, `Table`, `Drawer`, `Sheet` (`frontend/src/components/ds/`); `.page-container--viewport` (global.css:611) gives a flex/min-height-0 full-height shell; 8 grammars in `phase18-page-grammars.md`. Mark: Plan tab = **fully-built but fragmented**; density = **partial** (inspectors exist but only reactively, chrome uncompressed); Cases SLA tiles = **absent** (placeholder zeros).

## 2. Gaps
1. No single planning toolbar on the Plan tab; create-milestone/create-CR have two entry points each, risk has one, positions live in the header — no consistent place or pattern.
2. Gantt collapsed-by-default and nested in Milestones — the primary schedule view is hidden on the planning tab.
3. Three create idioms (header buttons / hidden signal forms / in-card buttons).
4. Staffing Desk pushes the table below 4+ chrome bands; detail overlays instead of a persistent split-pane.
5. Bench/Cases default to a narrow table in a full-width column; split-pane only materializes on click.
6. People inspector split-pane only in one of three layouts.
7. Cases SLA tiles hardcoded to 0 (no SLA fields on CaseRecord payload).
8. No shared persistent-split-pane grammar to standardize against; each page invents its own chrome.

## 3. Product Definition

**JTBD 1 (Plan):** As a PM/DM, give me every planning lever — schedule the timeline, add/edit a milestone, raise a change request, log a risk, open/fill a position — in one predictable place with one pattern, so I run delivery planning without hunting. Personas: PM (primary), DM (oversight), RM (positions).

**JTBD 2 (Density):** As an RM/HR working a queue/directory on a wide monitor, show the data and the inspected item together with chrome compressed, so I triage without losing the list. Personas: RM (Staffing Desk/Bench), HR (People/Cases), DM/Director.

**Minimal viable scope:**
- Plan: one sticky `PlanToolbar` grouping all create/manage actions; Gantt promoted to first section, expanded; delete duplicate header + in-card create buttons (per-row Edit/Delete stay).
- Density: reusable persistent List-Detail split-pane shell; chrome compressed to one band; KPI strip capped to one row. No backend changes for MVP (Cases SLA optional, later).

## 4. Options Considered

**Plan tab**
- **A. Inline `PlanToolbar` (recommended):** one button cluster + overflow MenuPopover; reuse existing signal pattern; delete duplicates. Minimal code, fixes duplication + adjacency.
- **B. Single "Add…" MenuPopover only:** cleanest but hides discoverability → use as overflow only.
- **C. Full Gantt-editor rebuild (inline milestone CRUD on bars):** high value, XL effort/risk → defer.

**Density**
- **A. Persistent split-pane shell (recommended):** directly fixes the "empty wide area while inspecting" complaint.
- **B. Keep overlay drawers, shrink chrome only:** cheaper but leaves the wasted gutter.

## 5. Recommendation (phased)

**Phase 1 — Plan consolidation (M):** Add `PlanToolbar` at the top of `PlanTab.tsx` owning New milestone / New change request / New risk / New position / Manage positions (DS Button cluster + MenuPopover). Drive sub-tab creates via existing `openCreateSignal`. DELETE: in-card "+ New Milestone" (MilestonesTab.tsx:313-322), in-card CR/risk create buttons, header planning buttons (ProjectDetailPage.tsx:271-277). Promote Timeline to first section `defaultCollapsed={false}`. Keep per-row Edit/Delete. Preserve `PROJECT_CREATE_ROLES` gating.

**Phase 2 — Density grammar (M):** Add a 9th grammar "Persistent List-Detail Workspace" to `phase18-page-grammars.md`; build reusable `ListDetailWorkspace` (slots: header, kpiRow, listPane, inspectorPane, pagination) or extend DS `DataView`+`Drawer` into an inline split. Apply order: Bench → Cases → People (extend split to all layouts) → Staffing Desk (collapse 7 bands, fold JQL into filter row, inline detail pane, one KPI row). Preserve URL filters (UX Law 5) and deep-links (`?openCreatePosition`, `positionIds`, saved tabs).

**Phase 3 — Polish (S):** Wire Cases SLA tiles to real data (needs SLA status on case-list DTO); max-content-width + density tokens.

## 6. Effort: **L** (two M tracks + one S, design-led)

## 7. Dependencies
DS primitives (shipped); DetailLayout `actions`/`kpiStrip` slots; existing signal wiring; design-doc updates (grammars/standards/changelog per CLAUDE.md §9); dsRefresh ON build; tokens:check + ds:check ratchets; per-page test updates; Cases SLA backend (Phase 3 only).

## 8. Risks
- Removing in-card/header create buttons breaks `MilestonesTab.195/v2b6` + `ProjectDetailPage.v2a1/w405` tests → update fixtures same change.
- RBAC: toolbar must keep `canManage` gating.
- Gantt-first needs explicit parent height (CLAUDE.md §9 hero-chart gotcha) or it collapses.
- Staffing Desk inline-detail conversion must not regress deep-link/back-nav/saved-tabs.
- 4 high-traffic LIVE pages (agentic.uz) → staged rollout + visual round-trip before cutover.
- Cases SLA: don't surface real-looking 0/0; gate until backend lands.
- 9th grammar must not contradict existing "Operational Queue"/"List-Detail" — explicit route-migration decision.
- CIS/Uzbekistan locale/RTL + tabular-nums must survive denser layouts.

## 9. Ready-to-paste Claude Design prompts
See the `claudeDesignPrompt` field — two redesigns: (A) Project Plan-tab planning toolbar with Gantt-first; (B) Persistent List-Detail Workspace grammar applied to Staffing Desk / People / Bench / Cases.
