# Workload Tracking Platform: UX Operating System

**Version:** 2.0.0
**Date:** 2026-04-12
**Classification:** Enterprise UX Governance Document --- Binding Standard
**Supersedes:** Design System Foundation Package v1.0.0

This document is the enforceable law for every UI decision, every component render, every workflow transition, and every dashboard widget in the Workload Tracking Platform. It is not a style guide. It is an operating system for how humans interact with enterprise delivery data.

---

# PART I --- UX DOCTRINE

---

## SECTION A --- UX OPERATING LAWS

These are non-negotiable product laws. Every feature, screen, and component must comply. Violations are QA blockers.

### LAW 1: Three-Click Action Completion

Any core business action must complete within 3 clicks from the triggering context.

| Action | Maximum Clicks | Path |
|---|---|---|
| Approve a timesheet | 2 | Dashboard notification > Approve button |
| Assign a person to a project | 3 | PM Dashboard > Quick Assign > Confirm |
| Resolve an exception | 2 | Exception row > Resolve (inline) |
| Create a staffing request | 3 | Project detail > Staffing tab > Create request |
| Submit a timesheet | 2 | Timesheet page > Submit for Approval |
| View a person's utilization | 2 | People row click > Overview tab (utilization visible) |

**Enforcement:** Any workflow requiring more than 3 clicks to reach business outcome must be redesigned or supported with a shortcut (command palette, quick action, or inline action). Workflows requiring more than 5 clicks are automatic QA failures.

### LAW 2: No Dead-End Screens

Every screen must offer a clear next action. No screen may render only data without an actionable path forward.

**What constitutes a dead end:**
- An error page with no retry button
- A detail view with no related actions
- A list page after applying filters that shows "no results" without a "clear filters" or "create new" option
- A completed action that returns the user to blank space instead of suggesting the next step

**Required pattern:** Every page must include a `NextAction` zone --- either a primary CTA, a contextual suggestion, or a "back to workflow" link.

### LAW 3: No Context Loss After Action

When a user performs an action (approve, assign, resolve, create), the system must not navigate them away from their working context. The result of the action must be visible in-place.

**Violations:**
- Redirecting to a list page after creating an entity (should stay on the newly created entity or show a success toast with "View" link)
- Navigating to home after approving a timesheet (should stay on the approval queue and show the next pending item)
- Losing scroll position after a table row action

**Required pattern:** Actions complete via inline state change, drawer, or toast --- not via page navigation. The user's eyes should never leave the data that triggered the decision.

### LAW 4: Action Must Live Next to Decision Data

The button to act on data must be visually adjacent to the data that drives the decision. If a manager sees a staffing gap count of 4, the "Create staffing request" action must be within the same visual group --- not on a different page or behind a menu.

**Metric:** The pixel distance from the data that triggers a decision to the action that resolves it must be less than 200px vertically or 400px horizontally on a 1280px viewport.

### LAW 5: Filters Persist Until Explicit Reset

Navigating away from a filtered list and returning must restore the exact filter state. Filters persist in URL query parameters. Tab-switching within a page must not reset filters. Opening a detail view and pressing "Back" must restore the filtered list at the same scroll position.

**Implementation:** All filter state is serialized to URL search params. `FilterBar` reads from and writes to the URL on every change. localStorage caches the last URL per route for session persistence.

### LAW 6: No Duplicated User Input

A user must never be asked to enter the same information twice within the same workflow. If the user selected a project in a filter, and then clicks "Create assignment", the project field in the assignment form must be pre-filled.

**Enforcement:** Every action triggered from a filtered or contextual view must carry forward all applicable context as pre-filled form values.

### LAW 7: One-Screen Approval Principle

All approval decisions (timesheet approval, staffing request review, assignment approval) must be completable within a single screen. The screen must show: the item to approve, the context needed to decide (who, what, when, how much), and the approve/reject buttons.

**Layout:**
```
+----------------------------------------------+
| Approval Item Header (who, what, when)       |
|----------------------------------------------|
| Context Panel        | Decision Panel        |
| (data, history,      | [Approve] [Reject]    |
|  comparisons)        | [Comment field]       |
|                      | [Escalate]            |
+----------------------------------------------+
```

The user must never need to "open in new tab" to gather context for an approval decision.

### LAW 8: One-Screen Exception Resolution Principle

Same as Law 7 but for exceptions. The exception detail, the related entities (person, project, assignment), the evidence, and the resolve/suppress/escalate actions must all be visible on a single screen.

**Current violation:** Exceptions page shows a master-detail layout, but the detail panel says "No exception selected" and the related context requires clicking through to other pages. The resolution must be achievable without leaving the Exceptions page.

### LAW 9: Every KPI is a Doorway

Every metric displayed in a KPI card, chart segment, or table cell must be a clickable drilldown to the underlying data. A number is never just a number --- it is a filtered query result, and clicking it must execute that query.

**Implementation:** `StatCard` component requires an `href` or `onClick` prop. If neither is provided, the component throws a development-mode warning.

### LAW 10: Workspace Continuity

The platform must remember the user's last active workspace per session. On login, the user returns to their role-appropriate dashboard. On browser refresh, the user returns to their exact last page and scroll position. On back-navigation, the user returns to the exact list state they left.

**Implementation:** Route state persisted via URL + sessionStorage. Scroll position restoration via React Router `scrollRestoration` or manual implementation.

---

## SECTION 1 --- EXECUTIVE UX QA DIAGNOSTIC (PRESERVED + UPGRADED)

### 1.1 Maturity Scores

| Dimension | Score (1-10) | Assessment |
|---|---|---|
| Overall UX Maturity | 3.5 | Functional prototype; patterns exist but inconsistent |
| Enterprise Readiness | 3 | RBAC routing exists but error handling and governance flows are incomplete |
| Workflow Continuity | 2 | **NEW** --- No inline actions, no context preservation, no next-action suggestions |
| Click Economy | 2.5 | **NEW** --- Most workflows require 4-7 clicks; no command palette; no shortcuts |
| Decision Surface Quality | 3 | **NEW** --- Dashboards show data but lack decision context, trend deltas, and action adjacency |
| Scalability | 4 | Component reuse emerging but no token system or component contracts |
| Design Debt | 7 (high) | Inconsistent spacing, mixed patterns, no skeletons, weak error states |
| Accessibility | 2.5 | No focus rings, no ARIA landmarks, potential contrast failures |

### 1.2 Top 20 UX Risks (Preserved from v1.0)

*Unchanged --- refer to original Section 1.2. All 20 risks remain valid and unresolved.*

### 1.3 Top 20 Usability Bottlenecks (Preserved from v1.0)

*Unchanged --- refer to original Section 1.3. All 20 bottlenecks remain valid.*

