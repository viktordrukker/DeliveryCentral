# UX Contract — `<RouteName>`

**Route:** `/path`
**Component:** [`<file>`](../../../frontend/src/routes/.../File.tsx)
**Grammar:** _(one of: Decision Dashboard / List-Detail / Detail Surface / Create-Edit Form / Operational Queue / Analysis / Admin / Auth)_
**Last verified:** YYYY-MM-DD against `<git-sha>`

---

## 1. Route & Roles

- **Roles allowed** (from [`route-manifest.ts`](../../../frontend/src/app/route-manifest.ts)): `role-a`, `role-b`, ...
- **Auth required:** yes / no
- **Self-scope:** _(if applicable; e.g., employees see only their own data)_
- **Redirects:** unauthenticated → `/login`; unauthorized → `/dashboard` (or as defined)

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| _e.g._ Row click on Projects table | `/projects/:id` | Preserves URL filters via Breadcrumb sessionStorage |
| _e.g._ "Create" button (top-right) | `/projects/new` | Visible only to `project_manager`, `director` |
| _e.g._ KPI card "At Risk: 12" | `/projects?health=at_risk` | URL filter applied |

## 3. Form validation

| Field | Rule | Error display | Server rejection |
|---|---|---|---|
| _If page has no forms, write_ `_None._` | | | |

## 4. Confirmation prompts

| Action | Title | Body | Reason required | Danger styled |
|---|---|---|---|---|
| _e.g._ Delete project | "Delete project?" | "This cannot be undone." | yes | yes |

## 5. Toast / notification triggers

| Trigger | Type | Copy |
|---|---|---|
| _e.g._ Project created | success | "Project created" |
| _e.g._ Save failed (server 500) | error | "Could not save. Try again." |

## 6. Filters / sort / pagination / saved views

| Control | URL param | Default | Restore on back | Notes |
|---|---|---|---|---|
| _e.g._ Status filter | `status` | (none) | yes | Multi-select; `status=active,paused` |
| _e.g._ Page size | `pageSize` | `25` | yes | Options: 10, 25, 50, 100 |

## 7. Empty / loading / error states

| State | Trigger | Copy | CTA |
|---|---|---|---|
| Empty | No matching rows after filter | "No projects match your filters" | "Clear filters" → resets to default |
| Loading | First fetch | _skeleton_ | _none_ |
| Error | API 5xx or network | "Couldn't load projects" | "Retry" → refetch |

## 8. Side effects

| Interaction | API call | Audit | Notification | Analytics |
|---|---|---|---|---|
| _e.g._ Delete project | `DELETE /api/projects/:id` | `project.deleted` event | broadcast to `delivery_manager` | `project_deleted` |

---

## Mapped regression spec

[`e2e/ux-regression/<route>.spec.ts`](../../../e2e/ux-regression/<route>.spec.ts) — every row above is one or more `test()` blocks in this file.
