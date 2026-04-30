# UX Contract — `TimeManagementPage`

**Route:** `/time-management` ([`route-manifest.ts:148`](../../../frontend/src/app/route-manifest.ts#L148))
**Component:** [`TimeManagementPage.tsx`](../../../frontend/src/routes/time-management/TimeManagementPage.tsx)
**Grammar:** Operational Queue (Grammar 5)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `TIMESHEET_MANAGER_ROLES` = `project_manager`, `resource_manager`, `hr_manager`, `delivery_manager`, `director`, `admin`.
- **Self-scope:** none — manager sees entire org's monthly approval queue.

## 2. Click paths

| Trigger | Behavior |
|---|---|
| KPI Pending | `setTab('queue')` |
| KPI Gap Days | `setTab('compliance')` |
| KPI Overtime | `setTab('overtime')` |
| KPI Leave Requests | `setTab('calendar')` |
| Person name (queue row) | `/people/{personId}` |
| **Approve** button (queue row) | `handleApprove()` → API |
| **Reject** button (queue row) | `setRejectTarget(item)` → opens reject modal |
| Select All Pending | check all pending in set |
| **Approve Selected** | `handleBulkApprove()` (filters items in SUBMITTED or PENDING) |
| Compliance row | `/my-time?person={personId}` |
| Overtime row | `/people/{personId}` |
| Reject modal "Cancel" | `setRejectTarget(null)` |
| Reject modal "Reject" | `confirmReject(finalReason)` |
| Prev / Next month | adjust `month`/`year` state |

## 3. Form validation

| Field | Rule |
|---|---|
| Reject reason category | required (selectedReason truthy) |
| Reject "Additional notes" | required non-blank when category is `OTHER` |

## 4. Confirmation prompts

_None._ Reject modal is the confirmation surface (custom-built, not `<ConfirmDialog>`).

## 5. Toast / notification triggers

- `toast.success("Approved {personName}'s {type}")`
- `toast.error('Approval failed')`
- `toast.success("Rejected {personName}'s {type}")`
- `toast.error('Rejection failed')`
- `toast.success("Approved {count} of {items.length} items")`

## 6. Filters / sort / pagination / saved views

- `month` / `year` state, default current UTC month/year.
- `tab` state: `'queue' | 'calendar' | 'compliance' | 'overtime'`.
- No URL persistence today, no localStorage. Bulk-selection set is in-memory.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading time management..." (skeleton page) |
| Error | dynamic |
| Empty queue | title "Queue empty"; description "No pending approvals for this month." |
| Empty calendar | title "No leave"; description "No team members have approved leave this month." |
| Empty compliance | title "No data"; description "No timesheet data for this month." |
| Empty overtime | title "No overtime"; description "No overtime recorded in the current period." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount, month/year change | `GET /time-management/queue?month={YYYY-MM}`, `GET /time-management/team-calendar?month={YYYY-MM}`, `GET /time-management/compliance?month={YYYY-MM}` |
| Mount | `GET /metadata/dictionaries/42222222-0000-0000-0000-000000000201` (rejection reasons; falls back to hardcoded defaults) |
| Approve timesheet | `POST /timesheets/{id}/approve` |
| Reject timesheet | `POST /timesheets/{id}/reject` `{ reason }` |
| Approve leave | `POST /leave-requests/{id}/approve` |
| Reject leave | `POST /leave-requests/{id}/reject` |
| Overtime tab | `useOvertimeSummary` hook with `weeks=4` |

## 9. Other notable behaviors

- **Final reject reason** = `selectedLabel + " — " + customNote` (when both present).
- **Leave icon legend** (single-letter): V=ANNUAL, S=SICK, O=OT_OFF, P=PERSONAL, M=PARENTAL, B=BEREAVEMENT, T=STUDY.
- **Bulk approve** filters items by status (SUBMITTED or PENDING only).

---

## Mapped regression spec

[`e2e/ux-regression/TimeManagementPage.spec.ts`](../../../e2e/ux-regression/TimeManagementPage.spec.ts)
