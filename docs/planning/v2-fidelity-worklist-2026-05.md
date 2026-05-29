# V2 Surface Completion Worklist — pure-FE queue + BE-blocked (2026-05-29 audit)

_From the 12-agent per-surface fidelity audit. Gated behind dsRefresh; preview on v2-staging; cutover after testing accepts._

# V2 Completion Worklist — Visible Surfaces (gated behind `dsRefresh` / `workspaceMe`, preview on v2-staging)

_Defines "v2 100% done" for the 11 audited surfaces. Effort: S ≤ ½ day, M ≈ 1 day, L ≈ 2-3 days, XL ≈ 1 wk+. All FE work ships behind the existing flag; cutover (`F-04` / V2-G.4) only after testing accepts._

---

## 1. Fidelity Scoreboard

| # | Surface | Fidelity | One-line verdict |
|---|---------|----------|------------------|
| 1 | **approvals** | **faithful** | Operational-Queue + inspector grammar matches; gaps are BE-data (variance/SLA/decision endpoints), not layout. |
| 2 | **time-management** | **partial** | Decision drawers (BalanceMeter, Law-3/7) faithful; missing PageHeader chrome, TabBar split, SLA/Age cols. |
| 3 | **workspace (/me)** | **partial** | Shell + tabs + Leave faithful; chrome thin, Time/Inbox delegate to legacy pages. |
| 4 | **Project Pulse** | **partial** | 4 of ~11 crafted sections shipped; positions table + milestone donut + external links missing. |
| 5 | **Project Plan+Money** | **partial** | Money chrome faithful; Plan's 3 flagship sections (swimlane/positions/KPI) missing but pure-FE-closeable. |
| 6 | **staffing-desk** | **partial** | Board faithful; **Planner REGRESSES under dsRefresh** (swaps full studio → scenario list); JQL bar orphaned. |
| 7 | **bench** | **partial** | List-detail + inspector grammar right; chrome thin; suggested-fills BE-blocked (matching engine inverse). |
| 8 | **director** | **partial** | Anomaly rail + KPI strip faithful; entire finance/RAG analytic band BE-blocked (no portfolio rollup). |
| 9 | **directory-hr** | **partial** | 3-tab shell + Bench faithful; Directory thin, HR Queue is generic case-list (wrong surface). |
| 10 | **profile (Person 360)** | **partial** | Identity/skills/manager-chain present; flattened to 1 column, no tabs/sidebar/KPI strip. |
| 11 | **admin-setup** | **low** | Only TabBar swap done; no right rail, no RBAC matrix, SetupWizard is raw MUI (XL re-skin). |

---

## 2. PURE-FE CLOSEABLE GAPS — Execution Queue (ordered by impact × low-effort)

> These ship **now** behind the flag with **no new BE**. Every cited endpoint/atom already exists. Grouped by surface; within the PR sequence (§5) they are reordered breadth-first by nav.

### TIER A — Highest leverage (S/M, fixes broken or visibly-empty surfaces)

