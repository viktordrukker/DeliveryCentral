# UX Contract — `PlannedVsActualPage`

**Route:** `/dashboard/planned-vs-actual` ([`route-manifest.ts:113`](../../../frontend/src/app/route-manifest.ts#L113))
**Component:** [`PlannedVsActualPage.tsx`](../../../frontend/src/routes/dashboard/PlannedVsActualPage.tsx)
**Grammar:** Decision Dashboard (Grammar 1)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `MANAGEMENT_ROLES` = `hr_manager`, `project_manager`, `resource_manager`, `delivery_manager`, `director`, `admin`.

## 2. Click paths

| Trigger | Behavior |
|---|---|
| KPI Alignment Rate | `setDetailTab('matched')` + scroll to `#detail-explorer` |
| KPI Total Submitted | scroll to `#pipeline-section` |
| KPI Pending Pipeline | scroll to `#pipeline-section` |
| KPI Staffing Gaps | scroll to `#staffing-section` |
| KPI Over-Submitted | scroll to `#oversub-section` |
| KPI Overtime | scroll to `#overtime-section` |
| Approval Queue "Resolve" | `openAssignModal()` or `nav('/assignments')` or `nav('/people/{personId}')` |
| Approval Queue "Assign" | `openAssignModal()` |
| "Batch Assign" | prefills batch items |
| Severity filter (All/Critical/High/Med) | local state filter |
| Project row (pipeline) | `/projects/{projectId}` |
| Staffing row | `/staffing-requests?projectId={projectId}` |
| Org submission toggle | `setOrgDim('department' \| 'pool')` |
| Over-submitted row | `/projects/{projectId}` |
| Overtime dimension toggle | `setOtDim('person'/'project'/'department'/'pool')` |
| Overtime person row | `/people/{personId}` |
| Overtime project row | `/projects/{projectId}` |
| Top-mismatched project / person row | `/projects/{projectId}` / `/people/{personId}` |
| Detail tabs | matched / noEvidence / noAssignment / anomalies |
| Matched "View" | `/assignments/{assignmentId}` |
| NoEvidence "Review Assignment" | `/assignments?personId={personId}` |
| NoAssignment "Create Assignment" | opens modal |
| Anomalies "Resolve" | opens modal |
| Title bar links | `/assignments`, `/time-management`, `/projects`, `/reports/time` |
| "Refresh" footer | `refetch()` |
| CreateAssignment modal success | clears modal + `refetch()` |
| BatchAssign modal success | clears + `refetch()` |

## 3. Form validation

_None_ at the page level (modals own theirs).

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

- `toast.success('Assignment created — the time variance view will refresh after approval')`
- `toast.success('Created {createdCount} of {totalCount} assignments')`
- `toast.warning('{failedCount} failed — check for conflicts')`

## 6. Filters / sort / pagination / saved views

| Selector | State | Default |
|---|---|---|
| `projectId`, `personId` | local | empty |
| `weeks` | local (`WEEK_OPTIONS`) | 4 |
| `asOf` | local | current ISO |
| `detailTab` | `'matched' \| 'noEvidence' \| 'noAssignment' \| 'anomalies'` | `'matched'` |
| `actionSeverityFilter` | local | `''` |
| `orgDim` | `'department' \| 'pool'` | `'department'` |
| `pipelineView` | `'chart' \| 'table'` | `'chart'` |
| `otDim` | `'person' \| 'project' \| 'department' \| 'pool'` | `'person'` |

No URL params; no localStorage.

## 7. Empty / loading / error states

Many `<EmptyState>`s — listed verbatim:
- "All clear" / "No issues found." (action table)
- "No data" / "No planned vs actual data." (hero)
- "No data" / "No timesheet data for the period." (pipeline)
- "All staffed" / "All projects are fully staffed." (staffing)
- "No data" / "No submission data for this dimension." (org submission)
- "All within plan" / "No projects exceed planned hours." (over-submitted)
- "All clear" / "No mismatched projects" (top projects)
- "All clear" / "No mismatched people" (top people)
- "Empty" / "No matched records." (detail matched)
- "Empty" / "No staffed records are missing approved time." (detail noEvidence)
- "Empty" / "No unplanned work." (detail noAssignment)
- "Empty" / "No anomalies." (detail anomalies)
- "Fully reconciled" success state when `alignmentRate === 100 && anomalyCount === 0`

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /project-registry`, `GET /platform-settings`, `GET /person-directory?page=1&pageSize=500` |
| Mount, filters change | `POST /planned-vs-actual` `{ asOf, weeks, personId, projectId }` |
| Mount, filters change | `GET /overtime-summary?weeks={weeks}&asOf={asOf}` |

## 9. Other notable behaviors

- **standardHoursPerWeek** read from platform settings → variance calculations.
- **Multiple memoized derivations**: `kpis`, `heroData`, `pipelineRows`, `actionItems`, `topProjects`, `topPeople`, `explorerDimensions`.
- **Reconciliation chart** drills to `/projects/{id}`.
- **Data freshness** shows weeks included and week end date.

---

## Mapped regression spec

[`e2e/ux-regression/PlannedVsActualPage.spec.ts`](../../../e2e/ux-regression/PlannedVsActualPage.spec.ts)
