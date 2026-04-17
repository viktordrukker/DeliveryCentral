# Planned vs. Actual Dashboard — Rework Plan

**Created:** 2026-04-15  
**Status:** Ready for implementation

---

## 1. Problem Statement

The current PvA dashboard answers one narrow question: "Does this week's approved timesheet time match approved assignments?" It cross-references `ProjectAssignment` (APPROVED/ACTIVE) against `TimesheetEntry` (APPROVED week only) for a single ISO week.

### Questions the reworked dashboard must answer

| # | Question | Current gap |
|---|----------|-------------|
| Q1 | Per-project gap between planned hours and submitted timesheets | Backend only looks at APPROVED weeks. No hours-gap metric per project. |
| Q2 | Hours breakdown: submitted, approved, pending submission/approval | Backend filters `status = APPROVED` only. No status breakdown. |
| Q3 | Projects missing staff assignments vs open staffing requests | Backend doesn't query `StaffingRequest`. No join to open requests. |
| Q4 | Departments and resource pools under/over-submitting time | Backend doesn't join to `OrgUnit` or `ResourcePool`. Frontend enrichment is partial. |
| Q5 | Projects with more submitted hours than staffed capacity | No project-level planned-capacity vs total-submitted aggregation. |
| Q6 | Missing timesheets (assigned people with no timesheet at all) | No detection of completely absent timesheets vs drafts. |

### Design constraints

- **Keep the design likeness** — same page grammar (Decision Dashboard), same CSS classes, same component library
- **Change data sets** — richer backend response with new aggregations
- **Change layouts and widget types** — rearrange sections, swap chart types, add new KPI cards

### Key decisions

1. **Multi-week range** — expand from single ISO week to configurable date range (default: last 4 weeks). Single dropdown: "This week", "Last 2 weeks", "Last 4 weeks", "Last 8 weeks", "Custom".
2. **Both org dimensions** — show Department AND Resource Pool breakdowns (toggle within the section).
3. **Missing vs Draft** — a person with a DRAFT timesheet counts as "draft" (in-progress). A person with NO timesheet record at all for a week counts as "missing". No double-counting.

---

## 2. Backend Changes

### 2a. New query parameters

**File:** `src/modules/dashboard/application/contracts/planned-vs-actual.query.ts`

```typescript
export class PlannedVsActualQueryDto {
  @ApiPropertyOptional() public asOf?: string;
  @ApiPropertyOptional() public projectId?: string;
  @ApiPropertyOptional() public personId?: string;
  @ApiPropertyOptional() public weeks?: number;  // NEW — default 4, max 12
}
```

### 2b. Extended query service

**File:** `src/modules/dashboard/application/planned-vs-actual-query.service.ts`

Major changes to `execute()`:

1. **Date window**: compute `windowStart` as `startOfIsoWeek(asOf) - (weeks - 1) * 7 days` and `windowEnd` as `endOfIsoWeek(asOf)`. This covers the requested number of weeks.

2. **Fetch ALL timesheet statuses**: remove the `timesheetWeek: { status: 'APPROVED' }` filter. Instead fetch all entries for the window. Join `timesheetWeek` to get `status` per entry. This gives us DRAFT, SUBMITTED, APPROVED, and REJECTED hours.

3. **Missing person detection**: after fetching assignments (set A of personIds) and timesheet entries (set B of personIds+weekStarts), compute:
   - For each week in the range, for each assigned person: does a `TimesheetWeek` record exist?
   - If no record at all → "missing"
   - If record exists with status DRAFT → counted in draft hours
   - No double-counting: a person is either missing OR has a draft — never both

4. **StaffingRequest query**: for projects in the result set, query:
   ```sql
   StaffingRequest WHERE status IN ('OPEN', 'IN_REVIEW', 'POSTED')
     AND startDate <= windowEnd AND endDate >= windowStart
   ```
   Compute per-project: `openRequests` count, `unfilledHeadcount = SUM(headcountRequired - headcountFulfilled)`.

5. **OrgUnit + ResourcePool joins**: for each person in results, join:
   - `PersonOrgMembership` → `OrgUnit` (get department)
   - `PersonResourcePoolMembership` → `ResourcePool` (get pool)
   
   Aggregate planned vs submitted hours by org unit and by pool.

