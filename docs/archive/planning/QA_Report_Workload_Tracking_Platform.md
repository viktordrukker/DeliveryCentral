> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# QA Report — Workload Tracking Platform

**Date:** April 2026
**Environment:** `http://localhost:5173` · React + Vite · `SEED_PROFILE=phase2`
**Scope:** 4-phase sweep — Auth/RBAC, Core Workflows, Responsiveness, Role switching

---

## Severity Summary

| Severity | Count |
|---|---|
| 🔴 CRITICAL | 4 |
| 🟠 HIGH | 9 |
| 🟡 MEDIUM | 10 |
| 🔵 LOW | 2 |
| 🟢 UX | 6 |
| **Total (Phase 2–4 detailed)** | **31** |
| Phase 1 (summarised below) | 38 |
| **Grand total** | **~65** |

---

## Test Credentials

| Role | Email | Password |
|---|---|---|
| admin | admin@deliverycentral.local | DeliveryCentral@Admin1 |
| director | noah.bennett@example.com | DirectorPass1! |
| hr_manager | diana.walsh@example.com | HrManagerPass1! |
| resource_manager | sophia.kim@example.com | ResourceMgrPass1! |
| project_manager | lucas.reed@example.com | ProjectMgrPass1! |
| delivery_manager | carlos.vega@example.com | DeliveryMgrPass1! |
| employee | ethan.brooks@example.com | EmployeePass1! |
| dual-role (RM+HR) | emma.garcia@example.com | DualRolePass1! |

---

## Phase 1 Summary (38 findings — previous session)

| Area | Count | Sample findings |
|---|---|---|
| Authentication & Login | 6 | Login error duplication, focus management, spinner misalignment, missing hover state on Back to Login |
| Director / HR / RM Dashboards | 8 | Director KPI cards not loading, date filter producing no results, chart tooltip overflow, HR missing headcount data |
| Projects | 9 | Status badge inconsistency, name overflow on cards, missing empty-state CTA, inconsistent date formats |
| Assignments | 8 | Deadline accepts negative values, textarea resizes horizontally, title overflow, status update failure (BUG-008), UUID in PM field (BUG-019) |
| Work Evidence | 4 | Future dates accepted, negative hours, no success feedback, duplicate toast on rapid submit |
| Admin Panel | 3 | resource_manager missing from roles (BUG-028), no confirmation on destructive actions, password-reset not sending email |

---

## Detailed Findings (Phases 2–4)

---

### 🔴 CRITICAL

---

#### BUG-054 — Employee can view any other employee's personal dashboard
- **Route:** `/dashboard/employee/:id`
- **Roles affected:** employee
- **Description:** Authenticated employees can navigate to `/dashboard/employee/<any-UUID>` and view that person's full dashboard — assignments, workload stats, work evidence, project memberships. No ownership check exists on client or server.
- **Impact:** Complete breach of personal data confidentiality. GDPR violation risk.
- **Steps to reproduce:**
  1. Log in as `ethan.brooks@example.com`
  2. Note your own dashboard URL (e.g. `/dashboard/employee/0000…0005`)
  3. Replace the UUID with any other person's UUID
  4. Observe full dashboard data renders with no access-denied response
- **Fix:** Add server-side ownership check: compare requested ID against JWT `sub`. On the frontend, redirect to 403 if IDs don't match.

---

#### BUG-056 — Employee can access `/assignments/new`
- **Route:** `/assignments/new`
- **Roles affected:** employee
- **Description:** Navigating directly to `/assignments/new` as an employee renders the full creation form. Submitting it creates a real assignment record.
- **Impact:** Privilege escalation via direct URL. Employees create unauthorised assignments.
- **Steps to reproduce:**
  1. Log in as employee
  2. Type `/assignments/new` in the address bar
  3. Form renders; fill minimal fields and submit — record is created
- **Fix:** Wrap route in a role guard permitting only pm, dm, rm, hr, director, admin. Redirect others to Access Denied.

---