| # | Surface | Title | File to edit | DS atoms | Effort |
|---|---------|-------|--------------|----------|--------|
| A1 | staffing-desk | **Un-regress Planner: render WorkforcePlanner (swimlane+bench+anomaly) in dsRefresh-ON path** — currently `dsRefreshEnabled ? <DistributionStudio/> : <WorkforcePlanner/>` swaps the full studio for a scenario list. Render WorkforcePlanner (or compose both) in the ON branch. | `routes/staffing-desk/StaffingDeskPage.tsx:182-186` | (existing WorkforcePlanner) | **S** |
| A2 | staffing-desk | **Wire orphaned JqlQueryBar** — component + parser fully built, **zero importers**. Mount below title bar, feed `jql-from-filters`/`jql-to-filters`. | `routes/staffing-desk/StaffingDeskPage.tsx`, `routes/staffing-desk/DistributionStudio.tsx` | Input, SearchInput, Popover, MenuPopover, Button | **M** |
| A3 | Project Pulse | **Wire externalLinks tiles** — `project.externalLinks` + `ExternalLinksPanel` exist but panel only mounted in legacy `RadiatorTab`. Add tiles section to PulseTab. | `routes/projects/tabs/PulseTab.tsx` | Link, Button | **S** |
| A4 | Project Pulse | **Next-milestone Donut card** — `fetchMilestones(projectId)` returns `plannedDate/status/progressPct`; pick next un-hit milestone. | `routes/projects/tabs/PulseTab.tsx` | Donut, DescriptionList | **M** |
| A5 | Project Pulse | **Remove dead signalTone keys / fix tone logic** — `signalTone()` references `open_positions`/`budget_variance_pct`/`burn_4w` the BE never emits (dead branches). Map to actually-emitted lean signal keys. | `routes/projects/tabs/PulseTab.tsx:38-56` | — | **S** |
| A6 | Project Pulse | **Title-bar badges + actions** — StatusBadge (At-risk), mono code, stage chips; derivable from `ProjectDetails.{status,code,stage,plannedEnd}`. | `routes/projects/ProjectDetailPage.tsx:191-203` | StatusBadge, Button, Breadcrumb | **M** |
| A7 | bench | **PageHeader (breadcrumb, idle-total badge, Export)** — dsRefresh-ON branch renders bare `<PageContainer>`; idle-total already in `summary`. | `routes/people/BenchPage.tsx:99-105` | Breadcrumb, Button, IconButton | **M** |
| A8 | bench | **Client-side pagination footer ("Showing N of M")** — endpoint returns full array, no paging today. | `components/people/BenchEnrichedPanel.tsx` | Button | **S** |
| A9 | bench | **Inspector prev/skip stepper** — panel already holds sorted rows + selected index. | `components/people/BenchInspector.tsx:151-169` | Button, IconButton | **S** |
| A10 | time-management | **PageHeader chrome** — breadcrumb, "N awaiting you" (from `pendingCount`), "SLA · 24h" badge, subtitle. Currently bare `PageContainer`. | `routes/time-management/TimeManagementPage.tsx:314` | Breadcrumb, StatusBadge | **S** |
| A11 | time-management | **Inline Anomaly column in queue** — reuse drawer's `deriveAnomalies` logic as a render cell. | `routes/time-management/TimeManagementPage.tsx:436-476` | StatusBadge | **S** |
| A12 | directory-hr | **Directory header count badges (186 / 152 / 12)** — total in `state.data.total`, bench from bench endpoint. | `routes/people/EmployeeDirectoryPage.tsx` | (PageHeader badges) | **S** |
| A13 | profile | **Wire existing PersonActivityFeed into dsRefresh panel sidebar** — feed exists but only on legacy History tab. | `components/people/PersonProfilePanel.tsx` | Timeline | **S** |

### TIER B — High value (M/L, completes core grammar)