### 1.4 Architectural UI Inconsistencies (Preserved from v1.0)

*Unchanged --- refer to original Section 1.4.*

### 1.5 User Frustration Zones by Role (Preserved from v1.0)

*Unchanged --- refer to original Section 1.5.*

### 1.6 NEW --- Workflow Friction Map

| Workflow | Current Clicks | Ideal Clicks | Friction Source |
|---|---|---|---|
| PM checks staffing gaps and creates request | 7+ | 3 | KPI cards not clickable; must navigate to Staffing Requests separately |
| RM fills a staffing request | 6+ | 3 | Must navigate to People, find person, return to Staffing, propose |
| Employee submits timesheet | 4 | 2 | Must click Auto-fill, then Submit. Auto-fill should be the default behavior. |
| DM resolves an exception | 5+ | 2 | Must select exception, read context, navigate to related entity, return, resolve |
| HR processes onboarding case | 5+ | 3 | Case has no inline workflow stages; must manually track progress |
| PM views project health across portfolio | 6+ | 1 | No portfolio dashboard; must visit each project individually |
| Director reviews org utilization | 4+ | 1 | No executive dashboard; must navigate to Utilization report and manually filter |

---

# PART II --- DESIGN SYSTEM

---

## SECTION 2 --- DESIGN SYSTEM FOUNDATION (PRESERVED)

### 2.A Design Principles (UPGRADED)

**P1: Clarity Over Density**
Every screen has one clear primary action and one clear data hierarchy. Dense tables pair with column prioritization and scannable visual anchors.
*Rule:* Max 6 columns visible by default. Secondary columns behind "Columns" toggle.
*Measurable:* No table renders more than 6 columns on first load at 1280px viewport width.

**P2: Progressive Disclosure**
Summary first, detail on demand. Dashboards show KPIs; clicking drills into filtered lists. Lists show key columns; row click opens detail. Forms show required fields; advanced fields behind toggle.
*Rule:* All entity pages follow List > Detail > Edit flow. Detail views use tabs to defer secondary content.
*Measurable:* First paint of any page shows the user the most critical information within the top 600px of viewport.

**P3: Workflow-First Layouts**
Pages are organized around the job the user is doing, not the data model. A PM's project view leads with staffing gaps and deadlines, not metadata fields.
*Rule:* Every page header includes role-aware "Quick Actions" that reflect the user's most likely next step.
*Measurable:* The most common next action for each role is achievable within 2 clicks from the current page.

**P4: Exception-First Visibility**
Anomalies, gaps, and overdue items surface proactively. Normal states are de-emphasized. Red means "act now"; amber means "act soon"; green means "no action needed."
*Rule:* Dashboards sort by exception severity. Tables with mixed status rows pin exception rows to top.
*Measurable:* An exception condition is visible within 2 seconds of page load without scrolling.

**P5: Least-Click Principle** (now elevated to LAW 1 --- see Section A)

**P6: Role-Sensitive Contextual Actions**
Actions adapt to role. Hidden actions never show-then-deny --- they simply don't render.
*Rule:* RBAC-driven action rendering at the component level. Unauthorized nav items are removed, not grayed.
*Measurable:* Zero "Access Denied" screens appear during normal role-appropriate navigation.

**P7: Managerial Decision Acceleration**
Every dashboard widget answers: "Do I need to act?" Provide signal, not data. Traffic-light indicators, trend arrows, and exception counts replace raw numbers.
*Rule:* Every KPI card includes: current value + delta from prior period + threshold indicator + clickable drilldown.
*Measurable:* A manager can determine their top 3 action items within 10 seconds of dashboard load.

**P8: Action-Data Adjacency** (NEW)
The action to resolve a problem appears in the same visual group as the data that reveals the problem.
*Rule:* Every table row with an actionable status includes an inline action button. Every KPI card with an alert state includes a contextual CTA.
*Measurable:* No action requires navigating to a different page to resolve a problem visible on the current page.

**P9: Seamless Workflow Continuity** (NEW)
After completing an action, the system immediately presents the next logical step. Completing an approval shows the next pending approval. Creating an assignment offers "Create another" or "View project staffing."
*Rule:* Every mutation response triggers a `NextAction` component that suggests 1-2 follow-up actions.
*Measurable:* After every create/update/delete action, the user sees a suggested next step within 500ms.

### 2.B Design Tokens (PRESERVED FULLY)

*All token definitions from v1.0 Section 2.B are preserved without modification:*
- Spacing Scale (4px base)
- Typography Scale (text-xs through text-3xl)
- Elevation (shadow-none through shadow-xl)
- Border Radii (radius-none through radius-full)
- Color Primitives (gray-950 through gray-50)
- Semantic Colors (primary, success, warning, danger, info, neutral)
- Chart Palette (8 colors)
- Utilization Band Colors (5 bands)
- Focus Ring, Hover States, Disabled States

*Refer to v1.0 Section 2.B for complete specifications.*

### 2.C Layout Grammar (PRESERVED + UPGRADED)

*All layout specs from v1.0 are preserved: Page Shell, Content Max Widths, Card System, Grid Rules, Responsive Breakpoints, Sticky Action Bars.*

**UPGRADE --- Context-Preserving Layout Patterns:**

**Inspector Panel Pattern** (NEW):
For workflows where the user selects an item from a list and needs to see detail without losing the list context:
```
+--------------------+----------------------------+
| List Panel (35%)   | Inspector Panel (65%)      |
| [scrollable]       | [selected item detail]     |
| [row highlight]    | [inline actions]           |
|                    | [related context]          |
| Keyboard: ↑↓       | [next action suggestion]   |
+--------------------+----------------------------+
```
Used by: Exceptions, Staffing Requests, Timesheet Approval, Cases.

**Split-Action Pattern** (NEW):
For pages where the user both views data and performs actions on it:
```
+--------------------------------------------+
| Filter Bar                                 |
+--------------------------------------------+
| Data Table / List (scrollable)             |
|   [row] [row] [row] [row]                 |
+--------------------------------------------+
| Sticky Action Bar (bottom)                 |
|  [X selected] [Bulk Action 1] [Bulk 2]    |
+--------------------------------------------+
```
Used by: Assignments, People Directory, Timesheet Approval.

### 2.D Component Taxonomy (PRESERVED FULLY)

*All component specifications from v1.0 are preserved: Buttons, Tab Bars, Breadcrumbs, Page Headers, Data Tables, Filter Bars, Stat Tiles, Status Badges, Health Indicators, Notification Bell, Workload Cells.*

*Refer to v1.0 Section 2.D for complete specifications.*

**NEW Components Added:**

