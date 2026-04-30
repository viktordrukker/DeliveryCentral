# UX Contract — `ExceptionsPage`

**Route:** `/exceptions` ([`route-manifest.ts:128`](../../../frontend/src/app/route-manifest.ts#L128))
**Component:** [`ExceptionsPage.tsx`](../../../frontend/src/routes/exceptions/ExceptionsPage.tsx)
**Grammar:** Operational Queue (Grammar 5)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `EXCEPTIONS_ROLES` = `project_manager`, `resource_manager`, `hr_manager`, `delivery_manager`, `director`, `admin`.
- **Self-scope:** none.

## 2. Click paths

| Trigger | Destination |
|---|---|
| "Open planned vs actual" link | `/dashboard/planned-vs-actual` |
| TipTrigger | toggle global tips |
| Row click | sets `?selected={id}`; opens detail panel |
| **"Resolve"** inline button (OPEN only) | switches cell to inline note + Confirm/Cancel; on Confirm → `POST /exceptions/{id}/resolve` |
| **"Suppress"** inline button (OPEN only) | inline note + Confirm/Cancel; Confirm → `POST /exceptions/{id}/suppress` |
| Inline "Cancel" | revert to idle, clear note |
| "Refresh" button | `state.reload()`; disabled while `isLoading` |
| Detail panel: Person link | `/people/{personId}` |
| Detail panel: Project link | `/projects/{projectId}` |
| Detail panel: Assignment link | `/assignments/{assignmentId}` |
| Detail panel: "Review closure controls" | `/projects/{projectId}` (only when category = `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`) |

## 3. Form validation

| Form | Rule |
|---|---|
| Status filter | dropdown, default `'OPEN'` |
| Category filter | dropdown, default `''` |
| Target Entity ID filter | trimmed before query |
| As-of filter | `datetime-local` → ISO |
| Resolve/Suppress note | non-empty trim — Confirm disabled when blank |

## 4. Confirmation prompts

_None._ Resolve/Suppress is an inline confirmation (note required), no secondary modal.

## 5. Toast / notification triggers

- `toast.success('Exception resolved')`
- `toast.success('Exception suppressed')`

## 6. Filters / sort / pagination / saved views

| URL param | Default | Notes |
|---|---|---|
| `asOf` | `new Date().toISOString()` | |
| `category` | `''` | ExceptionCategory enum |
| `provider` | `''` | `'m365' \| 'radius' \| ''` |
| `statusFilter` | `'OPEN'` | also: `RESOLVED`, `SUPPRESSED` |
| `targetEntityId` | `''` | |
| `selected` | _(absent)_ | exception ID for detail panel |

- Empty filters (or default) are removed from URL.
- `?selected` cleared on filter change (except `asOf`).
- Pagination: none. API fetched with `limit: 100`.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading exceptions..." (skeleton table) |
| Error | dynamic `<ErrorState description={state.error} />` |
| No data | "No exception data" |
| Empty queue | title "No exceptions in view"; description "No exception items match the current queue filters." |
| Detail-panel: no selection | title "No exception selected"; description "Select an exception item to review its related context and follow-up links." |
| Detail-panel: loading | "Loading exception detail..." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount, filter change | `GET /exceptions?asOf&category&limit=100&provider&status&targetEntityId` |
| Selection | `GET /exceptions/{id}` |
| Resolve | `POST /exceptions/{id}/resolve` `{ resolution, resolvedBy }` |
| Suppress | `POST /exceptions/{id}/suppress` `{ reason, suppressedBy }` |
| After action | `state.reload()` (refetch queue) |

## 9. Other notable behaviors

- **Auth-token card** rendered only if no token stored.
- **Derived context JSON** displayed in detail panel.
- **Data freshness** "Updated X minutes ago" + manual Refresh.

---

## Mapped regression spec

[`e2e/ux-regression/ExceptionsPage.spec.ts`](../../../e2e/ux-regression/ExceptionsPage.spec.ts)