| # | Surface | Title | File to edit | DS atoms | Effort |
|---|---------|-------|--------------|----------|--------|
| B1 | workspace | **Chrome persona badges** — Avatar + grade + location/tz badges; `PageHeader.badges` slot exists, Avatar exists. | `routes/me/WorkspaceShellPage.tsx:102-117` | Avatar, Button | **S** |
| B2 | workspace | **Per-tab live counts** — widen `TabBar` label to `ReactNode` (currently `label: string`), compose counts from data each tab already fetches. | `routes/me/WorkspaceShellPage.tsx:20-27`, `components/common/TabBar.tsx:5` | TabBar | **M** |
| B3 | Project Plan | **Workstream swimlane Gantt** — group `ProjectPosition` by `workstreamId`, one `GanttRow` per position, open/vacant tone. `ProjectWorkstream` model + `/project-positions?projectId` + GanttRow all exist (PlanTab self-documents this as deferred V2-A.3). | `routes/projects/tabs/PlanTab.tsx` | GanttRow, Button, StatusBadge, Donut | **L** |
| B4 | Project Plan | **Open-positions table w/ candidates** — `listProjectPositions({fillStatuses:OPEN})` + `getPositionCandidates` already consumed by PositionsListPage. | `routes/projects/tabs/PlanTab.tsx` | Table, Button, StatusBadge, Pct | **M** |
| B5 | Project Plan | **Plan-focused KPI strip** — Schedule/Open-positions/Filled-donut/Active-gate/Effort-sparkline; data from `listProjectPositions` + `fetchStaffingSummary` + project-dashboard. | `routes/projects/tabs/PlanTab.tsx` | Donut, SparklineDs | **M** |
| B6 | Project Plan | **Gates segmented strip** — reshape existing milestone data into compact weighted-segment bar. | `routes/projects/tabs/MilestonesTab.tsx` | WorkflowStages, Timeline, StatusBadge | **S** |
| B7 | Plan/Money | **Per-tab header actions + count badges** — thread tab-scoped actions (Add milestone/position, Export, Change-request) + status/code badges through DetailLayout. | `routes/projects/ProjectDetailPage.tsx:46-50,195-202` | Button, StatusBadge, TabBar | **M** |
| B8 | Project Pulse | **Activity timeline restyle + All/Mine filter** — swap inline grid for DS `.timeline`/Timeline markup. | `routes/projects/tabs/PulseTab.tsx:204-247` | Timeline, Button | **S** |
| B9 | Project Pulse | **Footer Refresh action** — re-trigger load effect (Confidence label dropped, no data). | `routes/projects/tabs/PulseTab.tsx:303-322` | Button, IconButton | **S** |
| B10 | staffing-desk | **Σ-util-now over-allocation cell** — compute from `personAssignments` already on each row. | `components/staffing-desk/StaffingDeskTable.tsx:56` | MiniBars, VarianceBar | **S** |
| B11 | staffing-desk | **Title-bar count badges + New-position CTA** — Export/Save-tab/New-position; counts client-side. | `routes/staffing-desk/StaffingDeskPage.tsx:114-133` | StatusBadge, Button | **S** |
| B12 | bench | **Filter bar (search + chips, longest-idle sort)** — all data on loaded rows; Cost/Best-match sorts deferred (BE). URL-persisted (Law 5). | `components/people/BenchEnrichedPanel.tsx` | SearchInput, Select, Button | **M** |
| B13 | bench | **Bulk row-selection + action banner** — Propose flow exists at `/staffing-requests/new`. | `components/people/BenchEnrichedPanel.tsx` | Checkbox, Button | **L** |
| B14 | director | **PageHeader grammar (breadcrumb, period Select)** — narrative/$badges are BE; shell+breadcrumb+select pure-FE. | `routes/dashboard/DirectorDashboardPage.tsx:127-137` | Breadcrumb, Select, Button | **M** |
| B15 | director | **Recent-decisions Timeline re-skin** — re-shape existing director audit feed into decision-log `.tl-row` grammar. | `components/dashboard/RecentActivityRail.tsx`, `DirectorDashboardPage.tsx:363` | Timeline, Link | **S** |
| B16 | director | **Missing crafted CSS atoms** — add `.section-card-emphasized`, `.chip-active`, `.tl-row`, `.tl-dot`, `.table-cell-strong`, `.divider`. | `frontend/src/styles/global.css` | — | **S** |
| B17 | directory-hr | **Tab counts (Bench 12 / HR Queue 3)** — same TabBar ReactNode-label widening as B2. | `routes/people/EmployeeDirectoryPage.tsx:91-95`, `components/common/TabBar.tsx` | TabBar | **S** |
| B18 | directory-hr | **Filter chips + view toggle + group-by** — role/grade/office on `PersonDirectoryItem`. | `routes/people/EmployeeDirectoryPage.tsx:111-158` | SearchInput, Combobox, Select, Button, Switch | **M** |
| B19 | directory-hr | **Grid view + toggle** — card layout from `PersonDirectoryItem`. | `routes/people/EmployeeDirectoryPage.tsx` | Avatar, StatusBadge, Button | **M** |
| B20 | profile | **PageHeader chrome + tabs + two-column layout** — breadcrumb, avatar-in-title, badges, 6-tab strip, 1fr/320px grid. | `routes/people/EmployeeDetailsPlaceholderPage.tsx:254-290`, `components/people/PersonProfilePanel.tsx:79` | Breadcrumb, Avatar, StatusBadge, TabBar, Button | **M** |
| B21 | profile | **Positions DS Table + Skill pip bars + Quick-actions card** — assignment data + `proficiency` (1-5) already present; quick-actions reuse existing routes. | `components/people/PersonProfilePanel.tsx:177-236` | Table, StatusBadge, MiniBars, Button | **M** |
| B22 | time-management | **TabBar Timesheets/Leave split + range Select + Filters** — swap button-pills for TabBar atom; range maps to month state. | `routes/time-management/TimeManagementPage.tsx:418-424,206-221` | TabBar, Tabs, Select, Button | **M** |
| B23 | time-management | **Leave drawer overlap-warning banner + nav hints** — conflict data already loaded. | `components/time-management/LeaveDecisionDrawer.tsx:280-295` | StatusBadge | **S** |
| B24 | approvals | **Header badges + Filters/History actions + source icons + sticky list + A/R kbd hints** — `PageHeader.badges`/`actions` unused; awaiting-count from total. | `routes/approvals/ApprovalsPage.tsx:142-258`, `components/approvals/ApprovalInspector.tsx` | StatusBadge, Button, Link, IconButton | **S** |
| B25 | admin-setup | **Two-column body grid (1fr/280px) + PageHeader badges/actions/tab-counts** — `PageHeader.badges`/`actions` unused; PageHeaderTab needs `count`. | `routes/admin/AdminPanelPage.tsx:183-208`, `components/common/PageHeader.tsx` | StatusBadge, Button, DescriptionList | **L** |
| B26 | admin-setup | **RBAC permission×role matrix** — build from role-preset + responsibility-matrix data. | `routes/admin/RolePermissionAdminPage.tsx` | Table, StatusBadge | **L** |
| B27 | admin-setup | **Integrations registry polish (icon tiles, mode badge, header count chips, inline actions)** — counts derive client-side; Retry-auth POST is BE. | `routes/admin/IntegrationsRegistryPage.tsx:80-95` | IconButton, StatusBadge, Button | **M** |
| B28 | admin-setup | **2-col Platform-settings grid + unsaved-change footer (Discard/Save&audit)** — restructure single-column inline-save form. | `routes/admin/SettingsPage.tsx` | Input, Select, Switch, Button | **L** |