**NextAction Component:**
```
+------------------------------------------+
| [icon] Action completed successfully.    |
| Suggested next:                          |
|   [Primary: View entity] [Secondary: Create another] |
+------------------------------------------+
```
Appears inline after mutations. Auto-dismisses after 8 seconds. Position: below the action trigger or inside success toast.

**InlineConfirm Component:**
Replaces modal dialogs for simple confirmations:
```
[Remove] -> [Are you sure? [Yes, remove] [Cancel]]
```
Button transforms into inline confirm/cancel pair. No modal overlay. No context loss. 300ms animation.

**CommandPalette Component:**
```
Ctrl+K / Cmd+K opens:
+------------------------------------------+
| Search commands, pages, people, projects |
| ---------------------------------------- |
| Recent:                                  |
|   Delivery Central Platform              |
|   Ethan Brooks                           |
| Pages:                                   |
|   Projects                               |
|   Assignments                            |
|   My Timesheet                           |
| Actions:                                 |
|   Create assignment                      |
|   Submit timesheet                       |
|   Create staffing request                |
+------------------------------------------+
```
Categories: Recent, Pages, People, Projects, Actions.
Keyboard: Arrow keys + Enter. Type to filter. Escape to close.

---

# PART III --- ROLE-BASED UX

---

## SECTION 3 --- ROLE-BASED UX BLUEPRINT (PRESERVED + UPGRADED)

*All 7 role definitions from v1.0 are preserved: Employee, PM, RM, HR, DM, Director, Admin.*

*Refer to v1.0 Section 3 for complete role specifications.*

**UPGRADE --- Role-Specific "What Needs Me Now" Widget:**

Every role-specific dashboard includes a "What Needs Me Now" section at the top, above KPI cards. This is a prioritized action queue showing the 3-5 most urgent items requiring the user's attention:

```
+--------------------------------------------------+
| What Needs You Now                    [View all] |
|--------------------------------------------------|
| [!] 2 timesheets pending your approval    [Review] |
| [!] Staffing gap on Mercury Infrastructure [Staff] |
| [i] Assignment ending in 7 days: Ethan Brooks [Extend] |
+--------------------------------------------------+
```

Rules:
- Maximum 5 items displayed
- Items sorted by urgency (overdue > due today > due this week > informational)
- Each item has a single inline action button
- Clicking the action button completes or navigates to the action in 1 click
- Items disappear after resolution (optimistic update)
- Empty state: "You're all caught up" with a subtle checkmark icon

---

# PART IV --- BUSINESS FLOW UX

---

## SECTION B --- BUSINESS-FLOW SCREEN GRAMMAR

For each major domain, this section defines the optimal screen flow: what triggers entry, what context the user needs, what decisions they make, what actions they take, and where they go next.

### B.1 Staffing and Assignments

**Business Question:** "Who is working on what, and where are the gaps?"

**Entry Triggers:**
- PM Dashboard > "Staffing Gaps: 4" KPI card click
- Staffing Requests sidebar nav
- Project detail > Staffing tab
- Command palette: "staffing"

**Optimal Screen Flow:**

```
Step 1: DETECT
  PM Dashboard shows "Staffing Gaps: 4" (red accent)
  Click -> filtered Staffing Requests (status: Open, priority: sorted)

Step 2: UNDERSTAND
  Staffing Request inspector panel opens on right:
    - Project context (name, timeline, budget)
    - Role needed (Frontend Engineer, 80%, 6 months)
    - Candidate suggestions (auto-matched from available pool)
    - Current team composition

Step 3: DECIDE
  RM reviews suggested candidates:
    - Candidate name, current utilization, skills match %, availability
    - Side-by-side comparison of top 2-3 candidates

Step 4: ACT
  "Propose candidate" button inline -> confirmation -> assignment created
  OR "Escalate" button -> routes to Director with context preserved

Step 5: CONFIRM
  Success toast: "Ethan Brooks proposed for Mercury Infrastructure"
  NextAction: [View assignment] [Fill next request]

Step 6: CONTINUE
  Next open staffing request auto-highlights in the list panel
```

**Click count:** Detect (1) > Understand (0, auto-loaded) > Decide (0, visible) > Act (1) > Confirm (0, auto) = **2 clicks total**

**Current platform reality:** 7+ clicks. KPI cards not clickable. Must navigate to Staffing Requests separately. No candidate suggestions. No inspector panel. Must navigate to People to find candidates.

### B.2 Project Lifecycle

**Business Question:** "Is this project healthy, staffed, and on track?"

**Entry Triggers:**
- PM Dashboard > project card click
- Projects list > row click
- Command palette: "Delivery Central Platform"

**Optimal Screen Flow:**

```
Step 1: DETECT
  PM Dashboard shows project cards with health indicators
  Red/amber indicators surface problems immediately
  Click -> Project detail with tabs

Step 2: UNDERSTAND
  Project detail opens on Summary tab:
    - Health score (prominent, with breakdown tooltip)
    - KPI row: Budget status | Staffing coverage | Evidence freshness | Days remaining
    - Staffing coverage table (inline, not separate tab)
    - Recent exceptions related to this project (inline, not separate page)

Step 3: DECIDE
  Data is sufficient to decide on-screen:
    - Staffing gap visible -> "Create staffing request" button adjacent
    - Budget overrun visible -> "Review budget" button adjacent
    - Evidence anomaly visible -> "View exceptions" drills into filtered exceptions

Step 4: ACT
  Inline actions from the project detail page:
    - Quick assign (drawer, not page nav)
    - Create staffing request (drawer, pre-filled with project)
    - Adjust budget (inline edit)
    - Change status (dropdown, not separate page)

Step 5: CONTINUE
  After any action: return to project detail in same tab/scroll position
  NextAction: suggests next project with issues, or "All projects healthy"
```

**Click count:** Detect (1) > Understand (0) > Decide (0) > Act (1 for drawer + 1 confirm) = **3 clicks**

### B.3 Workload Balancing

**Business Question:** "Who is overloaded, who is underutilized, and how do I rebalance?"

**Entry Triggers:**
- RM Dashboard > "Over-allocated: 3" KPI
- Utilization report nav
- Org chart > click on red utilization bar

**Optimal Screen Flow:**

```
Step 1: DETECT
  Utilization page shows horizontal bar chart, sorted by utilization descending
  Over-allocated people (>100%) at top, colored red/orange
  Under-utilized people (<50%) at bottom, colored cyan

Step 2: UNDERSTAND
  Click on a person's bar -> Inspector panel opens:
    - Person name, current assignments (project, allocation %, dates)
    - Breakdown: where their hours are going
    - Comparison: planned vs actual hours this period

Step 3: DECIDE
  Inspector shows actionable options:
    - "Reduce allocation on [Project X]" (slider or input, inline)
    - "End assignment on [Project Y]" (with date picker)
    - "Reassign to [Project Z]" (with role/allocation pre-filled)

Step 4: ACT
  Inline action from inspector -> confirmation -> assignment updated
  Chart bar updates immediately (optimistic)

Step 5: CONTINUE
  Next over-allocated person auto-highlights
  KPI updates in real-time
```