6. **Project-level rollup**: for each project, aggregate:
   - `plannedHours = SUM(allocationPercent / 100 * standardHoursPerWeek)` across all assignments × weeks
   - `approvedHours`, `submittedHours`, `draftHours` from timesheet entries grouped by week status
   - `variance = totalSubmittedHours - plannedHours`
   - `overSubmitted = totalSubmittedHours > plannedHours`

### 2c. New response shape

**File:** `src/modules/dashboard/application/contracts/planned-vs-actual.dto.ts`

Add new DTO classes alongside (not replacing) existing ones:

```typescript
// ── Timesheet status funnel ──
class TimesheetStatusSummaryDto {
  totalHours: number;
  approvedHours: number;
  submittedHours: number;    // SUBMITTED, not yet approved
  draftHours: number;        // DRAFT, not yet submitted
  rejectedHours: number;
  personCount: number;       // distinct people with any timesheet
  missingPersonCount: number; // assigned people with NO timesheet record at all
  missingPersonIds: string[]; // for drilldown
}

// ── Per-project summary ──
class ProjectPvaSummaryDto {
  projectId: string;
  projectCode: string;
  projectName: string;
  plannedHours: number;
  approvedHours: number;
  submittedHours: number;
  draftHours: number;
  totalActualHours: number;  // approved + submitted + draft
  assignmentCount: number;
  openStaffingRequests: number;
  unfilledHeadcount: number;
  variance: number;          // totalActualHours - plannedHours
  variancePercent: number;
  overSubmitted: boolean;
}

// ── Per-org-unit summary ──
class OrgUnitPvaSummaryDto {
  orgUnitId: string;
  orgUnitName: string;
  personCount: number;
  plannedHours: number;
  submittedHours: number;    // SUBMITTED + APPROVED (committed hours)
  approvedHours: number;
  draftHours: number;
  submissionRate: number;    // (submitted + approved) / planned * 100
  variance: number;
}

// ── Per-resource-pool summary ──
class ResourcePoolPvaSummaryDto {
  poolId: string;
  poolName: string;
  personCount: number;
  plannedHours: number;
  submittedHours: number;
  approvedHours: number;
  draftHours: number;
  submissionRate: number;
  variance: number;
}

// ── Staffing coverage ──
class StaffingCoverageDto {
  projectsFullyStaffed: number;
  projectsPartiallyStaffed: number;
  projectsWithOpenRequests: number;
  totalOpenRequests: number;
  totalUnfilledHeadcount: number;
  unstaffedProjects: UnstaffedProjectDto[];
}

class UnstaffedProjectDto {
  projectId: string;
  projectCode: string;
  projectName: string;
  openRequests: number;
  unfilledHeadcount: number;
  roles: string[];  // what roles are needed
}

// ── Extended top-level response ──
class PlannedVsActualResponseDto {
  asOf: string;
  weekStart: string;               // NEW
  weekEnd: string;                 // NEW
  weeksIncluded: number;           // NEW

  // Existing detail lists (unchanged)
  matchedRecords: MatchedRecordDto[];
  assignedButNoEvidence: AssignedWithoutEvidenceDto[];
  evidenceButNoApprovedAssignment: EvidenceWithoutApprovedAssignmentDto[];
  anomalies: ComparisonAnomalyDto[];

  // NEW aggregations
  timesheetStatusSummary: TimesheetStatusSummaryDto;
  projectSummaries: ProjectPvaSummaryDto[];
  orgUnitSummaries: OrgUnitPvaSummaryDto[];
  resourcePoolSummaries: ResourcePoolPvaSummaryDto[];
  staffingCoverage: StaffingCoverageDto;
}
```

### 2d. Standard hours

The backend needs `standardHoursPerWeek` to convert allocation % → planned hours. Two options:
- **(A)** Read from `PlatformSetting` table in the service (cleaner — single source of truth)
- **(B)** Accept as query param from frontend (current pattern — frontend reads settings separately)

**Decision:** Option A — read from platform settings in the service. This eliminates the possibility of frontend/backend using different values.

---

## 3. Frontend API Types

**File:** `frontend/src/lib/api/planned-vs-actual.ts`

Add TypeScript interfaces mirroring the new DTOs. Keep existing interfaces unchanged. Add `weeks` to the query interface:

```typescript
export interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
  weeks?: number;  // NEW
}
```

---

## 4. Frontend Selectors

**File:** `frontend/src/features/dashboard/planned-vs-actual-selectors.ts`

Most heavy aggregation logic **moves to the backend**. Selectors become thin formatters:

| Selector | What it does | Replaces |
|----------|-------------|----------|
| `buildPvaKpis()` | Reads pre-aggregated fields from response. 6 KPI values. | Current `buildPvaKpis()` — simpler now |
| `buildProjectVarianceRows()` | Sorts `projectSummaries` by absolute variance desc, applies threshold coloring | Current `buildProjectReconciliationRows()` |
| `buildTimesheetFunnelData()` | Maps `projectSummaries` → stacked bar data (draft, submitted, approved segments) | NEW |
| `buildStaffingGapRows()` | Filters `staffingCoverage.unstaffedProjects` | NEW |
| `buildOrgSubmissionRows()` | Sorts `orgUnitSummaries` by submissionRate asc | NEW |
| `buildPoolSubmissionRows()` | Sorts `resourcePoolSummaries` by submissionRate asc | NEW |
| `buildOverSubmittedRows()` | Filters `projectSummaries` where `overSubmitted === true`, sorts by variance desc | NEW |
| Keep: `buildPvaActionItems()` | Same triage logic | Unchanged |
| Keep: `buildVarianceExplorerDimensions()` | Same 3-dimension pivot | Unchanged (data source same) |
| Keep: `buildTopMismatchedProjects()` | Same | Unchanged |
| Keep: `buildTopMismatchedPeople()` | Same | Unchanged |
| Remove: `buildPersonReconciliationRows()` | Unused on the page | Remove dead code |
| Remove: `buildPersonVarianceRows()` | Unused on the page | Remove dead code |
| Remove: `buildVarianceAggregateRows()` | Unused on the page | Remove dead code |

---

## 5. Frontend Page Layout

**File:** `frontend/src/routes/dashboard/PlannedVsActualPage.tsx`

Same page grammar (Decision Dashboard). Same CSS classes. New zones:

### Title bar

Add "Weeks" dropdown alongside existing filters:

```
[Project ▼] [Person ▼] [Weeks: Last 4 weeks ▼] [As-of ▼] [Assignments] [Time Approval] [Projects]
```

Weeks options: `1` (This week), `2`, `4` (default), `8`, `12`.

### KPI strip (6 cards)