### TIER C — Large pure-FE rebuilds (L/XL, do last in queue)

| # | Surface | Title | File to edit | DS atoms | Effort |
|---|---------|-------|--------------|----------|--------|
| C1 | workspace | **Rebuild Time tab as weekly editable grid** — stop delegating to `MyTimePage` (monthly); build project×day grid w/ daily totals + draft status. Data in `MonthlyTimesheetResponse.entries/weeks`; EditableCell exists. | `routes/me/TimeTab.tsx:143` | Table, EditableCell, StatusBadge | **L** |
| C2 | workspace | **Time tab week-nav + lock KPI strip + Copy/Auto-fill/Submit-week** — `MonthlyWeek.weekStart/status` drives lock; copy/auto-fill/submit endpoints exist in my-time API. | `routes/me/TimeTab.tsx` | Button, StatusBadge, IconButton | **L** |
| C3 | staffing-desk | **Compose swimlane planner into ON path** (if A1 chose minimal wiring) — PlannerGroup lanes + Σ-sparkline + heat band + draggable PBar. | `routes/staffing-desk/StaffingDeskPage.tsx`, WorkforcePlanner | Table, GanttRow, SparklineDs, MiniBars, Avatar | **XL** |
| C4 | admin-setup | **SetupWizard DS re-skin** — entire wizard is raw `@mui/material` w/ no dsRefresh branch. Re-skin to WorkflowStages/Tabs + DescriptionList + Button/Switch/Input. Step-5 connector cards are BE-blocked (see §3); the shell re-skin is pure-FE. | `routes/setup/SetupWizardPage.tsx`, `routes/setup/screens/*.tsx` | WorkflowStages, Button, Switch, Input, DescriptionList, StatusBadge, Spinner | **XL** |

---

## 3. BE-BLOCKED GAPS — Wait for lean-BE / concurrent-agent track (⚑ territory)

Mapped to NEW-LGL-* / action IDs from `v2-bank-process-assessment-2026-05.md`. **Do not start these — confirm ProjectPosition read-path ownership first (validation §8).**