#### BUG-058 — Employee can access `/projects/new`
- **Route:** `/projects/new`
- **Roles affected:** employee
- **Description:** Same unguarded-route defect as BUG-056 for project creation.
- **Impact:** Employees create unauthorised project records.
- **Steps to reproduce:**
  1. Log in as employee
  2. Navigate to `/projects/new`
  3. Form renders and can be submitted
- **Fix:** Apply role guard — project_manager, delivery_manager and above only.

---

#### BUG-064 — App completely unusable below 900 px viewport
- **Route:** All routes — global layout
- **Roles affected:** All
- **Description:** Below the 900 px CSS breakpoint, the sidebar expands to 100% viewport width, pushing all main content off-screen. No collapse control is available.
- **Impact:** Zero usability on mobile, tablet, or small laptop screens. Fails WCAG 1.4.10 Reflow.
- **Steps to reproduce:**
  1. Open app in any browser
  2. Set viewport to ≤ 899 px (DevTools responsive mode)
  3. Sidebar fills entire screen; main content inaccessible
- **Fix:** Implement hamburger-toggle sidebar below 900 px. Hidden by default on mobile; overlay only when toggled.

---

### 🟠 HIGH

---

#### BUG-008 — Assignment status never persists (core workflow broken)
- **Route:** `/assignments/:id`
- **Roles affected:** project_manager, delivery_manager, resource_manager
- **Description:** Changing assignment status via the UI appears to succeed, but refreshing the page reverts the status to the original value. The PATCH request either fails silently or the response is ignored.
- **Impact:** The primary business workflow (PENDING → IN_PROGRESS → COMPLETED) is non-functional.
- **Steps to reproduce:**
  1. Log in as project_manager, open any assignment
  2. Change the status control
  3. Refresh the page — status reverts
- **Fix:** Investigate `PATCH /assignments/:id` handler. Ensure status is persisted and the frontend reads the server-returned value.

---

#### BUG-019 — UUID displayed instead of person name (Project Manager field)
- **Route:** `/assignments/:id`
- **Roles affected:** All with assignment read access
- **Description:** The Project Manager field shows a raw UUID (e.g. `00000000-0000-0000-0000-000000000003`) instead of the person's display name.
- **Impact:** Managers cannot identify assigned PMs. Part of a systemic UUID-display defect.
- **Fix:** Resolve person foreign keys to `firstName + lastName` on the detail fetch. Build a shared name-lookup utility.

---

#### BUG-028 — `resource_manager` role missing from Admin roles dropdown
- **Route:** `/admin` → User Management → Create/Edit User
- **Roles affected:** admin
- **Description:** The role selector in Admin user management does not include `resource_manager`. Admins cannot assign this role via the UI.
- **Impact:** Onboarding resource managers requires direct DB manipulation.
- **Fix:** Add `resource_manager` to the role enum powering the dropdown. Audit all role selectors for completeness.

---

#### BUG-044 — Resource Pool shows raw UUID on Person detail
- **Route:** `/people/:id`
- **Roles affected:** hr_manager, resource_manager, director, admin
- **Description:** Same foreign-key defect as BUG-019 — Resource Pool ID not resolved to pool name.
- **Fix:** Resolve `resource_pool_id` to pool name in person-detail fetch.

---

#### BUG-052 — Case Subject and Owner display raw UUIDs
- **Route:** `/cases/:id`
- **Roles affected:** hr_manager, director, admin
- **Description:** Subject and Owner fields on Case detail show UUIDs, not names. Cases module effectively unreadable for day-to-day HR work.
- **Fix:** Resolve person FKs in Case detail query. Part of the same systemic UUID defect (BUG-019, BUG-044, BUG-060).

---

#### BUG-057 — "Create Project" button visible to employee role
- **Route:** `/projects`
- **Roles affected:** employee
- **Description:** The Create Project button renders for employees, compounding the unguarded route defect (BUG-058).
- **Fix:** Conditionally render button only for authorised roles. Audit all action buttons site-wide.

---

