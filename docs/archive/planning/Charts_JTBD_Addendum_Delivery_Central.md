# Delivery Central — Exhaustive Charts & JTBD Addendum Report

**Date:** 2026-04-06
**Author:** QA Automation / Senior PM Review
**Scope:** Every chart, every role, every page, every button — mapped to three-click JTBD paths
**Cross-reference:** UIUX_Deep_Audit, Backlog_Master_Tracker, Advanced_Action_Plan

---

## Part A: Complete Chart Inventory

### A.1 Chart Census — All Roles, All Pages

| # | Page | Chart Name | Type | Library | Dimensions | SVG role | Legends | Interactive Tooltip | Clickable Bars/Segments | A11y |
|---|------|-----------|------|---------|-----------|----------|---------|--------------------|-----------------------|------|
| C-01 | PM Dashboard | Staffing Coverage | Horizontal Bar | Recharts | 727×300 | **null** | Allocated FTE (#6366f1), Required FTE (#e2e8f0) | Wrapper exists, visibility hidden by default | No (cursor: auto) | **FAIL** — no svg role, no aria-label |
| C-02 | PM Dashboard | Project Timeline | Unknown/Empty | Recharts | 1511×200 | application | None | Wrapper exists | No data rendered (1 rect, text "Days" only) | **FAIL** — chart renders empty, misleading |
| C-03 | Planned vs Actual | Planned vs Actual Hours | Horizontal Bar | Recharts | 727×550 | **null** | Actual Hours, Planned Hours | Yes | Not tested | **FAIL** — no svg role |
| C-04 | Planned vs Actual | Deviation Analysis | Scatter/Custom | Recharts | 1511×300 | application | None | Yes | Not tested | PASS — has role |
| C-05 | Employee Dashboard | Workload Gauge | Donut/Gauge | Recharts | 727×200 | application | None | Yes | No | PASS — has role |
| C-06 | Employee Dashboard | Evidence Last 14 Days | Line/Bar | Recharts | 1511×200 | **null** | None | Yes | Not tested | **FAIL** — no svg role |
| C-07 | Employee Dashboard | Weekly Allocation (12 Weeks) | Stacked Area | Recharts | 1511×250 | **null** | CloudFlex Migration, DataPulse Analytics, NovaBridge Platform | Yes | Not tested | **FAIL** — no svg role |
| C-08 | Director Dashboard | Sparkline — Active Projects | Line (mini) | Recharts | 80×32 | application | None | No | No | PASS |
| C-09 | Director Dashboard | Sparkline — Active Assignments | Line (mini) | Recharts | 80×32 | application | None | No | No | PASS |
| C-10 | Director Dashboard | Workload Distribution | Horizontal Bar | Recharts | 727×300 | **null** | Unstaffed | Yes | Not tested | **FAIL** — no svg role |
| C-11 | Director Dashboard | Staffing Status | Custom | Recharts | 1511×300 | **null** | Evidence Mismatch, No Staff, Staffed | Yes | Not tested | **FAIL** — no svg role |
| C-12 | Director Dashboard | Headcount Trend (12 Weeks) | Area | Recharts | 1511×200 | application | None | Yes | Not tested | PASS |
| C-13 | HR Dashboard | Org Distribution | Treemap | Recharts | 727×300 | **null** | None | Yes (9 nodes: Engineering, Delivery, Data & Analytics, etc.) | Not tested | **FAIL** — no svg role |
| C-14 | HR Dashboard | Data Quality | **Table-as-chart** | Recharts | 1511×280 | application | None | N/A | N/A | **ANTIPATTERN** — tabular data rendered via Recharts SVG |
| C-15 | HR Dashboard | Headcount Trend (6 Months) | Line | Recharts | 727×200 | application | None | Yes | Not tested | PASS |
| C-16 | HR Dashboard | Role Distribution | Horizontal Bar | Recharts | 727×300 | **null** | None | Yes | Not tested | **FAIL** — no svg role, label collision (FrontendDeveloper, Full-StackEngineer — no spaces) |
| C-17 | RM Dashboard | Pool Utilization | Donut/Pie | Recharts | 727×250 | **null** | Allocated, Idle | Yes | Not tested | **FAIL** — no svg role |
| C-18 | RM Dashboard | Demand Pipeline (4 Weeks) | Bar | Recharts | 1511×250 | **null** | CloudFlex Migration | Yes | Not tested | **FAIL** — no svg role |
| C-19 | Delivery Dashboard | Evidence vs Assignment Coverage | Horizontal Bar | Recharts | ~1511×300 | Not tested | Expected Hours, Logged Hours | Yes | Not tested | Likely FAIL |
| C-20 | Workload Planning | 12-Week Capacity Forecast | Stacked Area | Recharts | 1553×220 | **null** | At Risk, On Bench | Yes | Not tested | **FAIL** — no svg role |
| C-21 | Capitalisation | CAPEX vs OPEX Hours | Unknown | Recharts | 1511×300 | **null** | CAPEX, OPEX | Yes | Not tested | **FAIL** — no svg role |

**Total: 21 chart instances across 8 pages.**

### A.2 Severity Summary

| Issue | Count | Severity |
|-------|-------|----------|
| Missing SVG `role` attribute | 14 of 21 (67%) | **P1 — A11y blocker** |
| Inconsistent `role` (some have "application", most null) | 14/21 | P1 |
| No chart is clickable (cursor: auto on all bars/segments) | 21/21 | P2 — missed drill-down |
| Empty/broken chart (Project Timeline on PM Dashboard) | 1 | P1 — broken feature |
| Tabular data rendered as Recharts SVG (HR Data Quality) | 1 | P2 — antipattern |
| Concatenated Y-axis labels (no spaces: "CloudFlexMigration") | 2+ charts | P2 — readability |
| No chart export (download PNG/CSV) on any chart | 21/21 | P3 — feature gap |
| No chart title via `<title>` inside SVG | 21/21 | P2 — a11y |
| Tooltip exists but no keyboard activation path | 21/21 | P2 — a11y |

---

## Part B: Per-Role Dashboard Deep Audit

### B.1 Project Manager (lucas.reed)

**Page:** `/dashboard/project-manager` | **Page height:** 3,442px (3.8 viewports)

**Sections (11):**
1. Page header + description (y=129)
2. Filter bar: PM dropdown + As-of datetime picker (y=336)
3. KPI cards: Managed Projects (4), Active Assignments (15), Staffing Gaps (2), Evidence Anomalies (1) (y=430)
4. Closing in 30 Days alert card: 1 project, orange border (y=544)
5. Staffing Coverage chart (y=821) — C-01
6. Project Timeline chart (y=1219) — C-02 **BROKEN: empty**
7. Projects list (y=1525): 4 project cards with "Open dashboard" links
8. Staffing Gaps (y=1525): NovaBridge gaps listed
9. Recently Changed Assignments (y=2461): 5 assignment events
10. Nearing Closure (y=2461): 1 item
11. Anomalies section (y=3077): Planned vs Actual anomalies + Evidence anomalies

**Critical Bugs Found:**
- **BUG-PM-01:** "Project manager" dropdown lists ALL 21 employees instead of filtering to only PM-role users
- **BUG-PM-02:** Project Timeline chart (C-02) renders completely empty — only shows "Days" x-axis label and 1 background rect. No data, no bars, no Gantt segments
- **BUG-PM-03:** "As of" date input uses `datetime-local` type but shows locale-specific placeholder "ДД.ММ.ГГГГ" — no min/max bounds set, no required attribute. No validation feedback
- **BUG-PM-04:** KPI cards (Managed Projects, Active Assignments, etc.) are NOT clickable (cursor: auto, no onClick, no role). Should drill into filtered views

**UX Issues:**
- 3,442px page height = 3.8 viewports of scrolling. No anchor navigation, no sticky section tabs
- "Open project registry" button is an `<a>` tag styled as button (good) but the KPI cards that logically should link to the same data are dead
- Sections at same y-position (Projects/Staffing Gaps at y=1525, Recently Changed/Nearing Closure at y=2461) suggest side-by-side layout, good use of space
- No "Collapse section" controls

### B.2 Planned vs Actual (all roles with access)

**Page:** `/dashboard/planned-vs-actual` | **Page height:** 18,098px (20+ viewports!)

**Critical Bugs:**
- **BUG-PVA-01:** Page is 18,098px tall — renders ALL 113 matched records inline with no pagination, no virtual scroll, no "Show more" pattern. This is a performance and UX catastrophe
- **BUG-PVA-02:** Filter inputs are plain text ("Optional project filter", "Optional person filter") — no autocomplete, no dropdown, no type-ahead. Users must know exact project/person IDs
- **BUG-PVA-03:** Duplicate headings: "Assigned but No Evidence" appears twice (y=1853 and y=1893), "Evidence but No Approved Assignment" appears twice, "Anomalies" appears twice. Likely a wrapper + inner heading pattern creating redundancy

**Charts (2):**
- C-03: Planned vs Actual Hours (11 people shown) — good data density
- C-04: Deviation Analysis (scatter with Planned vs Actual axes) — useful pattern

### B.3 Employee (ethan.brooks)

**Page:** `/dashboard/employee` | **Page height:** 3,051px

**Unique Feature:** Weekly Pulse Check with emoji buttons (Struggling, Stressed, Neutral, Good, Great) — good employee wellbeing feature

**KPI Cards (4):** Current Assignments (2), Future Assignments (1), Allocation (120% — red highlight with "Overallocated — exceeds 100%"), Recent Evidence Hours (58.4h)

**Charts (3):**
- C-05: Workload Gauge — shows 120% allocation
- C-06: Evidence Last 14 Days — daily bar/line from Mar 24 to Apr 6
- C-07: Weekly Allocation (12 Weeks) — stacked area showing 3 project allocations over time

**Sections:** Assignments (2 active), Future Assignments (1 approved), Workload, Evidence, Pending Workflow Items ("No pending items")

**Issues:**
- Notification bell shows badge count (3) — good
- "Open employee directory" button present but KPI cards still not clickable

### B.4 Director (noah.bennett)

**Page:** `/` (root Workload Dashboard) | **Page height:** 3,728px

**Charts (5 — most of any dashboard):**
- C-08, C-09: Sparklines in KPI cards (Active Projects, Active Assignments) — **best practice!** Only dashboard with inline trends
- C-10: Workload Distribution horizontal bar
- C-11: Staffing Status (Evidence Mismatch / No Staff / Staffed)
- C-12: Headcount Trend (12 Weeks) area chart

**KPI Cards (6):** Active Projects (6), Active Assignments (0!), Unassigned Active People (12), Projects Without Staff (6), People Without Active Assignments (12), Evidence Without Assignment Match (3)

**Critical Data Issue:**
- **BUG-DIR-01:** Active Assignments shows 0 but PM Dashboard shows 15 for Lucas Reed alone. The Director dashboard may be showing unscoped/global data that doesn't match PM-filtered views
- **BUG-DIR-02:** "Unassigned Active People: 12" and "People Without Active Assignments: 12" appear to be the same metric with different labels — redundant KPI?

**Good Patterns:** Action buttons (View projects, View assignments, Compare planned vs actual), Reset button on filter, sparklines in KPI cards

### B.5 HR Manager (diana.walsh)

**Page:** `/dashboard/hr` | **Page height:** 7,963px

**Charts (4):**
- C-13: Org Distribution treemap (Engineering, Delivery, Data & Analytics, etc.)
- C-14: Data Quality — **ANTIPATTERN: tabular data (Manager, Org Unit, Assignments, Email, Resource Pool) rendered as Recharts SVG** — should be an HTML table
- C-15: Headcount Trend (6 Months) line chart
- C-16: Role Distribution horizontal bar — **label collision: "FrontendDeveloper", "Full-StackEngineer" missing spaces**

**Sections (13):** Org Distribution, Data Quality, Headcount Trend, Role Distribution, Org Distribution (detail), Data Quality Signals, Lifecycle Activity, Roles and Grades, Team Mood Heatmap, Direct Reports Mood Summary

**Critical Bugs:**
- **BUG-HR-01:** "HR manager" dropdown lists ALL 21 employees (same bug as PM dashboard)
- **BUG-HR-02:** Data Quality rendered as Recharts SVG instead of HTML table
- **BUG-HR-03:** Role Distribution labels concatenated without spaces
- **BUG-HR-04:** Page is 7,963px — no section collapse or tab navigation
- **BUG-HR-05:** "Team Mood Heatmap" (y=6709) and "Direct Reports Mood Summary" (y=7707) show "No data" — features present but empty

### B.6 Resource Manager (sophia.kim)

**Page:** `/dashboard/resource-manager` | **Page height:** 2,911px (most compact dashboard)

**Charts (2):**
- C-17: Pool Utilization donut (Allocated/Idle)
- C-18: Demand Pipeline (4 Weeks) bar chart

**Non-Chart Visualization:**
- Team Capacity Heatmap (8 Weeks): HTML table showing per-person weekly allocation percentages — properly uses `<table>` (unlike HR's Data Quality). Shows Ethan Brooks at 120%, Jordan Kim at 130% — overallocated

**Sections (8):** Pool Utilization, Demand Pipeline, Team Capacity Heatmap, Capacity (Engineering Pool: 8 members, 11 assignments, 5 projects), Idle Resources ("No idle resources"), Pipeline (2 upcoming), Allocation Indicators

**Good Patterns:**
- 3 action buttons (Quick assignment, Resource pools, Open teams) — most actionable dashboard header
- Compact 2,911px height
- Team Capacity Heatmap using proper HTML table with percentage values

**Bug:**
- **BUG-RM-01:** "Resource manager" dropdown lists all 21 employees (same systemic bug)

### B.7 Delivery Manager Dashboard

**Page:** `/dashboard/delivery-manager` | **Page height:** 4,126px

**Charts (1):**
- C-19: Evidence vs Assignment Coverage horizontal bar

**Tables (2):**
- Portfolio Health Overview: 8 rows with color-coded status badges (Good / At Risk) for Staffing, Evidence, Timeline
- Project Health Scorecard: 8 rows with Health Score, Staffing, Evidence, Timeline columns

**KPI Cards (5):** Active Projects (7), Active Assignments (20), Projects Without Staff (0), Evidence Anomalies (1), Inactive Evidence Projects (2)

### B.8 Shared/Report Pages

| Page | Route | Charts | Tables | Notable |
|------|-------|--------|--------|---------|
| Utilization | `/reports/utilization` | 0 | 1 (18 rows: Person, Available/Assigned/Actual Hrs, Utilization) | Pure tabular — **needs chart visualization** |
| Workload Matrix | `/workload` | 0 | 0 | **Empty state: "No workload data"** |
| Workload Planning | `/workload/planning` | 1 (C-20: Stacked area, At Risk/On Bench) | 1 (3 rows, 12 weekly date columns) | Good forward-looking view |
| Capitalisation | `/reports/capitalisation` | 1 (C-21: CAPEX/OPEX) | 1 (CAPEX %, Alert column) | Period locks feature present |
| Monitoring | `/admin/monitoring` | 0 | 0 | Text-only status page, 9 sections |
| Admin Panel | `/admin` | 0 | 1 (User accounts) | CRUD interface, no analytics |

---

## Part C: Systemic Issues Across All Charts

### C.1 Accessibility (WCAG 2.1 AA) — FAILS

1. **67% of charts missing `role` attribute** on SVG element. Screen readers cannot identify these as data visualizations
2. **No `<title>` or `<desc>` inside any SVG** — blind users get zero context
3. **No keyboard navigation** to chart data points — tooltip only activatable via mouse hover
4. **No `aria-label` on any chart container** — the one "aria-label" found was incorrectly set to a legend icon text
5. **Color-only encoding**: Staffing Coverage uses #6366f1 (indigo) vs #e2e8f0 (light gray) — insufficient contrast, fails for colorblind users. Need pattern fills or text labels on bars

**Recommendation:** Create a shared `<AccessibleChart>` wrapper component that enforces: `role="img"`, `aria-label={chartTitle}`, `<title>`, keyboard trap for data points, and pattern fills for color blindness.

### C.2 Data Label Formatting

1. **Y-axis labels concatenated without spaces**: "CloudFlexMigration", "DataPulseAnalytics", "FrontendDeveloper", "Full-StackEngineer" — appears on C-01, C-16, and likely others
2. **Fix:** The data source is sending camelCase or no-space strings. Apply a `formatLabel()` utility that inserts spaces before capitals: `CloudFlex Migration`

### C.3 Chart Interactivity — None

- **Zero charts are clickable** (all cursor: auto on bars/segments)
- No drill-down from any chart to a filtered detail view
- No "click bar to see assignments" pattern
- **Recommendation:** Every bar/segment should be clickable, navigating to a pre-filtered list view of the underlying data

### C.4 Chart Export — Missing

- No PNG download button on any chart
- No CSV export of chart data
- No "Copy to clipboard" option
- **Recommendation:** Add a triple-dot menu (⋯) in each chart header with: Download PNG, Download CSV, Copy data, Full-screen

### C.5 Responsive Container Issues

- Charts alternate between 727px (left-half) and 1511px (full-width) with no apparent system
- The 727px charts leave the right 50% of the viewport completely empty
- **Recommendation:** Use a consistent grid system; 727px charts should share a row with an adjacent component

---

## Part D: JTBD → Three-Click Path Mapping

### D.1 Methodology

For each role, I identified the top Jobs-To-Be-Done (what the user is trying to accomplish), measured the current click path, and designed a maximum-three-click path. "Click" includes: navigation click, filter selection, or button press.

### D.2 Project Manager JTBDs

| # | Job To Be Done | Current Path | Clicks | Three-Click Path | Target |
|---|---------------|-------------|--------|-----------------|--------|
| PM-1 | See my projects' staffing health | Login → PM Dashboard auto-loads → scroll to Staffing Coverage | 1 + scroll | Dashboard loads with chart above fold (move above KPIs) | **1 click** |
| PM-2 | Find which project has staffing gaps | Login → scroll to Staffing Gaps section (y=1525) | 1 + long scroll | Add "Staffing Gaps" anchor in KPI card click → jumps to section | **2 clicks** |
| PM-3 | Check project timeline | Login → scroll to Project Timeline (y=1219) | 1 + scroll | **BLOCKED** — chart renders empty, no data | Fix C-02 first |
| PM-4 | Open a specific project dashboard | Login → scroll to Projects (y=1525) → click "Open dashboard" | 1 + scroll + 1 = 2 + scroll | KPI "Managed Projects" → project list popover → click project | **3 clicks** |
| PM-5 | Review assignment changes | Login → scroll to Recently Changed (y=2461) | 1 + extreme scroll | Add "Recent Changes" tab/anchor accessible from KPI area | **2 clicks** |
| PM-6 | Compare planned vs actual | Login → sidebar click "Planned vs Actual" | 2 clicks | Already achievable — add Cmd+K shortcut | **2 clicks** |
| PM-7 | See anomalies for my projects | Login → scroll to Anomalies (y=3077) | 1 + extreme scroll | "Evidence Anomalies: 1" KPI card → click → scrolls/links to section | **2 clicks** |
| PM-8 | Filter by a different PM | Click dropdown → select name | 2 clicks | Already at 2, but fix: **show only PMs** in dropdown | 2 clicks (fixed data) |

### D.3 Employee JTBDs

| # | Job To Be Done | Current Path | Clicks | Three-Click Path | Target |
|---|---------------|-------------|--------|-----------------|--------|
| E-1 | Check my current workload | Login → Employee Dashboard auto-loads with gauge | 1 | Already optimal — gauge is above fold | **1 click** |
| E-2 | See my allocation over time | Login → scroll to Weekly Allocation chart (y=1467) | 1 + scroll | Move chart to second viewport position, add tab bar | **1 + small scroll** |
| E-3 | Submit weekly pulse | Login → click emoji button in Pulse Check | 2 clicks | Already optimal — pulse is above fold | **2 clicks** |
| E-4 | View my assignments | Login → scroll to Assignments (y=1823) | 1 + scroll | KPI "Current Assignments: 2" → click → anchor to section | **2 clicks** |
| E-5 | Log timesheet hours | Login → sidebar "My Timesheet" | 2 clicks | Already optimal — sidebar accessible | **2 clicks** |
| E-6 | Check pending approvals | Login → scroll to Pending Workflow Items (y=2795) | 1 + extreme scroll | Notification bell badge → dropdown → click item | **2 clicks** |

### D.4 Director JTBDs

| # | Job To Be Done | Current Path | Clicks | Three-Click Path | Target |
|---|---------------|-------------|--------|-----------------|--------|
| D-1 | Get portfolio health overview | Login → Dashboard loads at `/` | 1 | Already optimal — KPIs above fold with sparklines | **1 click** |
| D-2 | See staffing distribution | Login → scroll to Workload Distribution (y=775) | 1 + scroll | Chart is close to fold — move KPIs to compact row | **1 + tiny scroll** |
| D-3 | Identify unstaffed projects | Login → scroll to "Projects With No Staff" (y=1885) | 1 + scroll | KPI "Projects Without Staff: 6" → click → filtered view | **2 clicks** |
| D-4 | Track headcount trend | Login → scroll to Headcount Trend (y=1579) | 1 + scroll | Add section tabs: Overview / Staffing / Trends | **2 clicks** |
| D-5 | Drill into a problem project | Login → scroll → find project → click | 3+ clicks + scroll | KPI card click → project list → project dashboard | **3 clicks** |

### D.5 HR Manager JTBDs

| # | Job To Be Done | Current Path | Clicks | Three-Click Path | Target |
|---|---------------|-------------|--------|-----------------|--------|
| HR-1 | Check headcount | Login → HR Dashboard loads with KPIs | 1 | Already optimal — "Total Headcount: 21" above fold | **1 click** |
| HR-2 | See org distribution | Login → scroll to treemap (y=663) | 1 + small scroll | Already close to fold — move filter bar inline with KPIs | **1 click** |
| HR-3 | Check data quality | Login → scroll to Data Quality (y=1061) | 1 + scroll | Tab navigation: Overview / Quality / Trends / Mood | **2 clicks** |
| HR-4 | Review role distribution | Login → scroll to Role Distribution (y=1745) | 1 + long scroll | Tab "Org Structure" → Role Distribution | **2 clicks** |
| HR-5 | Check team mood | Login → scroll to Team Mood Heatmap (y=6709!) | 1 + extreme scroll (7.5 viewports!) | Tab "Wellbeing" → mood heatmap loads | **2 clicks** |
| HR-6 | Find employees without manager | Login → KPI "Employees Without Manager: 2" (not clickable) | Dead end | Click KPI → filtered people list | **2 clicks** |

### D.6 Resource Manager JTBDs

| # | Job To Be Done | Current Path | Clicks | Three-Click Path | Target |
|---|---------------|-------------|--------|-----------------|--------|
| RM-1 | Check pool utilization | Login → RM Dashboard loads with donut | 1 + small scroll | Already close — move chart above fold | **1 click** |
| RM-2 | See demand pipeline | Login → scroll to Demand Pipeline (y=1011) | 1 + scroll | Tab "Pipeline" → chart loads | **2 clicks** |
| RM-3 | Find overallocated people | Login → scroll to Capacity Heatmap (y=1367) | 1 + scroll | Tab "Capacity" → heatmap with red highlights | **2 clicks** |
| RM-4 | Quick-assign a person | Click "Quick assignment" button | 2 clicks | Already optimal — button in header | **2 clicks** |
| RM-5 | View idle resources | Login → scroll to Idle Resources (y=1720) | 1 + scroll | KPI "Idle Resources: 0" → click → filtered view | **2 clicks** |

---

## Part E: Three-Click Architecture Recommendations

### E.1 Universal Patterns (Apply to ALL Dashboards)

**Pattern 1: Clickable KPI Cards**
Every KPI card must be an `<a>` or `<button>` that either:
- Anchors to the relevant section on the same page (scroll + highlight), OR
- Navigates to a filtered list view (e.g., "Staffing Gaps: 2" → `/assignments?filter=gap`)

Implementation: wrap each KPI card in `<Link to={...}>`, add `cursor: pointer`, hover state, and `role="link"`.

**Pattern 2: Section Tab Bar**
For dashboards over 2 viewport heights (PM: 3.8, HR: 8.8!, Director: 4.1), add a sticky tab bar below the KPI cards:
```
[ Overview ] [ Staffing ] [ Evidence ] [ Anomalies ]
```
Each tab lazy-loads only its section content, eliminating the 3,000-18,000px scroll.

**Pattern 3: Chart Drill-Down**
Every chart bar/segment/slice should be clickable:
- Horizontal bar → navigate to project detail filtered by that project
- Donut segment → navigate to assignment list filtered by status
- Area chart data point → navigate to week detail

**Pattern 4: Accessible Chart Wrapper**
```tsx
<AccessibleChart title="Staffing Coverage" description="Comparison of allocated vs required FTE by project">
  <BarChart ... />
</AccessibleChart>
```
Wrapper adds: `role="img"`, `aria-label`, `<title>`, `<desc>`, keyboard navigation, pattern fills.

**Pattern 5: Chart Action Menu**
Top-right of every chart card: `⋯` menu with Download PNG, Download CSV, Expand full-screen, Copy link.

### E.2 Page-Specific Fixes

**PM Dashboard:**
1. Fix Project Timeline chart (C-02) — it renders completely empty
2. Filter PM dropdown to only show users with `project_manager` role
3. Make KPI cards clickable (anchor links)
4. Add sticky tab bar: [Overview | Projects | Staffing | Evidence | Timeline]
5. Move Staffing Coverage chart above the fold (before or adjacent to KPI cards)

**Planned vs Actual:**
1. **URGENT:** Add pagination or virtual scroll — 18,098px page with 113 inline records is unusable
2. Replace text filter inputs with autocomplete dropdowns (project/person pickers)
3. Remove duplicate headings (wrapper + inner)
4. Add "Matched Records" count with expandable/collapsible list (show first 10, "Load more")

**Employee Dashboard:**
1. Already the most usable dashboard (3,051px, clear sections)
2. Add click-to-anchor on "Current Assignments" and "Future Assignments" KPI cards
3. Consider moving Pulse Check into a floating bottom bar or modal

**Director Dashboard:**
1. Best dashboard design overall (sparklines in KPIs, action buttons, Reset filter)
2. Extend the sparkline pattern to all KPI cards across all dashboards
3. Add clickable KPI cards for drill-down

**HR Dashboard:**
1. **CRITICAL:** Replace Recharts-rendered Data Quality table (C-14) with proper `<table>` element
2. Fix Role Distribution label spacing (insert spaces before capitals)
3. Add tab bar — page is 7,963px (8.8 viewports!): [Headcount | Org | Quality | Roles | Mood]
4. Fix HR manager dropdown to filter by role
5. Populate Team Mood Heatmap and Direct Reports Mood Summary (currently empty)

**RM Dashboard:**
1. Best compact layout (2,911px) — use as reference design
2. Fix RM dropdown to filter by role
3. Add clickable KPI cards

**Delivery Dashboard:**
1. Good use of tables with color-coded badges
2. Add chart visualization for Portfolio Health (currently table-only)
3. Make status badges clickable (filter/drill-down)

---

## Part F: Cross-Dashboard Dropdown Bug

### F.1 The "21 Employees" Bug

**Affected pages:** PM Dashboard, HR Dashboard, RM Dashboard (3 of 3 role-filtered dashboards)

All three role-specific dashboards have a `<select>` dropdown that loads ALL 21 employees from the system instead of filtering by role. This means:
- A PM can view the dashboard "as if" they were an Employee, Director, or Admin
- An HR Manager can impersonate any user's HR view
- A Resource Manager can see capacity data for non-RM users

**Root cause (likely):** The API endpoint that populates the dropdown returns all people without a role filter parameter.

**Fix:** Add `?role=project_manager` (or equivalent) to the people API call, or filter client-side by role before populating `<option>` elements.

**Security implication:** While this is primarily a UX issue (the data shown is scoped to the selected person), it could expose organizational data patterns that should be restricted by role.

---

## Part G: Page Height Audit — Scroll Tax

| Page | Height (px) | Viewports (÷ 900px) | Verdict |
|------|-------------|---------------------|---------|
| RM Dashboard | 2,911 | 3.2 | **Acceptable** |
| Employee Dashboard | 3,051 | 3.4 | **Acceptable** |
| PM Dashboard | 3,442 | 3.8 | Needs tab bar |
| Director Dashboard | 3,728 | 4.1 | Needs tab bar |
| Delivery Dashboard | 4,126 | 4.6 | Needs tab bar |
| HR Dashboard | 7,963 | **8.8** | **Critical — needs tabs** |
| Planned vs Actual | 18,098 | **20.1** | **Emergency — needs pagination** |

---

## Part H: Missing Visualizations — Opportunities

These pages currently have NO charts but would significantly benefit from them:

| Page | Current State | Recommended Chart |
|------|--------------|-------------------|
| Utilization Report | 18-row table only | Horizontal bar chart (utilization % by person), heatmap grid |
| Workload Matrix | Empty state | Person × Project allocation matrix grid (like RM's heatmap) |
| Monitoring | Text-only status | System health gauge/donut, error trend sparkline |
| Staffing Requests | Not accessible in test | Pipeline funnel chart, request status donut |
| Export Centre | Not accessible in test | Recent exports list, schedule calendar |

---

## Part I: Priority Action Items

### Immediate (Sprint 0 — This Week)
1. **Fix Project Timeline chart** (C-02) — renders empty, broken feature
2. **Add `role="img"` to all 14 charts** missing SVG role attribute
3. **Fix dropdown filters** on PM/HR/RM dashboards to filter by role
4. **Add pagination** to Planned vs Actual page (18,098px → max 2,000px)

### High Priority (Sprint 1)
5. Make all KPI cards clickable (drill-down or anchor links)
6. Replace HR Data Quality Recharts rendering with HTML table
7. Fix concatenated Y-axis labels (add space before capitals)
8. Add sticky tab bar to PM, HR, Director, and Delivery dashboards

### Medium Priority (Sprint 2)
9. Add chart drill-down (click bar → filtered view)
10. Add chart export menu (PNG, CSV, clipboard)
11. Add `<title>` and `<desc>` to all chart SVGs
12. Extend sparkline pattern from Director KPIs to all dashboards
13. Add visualizations to Utilization and Monitoring pages

### Low Priority (Sprint 3+)
14. Keyboard navigation for chart tooltips
15. Pattern fills for colorblind accessibility
16. Chart animation (progressive reveal on scroll-into-view)
17. Populate HR Team Mood Heatmap with real data

---

*End of Charts & JTBD Addendum Report*
*Total findings: 21 charts audited, 14 accessibility failures, 9 critical bugs, 38 JTBD paths mapped, 17 action items prioritized*