| Surface | Gap | Missing dependency | Maps to |
|---------|-----|--------------------|---------|
| **workspace** | Overview KPI hours-this-week (logged/expected) + hero totals footer | `GET /me/overview` (week filed/expected) | **NEW-LGL-9 / C-02** |
| **workspace** | Projects Manager column | manager ref on `AssignmentDirectoryItem` (→ `/me/memberships` over ProjectPosition) | **NEW-LGL-9 / C-03** |
| **workspace** | Leave accrual ("+3.5d in lieu"), Overview leave-balance KPI | accrual/TOIL field on `LeaveBalanceDto`; `LeavePolicy` model | **NEW-LGL-13 / C-07** |
| **workspace** | Leave form approver field + Save-draft | approver lookup + draft persistence | (new — leave draft, adjacent **C-04**) |
| **workspace** | Overview pending-item tone/CTA/href; recent-activity event array | enrich `EmployeePendingWorkflowItems` + activity feed on `/me/overview` | **NEW-LGL-9 / C-02** |
| **workspace** | Inbox filter chips + per-row CTA | notification category facet + action-link on inbox read | (adjacent **C-06** notifications) |
| **workspace** | Settings Sessions panel + GDPR (data-export/account-closure) | active-sessions endpoint + GDPR endpoints | (new — not in assessment) |
| **Project Pulse** | Decision banner + Decisions-awaiting panel | unified per-project decisions/attention-items feed (no Decision aggregate in schema) | **D-06 / NEW-LGL-5** (extend) |
| **Project Pulse** | Crafted KPI signal set (open-positions/budget-var/milestone/days-to-gate) + burn-4w sparkline | extend `collectSignals()` in `project-pulse.service.ts` | (new — adjacent **A-03**) |
| **Project Pulse** | Quality RAG quadrant + numeric 0-100 scores | quality dimension + numeric scores on `/rag-computed` (no defect/P0 model) | (new) |
| **Project Money** | Hero PV/EV/AC + EAC time-series; fiscal-period CPI/SPI rollup; true EVM KPIs; currency selector | extend `budget-dashboard` (EV series, EAC, per-period rollup); FxRate wiring | **E-03 / V2-H.3+H.19**, **E-04 / V2-H.20** |
| **staffing-desk** | Saved-view tab strip (mine/public + CRUD) | `StaffingDeskTab` Prisma model + CRUD endpoints | **NEW-LGL-14 / B-09** |
| **staffing-desk** | Find-candidates Donut/skill-flags/cost columns | per-skill proficiency + availability + rate-card on candidate DTO | **NEW-LGL-7 / B-02, B-03** |
| **staffing-desk** | Lifecycle legend (7-state) coloring | desk feed projecting `ProjectPosition.fillStatus` (currently legacy assignment status) | **NEW-LGL-1 / A-03** |
| **staffing-desk** | RBAC-denied / solver-timeout / dual-write banners + tab CRUD modals | tied to saved-view model + dual-write window state | **NEW-LGL-14 / B-09** |
| **bench** | Ranked Suggested-Fills cards (centerpiece) | **`GET /people/:id/suggested-positions`** (inverse of `/project-positions/:id/candidates`; `suggestedProjectIds` hardcoded `[]`) | **NEW-LGL-7 / B-03** (inverse) |
| **bench** | Last-project/released date, Cost/day, Manager, skills cloud | extend `BenchEnrichedRowDto` (release date + skills already computed internally) | **NEW-LGL-1 / A-03** |
| **bench** | Cost-of-bench KPI + WoW deltas | per-person cost rate + prior-week snapshot | (new) |
| **director** | Multi-project burn hero / Variance-by-driver / Cash-position / 4-axis RAG table / budget-var KPI | portfolio-level finance rollup endpoints (today only per-project `/budget-dashboard`, `/evm/recompute`) | **E-03/E-04** + (new portfolio rollup) |
| **director** | Headcount-mix Donut "booked" tier | `bookedHC` on `PortfolioSummaryResponse` | (new) |
| **directory-hr** | Import-HRIS | HRIS import endpoint — **but HRIS is DROP-listed (G-02)**; reframe to bulk-upsert if needed | **G-02 (drop)** |
| **directory-hr** | Util·L30D column | per-person 30-day utilization on `/org/people` DTO | **NEW-LGL-1 / A-03** |
| **directory-hr** | HR Queue: KPI strip, leave-approval-in-place, bulk approve, onboarding day-N checklist | HR-queue aggregate + leave-queue read DTO (balance+manager+conflict) + batch endpoints + onboarding progress DTO | **C-08, C-11 / NEW-LGL-17** |
| **profile** | KPI strip (utilization sparkline/billable/leave); cost-rate history table; current-week grid; upcoming-leave; suggested-positions | profile aggregator returns scalar cost (no history), no utilization/per-day/upcoming-leave; **no person→positions endpoint** | **NEW-LGL-7, NEW-LGL-10 / A-05, B-03** |
| **profile** | Employment card (org-unit/cost-centre/employment-type/role-family/employeeId), skill endorsements | new Person columns + `PersonSkillEndorsement` model | **A-05** + (new) |
| **approvals** | Variance breakdown / forecast sparkline / 4-tile figures (render empty today) | budget-approval detail read (baseline/actuals/EAC/variance + causes); unified meta is `{projectId,fiscalYear}` only | **D-06 / NEW-LGL-5** |
| **approvals** | SLA badges + urgency sort (FE built, inert) | SLA columns + SLA-weighted sort (`slaStage` hardcoded null) | **Issue #257 / D-06** |
| **approvals** | Real Approve/Reject/Escalate (toast-only stubs) | per-source decision endpoints invokable by `{source,id}` | **D-06 / NEW-LGL-5** (XL) |
| **time-management** | SLA-breach KPI + per-row SLA/Age (stubbed) | `ageHours/slaDueAt/slaStage` on `/time-management/queue` (exists on dashboard `ApprovalQueueItemDto` — repoint) | **Issue #257 / C-08** |
| **time-management** | Leave drawer balance for non-self requester | manager-scope `GET /leave-requests/balance?personId` (service `getBalances` exists, no route) | **C-04-adjacent** |
| **time-management** | Inspector hours-by-project Timeline (placeholder) | manager-scope timesheet week-detail endpoint | **Issue #254 / C-09** |
| **time-management** | Team-coverage pool/holiday triple | pool-remaining + PublicHoliday-by-week reads | **C-04 / V2-H.9** |
| **admin-setup** | Right rail (System/Backups/Service-health latency/Recent-actions) | system-overview + backups + per-service latency + lean admin-audit feed reads | **D-03 / NEW-LGL-16** |
| **admin-setup** | SetupWizard Step-5 per-integration connect cards | setup-scoped per-adapter configure/test endpoints (today SMTP/CORS only — **assessment locks SMTP-only**, defer connectors to registry) | **decision: keep SMTP-only** |
| **admin-setup** | Integrations Retry-auth inline action | re-auth POST on degraded adapter | **D-02/D-03** |