**Click count:** 3 clicks total (select person > choose action > confirm)

### B.4 Timesheets and Approval

**Business Question (Employee):** "How do I log my time quickly and correctly?"
**Business Question (PM):** "Are my team's timesheets submitted and accurate?"

**Employee Flow:**

```
Step 1: LAND
  My Timesheet page loads with current week pre-filled from active assignments
  (Auto-fill from Assignments is the DEFAULT behavior, not a button)

Step 2: EDIT
  Inline cell editing: click cell > type hours > Tab to next cell
  Running totals update in real-time
  Visual indicator for cells exceeding 8h (amber), exceeding 12h (red)
  "Unsaved changes" indicator in header

Step 3: SUBMIT
  "Submit for Approval" button (sticky bottom bar)
  Inline confirm: "Submit 40h for week of Apr 6-12?" [Submit] [Cancel]

Step 4: CONFIRM
  Status changes to "SUBMITTED" (optimistic)
  NextAction: "View next week" or "Back to Dashboard"
```

**Click count:** 0 clicks to see pre-filled timesheet. ~7 tab-key presses to enter hours. 2 clicks to submit = **2 clicks + keyboard entry**

**Approval Flow (PM):**

```
Step 1: DETECT
  PM Dashboard "What Needs You Now": "2 timesheets pending approval"
  Click -> Timesheet Approval page with pending queue

Step 2: UNDERSTAND
  Inspector panel shows:
    - Person name, week, project breakdown
    - Hours per day (visual grid matching timesheet format)
    - Comparison: submitted hours vs assigned allocation
    - Historical: same person's average for past 4 weeks
    - Anomaly flags: "3 hours on Saturday (unusual)"

Step 3: ACT
  [Approve] [Reject with comment] [Request revision]
  Inline actions, no modal, no page change

Step 4: CONTINUE
  Next pending timesheet auto-loads in inspector
  Counter decrements: "1 remaining"
  When all approved: "All timesheets approved for this week" + confetti-free checkmark
```

**Click count:** 1 click to enter queue + 1 click per approval = **2 clicks per approval**

### B.5 Cost Governance

**Business Question:** "Are projects within budget, and where is money being spent?"

**Entry Triggers:**
- Project detail > Budget tab
- Director Dashboard > "Budget at Risk" KPI
- Report Builder > Budget data source

**Optimal Screen Flow:**

```
Step 1: DETECT
  Budget tab on project detail shows:
    - Budget summary card: Allocated | Spent | Remaining | Burn rate
    - Budget vs Actual progress bar with target marker
    - Monthly burn chart (bar chart, actual vs planned)

Step 2: UNDERSTAND
  Drilldown table below:
    - Person | Role | Monthly cost | Hours logged | Cost this period
    - Sortable by cost to identify top cost drivers
    - CAPEX vs OPEX split visible per row

Step 3: DECIDE
  Anomaly highlighting:
    - Person exceeding budget allocation: amber row highlight
    - Project burn rate exceeding planned: red indicator on chart
    - Forecast: "At current burn rate, budget exhausted by [date]"

Step 4: ACT
  "Adjust allocation" inline on rows
  "Request budget extension" button (pre-filled with project context)
  "Export budget report" for finance review
```

### B.6 People Lifecycle

**Business Question:** "What's happening with onboarding, transfers, and offboarding?"

**Entry Triggers:**
- HR Dashboard > "Open Cases" KPI
- Cases nav
- People directory > person > Cases tab (NEW)

**Optimal Screen Flow:**

```
Step 1: DETECT
  HR Dashboard shows case pipeline:
    [Draft: 1] -> [Open: 3] -> [In Progress: 2] -> [Completed: 5]
  Visual kanban or funnel, clickable stages

Step 2: UNDERSTAND
  Click "Open: 3" -> filtered case list
  Inspector panel shows selected case:
    - Case type, subject person, owner, participants
    - Checklist of required steps (with completion status)
    - Documents attached
    - Activity timeline

Step 3: ACT
  "Complete step" checkboxes inline
  "Add note" inline text field
  "Reassign" dropdown
  "Close case" when all steps complete

Step 4: CONTINUE
  Next open case auto-highlights
  Dashboard pipeline counts update in real-time
```

### B.7 Exception Handling

**Business Question:** "What's broken, and how do I fix it?"

**Entry Triggers:**
- Any dashboard > exception KPI or alert strip
- Governance > Exceptions nav
- Notification: "New exception detected"

**Optimal Screen Flow:**

```
Step 1: DETECT
  Exception Queue (master-detail layout, already partially implemented)
  Left panel: sorted by priority score (Severity * Recency * Impact)
  Top exceptions are red-background rows, impossible to miss

Step 2: UNDERSTAND
  Click exception -> right panel shows:
    - Exception type and description
    - Related entity links (person, project, assignment) as inline previews
      (NOT as links that navigate away --- show embedded context cards)
    - Work evidence data that triggered the exception
    - Historical: has this exception occurred before? How was it resolved?

Step 3: DECIDE
  Embedded context eliminates need to navigate:
    - "This person has no active assignment but logged 8h on Project X"
    - Assignment details visible. Person details visible. Evidence visible.
    - The resolution path is clear from the context alone.

Step 4: ACT
  [Resolve: Create assignment] (pre-fills assignment form with context)
  [Resolve: Adjust evidence] (opens inline edit)
  [Suppress: Mark as false positive] (with required reason)
  [Escalate: Route to Director] (with context preserved)

Step 5: CONTINUE
  Exception removed from queue (optimistic)
  Next exception auto-selects
  Counter decrements
  Bulk actions for similar exceptions: "Resolve all 3 similar exceptions"
```

**Click count:** 1 click to select + 1 click to resolve = **2 clicks**

### B.8 Director Decision Dashboards

**Business Question:** "What's the health of my organization, and where do I need to intervene?"

**Entry Triggers:**
- Login (auto-landing for Director role)
- Command palette: "executive dashboard"

**Optimal Screen Flow:**

