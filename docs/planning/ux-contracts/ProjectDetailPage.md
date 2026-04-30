# UX Contract — `ProjectDetailPage`

**Route:** `/projects/:id` ([`route-manifest.ts:134`](../../../frontend/src/app/route-manifest.ts#L134))
**Component:** [`ProjectDetailPage.tsx`](../../../frontend/src/routes/projects/ProjectDetailPage.tsx)
**Grammar:** Detail Surface (Grammar 3) with TabBar
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`. Mutating actions are gated by `canManage` (`PROJECT_CREATE_ROLES` = `project_manager`, `delivery_manager`, `director`, `admin`).
- **Self-scope:** none.
- **Auth-required redirects:** handled by app-level guard.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| **Staffing request** button | `/staffing-requests/new?projectId={id}` | `canManage` only |
| **Quick assign** button | `/assignments/new?projectId={id}` | `canManage` only |
| KPI card "Status" | `/projects/{id}?tab=radiator` | |
| KPI card "Active Staff" | `/projects/{id}?tab=team` | |
| KPI card "Fill Rate" | `/projects/{id}?tab=team` | conditional on `staffingSummary.totalPlanned > 0` |
| KPI card "Overall RAG" | `/projects/{id}?tab=radiator` | conditional on `computedRag` |
| KPI card "Days Remaining" | `/projects/{id}?tab=team` | Color thresholds: ≤7d danger, ≤30d warning |
| Tab click | sets `?tab={id}` | Tabs: `radiator`, `milestones`, `change-requests`, `risks`, `team`, `budget`, `lifecycle` |
| Legacy redirect | `?tab=status` and `?tab=report` map to `radiator` | |

### Tab-specific (`radiator`, `milestones`)
| Trigger | Behavior |
|---|---|
| RadiatorTab "Refresh" | `POST /projects/{id}/radiator/refresh`, toasts |
| RadiatorTab "Export PDF" | client-side render → toast on success/fail |
| RadiatorTab "Export PPTX" | client-side render → toast on success/fail |
| MilestonesTab "Create" | `POST /projects/{id}/milestones`, toasts |
| MilestonesTab "Delete" | ConfirmDialog → `DELETE /projects/{id}/milestones/{milestoneId}` |
| MilestonesTab edit | `PATCH /projects/{id}/milestones/{milestoneId}` |
| RadiatorTab "Confirm close" (LifecycleTab) | ConfirmDialog → `POST /projects/{id}/close` |
| RadiatorTab "Apply override" | ConfirmDialog (requires reason) → `POST /projects/{id}/close-override` |

## 3. Form validation

| Form / Input | Rule |
|---|---|
| MilestonesTab create | `name`, `plannedDate` required (toast.error if missing) |
| RadiatorTab close override | `overrideReason` non-empty trim ("Override reason is required.") |
| RadiatorTab edit project | name / description optional |

## 4. Confirmation prompts

| Action | Title / Message | Reason | Danger |
|---|---|---|---|
| Delete milestone | `Delete milestone "{name}"? This cannot be undone.` | no | implicit (style not formalized today) |
| Confirm close project | "Close this project? History is preserved and workspend summary will be generated." | no | yes |
| Apply close override | "Apply the closure override? This closes the project despite blocking conditions." | yes | yes |

## 5. Toast / notification triggers

- `toast.success('Radiator refreshed')`
- `toast.error('Refresh failed')`
- `toast.success('PDF exported')` / `toast.error('Failed to export PDF')`
- `toast.success('PPTX exported')` / `toast.error('Failed to export PPTX')`
- `toast.error('Failed to load milestones')`
- `toast.error('Name and planned date are required')`
- `toast.success('Milestone created')` / `toast.error('Failed to create milestone')`
- `toast.success('Milestone updated')` / `toast.error('Failed to update milestone')`
- `toast.success('Milestone deleted')` / `toast.error('Failed to delete milestone')`

## 6. Filters / sort / pagination / saved views

- `tab` URL param, default `'radiator'`. Legacy: `status` and `report` redirect.
- RadiatorTab `selectedWeek` (in-memory) for time-travel snapshot.
- No localStorage. No pagination at the orchestrator level.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Page loading | "Loading project..." |
| Not found | "No project found for {id}." |
| Error | dynamic (from API) |
| RadiatorTab loading radar | "Loading radar…" |
| RadiatorTab no radar data | "No radar data yet." |
| RadiatorTab loading status | "Loading radiator…" |
| RadiatorTab no status data | "No radiator data yet." |
| MilestonesTab loading | "Loading milestones…" |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /projects/{id}` |
| RadiatorTab mount | `GET /projects/{id}/radiator`, `GET /projects/{id}/radiator/history?weeks=12`, `GET /projects/{id}/health`, `GET /projects/{id}/budget/dashboard`, `GET /org-config` |
| Time-travel | `GET /projects/{id}/radiator/snapshot?week={iso-date}` |
| Refresh | `POST /projects/{id}/radiator/refresh` |
| MilestonesTab mount | `GET /projects/{id}/milestones` |
| Milestone CUD | `POST/PATCH/DELETE /projects/{id}/milestones[/{milestoneId}]` |
| Activate | `POST /projects/{id}/activate` |
| Close | `POST /projects/{id}/close` |
| Close override | `POST /projects/{id}/close-override` |
| Edit project | `PATCH /projects/{id}` |
| LifecycleTab | `GET /audit?targetEntityType=Project&targetEntityId={id}&pageSize=200` |

## 9. Other notable behaviors

- **Last-loaded project cache** in `lastProjectRef` prevents tab unmount during reload.
- **KPI strip conditional render:** Fill Rate only when `staffingSummary.totalPlanned > 0`; Overall RAG only when `computedRag` loaded.
- **RadiatorTab role gating:** lifecycle controls (activate/close/override) only on LifecycleTab when `canManageProject === true`.
- **isSubmitting** flags prevent concurrent submissions on every form.
- **Drilldown label** set to project name on mount.

---

## Mapped regression spec

[`e2e/ux-regression/ProjectDetailPage.spec.ts`](../../../e2e/ux-regression/ProjectDetailPage.spec.ts)