```
┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│ Alignment │ Total     │ Pending   │ Staffing  │ Over-     │ Risk      │
│ Rate      │ Submitted │ Pipeline  │ Gaps      │ Submitted │ Projects  │
│ 82%       │ 1,240h    │ 380h      │ 3         │ 2 prj     │ 5         │
│ (prog bar)│ approved  │ draft+sub │ unfilled  │ over plan │ w/ issues │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

| # | KPI | Source | Click action |
|---|-----|--------|-------------|
| 1 | **Alignment Rate** — % of time records with matching assignment | `matchedCount / totalRecords * 100` | Scroll to detail tabs → Matched |
| 2 | **Total Submitted** — total hours across approved + submitted timesheets | `timesheetStatusSummary.approvedHours + submittedHours` | Scroll to Timesheet Pipeline |
| 3 | **Pending Pipeline** — draft + submitted hours not yet approved | `timesheetStatusSummary.draftHours + submittedHours` | Scroll to Timesheet Pipeline |
| 4 | **Staffing Gaps** — total unfilled headcount from open requests | `staffingCoverage.totalUnfilledHeadcount` | Scroll to Staffing Coverage |
| 5 | **Over-Submitted** — count of projects where actual > planned | `projectSummaries.filter(overSubmitted).length` | Scroll to Over-Submitted |
| 6 | **Risk Projects** — projects with any variance > threshold | Same concept as current, from projectSummaries | Scroll to hero chart |

Context line on each card shows secondary stat. Sparkline where meaningful (e.g., alignment rate could show per-week trend if multi-week).

### Hero chart — Project Planned vs Actual

**Keep:** `ReconciliationOverviewChart` (horizontal stacked bar)  
**Change data:** feed from `projectSummaries` instead of current reconciliation rows.

Each bar shows:
- Green segment = approved hours
- Amber segment = submitted (pending approval)
- Grey segment = draft hours
- Blue line overlay = planned hours (allocation-based)
- Red marker if `overSubmitted`

Sort by absolute variance (biggest gaps first). Show top 12, with "Show all" toggle.

### Action table — What Needs Attention

**Keep as-is.** Same ActionDataTable with severity-ranked triage, quick actions (Resolve, Assign), batch actions, filters by severity. Same data source (anomalies, unplanned work, silent assignments).

One addition: add a new category for "Missing Timesheet" items (people with no timesheet at all for a week):
- Severity: **Med**
- Category: "Missing Timesheet"
- Impact: "{name} has no timesheet for week of {date}"
- Suggested action: "Contact employee"
- Href: person detail page

### Secondary analysis — 4 SectionCards in 2×2 grid

**Section 1: Timesheet Pipeline** (top-left)
- Stacked horizontal bar chart (Recharts `BarChart layout="vertical"`)
- One bar per project (top 10 by total hours)
- 3 segments: Draft (grey `var(--color-status-neutral)`), Submitted (amber `var(--color-status-warning)`), Approved (green `var(--color-status-active)`)
- Shows the maturity funnel of time data — directly answers Q2
- At the bottom: summary text: "{missingPersonCount} people have not started their timesheet"
- Click segment → `/timesheets/approval?status={status}&projectId={id}`

**Section 2: Staffing Coverage** (top-right)
- DataTable `variant="compact"`
- Columns: Project (code + name) | Assignments | Open Requests | Unfilled HC | Roles Needed | Action
- Only shows projects with `unfilledHeadcount > 0` or `openStaffingRequests > 0`
- "Create Request" button → `/staffing-requests/new?projectId={id}`
- Answers Q3 directly
- Empty state: "All projects fully staffed"

**Section 3: Dept / Pool Submission Rate** (bottom-left)
- Toggle buttons: [Department] [Resource Pool]
- Horizontal bar chart showing submission rate (%) per org unit or pool
- Threshold coloring: green (>90%), amber (70–90%), red (<70%)
- Each bar labeled with: `{name}: {submissionRate}% ({submittedHours}h / {plannedHours}h)`
- Answers Q4 directly
- Click bar → sets the "Person" filter to people in that dept/pool (or navigates to org page)

**Section 4: Over-Submitted Projects** (bottom-right)
- DataTable `variant="compact"`
- Columns: Project | Planned h | Actual h | Surplus h | Variance % | Status
- Only projects where `overSubmitted === true`
- Variance % colored: amber if 10–25%, red if >25%
- Click row → `/projects/{id}`
- Answers Q5 directly
- Empty state: "No projects exceed planned hours"

### Variance Explorer — keep

Same `VarianceExplorerChart` with 3 dimensions (person, project, department). Add resource pool as a 4th dimension option.

### Detail Tabs — keep

Same tabbed ActionDataTable: Matched, Staffed No Actual, Unplanned Work, Anomalies.

### Data Freshness — add

```html
<div class="data-freshness">
  Showing {weeksIncluded} weeks ending {weekEnd} · Last refreshed {timestamp}
  <button onClick={refetch}>↻ Refresh</button>