#### BUG-059 — PM / RM dashboard defaults to wrong person (not logged-in user)
- **Route:** `/dashboard/project-manager`, `/dashboard/resource-manager`
- **Roles affected:** project_manager, resource_manager
- **Description:** On login, the role dashboard loads data for a different person rather than the authenticated user (e.g. lucas.reed sees "Sophia Kim"'s data).
- **Impact:** Managers see another person's assignments and workload by default — information disclosure.
- **Fix:** Initialise dashboard subject from JWT `sub` / `/me` endpoint on load.

---

#### BUG-060 — UUID shown in Recent Activity feed (PM Dashboard)
- **Route:** `/dashboard/project-manager`
- **Roles affected:** project_manager
- **Description:** Activity items show raw UUIDs where person names are expected. Activity feed is unreadable.
- **Fix:** Resolve person UUIDs in activity-feed queries. Return denormalised display names from API or resolve via people cache.

---

#### BUG-062 — Raw "Failed to fetch" error shown to users on login
- **Route:** `/login`
- **Roles affected:** All
- **Description:** When the backend is unavailable, the raw JS error "Failed to fetch" is surfaced directly in the login UI.
- **Impact:** Alarming and meaningless to end users. Exposes internal implementation details.
- **Fix:** Catch network errors in the auth service and map to user-friendly messages ("Unable to connect — please check your connection").

---

### 🟡 MEDIUM

---

#### BUG-039 — Search placeholder truncated to "org ui" on People page
- **Route:** `/people`
- **Description:** Search input shows "org ui" — a leftover development fragment.
- **Fix:** Replace with "Search by name, department or role…"

---

#### BUG-041 — Breadcrumb shows "HOME / DASHBOARD" on Person detail
- **Route:** `/people/:id`
- **Description:** Breadcrumb should be "HOME / PEOPLE / [Name]". Systemic defect (also BUG-048 for Teams, and Cases/Projects New routes).
- **Fix:** Centralise breadcrumb config in the React Router route tree to prevent per-page drift.

---

#### BUG-042 — Page `<h1>` reads "Dashboard" on Person detail
- **Route:** `/people/:id`
- **Description:** The main heading renders "Dashboard" instead of the person's name. Same copy-paste defect as BUG-041.
- **Fix:** Set h1 text dynamically from the loaded person record.

---

#### BUG-048 — Team Dashboard breadcrumb shows "HOME / DASHBOARD"
- **Route:** `/teams/:id/dashboard`
- **Description:** Should read "HOME / TEAMS / [Team Name] / DASHBOARD". Part of the systemic breadcrumb defect.
- **Fix:** Fix as part of the same centralised breadcrumb overhaul (BUG-041).

---

#### BUG-049 — Team Dashboard `<h1>` reads "Dashboard"
- **Route:** `/teams/:id/dashboard`
- **Description:** Same generic copy-paste heading defect.
- **Fix:** Set to team name dynamically.

---

#### BUG-051 — Case Type pre-filled with raw enum "ONBOARDING"
- **Route:** `/cases/new`
- **Roles affected:** hr_manager, director, admin
- **Description:** Case Type field defaults to the raw backend enum value in ALL_CAPS. Users see technical code instead of a label.
- **Fix:** Map enum values to display labels: `ONBOARDING` → "Onboarding", `PERFORMANCE_REVIEW` → "Performance Review", etc.

---

#### BUG-061 — Raw `ASSIGNMENT_CREATED` enum in PM activity feed
- **Route:** `/dashboard/project-manager`
- **Description:** Event type labels show raw backend enums (e.g. `ASSIGNMENT_CREATED`). Same root cause as BUG-051.
- **Fix:** Add event-type label mapping: `ASSIGNMENT_CREATED` → "Assignment Created".

---

#### BUG-063 — Role badge shows only one role for dual-role users
- **Route:** Global nav header
- **Roles affected:** Dual-role users (e.g. emma.garcia)
- **Description:** Users with two roles (RM + HR) only see one role in the nav badge.
- **Fix:** Display all roles, comma-separated or as stacked badges. Use "+N more" tooltip for 3+ roles.

---

#### BUG-065 — Sidebar expands to 97% viewport width at ~884 px
- **Route:** All routes — global sidebar
- **Description:** At ~884 px (just below the 900 px breakpoint), sidebar = 869 px — 97% of viewport. Main content is ~15 px wide.
- **Fix:** Add `max-width` constraint on the sidebar (e.g. `240px`) at smaller viewport sizes. Intermediate breakpoint needed between 900–1100 px.

---

### 🔵 LOW

---

#### BUG-033 — No red border / visual error on invalid form fields
- **Route:** All forms (`/assignments/new`, `/projects/new`, `/cases/new`, `/login`)
- **Description:** Validation error messages appear below fields but input borders don't change colour. Standard convention (and WCAG 1.3.1) requires invalid fields to be visually highlighted.
- **Fix:** Add `aria-invalid="true"` and `.input-error { border-color: var(--color-danger); }` to invalid inputs. Reference error message via `aria-describedby`.

---

#### BUG-055 — Access Denied page has no back navigation
- **Route:** `/access-denied`
- **Description:** After RBAC redirect, users are stranded with no link back to a valid route.
- **Fix:** Add "Return to Dashboard" button/link.

---

### 🟢 UX

---

#### UX-040 — Filter dropdowns show "Filter placeholder" text
- **Route:** `/people`
- **Description:** Department and Resource Pool filters show literal "Filter placeholder" — unfinalised dev text.
- **Fix:** Replace with "All Departments", "All Resource Pools".

---

#### UX-043 — "Status not exposed yet" note visible on Person detail
- **Route:** `/people/:id`
- **Description:** Internal dev comment visible to end users in the status section.
- **Fix:** Implement status display or replace with "Not available" empty state.

---

#### UX-045 — Dev placeholder in Active Assignments Summary (Person detail)
- **Route:** `/people/:id`
- **Fix:** Implement or replace with clean empty state: "No active assignments".

---

#### UX-046 — Work Evidence Summary shows placeholder (Person detail)
- **Route:** `/people/:id`
- **Fix:** Implement or replace with clean empty state.

---

#### UX-047 — "Current Workload" shows placeholder (Person detail)
- **Route:** `/people/:id`
- **Fix:** Complete workload widget or show "Workload data coming soon".

---

#### UX-053 — System Settings flag names in `snake_case`
- **Route:** `/admin` → System Settings
- **Description:** Feature flags displayed as raw `snake_case` keys instead of human labels.
- **Fix:** Format as title-case: `enable_case_management` → "Enable Case Management".

---

## Recommendations

### Block release (fix immediately)
1. Fix all RBAC route guards — wrap create/edit routes with server-validated role checks. Don't rely on frontend-only conditional rendering.
2. Fix employee dashboard data isolation (BUG-054) — validate subject ID against JWT `sub` server-side.
3. Fix mobile layout (BUG-064) — sidebar hamburger toggle below 900 px.

### Next sprint
1. Fix assignment status persistence (BUG-008) — core workflow is broken.
2. Build a centralised name-resolution utility to fix BUG-019, BUG-044, BUG-052, BUG-060 in one pass.
3. Add `resource_manager` to the Admin roles dropdown (BUG-028).
4. Fix PM/RM dashboard subject defaulting to authenticated user (BUG-059).
5. Handle login network errors gracefully (BUG-062).

### Before public beta
- Centralise breadcrumb config — fixes BUG-041, BUG-042, BUG-048, BUG-049 together.
- Add enum-to-label mapping — fixes BUG-051, BUG-061, UX-053 together.
- Fix dual-role badge (BUG-063), form error states (BUG-033), sidebar width at ~884 px (BUG-065).

### UX polish
- Replace all dev placeholder strings (UX-040, UX-043, UX-045, UX-046, UX-047).
- Fix People page search placeholder (BUG-039).
- Add back-navigation to Access Denied page (BUG-055).

### Systemic patterns (one fix kills multiple bugs)
| Pattern | Bugs | Fix |
|---|---|---|
| UUID displayed instead of name | BUG-019, BUG-044, BUG-052, BUG-060 | Shared name-resolution utility |
| Breadcrumb / h1 copy-paste | BUG-041, BUG-042, BUG-048, BUG-049 | Centralised route metadata |
| Raw enum display | BUG-051, BUG-061, UX-053 | Enum-to-label dictionary |
| Unguarded create routes | BUG-054, BUG-056, BUG-057, BUG-058 | `withRoleGuard` HOC or Router loader |
