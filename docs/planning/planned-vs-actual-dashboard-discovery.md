# Planned vs Actual Dashboard Discovery

**Date:** 2026-04-14  
**Goal:** define how to refactor the Planned vs Actual dashboard so Claude Code can rebuild it in the same structural style as the Workload Overview dashboard.

## Executive summary

The current Planned vs Actual page is a reconciliation report disguised as a dashboard. It exposes raw categories and record tables well, but it does not answer the most important operational questions quickly:

- Are assignments and work evidence aligned overall?
- Where is mismatch concentrated?
- What requires action now?
- Is actual effort materially under or over the planned staffing signal?
- Which projects or people are driving the problem?

The Workload Overview dashboard already solves these UX problems with a consistent page grammar:

1. title-bar filters/actions
2. KPI strip
3. one hero chart
4. action-oriented table
5. secondary detail sections

Planned vs Actual should be rebuilt using that same grammar.

## What exists today

### Current page

- [frontend/src/routes/dashboard/PlannedVsActualPage.tsx](/home/drukker/DeliveryCentral/frontend/src/routes/dashboard/PlannedVsActualPage.tsx:1)
- Current structure:
  - title-bar filters
  - four simple metric cards
  - two charts side by side
  - tab bar
  - category-specific table

### Workload Overview reference

- [frontend/src/routes/dashboard/DashboardPage.tsx](/home/drukker/DeliveryCentral/frontend/src/routes/dashboard/DashboardPage.tsx:1)
- Strong layout patterns already established:
  - `kpi-strip`
  - `dashboard-hero`
  - `dash-action-section`
  - compact secondary sections
  - actionable KPI links
  - contextual tooltips via `TipBalloon`

### Available Planned vs Actual data

- [frontend/src/lib/api/planned-vs-actual.ts](/home/drukker/DeliveryCentral/frontend/src/lib/api/planned-vs-actual.ts:1)
- Response shape:
  - `matchedRecords`
  - `assignedButNoEvidence`
  - `evidenceButNoApprovedAssignment`
  - `anomalies`

### Backend implementation

- [src/modules/dashboard/application/planned-vs-actual-query.service.ts](/home/drukker/DeliveryCentral/src/modules/dashboard/application/planned-vs-actual-query.service.ts:1)
- Important implementation detail:
  - matching is based on `personId + projectId`
  - the service returns raw record lists, not dashboard aggregates
  - it already uses efficient precomputed maps and sets internally

## Key discovery findings

### 1. Planned vs Actual is currently optimized for audit, not decision-making

The page leads with record counts and tabbed categories. That is good for analysis after the fact, but weak for triage.

### 2. Workload Overview is the right structural template

The Workload Overview page has the clearest “scan → understand → act” flow in the codebase. Planned vs Actual should match its layout, spacing, and affordance model.

### 3. The best dashboard questions are project- and action-centric

For this page, the real business questions are not “how many matched rows exist?” but:

- What percentage of observed work is reconciled?
- Which projects have the biggest mismatch risk?
- Which people are logging work without assignment coverage?
- Which assignments are generating no evidence?
- Where do managers need to act now?

### 4. The current API can support a first refactor, but a summary shape would improve clarity

Claude Code can produce a good v1 by deriving aggregates client-side from the existing response.  
However, the ideal architecture is to add a summary-oriented API or shared selector layer that returns:

- KPI totals
- grouped-by-project mismatch data
- grouped-by-person mismatch data
- ranked action items

## Recommended layout

Match the **Workload Overview** page layout almost exactly.

### Page structure

1. Title bar filters and actions
2. KPI strip
3. Hero chart
4. “What needs attention now” action section
5. Two secondary analysis sections
6. Detailed reconciliation table at the bottom

### Title bar

Keep the existing filters:

- project filter
- person filter
- `asOf` filter

Add the same style of quick actions used in Workload Overview:

- link to `/assignments`
- link to `/work-evidence`
- link to `/exceptions`

Keep `TipTrigger`.

## KPI recommendations

These KPIs should be the top strip. They should be clickable and use threshold semantics like Workload Overview.

### 1. Match Rate

**Question answered:** How much of observed work is reconciled?

Definition:

- numerator: `matchedRecords.length`
- denominator: `matched + assignedButNoEvidence + evidenceButNoApprovedAssignment`

Display:

- value as percentage
- context label like `X of Y records aligned`

Drill target:

- same page, filtered to matched vs unmatched detail

### 2. Unapproved Work

**Question answered:** How much effort is happening without assignment approval?

Definition:

- count of `evidenceButNoApprovedAssignment`
- ideally also sum of `effortHours`

Display:

- primary value: count
- context: total hours if derived

Drill target:

- `/assignments/new` or filtered reconciliation detail

### 3. Silent Assignments

**Question answered:** Which assignments appear staffed but are producing no evidence?

Definition:

- `assignedButNoEvidence.length`

Display:

- count
- context: highest-risk projects or people count

