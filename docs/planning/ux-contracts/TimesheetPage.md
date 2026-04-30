# UX Contract — `TimesheetPage`

**Route:** `/timesheets` ([`route-manifest.ts:149`](../../../frontend/src/app/route-manifest.ts#L149))
**Component:** [`TimesheetPage.tsx`](../../../frontend/src/routes/timesheets/TimesheetPage.tsx)
**Grammar:** Form-heavy weekly grid (Create/Edit Form, Grammar 4 variant)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`.
- **Self-scope:** **REQUIRED** — page returns error message if `principal?.personId` is falsy ("Personal timesheets require a person identity. Use the 'View as' feature to view another user's timesheet.").

## 2. Click paths

| Trigger | Destination / Behavior |
|---|---|
| "Prev" / "Next" week | `navigateWeek(±1)` → updates `weekStart` URL param |
| "Copy last week" | opens copy popover; disabled when `isReadOnly` |
| Copy popover "Copy with hours" | `copyLastWeek(true)` — copies project rows + hour entries (mapped day-of-week) |
| Copy popover "Copy projects only" | `copyLastWeek(false)` — copies projects, hours = 0 |
| Copy popover "Cancel" | closes popover |
| "Submit" / "Submit for Approval" | `POST /timesheets/my/{weekStart}/submit`; disabled when `week?.status !== 'DRAFT'` |
| "Refresh from Assignments" | `autoPopulateFromAssignments()` — adds rows for APPROVED+ACTIVE assignments overlapping week |
| "+ Add Row" | opens add-project modal |
| Modal "Add" | save 0-hour entry on day 0; focuses first cell |
| Modal "Cancel" | close modal |
| Cell input | local edit; clears cell error |
| Cell blur | debounced 500ms `PUT /timesheets/my/entries` |
| Cell keyboard | Arrow=navigate; Enter=blur+down; Escape=revert; Tab=default |
| Weekend toggle | toggle `showWeekend` (Sat/Sun columns) |
| Description popover Save | upserts entry with description |
| Description popover Cancel | close popover |

## 3. Form validation

| Field | Rule |
|---|---|
| Cell hours | `type=number`, `min=0`, `max=24`, `step=0.5`; `parseFloat \|\| 0`; empty → delete entry |
| Add-project modal | `selectedProjectId` required (Add disabled otherwise) |
| Description popover | textarea; no length limit; no validation on save |

## 4. Confirmation prompts

_None._ Submit is direct. Copy popover is a chooser, not a confirm.

## 5. Toast / notification triggers

- `toast.info('No active assignments found for this week.')`
- `toast.success('Added ${addedCount} project row${plural} from assignments.')`
- `toast.info('All assigned projects are already in the timesheet.')`
- `toast.error('Failed to load assignments. Please try again.')`
- `toast.success('Timesheet submitted successfully')`
- `toast.error(err.message ?? 'Failed to submit.')`
- `toast.success('Copied projects and hours from last week')` / `toast.success('Copied projects from last week')` (depending on `withHours`)

## 6. Filters / sort / pagination / saved views

| Control | Where | Default |
|---|---|---|
| `weekStart` | URL param | derived as ISO week start of today |
| `showWeekend` | local state | hidden initially |

Rows ordered by active assignment IDs and add order. No localStorage.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Page loading | "Loading timesheet..." (skeleton table) |
| Page error | dynamic |
| No person ID | "Personal timesheets require a person identity. Use the 'View as' feature to view another user's timesheet." |
| No projects | "No projects added. Click 'Add Row' to begin." |
| Add-project modal — empty list | "No additional assigned projects available." |
| Copy popover loading | "Loading..." |
| Copy popover empty | "Previous week is empty" |
| Cell error | red 10px text below cell |
| Saving indicator | "Saving…" / "Saved ✓" / "Save failed" |
| Read-only notice | shown when status ∈ {APPROVED, REJECTED}, including rejection reason if present |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount, week change | `GET /timesheets/my?weekStart={iso}` |
| Cell blur (debounced 500ms) | `PUT /timesheets/my/entries` body `{weekStart, projectId, date, hours, capex?, description?}` |
| Submit | `POST /timesheets/my/{weekStart}/submit` |
| Auto-populate | `GET /assignments?personId&status=APPROVED` and `?status=ACTIVE` |
| Mount | `GET /project-registry` to build project name map (errors silently ignored) |

## 9. Other notable behaviors

- **Auto-fill** runs once per week if status is DRAFT, entries empty, and `autoFillRanRef.current !== weekStart`.
- **Day total** color thresholds: red >10h, yellow >8h, gray =0.
- **Grand total** color: red >50h, green 35–45h, yellow else.
- **Row locking** when `weekStatus ∈ {SUBMITTED, APPROVED}` → cells disabled.
- **Status icon per row:** ✓ green / ⏳ yellow / ✕ red / ● gray (from `getStatusIcon()`).
- **Capex per project** state tracked but UI not in current render path.
- **`cellRefs`** map keyed `${rowIdx}-${dayIdx}`; new project focuses first cell after add.
- **Escape key** reverts to last-saved server value.

---

## Mapped regression spec

[`e2e/ux-regression/TimesheetPage.spec.ts`](../../../e2e/ux-regression/TimesheetPage.spec.ts)