```
Step 1: SCAN (5 seconds)
  Executive Dashboard top row:
    [Headcount: 32] [Utilization: 68%↓] [Budget: 82% spent] [Projects: 3 at risk] [Exceptions: 14 open]

  "What Needs You Now":
    [!] 2 projects critical - review required
    [!] Budget overrun on Atlas ERP Rollout
    [i] 3 staffing requests pending > 7 days

Step 2: DRILL (1 click)
  Click "3 at risk" -> filtered Projects list showing only at-risk projects
  Or: Click "Budget overrun" -> Project detail > Budget tab for Atlas ERP Rollout
  Or: Click any staffing request -> Staffing Request detail with context

Step 3: DECIDE (0 additional clicks --- data is on screen)
  Project list shows health score, staffing coverage, budget status, evidence freshness
  Enough to prioritize which project to intervene on

Step 4: ACT (1-2 clicks)
  From the filtered list: "Open project dashboard" or inline actions
  Delegate: "Assign to DM" button on critical exceptions

Step 5: RETURN (1 click or Back button)
  Return to executive dashboard
  KPIs refresh to reflect changes
```

---

# PART V --- DASHBOARD UX

---

## SECTION C --- DASHBOARD DECISION UX STANDARD

Dashboards are not reports. Dashboards are **decision surfaces**. Every pixel must earn its place by either informing a decision, enabling an action, or confirming a result.

### C.1 Dashboard Anatomy (Canonical Layout)

Every dashboard follows this exact vertical structure:

```
+====================================================+
| ZONE 1: URGENT ANOMALY STRIP (conditional)         |
| Red/amber bar at very top. Only visible when there |
| are P0/P1 alerts. Clickable. Dismissible per item. |
| "3 critical exceptions require your attention" [→]  |
+====================================================+
| ZONE 2: "WHAT NEEDS YOU NOW" (role-specific)       |
| 3-5 prioritized action items with inline CTAs      |
+----------------------------------------------------+
| ZONE 3: KPI CARDS ROW                              |
| 4-5 stat cards. Each: value + delta + threshold    |
| Each card is a clickable drilldown                 |
+----------------------------------------------------+
| ZONE 4: TAB NAVIGATION                             |
| [Overview] [Timeline] [Staffing] [Anomalies] etc.  |
+----------------------------------------------------+
| ZONE 5: PRIMARY CONTENT AREA                        |
| Left 60%: Chart/Visualization                       |
| Right 40%: Context panel or secondary chart         |
+----------------------------------------------------+
| ZONE 6: DRILLDOWN TABLE                            |
| Full-width data table supporting the above zones   |
| Sortable, filterable, linked to detail views       |
+----------------------------------------------------+
| ZONE 7: DATA FRESHNESS + CONFIDENCE BAR (sticky)   |
| "Data as of: 12 Apr 2026, 15:30 | Refresh [↻]"   |
| "Source: Production DB | Confidence: High"          |
+====================================================+
```

### C.2 Urgent Anomaly Strip

Rendered only when P0 or P1 alerts exist. Spans full content width. Cannot be missed.

```
background: color-danger-muted (for P0) or color-warning-muted (for P1)
text: color-danger or color-warning
padding: space-2 space-4
border-radius: radius-md
display: flex; justify-content: space-between
```

Content: `[Alert icon] [Message with count] [View all →]`
Behavior: Clicking navigates to the relevant filtered view. Each alert item has an "X" dismiss (suppresses for this session only).

### C.3 KPI Card Decision Standard

Every KPI card must contain exactly these elements:

| Element | Purpose | Visual |
|---|---|---|
| Label | What this metric is | `text-sm`, `gray-400` |
| Value | Current number | `text-2xl`, `gray-50`, `font-weight-700` |
| Delta | Change from prior period | `text-xs`, green (↑ improving) / red (↓ declining) / gray (→ stable) |
| Threshold indicator | Left-border accent color | 3px left border: green/amber/red based on threshold |
| Sparkline (optional) | 7-day or 30-day trend | 40px tall mini chart, no axis labels |
| Clickable area | Entire card is a drilldown link | `cursor: pointer`, hover shadow |

**Threshold Logic:**
```
if (value > dangerThreshold) -> red left border + red delta
if (value > warningThreshold) -> amber left border + amber delta
else -> green left border or no border (healthy)
```

Thresholds are configurable per metric and per role.

### C.4 Comparative Trend Zone

Dashboards must support comparison:
- **Period comparison:** This week vs last week. This month vs last month.
- **Target comparison:** Actual vs target/plan.
- **Peer comparison:** This project vs portfolio average. This team vs org average.

Implementation: Toggle in dashboard header: `[This period] vs [Prior period / Target / Avg]`
Charts render dual series. KPI deltas compute against the selected comparison.

### C.5 Recommended Actions Rail

On dashboards with available actions, a right-aligned rail shows suggested actions based on the current data state:

```
+----------------------------+
| Recommended Actions        |
|----------------------------|
| 1. Fill 2 open staffing   |
|    requests (7+ days old)  |
|    [Open requests →]       |
| 2. Review 3 exceptions    |
|    on Atlas ERP Rollout    |
|    [View exceptions →]     |
| 3. Approve pending         |
|    timesheets (2 overdue)  |
|    [Approve →]             |
+----------------------------+
```

Generated from: open staffing requests, unresolved exceptions, pending approvals, overdue timesheets, budget alerts.
Sorted by: urgency, then impact, then recency.
Max 5 items. Each with a single CTA link.

### C.6 Data Freshness Indicator

Every dashboard must show when the data was last updated:

```
position: sticky; bottom: 0;
background: gray-900; border-top: 1px solid gray-700;
text: text-xs, gray-400
content: "Data as of: [timestamp] | [Refresh ↻]"
```

If data is older than the expected refresh interval, show an amber warning: "Data may be stale (last refresh: 2h ago)."

If data source is in error state, show a red indicator: "Unable to refresh. Showing cached data."

---

# PART VI --- CLICK ECONOMY

---

## SECTION D --- CLICK ECONOMY OPTIMIZATION

### D.1 Module-by-Module Click Audit

#### D.1.1 Dashboard

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| PM sees staffing gaps | Login > sidebar click > PM Dashboard | 2 | Auto-landing on PM Dashboard | 0 | -2 |
| PM drills into staffing gaps | See gap count > sidebar > Staffing Requests | 3 | Click KPI card "Staffing Gaps: 4" | 1 | -2 |
| PM creates staffing request | See gap > navigate > click Create > fill form > submit | 6 | KPI click > drawer opens pre-filled > submit | 3 | -3 |

#### D.1.2 Projects

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| View project health | Projects nav > find row > click row | 3 | Command palette "project name" > Enter | 2 | -1 |
| Assign person to project | Project detail > Team tab > fill form > submit | 4 | Project detail > "Quick Assign" button > drawer > confirm | 3 | -1 |
| Close project | Project detail > "Close project" button (no confirm) | 1 (dangerous) | Project detail > "Close project" > inline confirm | 2 | +1 (safety) |