---

## 4. ALREADY-FAITHFUL — Spend little/no effort

- **approvals** — Only surface graded **faithful**. The list-detail + inspector grammar, source chips with live counts (even adds a 7th source), per-row anatomy, and inspector comment/footer all match. **All remaining gaps are BE-blocked data** (§3) — the small pure-FE polish in B24 is the only FE work; do not rebuild anything.
- **time-management Leave/Timesheet decision drawers** — `LeaveDecisionDrawer` + `TimesheetInspectorDrawer` faithfully implement Law-7 (one-screen approve/reject), Law-3 auto-advance, BalanceMeter, conflict table, inline reject-reason. **Leave as-is** — only chrome (B22/B23) and BE data needed.
- **workspace Leave tab** — Most faithful tab: BalanceMeter, request form w/ live preview (working-days/holidays/balance-after/conflict rail), year Calendar + legend. **No work** beyond the accrual line (BE).
- **staffing-desk Board** — KPI strip, killer Person+Timeline dense table w/ per-column filters + column configurator, Supply/Demand toggle, Saved Filters, Export, detail Drawer all faithful. **Board needs no rebuild** (only B10/B11 polish); fix is entirely in the Planner half.
- **Project Pulse RAG quadrant + Top-risks panel + KPI-strip grammar + freshness footer** — structurally faithful; leave shells, only swap signals (BE).
- **Money tab (banner, EVM KPI strip, VarianceBar drivers, cost-lines table)** — faithful from real `budget-dashboard`; do not touch — gaps are analytic depth (BE).
- **director anomaly rail + KPI strip + heatmap** — `DirectorAnomalyRail` near-pixel match, BE-backed; KPI strip richer than crafted. Leave.
- **bench + directory-hr list-detail-inspector core** — `BenchEnrichedPanel`/`BenchInspector` realize the grammar with real atoms; only chrome + BE-richness remain.

