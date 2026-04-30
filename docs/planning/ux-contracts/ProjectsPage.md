# UX Contract — `ProjectsPage`

**Route:** `/projects` ([`route-manifest.ts:132`](../../../frontend/src/app/route-manifest.ts#L132))
**Component:** [`ProjectsPage.tsx`](../../../frontend/src/routes/projects/ProjectsPage.tsx)
**Grammar:** List-Detail Workflow (Grammar 2)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Roles allowed:** `ALL_ROLES` ([`route-manifest.ts:132`](../../../frontend/src/app/route-manifest.ts#L132))
- **Create gate:** "Create project" link visible only when `principal` has any of `PROJECT_CREATE_ROLES` (`project_manager`, `delivery_manager`, `director`, `admin`) — [`route-manifest.ts:74`](../../../frontend/src/app/route-manifest.ts#L74), checked by `canCreateProject` at [`ProjectsPage.tsx:38`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L38).
- **Self-scope:** none.
- **Auth-required redirects:** handled by app-level route guard, not this component.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| Title-bar **search input** | _no nav_ — updates `filters.search` URL param ([`ProjectsPage.tsx:45-50`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L45-L50)) | Client-side filter on name / code / status |
| Title-bar **engagement** dropdown | _no nav_ — updates `filters.engagement` ([`ProjectsPage.tsx:52-62`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L52-L62)) | Options: All models, T&M, Fixed Price, Managed Service, Internal |
| Title-bar **priority** dropdown | _no nav_ — updates `filters.priority` ([`ProjectsPage.tsx:63-73`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L63-L73)) | Options: All priorities, Critical, High, Medium, Low |
| Title-bar **Export XLSX** button | _no nav_ — downloads file ([`ProjectsPage.tsx:75-94`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L75-L94)) | Visible only when `hasItems`; disabled while `state.isLoading`; columns Name / Project Code / Status / Assignment Count / Health Score |
| Title-bar **Create project** link | `/projects/new` | Visible only when `canCreateProject` |
| Title-bar **Copy link** button | _no nav_ — copies `window.location.href` to clipboard ([`CopyLinkButton.tsx:16-21`](../../../frontend/src/components/common/CopyLinkButton.tsx#L16-L21)) | Inline confirmation "Copied ✓" for 1500ms |
| Title-bar **TipTrigger "?"** button | _no nav_ — toggles global `showAll` for `TipBalloon` instances |
| **Empty state "Create Project"** button | `/projects/new` | Renders only when `sortedItems.length === 0 && !error && !loading` ([`ProjectsPage.tsx:264`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L264)) |
| **Table row click** (any cell) | `/projects/${item.id}` ([`ProjectsPage.tsx:275`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L275)) | Navigates to project detail |
| **"Go" link** in last column | `/projects/${item.id}` | `event.stopPropagation()` prevents the row click ([`ProjectsPage.tsx:242-249`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L242-L249)) |
| **"Health" column header button** | _no nav_ — cycles sort: `null → 'desc' → 'asc' → null` ([`ProjectsPage.tsx:141-143`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L141-L143)) | Indicator: `↕`, `▼`, `▲`. Stored as `sort` URL param. |
| **"Project Name" column header** TipBalloon | _no nav_ | Tooltip: "Click a row to view full project details and health breakdown." |
| **"External Links" column header** TipBalloon | _no nav_ | Tooltip: "Shows linked systems like JIRA; filter by external system in the title bar." |

## 3. Form validation

_None._ This page has no `<form>` elements. Filter inputs are uncontrolled at the component level; defaults derived from URL.

## 4. Confirmation prompts

_None._ This page has no destructive actions.

## 5. Toast / notification triggers

_None._ Errors render in `<ErrorState>`; copy-link confirmation is inline ("Copied ✓"), not a toast.

## 6. Filters / sort / pagination / saved views

| Control | URL param | Default | Restore on back | Notes |
|---|---|---|---|---|
| Search | `search` | `''` | yes | Filters client-side over name/code/status ([`useProjectRegistry.ts:67-81`](../../../frontend/src/features/projects/useProjectRegistry.ts#L67-L81)) |
| Engagement model | `engagement` | `''` | yes | Client-side filter |
| Priority | `priority` | `''` | yes | Client-side filter |
| Health sort | `sort` | `''` (unsorted) | yes | Values: `''`, `'asc'`, `'desc'` |
| Source (back-end) | `source` | _(absent)_ | yes | When present, sent to the registry endpoint as a query param |

**Pagination:** none. Full registry is fetched in one call. The `useProjectRegistry` hook accepts optional `page` / `pageSize` but `ProjectsPage` does not pass them ([`ProjectsPage.tsx:33-36`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L33-L36)).

**Saved views:** none. The URL itself is the saved view — `Copy link` shares it.

## 7. Empty / loading / error states

| State | Trigger | Copy / UI | CTA |
|---|---|---|---|
| Loading | `state.isLoading` | `<LoadingState variant="skeleton" skeletonType="table" />` (5 placeholder rows) | none |
| Error | `state.error` truthy | `<ErrorState>` — title "Something went wrong"; description = `state.error` | "Retry" (no-op — `onRetry` not set) and "Go to Dashboard" → `/` |
| Empty | `sortedItems.length === 0` && no error / loading | Title: "No projects yet". Description: "The internal project registry has no matching projects for the current filters." | "Create Project" → `/projects/new` |

## 8. Side effects

| Interaction | API call | Notes |
|---|---|---|
| Mount | `GET /api/projects?source=…` (only when `source` URL param present) ([`useProjectRegistry.ts:36-40`](../../../frontend/src/features/projects/useProjectRegistry.ts#L36-L40)) | Search and other filters are NOT sent server-side. |
| Visible items change | `GET /api/projects/{id}/health` for every visible row in parallel via `Promise.allSettled` ([`ProjectsPage.tsx:109-125`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L109-L125)) | Failed health requests silently dropped from `healthMap` |
| Source param change | refetch project directory | |
| Copy link | `navigator.clipboard.writeText(window.location.href)` | No API |
| Export | _no API_ — XLSX assembled from current `sortedItems` + `healthMap` | |

## 9. Other notable behaviors

- **Filter application order** ([`ProjectsPage.tsx:127-139`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L127-L139), [`useProjectRegistry.ts:67-81`](../../../frontend/src/features/projects/useProjectRegistry.ts#L67-L81)): registry fetch by `source` → client-side `search` → client-side `engagement` → client-side `priority` → optional health sort.
- **Title-bar action memoization** depends on `[filters.search, filters.engagement, filters.priority, hasItems, state.isLoading, state.visibleItems, healthMap, canCreateProject, setFilters]` — comment notes 20d-04 stabilization.
- **Health badge:** displays score 0–100 in a colored circle. Grey dash when score not yet loaded. Grade map: `green → 'active'` (green), `yellow → 'warning'` (amber), `red → 'danger'` (red) ([`ProjectHealthBadge.tsx:14-18`](../../../frontend/src/components/common/ProjectHealthBadge.tsx#L14-L18)).
- **Priority badge:** `CRITICAL → danger`, `HIGH → warning`, `LOW → neutral`, else `info` ([`ProjectsPage.tsx:181-185`](../../../frontend/src/routes/projects/ProjectsPage.tsx#L181-L185)). Em-dash if null.
- **Project status:** rendered with humanized labels via `PROJECT_STATUS_LABELS` ([`labels.ts:26-31`](../../../frontend/src/lib/labels.ts#L26-L31)). Statuses: `ACTIVE / CANCELLED / CLOSED / DRAFT`.
- **Client name** rendered muted; em-dash if null. **External Links** rendered as comma-separated provider names (e.g., "JIRA (3), GitHub (1)"); em-dash if count is 0.
- **Race-condition guards:** both `useProjectRegistry` and the health-fetch effect use `let active = true; return () => { active = false; }` cleanup.
- **Page container testId:** `"project-registry-page"`. Table caption: `"Project registry"`. Table `minWidth={700}`, `variant="compact"`.
- **getRowKey:** `item.id`.

---

## Mapped regression spec

[`e2e/ux-regression/ProjectsPage.spec.ts`](../../../e2e/ux-regression/ProjectsPage.spec.ts)