#### D.1.3 People

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| Find a person | People nav > scroll/paginate > find > click | 4+ | Command palette > type name > Enter | 2 | -2+ |
| View person's assignments | Person 360 > scroll to assignments section | 2+ | Person 360 > Overview tab shows assignments above fold | 1 | -1+ |

#### D.1.4 Assignments

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| Create assignment | Assignments nav > "Create assignment" > fill form > submit | 4 | From any context > Cmd+K "assign" > drawer pre-fills context > confirm | 3 | -1 |
| Bulk approve assignments | Select one > approve > select another > approve... | 2*N | Select all > "Bulk Approve" | 3 | -(2N-3) |

#### D.1.5 Timesheets

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| Fill timesheet | Navigate > "Auto-fill from Assignments" > edit cells > Submit | 4+ | Navigate (auto-filled already) > edit cells > Submit | 2 | -2+ |
| Approve timesheets | Navigate > select > review > approve > select next... | 3*N | Inspector panel > review > approve > auto-next | 1+N | -(2N-1) |

#### D.1.6 Exceptions

| Action | Current Path | Clicks | Ideal Path | Clicks | Savings |
|---|---|---|---|---|---|
| Resolve exception | Select > read > navigate for context > return > resolve | 5+ | Select > read context in inspector > resolve | 2 | -3+ |
| Bulk suppress similar | Suppress one > select next > suppress > repeat... | 2*N | Select similar > "Suppress all similar" | 3 | -(2N-3) |

### D.2 Navigation Elimination Opportunities

| Opportunity | Current | Proposed | Impact |
|---|---|---|---|
| Command Palette (Ctrl+K) | Not implemented | Jump to any page, person, project, or action in 2 keystrokes | Eliminates 50%+ of sidebar navigation |
| KPI card drilldowns | Cards not clickable | Every card links to filtered view | Eliminates 1-2 sidebar clicks per drilldown |
| Inline entity previews | Must navigate to detail page | Hover or click shows popover with summary | Eliminates round-trip navigation for quick lookups |
| Context-carrying navigation | Links lose context | All navigations carry filter state and context params | Eliminates re-entry of filters after navigation |
| Breadcrumb "Back to list" | Browser back (loses filter state) | Breadcrumb preserves query params | Eliminates filter re-application |

### D.3 Inline Edit Opportunities

| Field | Current | Proposed |
|---|---|---|
| Assignment allocation % | Must open edit form | Click cell > type > Tab to save |
| Assignment dates | Must open edit form | Click date > date picker inline |
| Project status | Must open edit form | Dropdown in header card |
| Person org unit | Must navigate to admin | Dropdown on person 360 (admin only) |
| Timesheet hours | Already inline (partially) | Improve: Tab navigation + auto-save |
| KPI thresholds | Not configurable | Settings gear on KPI card > inline edit |

### D.4 Keyboard Acceleration Patterns

| Shortcut | Action | Scope |
|---|---|---|
| `Ctrl+K` / `Cmd+K` | Open command palette | Global |
| `Ctrl+/` | Show keyboard shortcuts help | Global |
| `g then d` | Go to Dashboard | Global (vim-style) |
| `g then p` | Go to Projects | Global |
| `g then a` | Go to Assignments | Global |
| `g then t` | Go to My Timesheet | Global |
| `g then e` | Go to Exceptions | Global |
| `n` | Create new (context-sensitive) | List pages |
| `e` | Edit selected | Detail pages |
| `Enter` | Open selected row | Table focus |
| `Escape` | Close panel/dialog/cancel | Global |
| `Tab` / `Shift+Tab` | Navigate between cells | Timesheet grid |
| `j` / `k` | Next/previous row | Table focus (vim-style) |
| `Space` | Toggle row selection | Table focus |
| `Ctrl+Enter` | Submit form | Forms |

---

# PART VII --- TABLES, FORMS, AND FILTERS

---

## SECTION 5 --- TABLES, FORMS, AND FILTER UX STANDARDS (PRESERVED + UPGRADED)

*All specifications from v1.0 Section 5 are preserved: Enterprise Data Tables, Sticky Headers, Row Actions, Mass Actions, Inline Edits, Saved Filters, Filter Chips, Async Lookup Fields, Destructive Action Confirmation.*

*Refer to v1.0 Section 5 for complete specifications.*

**UPGRADES:**

### 5.10 NEW --- Context-Carrying Table Navigation

When a user clicks a table row to navigate to a detail page:
1. Current filter state is encoded in the URL query params
2. The detail page breadcrumb includes a "Back to [Page] (filtered)" link that restores the exact list state
3. On the detail page, "Previous" / "Next" arrows navigate between entities in the current filtered set without returning to the list

```
+----------------------------------------------+
| ← Back to Projects (3 of 12 filtered)       |
| [← Previous: Atlas ERP] [Next: Beacon →]    |
+----------------------------------------------+
| Delivery Central Platform                    |
| ...                                          |
```

### 5.11 NEW --- Table Smart Defaults

| Rule | Standard |
|---|---|
| Default sort | Most recently modified first (except where domain logic overrides) |
| Default page size | 25 rows |
| Default column visibility | Max 6 columns visible; rest in "Columns" toggle |
| Default filter state | Role-appropriate (PM sees their projects; RM sees their pool; Employee sees their assignments) |
| "Show mine" toggle | On every table that supports user-scoped data. Toggles between "My [entities]" and "All [entities]" |

### 5.12 NEW --- Bulk Action Ergonomics

Bulk actions follow this interaction pattern:
1. Checkbox appears on table row hover (not always visible to reduce noise)
2. Clicking one checkbox makes all checkboxes visible + shows sticky action bar
3. "Select all on this page" and "Select all N matching filters" options
4. Sticky action bar at bottom: `[X selected] [Action 1] [Action 2] [Deselect all]`
5. After bulk action: success toast with count + undo option

---

# PART VIII --- ACCESSIBILITY

---

## SECTION 6 --- ACCESSIBILITY + ENTERPRISE USABILITY QA (PRESERVED FULLY)

*All specifications from v1.0 Section 6 are preserved: WCAG 2.2 AA Compliance Audit, Keyboard-First Operation, Screen Reader Semantics, Chart Accessibility, Motion Reduction, Dense Table Readability.*

*Refer to v1.0 Section 6 for complete specifications.*

---

# PART IX --- IMPLEMENTATION

---

## SECTION 7 --- DESIGN-TO-CODE IMPLEMENTATION SPEC (PRESERVED + UPGRADED)

*All specifications from v1.0 Section 7 are preserved: React Component Architecture, shadcn/ui Suitability Matrix, Tailwind Token Mapping, Storybook Structure, Visual Regression Test Strategy, Playwright UI Assertion Patterns, Token Naming Convention, Chart Abstraction Strategy, Page Composition Pattern, Slot-Based Dashboard Widgets, Reusable Filter Architecture, Route-Level Layout Primitives.*

