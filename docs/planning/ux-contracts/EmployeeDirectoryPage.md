# UX Contract — `EmployeeDirectoryPage`

**Route:** `/people` ([`route-manifest.ts:126`](../../../frontend/src/app/route-manifest.ts#L126))
**Component:** [`EmployeeDirectoryPage.tsx`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx)
**Grammar:** List-Detail Workflow (Grammar 2)
**Last verified:** 2026-04-27 against `7c495e6`

The only known consumer of the shared `<FilterBar>` component today.

---

## 1. Route & Roles

- `/people` — `ALL_ROLES`
- `/people/:id` — `ALL_ROLES`
- `/people/new` — `HR_ADMIN_ROLES` = `hr_manager`, `admin`
- `/admin/people/new` — `HR_ADMIN_ROLES`
- `/admin/people/import` — `HR_DIRECTOR_ADMIN_ROLES` = `hr_manager`, `director`, `admin`
- **Page-level capability gate:** `canManagePeople` = principal has any of `PEOPLE_MANAGE_ROLES` = `hr_manager`, `resource_manager`, `director`, `admin` ([`route-manifest.ts:91`](../../../frontend/src/app/route-manifest.ts#L91), [`EmployeeDirectoryPage.tsx:26`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx#L26)). Controls visibility of Export and Create.
- **Self-scope:** none.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| **Export XLSX** (title bar) | _no nav_ — downloads file | Visible only when `canManagePeople`; disabled while `state.isLoading`; visible only when `state.data.total > 0 \|\| visibleItems.length > 0` |
| **Create employee** (title bar) | `/admin/people/new` | Visible only when `canManagePeople` |
| **Copy link** (title bar) | clipboard copy `window.location.href` | inline "Copied ✓" |
| **TipTrigger** (title bar) | toggles global tips | |
| Search input | _no nav_ — updates `filters.search` URL param | Client-side filter |
| Department ID input | _no nav_ — updates `filters.departmentId` URL param | Server-side via API query |
| Resource Pool dropdown | _no nav_ — updates `filters.resourcePoolId` | Server-side via API query |
| Status dropdown | _no nav_ — updates `filters.lifecycleStatus` AND resets `page` to 1 | Client-side filter |
| **Previous (←)** button | _no nav_ — `setPage(page - 1)` | Disabled when `page <= 1` |
| **Next (→)** button | _no nav_ — `setPage(page + 1)` | Disabled when `page * pageSize >= state.data.total` |
| Table row click | `/people/${item.id}` ([`EmployeeDirectoryPage.tsx:181`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx#L181)) | |

## 3. Form validation

_None._ All filter inputs are uncontrolled at submit time (immediate-apply); the Department ID is a free-text input with no constraints.

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._ Errors render in `<ErrorState>`; copy-link inline.

## 6. Filters / sort / pagination / saved views

### URL search params (`useFilterParams` defaults)

| Param | Default | Sent to API | Notes |
|---|---|---|---|
| `search` | `''` | _client-side_ | Substring match across `displayName`, `currentOrgUnit.name`, `currentLineManager.displayName`, `primaryEmail` ([`useEmployeeDirectory.ts:79-86`](../../../frontend/src/features/people/useEmployeeDirectory.ts#L79-L86)); case-insensitive, trimmed |
| `departmentId` | `''` | yes | Free-text input |
| `resourcePoolId` | `''` | yes | Dropdown value |
| `lifecycleStatus` | `'ACTIVE'` | _client-side_ | Options: `ACTIVE`, `INACTIVE`, `TERMINATED`, `ALL`. Changing this resets `page` to 1. |

### Pagination

| Control | Default | Notes |
|---|---|---|
| `page` | `1` (in-component `useState`, not URL) | Reset to 1 only on `lifecycleStatus` change ([`EmployeeDirectoryPage.tsx:125`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx#L125)); other filter changes do NOT reset page |
| `pageSize` | `25` (hardcoded `defaultPageSize` constant) | Not user-adjustable on this page |

> **Contract gap noted:** `page` is local state — not URL-persisted — meaning back-navigation from a detail page does not restore the page number. Migration may URL-persist; document any change.

### Saved views & column presets

- No saved-filter dropdown.
- Column visibility persisted at `dc:col-vis:people` and `dc:col-order:people`. **No saved column presets** for this page (different from StaffingDesk / Assignments) ([`EmployeeDirectoryTable.tsx:29`](../../../frontend/src/components/people/EmployeeDirectoryTable.tsx#L29)).

### `<FilterBar>` composition

Filter inputs are wrapped in the shared `FilterBar` component ([`FilterBar.tsx:7-17`](../../../frontend/src/components/common/FilterBar.tsx#L7-L17)) with no `actions` slot used. Each filter is a `<label className="field"><span className="field__label">…</span><input/select className="field__control" /></label>`. Order: Search, Department ID, Resource Pool, Status.

## 7. Empty / loading / error states

| State | Trigger | Copy / UI |
|---|---|---|
| Loading | `state.isLoading` | `<LoadingState variant="skeleton" skeletonType="table" />` |
| Error | `state.error` | `<ErrorState description={state.error} />` |
| Empty (no data at all) | `state.data.total === 0 && !error && !loading` | `<EmptyState title="No employees available" description="The employee directory is available, but there are no people to display yet." />` (no action) |
| Empty (table-level, post-filter) | Server returned `items.length > 0` but client-side filter eliminated all | `<EmptyState title="No directory results" description="No employees matched the current query." />` ([`EmployeeDirectoryTable.tsx:77-82`](../../../frontend/src/components/people/EmployeeDirectoryTable.tsx#L77-L82)) |
| Results meta | always shown when `state.data.total > 0` | `"Showing N of M people"` or `"Showing N filtered people"` if `visibleItems.length < data.items.length`; TipBalloon arrow="left": "Use filters above to narrow by department, pool, or status." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `fetchResourcePools()` to populate dropdown ([`EmployeeDirectoryPage.tsx:32-34`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx#L32-L34)) |
| Mount, page change, departmentId change, resourcePoolId change | `fetchPersonDirectory({ departmentId, page, pageSize, resourcePoolId })` ([`useEmployeeDirectory.ts:34-39`](../../../frontend/src/features/people/useEmployeeDirectory.ts#L34-L39)) |
| `search` / `lifecycleStatus` change | _no API_ — client-side post-filter |
| Export | _no API_ — XLSX assembled from `visibleItems` |

## 9. Other notable behaviors

- **Column set** ([`EmployeeDirectoryTable.tsx:15-23`](../../../frontend/src/components/people/EmployeeDirectoryTable.tsx#L15-L23)): name (Person Name), orgUnit (Org Unit), lineManager (Line Manager), dottedLine (Dotted-Line Summary), assignmentCount (Active Assignments), status (Status).
- **Org Unit** renders `currentOrgUnit?.name ?? "Not assigned"`.
- **Line Manager** renders `currentLineManager?.displayName ?? "No line manager"`.
- **Dotted-Line Summary** joins `dottedLineManagers` displayNames with `, `; "None" if empty.
- **Status** rendered via `<StatusBadge size="small" uppercase />`.
- **Export columns:** Email, Line Manager, Name, Org Unit ([`EmployeeDirectoryPage.tsx:55-60`](../../../frontend/src/routes/people/EmployeeDirectoryPage.tsx#L55-L60)). Filename `people-directory_YYYY-MM-DD.xlsx`. Includes `visibleItems` only (post-filter).
- **Search** placeholder: "Search by person, org unit, manager, or email".
- **Department ID** placeholder: "Filter by department".
- **Resource Pool** first option: "All pools" (`value=""`).
- **Status** options: `ACTIVE`, `INACTIVE`, `TERMINATED`, `ALL`.
- **Bulk import** is at `/admin/people/import`, not from this page.

---

## Mapped regression spec

[`e2e/ux-regression/EmployeeDirectoryPage.spec.ts`](../../../e2e/ux-regression/EmployeeDirectoryPage.spec.ts)