Drill target:

- `/work-evidence`

### 4. Anomaly Flags

**Question answered:** How many records show explicit anomaly conditions?

Definition:

- `anomalies.length`

Display:

- count
- context: top anomaly type

Drill target:

- anomaly detail table on the same page

### 5. Variance Risk Projects

**Question answered:** How many projects have material mismatch between planned staffing signal and actual evidence?

Definition:

- derive project rollup from the current response
- flag projects with:
  - evidence without assignment
  - assignment without evidence
  - evidence after assignment end

Display:

- count of impacted projects

Drill target:

- filtered project-level detail table

## Chart recommendations

Use **one hero chart** plus one secondary supporting chart.

### Hero chart: Project Reconciliation Coverage

Best module:

- reuse and adapt [frontend/src/components/charts/EvidenceVsAssignmentBars.tsx](/home/drukker/DeliveryCentral/frontend/src/components/charts/EvidenceVsAssignmentBars.tsx:1)

Why:

- it already follows the same chart idiom used elsewhere
- it answers a more actionable business question than the current person-level bar chart
- project-level framing is better for PM/DM triage

Recommended data model:

- group by project
- expected/planned signal:
  - derive from approved/active assignment allocation percentages
  - convert to approximate hours using `standardHoursPerWeek`
- actual signal:
  - sum `effortHours` from matched and unapproved evidence

Business question answered:

- Which projects are materially under-supported or showing unapproved work?

### Secondary chart: Variance Scatter by Person or Project

Best module:

- keep [frontend/src/components/charts/DeviationScatter.tsx](/home/drukker/DeliveryCentral/frontend/src/components/charts/DeviationScatter.tsx:1), but modernize styling and token usage

Why:

- it helps answer whether effort is under or over planned expectation
- it complements the hero chart without duplicating it

Recommended improvement:

- allow switching grouping between person and project
- style with tokens rather than raw colors
- add tooltip context for mismatch category counts

### Do not keep both current charts as equal first-class visuals

The current two-chart row dilutes the page hierarchy. One chart should be dominant.

## Best reusable modules

### Layout and structural modules

- [frontend/src/components/common/PageContainer.tsx](/home/drukker/DeliveryCentral/frontend/src/components/common/PageContainer.tsx:1)
- [frontend/src/components/common/SectionCard.tsx](/home/drukker/DeliveryCentral/frontend/src/components/common/SectionCard.tsx:1)
- `kpi-strip` and `dashboard-hero` patterns from [DashboardPage.tsx](/home/drukker/DeliveryCentral/frontend/src/routes/dashboard/DashboardPage.tsx:1)
- [frontend/src/components/common/TipBalloon.tsx](/home/drukker/DeliveryCentral/frontend/src/components/common/TipBalloon.tsx:1)

### KPI modules

- Prefer the **Workload Overview KPI strip style** over introducing a different card system.
- Optional fallback for smaller secondary stats:
  - [frontend/src/components/dashboard/StatCard.tsx](/home/drukker/DeliveryCentral/frontend/src/components/dashboard/StatCard.tsx:1)

### Action/triage modules

- Prefer [frontend/src/components/common/DataTable.tsx](/home/drukker/DeliveryCentral/frontend/src/components/common/DataTable.tsx:1) for the primary action table.
- Optional inspiration for prioritization:
  - [frontend/src/components/dashboard/WhatNeedsYouNow.tsx](/home/drukker/DeliveryCentral/frontend/src/components/dashboard/WhatNeedsYouNow.tsx:1)

### Status and severity modules

- [frontend/src/components/common/StatusBadge.tsx](/home/drukker/DeliveryCentral/frontend/src/components/common/StatusBadge.tsx:1)

### Chart modules

- Primary:
  - [frontend/src/components/charts/EvidenceVsAssignmentBars.tsx](/home/drukker/DeliveryCentral/frontend/src/components/charts/EvidenceVsAssignmentBars.tsx:1)
- Secondary:
  - [frontend/src/components/charts/DeviationScatter.tsx](/home/drukker/DeliveryCentral/frontend/src/components/charts/DeviationScatter.tsx:1)
- Optional sparkline support:
  - [frontend/src/components/charts/Sparkline.tsx](/home/drukker/DeliveryCentral/frontend/src/components/charts/Sparkline.tsx:1)

## Recommended page sections

### Section 1: KPI strip

Five KPI tiles:

- Match Rate
- Unapproved Work
- Silent Assignments
- Anomaly Flags
- Variance Risk Projects

### Section 2: Hero chart

Project Reconciliation Coverage

### Section 3: Action table

One ranked table answering: “What needs intervention right now?”

Suggested columns:

- Severity
- Category
- Project
- Person or Owner
- Impact
- Hours / variance
- Suggested action
- Link

Suggested categories:

- evidence without approved assignment
- assigned with no evidence
- evidence after assignment end
- high variance project

### Section 4: Secondary analysis cards