*Refer to v1.0 Section 7 for complete specifications.*

**UPGRADES:**

### 7.13 NEW --- Workflow Continuity Architecture

```tsx
// Every mutation hook returns a NextAction suggestion
interface MutationResult<T> {
  data: T;
  nextActions: NextAction[];
}

interface NextAction {
  label: string;           // "View assignment"
  href?: string;           // Navigation target
  onClick?: () => void;    // Inline action
  variant: 'primary' | 'secondary';
  icon?: LucideIcon;
}

// Usage in components
const { mutate } = useCreateAssignment({
  onSuccess: (result) => {
    toast.success('Assignment created', {
      actions: result.nextActions.map(a => ({
        label: a.label,
        onClick: () => navigate(a.href),
      })),
    });
  },
});
```

### 7.14 NEW --- Inspector Panel Architecture

```tsx
interface InspectorPanelConfig<T> {
  // What entity is being inspected
  selectedItem: T | null;
  // Related context to load
  contextQueries: {
    key: string;
    query: () => Promise<unknown>;
    label: string;
  }[];
  // Actions available on this item
  actions: {
    label: string;
    variant: 'primary' | 'secondary' | 'destructive';
    onClick: (item: T) => void;
    requiresConfirm?: boolean;
    confirmMessage?: string;
  }[];
  // What to show when nothing is selected
  emptyState: React.ReactNode;
  // Navigate to next/previous
  onNext?: () => void;
  onPrevious?: () => void;
}

<InspectorPanel config={inspectorConfig} />
```

### 7.15 NEW --- Command Palette Integration

```tsx
// Command palette entries are registered by each module
interface CommandEntry {
  id: string;
  label: string;
  category: 'page' | 'action' | 'person' | 'project' | 'recent';
  keywords: string[];          // Additional search terms
  icon: LucideIcon;
  onSelect: () => void;
  shortcut?: string;           // e.g., "g p" for Go to Projects
  requiredRole?: Role[];       // RBAC filtering
}

// Modules register commands
useCommandRegistry([
  { id: 'nav-projects', label: 'Projects', category: 'page', icon: FolderIcon, onSelect: () => navigate('/projects'), keywords: ['project', 'prj'], shortcut: 'g p' },
  { id: 'action-create-assignment', label: 'Create assignment', category: 'action', icon: PlusIcon, onSelect: () => openDrawer('create-assignment'), keywords: ['assign', 'staff'] },
]);

// Dynamic entries from API
useEffect(() => {
  people.forEach(p => registerCommand({
    id: `person-${p.id}`, label: p.name, category: 'person', icon: UserIcon,
    onSelect: () => navigate(`/people/${p.id}`), keywords: [p.email, p.department],
  }));
}, [people]);
```

---

# PART X --- QA GOVERNANCE

---

## SECTION 8 --- UI/UX QA DEFINITION OF DONE (PRESERVED + UPGRADED)

*All checklist items from v1.0 Section 8 are preserved.*

*Refer to v1.0 Section 8 for the complete checklist.*

**NEW Checklist Items Added:**

#### Workflow Continuity
- [ ] After any create/update/delete action, a `NextAction` suggestion is displayed
- [ ] No action navigates the user away from their current context without explicit navigation intent
- [ ] Filter state is preserved when navigating away and returning (URL query params)
- [ ] Scroll position is restored on back-navigation
- [ ] Inspector panels load related context without requiring additional navigation

#### Click Economy
- [ ] Core workflow for the page's primary role completes in 3 or fewer clicks
- [ ] All KPI cards are clickable drilldowns (no non-interactive stat cards)
- [ ] At least 3 keyboard shortcuts are registered for the page's primary actions
- [ ] Command palette includes entries for this page and its primary actions

#### Business Logic Completeness
- [ ] Every error state includes a recovery action (retry, edit, or escalate)
- [ ] Every empty state includes a creation action or guidance text
- [ ] Every list page offers "Show mine" vs "Show all" toggle
- [ ] Every detail page includes "Previous/Next" navigation within the filtered set
- [ ] Every form triggered from a filtered context pre-fills applicable filter values

---

## SECTION E --- UX QA ACCEPTANCE RULES

These rules are enforced during code review and QA. Violations are merge blockers.

### E.1 Hard Failures (Automatic Rejection)

| Rule ID | Rule | Rationale |
|---|---|---|
| UX-FAIL-01 | Any workflow requiring more than 5 clicks to reach business outcome | Violates Law 1 |
| UX-FAIL-02 | Any action that requires return navigation to complete | Violates Law 3 |
| UX-FAIL-03 | Any page with no next action available (dead-end screen) | Violates Law 2 |
| UX-FAIL-04 | Any dashboard KPI card that is not a clickable drilldown | Violates Law 9 |
| UX-FAIL-05 | Any filter state that resets on navigation or tab-switch | Violates Law 5 |
| UX-FAIL-06 | Any data-heavy page (>25 rows or >3 widgets) without saved view support | Violates enterprise scalability |
| UX-FAIL-07 | Any error state without a retry or recovery action | Violates Law 2 |
| UX-FAIL-08 | Any form that asks for data already present in the current context | Violates Law 6 |
| UX-FAIL-09 | Any destructive action without confirmation | Safety violation |
| UX-FAIL-10 | Any action button located more than 200px vertically from its decision data | Violates Law 4 |

### E.2 Soft Warnings (Require Justification)

| Rule ID | Rule | When Exception is Acceptable |
|---|---|---|
| UX-WARN-01 | Workflow requires 4 clicks | Acceptable only if the 4th click is a confirmation for a destructive or high-impact action |
| UX-WARN-02 | Page loads with no data above the fold | Acceptable if loading skeleton is shown and data appears within 2 seconds |
| UX-WARN-03 | Dashboard widget has no CTA | Acceptable only for pure-informational widgets (e.g., "data as of" timestamp) |
| UX-WARN-04 | Table has more than 6 default columns | Acceptable for analytics-heavy views where all columns are essential for the primary decision |
| UX-WARN-05 | Action opens a full modal instead of inline/drawer | Acceptable for complex multi-step forms (e.g., project creation wizard) |

### E.3 Automated UX Tests (CI Pipeline)

