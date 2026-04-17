# Phase 18 — Canonical Page Grammars

**Created:** 2026-04-14  
**Source:** `docs/planning/UX_OPERATING_SYSTEM_v2.md`, codebase analysis

Every page redesigned in Phase 18 must conform to one of these grammars. Deviations require explicit justification.

---

## Grammar 1: Decision Dashboard

**UX Operating System ref:** Section 2 — Dashboard Design Principles  
**Structural zones (in order):**

1. **Title bar** — page title, filters/actions, `TipTrigger`
2. **KPI strip** — 4–6 clickable metric tiles using `kpi-strip` class; each links to a relevant drill-down
3. **Hero chart** — one dominant visualization answering the page's primary question; use `dashboard-hero` class
4. **Action section** — "What Needs Attention" ranked table using `DataTable` + `dash-action-section` class
5. **Secondary analysis** — 1–2 `SectionCard` panels with compact tables or secondary charts
6. **Data freshness** — last-updated timestamp + refresh action

**Routes using this grammar:**
`/`, `/dashboard/planned-vs-actual`, `/dashboard/employee`, `/dashboard/project-manager`, `/dashboard/resource-manager`, `/dashboard/hr`, `/dashboard/delivery-manager`, `/dashboard/director`, `/projects/:id/dashboard`, `/teams/:id/dashboard`

---

## Grammar 2: List-Detail Workflow

**UX Operating System ref:** Section 3 — List Pages  
**Structural zones:**

1. **Title bar** — page title, title-bar actions (create button, export, `TipTrigger`)
2. **Filter bar** — `FilterBar` with URL-persisted search params (UX Law 5)
3. **Data table** — `DataTable` with role-appropriate columns, click-to-detail, status indicators via `StatusBadge`
4. **Pagination** — bottom pagination controls
5. **Empty state** — `EmptyState` with forward action (UX Law 2)

**Routes using this grammar:**
`/people`, `/teams`, `/projects`, `/assignments`, `/resource-pools`, `/work-evidence`, `/leave`, `/staffing-requests`, `/notifications`

---

## Grammar 3: Detail Surface

**UX Operating System ref:** Section 4 — Detail Pages  
**Structural zones:**

1. **Page header** — entity name, status badge, breadcrumb back to list
2. **Tab bar** — if needed, using `TabBar` component
3. **Summary section** — key facts in `SectionCard` at a glance
4. **Action buttons** — lifecycle actions adjacent to entity data (UX Law 4: Action-Data Adjacency)
5. **Related data** — assignments, evidence, history, linked entities
6. **Audit timeline** — `AuditTimeline` for entity history

**Routes using this grammar:**
`/people/:id`, `/projects/:id`, `/assignments/:id`, `/resource-pools/:id`, `/staffing-requests/:id`, `/cases/:id`, `/org/managers/:id/scope`

---

## Grammar 4: Create/Edit Form

**UX Operating System ref:** Section 5 — Forms  
**Structural zones:**

1. **Page header** — clear action title (e.g., "Create Project", not just "New")
2. **Form sections** — grouped fields in `SectionCard`s with pre-filled defaults (UX Law 6)
3. **Validation** — inline field errors, not just toast
4. **Submit bar** — primary + secondary actions (Submit + Cancel)
5. **Post-submit** — redirect to created entity or stay in context (UX Law 3)

**Routes using this grammar:**
`/projects/new`, `/assignments/new`, `/assignments/bulk`, `/cases/new`, `/staffing-requests/new`, `/admin/people/new`, `/people/new`, `/admin/people/import`, `/timesheets`, `/settings/account`

---

## Grammar 5: Operational Queue

**UX Operating System ref:** Section 6 — Queue & Triage Surfaces  
**Structural zones:**

1. **Title bar** — queue name, count, quick filters
2. **Priority sort** — severity/urgency ranked by default
3. **Data table** — `DataTable` with inline context columns, status indicators
4. **Inline actions** — resolve/suppress/escalate buttons per row (UX Law 4)
5. **Detail panel** — expandable or side-panel for context without navigation

**Routes using this grammar:**
`/exceptions`, `/timesheets/approval`, `/cases`, `/staffing-requests`, `/workload`, `/workload/planning`, `/staffing-board`

---

## Grammar 6: Analysis Surface

**UX Operating System ref:** Section 7 — Reports & Analytics  
**Structural zones:**

1. **Title bar** — report name, date range controls
2. **KPI summary** — top-line aggregates
3. **Primary chart** — dominant visualization
4. **Detail table** — drill-down data
5. **Export** — XLSX/CSV download affordance

**Routes using this grammar:**
`/reports/time`, `/reports/capitalisation`, `/reports/export`, `/reports/utilization`, `/reports/builder`

---

## Grammar 7: Admin Control Surface

**UX Operating System ref:** Section 8 — Admin & Configuration  
**Structural zones:**

1. **Section cards** — grouped configuration areas
2. **Safe edits** — explicit save/apply, confirmation for destructive actions (`ConfirmDialog`)
3. **Audit awareness** — show last-modified, operator attribution
4. **Status indicators** — connection health, sync status via `StatusBadge`

**Routes using this grammar:**
`/admin`, `/admin/dictionaries`, `/admin/audit`, `/admin/notifications`, `/admin/integrations`, `/admin/monitoring`, `/admin/settings`, `/admin/webhooks`, `/admin/hris`, `/admin/access-policies`, `/metadata-admin`, `/integrations`

---

## Grammar 8: Auth Form

**Structural zones:**
1. **Centered card** — brand, form, clear CTA
2. **Error handling** — inline validation, clear error messages
3. **Next-step guidance** — link to forgot-password, signup, etc.

**Routes:** `/login`, `/forgot-password`, `/reset-password`, `/auth/2fa-setup`