---

## 5. Recommended PR Sequence (breadth-first, nav order, each shippable + gated)

Each PR is independently shippable behind `dsRefresh`/`workspaceMe`, passes `npm --prefix frontend run test` + `tokens:check`, touches one surface. **PR-1 first regardless of nav order — it fixes an active regression.**

| PR | Surface | Contents | Items | Eff |
|----|---------|----------|-------|-----|
| **1** | staffing-desk | **Planner regression fix** (render WorkforcePlanner in ON path) + Σ-util cell + title-bar badges | A1, B10, B11 | S+S+S |
| **2** | workspace | Chrome persona badges + per-tab counts (widen TabBar label→ReactNode) | B1, B2 | S+M |
| **3** | Project Pulse | externalLinks tiles + next-milestone Donut + dead-signal cleanup + title-bar badges + timeline restyle + footer Refresh | A3, A4, A5, A6, B8, B9 | mostly S |
| **4** | Project Plan/Money | Swimlane Gantt + open-positions table + plan KPI strip + gates strip + per-tab header actions | B3, B4, B5, B6, B7 | L+M×4 |
| **5** | staffing-desk | Wire orphaned JqlQueryBar (Board + Studio) | A2 | M |
| **6** | bench | PageHeader + pagination + inspector stepper + filter bar + bulk-select | A7, A8, A9, B12, B13 | M+S+S+M+L |
| **7** | director | PageHeader grammar + decision-log Timeline + crafted CSS atoms | B14, B15, B16 | M+S+S |
| **8** | directory-hr | Header badges + tab counts + filter chips + grid view | A12, B17, B18, B19 | S+S+M+M |
| **9** | profile | PageHeader+tabs+2-col layout + Positions table/pips/quick-actions + activity sidebar | A13, B20, B21 | S+M+M |
| **10** | time-management | PageHeader chrome + TabBar split/range/filters + anomaly column + drawer banner | A10, A11, B22, B23 | S+S+M+S |
| **11** | approvals | Header badges/actions + source icons + sticky list + A/R kbd hints | B24 | S |
| **12** | admin-setup | Two-col body + PageHeader chrome + RBAC matrix + registry polish + 2-col settings | B25, B26, B27, B28 | L×3+M |
| **13** | workspace | **Time tab weekly editable grid + week-nav/lock KPI strip** (replaces MyTimePage delegation) | C1, C2 | L+L |
| **14** | admin-setup | **SetupWizard DS re-skin** (MUI→DS shell; connectors stay BE-blocked) | C4 | XL |
| **(opt 15)** | staffing-desk | Full swimlane composition into ON path if PR-1 was minimal | C3 | XL |

**Rationale:** PR-1 stops the bleeding (flag-on currently regresses the Planner). PRs 2-12 are breadth-first in nav order (workspace → projects → staffing → people → director → directory → profile → time → approvals → admin), each reaching coherent crafted-page fidelity per surface with mostly S/M items front-loaded for fastest visible progress. PRs 13-15 are the L/XL rebuilds deferred to the end. After PR-12 every surface has its full pure-FE crafted chrome; the remaining fidelity delta is exclusively the §3 BE-blocked data depth on the concurrent-agent track, after which `F-04` (dsRefresh default-ON) gates cutover.

**Files cited as load-bearing:** `StaffingDeskPage.tsx:182-186` (regression), `TabBar.tsx:5` (`label: string` → must widen to `ReactNode` for B2/B17/B25), `PulseTab.tsx:38-56` (dead signalTone keys), `TimeTab.tsx:143` (`<MyTimePage/>` delegation), `ExternalLinksPanel` (only in legacy `RadiatorTab`), `JqlQueryBar.tsx` (zero importers), `PageHeader.tsx:20-21,12` (`badges`/`actions` props exist, unused on most surfaces; `PageHeaderTab` lacks `count`).
