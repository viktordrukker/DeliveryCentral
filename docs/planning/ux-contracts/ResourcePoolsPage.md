# UX Contract — `ResourcePoolsPage`

**Route:** `/resource-pools` ([`route-manifest.ts:142`](../../../frontend/src/app/route-manifest.ts#L142))
**Component:** [`ResourcePoolsPage.tsx`](../../../frontend/src/routes/resource-pools/ResourcePoolsPage.tsx)
**Grammar:** List-Detail Workflow (Grammar 2) — list with inline create form
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `RESOURCE_POOL_ROLES` = `resource_manager`, `director`, `admin`.
- **Mutating gate:** `canManage` = `RM_MANAGE_ROLES` (`resource_manager`, `admin`) — stricter than route gate.

## 2. Click paths

| Trigger | Behavior |
|---|---|
| "Create pool" toggle (canManage) | `setShowCreate(!showCreate)`; resets form |
| "Cancel" | `setShowCreate(false)` |
| Create-form submit | `state.createPool()` → `POST /resource-pools` |
| Pool row click | `window.location.assign('/resource-pools/{poolId}')` |
| "Go" link | navigate to `/resource-pools/{poolId}` |
| Export button | XLSX (code, name, description, memberCount) of filtered pools |
| Search input | sets `search` (client-side filter on name/code) |

## 3. Form validation

| Field | Rule |
|---|---|
| Code | required non-empty trim ("Code is required.") |
| Name | required non-empty trim ("Name is required.") |
| Description | optional |

`aria-invalid` toggled. Errors clear on field change.

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._ Success rendered as `form-success` paragraph; errors via `<ErrorState>`.

## 6. Filters / sort / pagination / saved views

- `search` is local state (case-insensitive `name` or `code` match). No URL params, no localStorage, no pagination.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading resource pools..." (skeleton table) |
| Error (list) | dynamic (when `!showCreate`) |
| Error (create form) | dynamic (when `showCreate`) |
| Empty | title "No pools"; description "No resource pools match the current filter." Action: Create Pool (managers only) |
| Success message | inline form-success paragraph |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /resource-pools`, `GET /person-directory?page=1&pageSize=200` |
| Create pool | `POST /resource-pools` |
| Add member | `POST /resource-pools/{poolId}/members` `{ personId }` |
| Remove member | `DELETE /resource-pools/{poolId}/members/{personId}` |

## 9. Other notable behaviors

- **`isSubmitting`** disables submit during creation.
- **Form auto-resets** on success.
- **Member count** rendered as table column.

---

## Mapped regression spec

[`e2e/ux-regression/ResourcePoolsPage.spec.ts`](../../../e2e/ux-regression/ResourcePoolsPage.spec.ts)