</div>
```

---

## 6. Implementation Steps

| # | Task | Layer | Files changed | Verify |
|---|------|-------|---------------|--------|
| 1 | Add `weeks` query param to DTO | BE | `planned-vs-actual.query.ts` | `tsc --noEmit` |
| 2 | Add new response DTOs (TimesheetStatusSummary, ProjectPvaSummary, OrgUnitPvaSummary, ResourcePoolPvaSummary, StaffingCoverage) | BE | `planned-vs-actual.dto.ts` | `tsc --noEmit` |
| 3 | Rework query service: multi-week window, all timesheet statuses, staffing request join, org/pool aggregation, missing person detection, project rollup, read standardHoursPerWeek from platform settings | BE | `planned-vs-actual-query.service.ts` | `tsc --noEmit` + manual API test |
| 4 | Update frontend API types and query function | FE | `frontend/src/lib/api/planned-vs-actual.ts` | Frontend `tsc` |
| 5 | Update hook to pass `weeks` param | FE | `frontend/src/features/dashboard/usePlannedVsActual.ts` | Frontend `tsc` |
| 6 | Rework selectors: new thin selectors, remove dead code | FE | `frontend/src/features/dashboard/planned-vs-actual-selectors.ts` | Frontend tests |
| 7 | Rework KPI strip (6 cards from new response) | FE | `PlannedVsActualPage.tsx` | Visual |
| 8 | Rework hero chart data source (projectSummaries → ReconciliationOverviewChart) | FE | `PlannedVsActualPage.tsx` | Visual |
| 9 | Add Weeks filter to title bar | FE | `PlannedVsActualPage.tsx` | Visual |
| 10 | Add Timesheet Pipeline section (stacked bar chart) | FE | `PlannedVsActualPage.tsx` | Visual |
| 11 | Add Staffing Coverage section (compact table) | FE | `PlannedVsActualPage.tsx` | Visual |
| 12 | Add Dept/Pool Submission Rate section (bar chart + toggle) | FE | `PlannedVsActualPage.tsx` | Visual |
| 13 | Add Over-Submitted Projects section (compact table) | FE | `PlannedVsActualPage.tsx` | Visual |
| 14 | Add "Missing Timesheet" items to action table | FE | `planned-vs-actual-selectors.ts`, `PlannedVsActualPage.tsx` | Visual |
| 15 | Add resource pool dimension to Variance Explorer | FE | `PlannedVsActualPage.tsx`, `planned-vs-actual-selectors.ts` | Visual |
| 16 | Add data freshness bar | FE | `PlannedVsActualPage.tsx` | Visual |
| 17 | Update test file for new response shape and selectors | FE | `PlannedVsActualPage.test.tsx`, selector tests | All tests pass |
| 18 | Verify seed has DRAFT/SUBMITTED timesheets and open staffing requests with gaps | SEED | `prisma/seed.ts` or `seeds/realistic-dataset.ts` | Seed runs, page shows data |

---

## 7. Data Flow Summary

```
User selects: Project ▼  Person ▼  Weeks: 4 ▼  As-of ▼
                │
                ▼
Frontend: fetchPlannedVsActual({ projectId, personId, weeks: 4, asOf })
                │
                ▼
GET /api/dashboard/workload/planned-vs-actual?weeks=4&asOf=2026-04-15
                │
                ▼
Backend: PlannedVsActualQueryService.execute()
  ├─ Compute window: 4 ISO weeks ending on week of asOf
  ├─ Query ProjectAssignment (APPROVED/ACTIVE, overlapping window)
  ├─ Query TimesheetEntry (ALL statuses, within window)
  │   └─ Join TimesheetWeek for status
  ├─ Query StaffingRequest (OPEN/IN_REVIEW/POSTED, overlapping window)
  ├─ Query PersonOrgMembership → OrgUnit (for each person)
  ├─ Query PersonResourcePoolMembership → ResourcePool (for each person)
  ├─ Read PlatformSetting (standardHoursPerWeek)
  │
  ├─ Cross-reference assignments × entries → matched, gaps, anomalies
  ├─ Detect missing: assigned persons with NO TimesheetWeek for a week
  ├─ Aggregate: per-project summary (planned/approved/submitted/draft/variance)
  ├─ Aggregate: per-orgUnit summary (hours by status, submission rate)
  ├─ Aggregate: per-resourcePool summary (same)
  ├─ Aggregate: staffing coverage (open requests, unfilled headcount)
  │
  └─ Return PlannedVsActualResponseV2
                │
                ▼
Frontend selectors: thin formatters over pre-aggregated data
                │
                ▼
Page renders: KPI strip → Hero chart → Action table → 2×2 grid → Explorer → Detail tabs
```

---

## 8. Risk Notes

- **Performance**: multi-week range × org/pool joins increases query cost. Mitigate with:
  - Index on `timesheet_entries(date)` already exists
  - Batch person lookups (single `findMany` with `id IN [...]`)
  - Consider 60s cache on the endpoint (already exists for workload/trend)
- **Backward compatibility**: existing response fields are preserved. New fields are additive. Frontend old code won't break if deployed incrementally.
- **Seed data**: the realistic dataset already has DRAFT and SUBMITTED timesheets (weeks 0–4 are non-APPROVED). Need to verify staffing requests have unfilled headcount — may need to add 2–3 OPEN requests with `headcountFulfilled < headcountRequired`.