Two smaller sections:

- `Top mismatched projects`
- `Top mismatched people`

Each can be compact lists or small tables.

### Section 5: Detailed reconciliation explorer

Keep the bottom-level detailed table, but demote it below the dashboard summary.

Replace the current tab-heavy experience with:

- one filterable table
- category chips or segmented control
- optional expandable rows

## Recommended business logic / selectors

Claude Code should introduce derived selectors instead of computing directly inline in JSX.

Suggested selector outputs:

- `buildPlannedVsActualKpis(response, standardHoursPerWeek)`
- `buildProjectReconciliationRows(response, standardHoursPerWeek)`
- `buildPersonVarianceRows(response, standardHoursPerWeek)`
- `buildPlannedVsActualActionItems(response, standardHoursPerWeek)`

This keeps the page composable and testable.

## Recommended tests

Claude Code should update tests so the page is validated as a dashboard, not just a tabbed report.

Add assertions for:

- KPI strip values
- hero chart presence
- action table presence
- highest-severity items appearing first
- empty state behavior
- project/person filters still functioning

Reference current baseline:

- [frontend/src/routes/dashboard/PlannedVsActualPage.test.tsx](/home/drukker/DeliveryCentral/frontend/src/routes/dashboard/PlannedVsActualPage.test.tsx:1)

## Clear prompt for Claude Code

```text
Refactor the Planned vs Actual dashboard so it behaves like the Workload Overview dashboard in structure, hierarchy, and interaction model, while preserving the existing reconciliation purpose.

Context:
- Current page: frontend/src/routes/dashboard/PlannedVsActualPage.tsx
- Structural reference: frontend/src/routes/dashboard/DashboardPage.tsx
- Data source: frontend/src/lib/api/planned-vs-actual.ts
- Hook: frontend/src/features/dashboard/usePlannedVsActual.ts
- Existing charts: frontend/src/components/charts/PlannedVsActualBars.tsx and frontend/src/components/charts/DeviationScatter.tsx
- Recommended reusable modules:
  - frontend/src/components/common/DataTable.tsx
  - frontend/src/components/common/SectionCard.tsx
  - frontend/src/components/common/StatusBadge.tsx
  - frontend/src/components/common/TipBalloon.tsx
  - frontend/src/components/charts/EvidenceVsAssignmentBars.tsx
  - frontend/src/components/charts/DeviationScatter.tsx

Primary objective:
- Recreate Planned vs Actual as a real dashboard with the same layout grammar as Workload Overview:
  1. title-bar filters/actions
  2. KPI strip
  3. one dominant hero chart
  4. action-oriented ranked table
  5. secondary analysis sections
  6. detailed explorer at the bottom

Business questions the page must answer:
- How much observed work is reconciled to approved assignments?
- Where is work happening without approved assignment coverage?
- Which assignments have no evidence?
- Which projects carry the highest mismatch risk?
- Which people or projects should managers act on first?

Implement these KPI cards in the top strip:
- Match Rate
- Unapproved Work
- Silent Assignments
- Anomaly Flags
- Variance Risk Projects

Dashboard chart strategy:
- Replace the current equal-weight two-chart row with one dominant hero chart and one secondary analytical chart.
- Use a project-level reconciliation coverage chart as the hero. Prefer adapting EvidenceVsAssignmentBars to show planned vs actual hours by project.
- Keep DeviationScatter as a secondary analysis chart, but modernize it to use token-based styling and clearer tooltips.

Data/selector approach:
- Do not leave aggregation logic scattered inline in JSX.
- Create clear derived selector helpers for KPI data, project rollups, person rollups, and ranked action items.
- It is acceptable to derive the first version client-side from the existing planned-vs-actual response.
- If needed, add a small summary-oriented API/helper layer, but do not over-engineer beyond what this page needs.

Layout rules:
- Match Workload Overview spacing, section order, and visual hierarchy.
- Use the existing title bar action pattern.
- Use the same KPI strip idiom from DashboardPage rather than inventing a different card layout.
- Use DataTable for the main action table.
- Keep the page actionable and drill-down friendly.

Interaction rules:
- KPIs should be clickable or clearly drill into relevant filtered detail.
- The action table should be severity-ranked and focused on triage.
- Preserve project/person/asOf filtering.
- Keep detail exploration available, but move it below the executive summary sections.

Testing:
- Update PlannedVsActualPage tests to validate the new dashboard structure:
  - KPI strip renders expected summary values
  - hero chart renders
  - action table renders
  - empty and error states still work
  - filters still affect the result set

Code quality expectations:
- Reuse existing dashboard primitives where possible.
- Follow the tokenized styling system already in place.
- Avoid raw color literals.
- Keep the implementation modular and easy to extend.
```

## Final recommendation

The best implementation is not “make the current page prettier.”  
It is “change the page from a category browser into an operational dashboard, using Workload Overview as the canonical layout template and using project-level mismatch triage as the core story.”
