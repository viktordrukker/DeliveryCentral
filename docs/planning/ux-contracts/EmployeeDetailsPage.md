# UX Contract — `EmployeeDetailsPlaceholderPage`

**Route:** `/people/:id` ([`route-manifest.ts:131`](../../../frontend/src/app/route-manifest.ts#L131))
**Component:** [`EmployeeDetailsPlaceholderPage.tsx`](../../../frontend/src/routes/people/EmployeeDetailsPlaceholderPage.tsx)
**Grammar:** Detail Surface (Grammar 3) with TabBar
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`. Mutating actions gated:
  - `canManageLifecycle` = `HR_DIRECTOR_ADMIN_ROLES` (deactivate / terminate)
  - `canView360` = `THREESIXTY_REVIEW_ROLES` (360 tab visibility)
  - `canEditSkills` = `SKILL_EDIT_ROLES` (skills edit)
- **Self-scope:** none.
- **Drilldown breadcrumb label:** set to person `displayName` on mount.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| "Deactivate employee" | ConfirmDialog → `POST /org/people/{id}/deactivate` | `canManageLifecycle` only; disabled when status is INACTIVE/TERMINATED |
| "Terminate employee" | ConfirmDialog → toggles terminate-form (with optional reason + date) → `POST /org/people/{id}/terminate` | `canManageLifecycle` only; disabled when status is TERMINATED |
| Tab "Overview" | `?tab=overview` | |
| Tab "360 View" | `?tab=360` | `canView360` only |
| Tab "Skills" | `?tab=skills` | edit when `canEditSkills` |
| Tab "History" | `?tab=history` | |
| Line Manager link | `/people/{currentLineManager.id}` | |
| "End relationship" button | confirms then `POST /reporting-lines/{id}/terminate` | |

## 3. Form validation

| Form | Rule |
|---|---|
| Terminate-form Reason | optional |
| Terminate-form Date | optional |
| End-relationship End-date | required ("End date is required.") |

## 4. Confirmation prompts

| Action | Message | Danger |
|---|---|---|
| Deactivate employee | "Deactivate this employee? They will lose access to the system but their history is preserved." | yes |
| Terminate employee | "Terminate this employee? This action is permanent and cannot be reversed." | yes |

## 5. Toast / notification triggers

_None._ Success/error use `success-banner` and `<ErrorState>` inline.

## 6. Filters / sort / pagination / saved views

- `tab` URL param, default `'overview'`. Valid: `overview`, `360`, `skills`, `history`.
- No localStorage.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading employee details..." |
| Not found | "No employee was found for {id}." |
| API error | dynamic |
| Deactivate success | "Employee {name} deactivated." |
| Terminate success | "Employee {name} terminated." |
| History loading | "Loading history..." |
| History error | dynamic |
| No active assignments | "This person has no active assignments at this time." |
| No workload | "Workload calculations are not yet available for this employee." |
| No history | "Future allocations, org history, and employee activity history are not yet available." |
| Reporting line loading | "Loading manager options..." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /org/people/{id}` |
| Deactivate | `POST /org/people/{id}/deactivate` |
| Terminate | `POST /org/people/{id}/terminate` (optional `{reason?, terminatedAt?}`) |
| End reporting line | `POST /reporting-lines/{id}/terminate` |
| History tab activate | `GET /audit?targetEntityType=Person&targetEntityId={id}&pageSize=100` |

## 9. Other notable behaviors

- **`ORG_DATA_CHANGED_EVENT`** dispatched after deactivate / terminate to refresh org-chart consumers.
- **Local `lifecycleStatus`** state overrides server status post-mutation to avoid flicker.
- **Disabled state matrix:** Deactivate disabled when status ∈ {INACTIVE, TERMINATED} or `isDeactivating`. Terminate disabled when status === TERMINATED or `isTerminating`.
- **Business-audit** fetched on demand (when History tab becomes active) — not on mount.

---

## Mapped regression spec

[`e2e/ux-regression/EmployeeDetailsPage.spec.ts`](../../../e2e/ux-regression/EmployeeDetailsPage.spec.ts)