| Test | Tool | Assertion |
|---|---|---|
| Click-path audit | Playwright | For each defined workflow, assert that the click count matches the ideal path ±1 |
| Dead-end detection | Playwright | Every page must have at least one interactive element below the fold |
| Filter persistence | Playwright | Apply filter > navigate away > navigate back > assert filters preserved |
| KPI drilldown | Playwright | Click every KPI card > assert navigation to filtered list page |
| Error state recovery | Playwright | Mock API error > assert retry button visible > click retry > assert recovery |
| Keyboard navigation | Playwright | Tab through every page > assert all interactive elements reachable |
| Loading state presence | Playwright | Slow network mock > assert skeleton visible before data |
| Empty state presence | Playwright | Empty data mock > assert empty state component visible |
| Context preservation | Playwright | Trigger action from filtered context > assert form pre-fills context values |
| Action adjacency | Playwright + custom | For each actionable table row, measure pixel distance from status to action button |

### E.4 UX Review Checklist for PR Reviews

Every pull request that touches UI must answer these questions in the PR description:

```markdown
## UX Review

### Workflow
- [ ] What business action does this change support?
- [ ] How many clicks does the happy path require? (must be ≤3 for core actions)
- [ ] What is the next action after this workflow completes?
- [ ] Does this change introduce any dead-end screens?

### Context
- [ ] Does this change preserve filter state during navigation?
- [ ] Does this change carry context forward into forms/drawers?
- [ ] Does this change restore scroll position on back-navigation?

### Feedback
- [ ] What loading state is shown during data fetch?
- [ ] What error state is shown on failure?
- [ ] What empty state is shown when there's no data?
- [ ] What success feedback is shown after the action completes?

### Accessibility
- [ ] Can this feature be operated entirely via keyboard?
- [ ] Does this change pass axe-core with 0 violations?
```

---

# APPENDICES

---

## APPENDIX A --- PRIORITY IMPLEMENTATION ROADMAP (UPGRADED)

### Phase 1: MUST FIX NOW + UX LAWS (Weeks 1-3)

1. **Fix RBAC routing** --- role-appropriate landing pages, hide unauthorized nav items (Law 10)
2. **Add loading skeletons** to all pages (QA Definition of Done)
3. **Standardize error states** with retry action (Law 2)
4. **Make all KPI cards clickable drilldowns** (Law 9)
5. **Fix page header banner** to always show correct context (Law 3)
6. **Add visible focus rings** to all interactive elements (WCAG 2.4.7)
7. **Fix date format consistency** (Law 6 --- don't make users re-learn formats)
8. **Add inline confirmation** for all destructive actions (Safety)
9. **Implement CommandPalette** (Ctrl+K) --- single biggest click-economy win (Law 1)
10. **Add NextAction component** after every mutation (Law 2, P9)
11. **Implement filter persistence** via URL query params (Law 5)
12. **Auto-fill timesheet** from assignments by default (Law 6)
13. **Add breadcrumbs with filter-preserving back links** (Law 3, Law 5)

### Phase 2: DESIGN SYSTEM + WORKFLOWS (Weeks 4-8)

1. Implement design tokens in Tailwind config
2. Build core component library (all components from Section 2.D)
3. Build InspectorPanel component for master-detail workflows
4. Build "What Needs You Now" widget for all role dashboards
5. Build EnterpriseTable with sorting, pagination, sticky headers, bulk actions, context navigation
6. Build AsyncSelect for person/project lookups
7. Implement keyboard shortcuts (Section D.4)
8. Build Urgent Anomaly Strip for dashboards
9. Set up Storybook + Playwright visual regression
10. Implement data freshness indicator on all dashboards

### Phase 3: ADVANCED WORKFLOWS (Weeks 9-16+)

1. Build role-specific dashboards (RM, HR, DM, Director, Admin)
2. Build staffing request workflow with candidate matching and inspector panel
3. Build timesheet approval queue with inspector and auto-advance
4. Build exception resolution with embedded context (no navigation needed)
5. Build workload rebalancing with inline allocation adjustment
6. Build budget governance views with burn-rate forecasting
7. Build saved filters and saved views system
8. Build Previous/Next entity navigation on all detail pages
9. Implement light theme token set
10. Build case pipeline visualization (kanban/funnel)

---

## APPENDIX B --- ANTI-PATTERN CATALOG (PRESERVED + UPGRADED)

*All anti-patterns from v1.0 Appendix B are preserved.*

**NEW Anti-Patterns Added:**

| Anti-Pattern | Where Found | Correct Pattern |
|---|---|---|
| Non-clickable KPI cards | PM Dashboard | Every KPI card is a drilldown link (Law 9) |
| Action on different page from decision data | Staffing gaps visible on Dashboard, action on Staffing Requests page | Action button adjacent to the gap indicator (Law 4) |
| Post-action redirect to different page | Creating entity redirects to list | Stay on created entity or show NextAction toast (Law 3) |
| Filter loss on back-navigation | All list pages | Filters encoded in URL, restored on return (Law 5) |
| Modal for simple confirmation | Teams > "Remove" | InlineConfirm component: button transforms to confirm/cancel (Law 1) |
| Manual data pre-fill | Creating assignment from project context doesn't pre-fill project | Context passed via URL params or drawer props (Law 6) |
| No "Next" after action | Approving timesheet returns to blank state | Auto-advance to next pending item + "All done" state (Law 2) |
| Dashboard as data dump | Dashboard shows numbers without thresholds | Every metric includes threshold indicator + delta + drilldown (Section C) |
| Read-only dashboard | Dashboard shows data but no actions | Every dashboard has actions rail + inline CTAs (Section C.5) |

---

## APPENDIX C --- CLICK ECONOMY METRICS (NEW)

Track these metrics as part of product analytics. Target improvements over time.

| Metric | Current Estimate | Target | How to Measure |
|---|---|---|---|
| Average clicks to complete core action (per role) | 5-7 | ≤3 | Playwright automated workflow tests |
| % of KPI cards that are clickable drilldowns | ~0% | 100% | Automated component audit |
| % of pages with command palette coverage | 0% | 100% | Command registry completeness check |
| % of filter states that persist across navigation | 0% | 100% | Automated filter persistence tests |
| % of mutations that show NextAction | 0% | 100% | Automated post-mutation assertion |
| % of error states with recovery action | ~20% | 100% | Automated error state assertion |
| Average time to scan dashboard and identify top action | Unknown | ≤10 seconds | User research / session recording |
| % of approval workflows completable in single screen | ~0% | 100% | Manual QA + Playwright |

---

*This document is the enforceable operating standard for all UI/UX decisions on the Workload Tracking Platform. It supersedes the v1.0 Design System Foundation Package. Every pull request touching UI must comply with the UX Operating Laws (Section A), pass the QA Acceptance Rules (Section E), and fulfill the Definition of Done (Section 8). Every design review must validate against the Dashboard Decision Standard (Section C) and the Click Economy targets (Appendix C). Every new feature must define its Business-Flow Screen Grammar (Section B pattern) before implementation begins.*

*The design system token definitions, component taxonomy, and implementation specifications from v1.0 remain in full force and are incorporated by reference.*
