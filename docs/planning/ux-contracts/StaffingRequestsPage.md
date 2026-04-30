# UX Contract — `StaffingRequestsPage`

**Route:** `/staffing-requests` ([`route-manifest.ts:158`](../../../frontend/src/app/route-manifest.ts#L158))
**Component:** [`StaffingRequestsPage.tsx`](../../../frontend/src/routes/staffing-requests/StaffingRequestsPage.tsx)
**Grammar:** Operational Queue (Grammar 5)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`. Create gated by `STAFFING_REQUEST_ROLES`.

## 2. Click paths

| Trigger | Destination |
|---|---|
| Status dropdown (title bar) | client-side filter on `derivedStatus`; default "All statuses" |
| Export | CSV (projectName/projectId, role, priority, allocationPercent, startDate, endDate, status, headcountFulfilled, headcountRequired, createdAt) |
| Copy Link | clipboard |
| Create button | `/staffing-requests/new` (gated) |
| TipTrigger | toggle tips |
| Row click | `/staffing-requests/{id}` |
| "Go" link | `/staffing-requests/{id}` (stopPropagation) |
| Pagination prev/next/page-size | local state — NOT URL-persisted |

## 3. Form validation

| Filter | Rule |
|---|---|
| Status dropdown | one of `''`, `Open`, `In progress`, `Filled`, `Closed`, `Cancelled` |

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._

## 6. Filters / sort / pagination / saved views

| Param | Where | Default |
|---|---|---|
| `status` | URL (`useFilterParams`) | `''` |
| `page`, `pageSize` | local state (`pageSize=25`) | not URL-persisted |

Filtering is **client-side**: `filteredRequests = filters.status ? requests.filter(r => r.derivedStatus === filters.status) : requests`. API called once on mount with no params.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | skeleton table |
| Error | dynamic |
| Empty | title "No requests"; description "No staffing requests match the current filter." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /staffing-requests` (no params) |

No re-fetch on filter change.

## 9. Other notable behaviors

- **Headcount** rendered "fulfilled/required" with TipBalloon: "Shows fulfilled vs required headcount for this request."
- **Priority labels:** `HIGH → 'High'`, `LOW → 'Low'`, `MEDIUM → 'Medium'`, `URGENT → 'Urgent'`.
- **Pagination UI:** "1–25 of N requests".

---

## Mapped regression spec

[`e2e/ux-regression/StaffingRequestsPage.spec.ts`](../../../e2e/ux-regression/StaffingRequestsPage.spec.ts)
