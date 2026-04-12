# Final Bug Report — DeliveryCentral

**Date:** 2026-04-12
**Testing period:** 2026-04-11 to 2026-04-12
**Method:** Browser QA (Chrome + Edge), API testing, code analysis
**JTBDs verified:** 107/107 (100%)
**Bugs found:** 66 | **Fixed:** 4 | **Open:** 62

---

## BUGS FIXED DURING QA

| # | Bug | Fix | Files |
|---|-----|-----|-------|
| BUG-38 | `@IsUUID()` rejects seed UUIDs — blocks ALL entity creation | `@Matches(/^[0-9a-f]{8}-...$/i)` across 31 DTO fields | 16 files in `src/modules/*/application/contracts/` |
| BUG-63 | Case creation: "subject person does not exist" — `InMemoryCaseReferenceRepository` checks demo seed not DB | Created `PrismaCaseReferenceRepository`, swapped in module | `prisma-case-reference.repository.ts`, `case-management.module.ts` |
| SYS-06 | KPI values invisible on all dashboards — MUI CssBaseline overrides CSS variables with light-mode color | `useAppTheme()` hook detects `prefers-color-scheme` and builds MUI theme dynamically | `theme.ts`, `main.tsx` |
| BUG-66 | Assignment approve/reject/end requires `actorId` in body but frontend sends empty string | Made `actorId` optional in DTO + controller derives from auth principal | `assignment-decision.request.ts`, `end-project-assignment.request.ts`, `assignments.controller.ts`, `AssignmentDetailsPlaceholderPage.tsx` |

---

## OPEN BUGS — P0 (Critical)

| # | Page | Bug | Root Cause | Suggested Fix |
|---|------|-----|-----------|---------------|
| BUG-14 | ALL pages | **PageTitleBar shows "Dashboard" on every page** — never updates on navigation | `activeRoute` matching in `AppShell.tsx` line 93-94 uses `location.pathname` but route matching fails for nested/dynamic routes | Fix route matching logic to use `startsWith` or match parent path segments |
| BUG-24 | /work-evidence | **Evidence data table (24 rows) invisible** — below the fold, cut off by form + filter bar | Page uses `viewport` prop on PageContainer which constrains height | Remove `viewport` prop or restructure as tabs (form tab + table tab) |
| BUG-02 | / (Dashboard) | **Headcount Trend chart renders as data table** — SrOnlyTable fallback instead of recharts AreaChart | ResponsiveContainer renders 0-height when parent has no explicit height | Ensure chart container has `min-height: 200px` |
| BUG-46 | /timesheets | **Timesheet project column shows raw UUIDs** instead of project names | Timesheet API returns `projectId` but no `projectName`; frontend renders the ID directly | Join project name in timesheet API response or resolve on frontend |

## OPEN BUGS — P1 (High)

| # | Page | Bug | Suggested Fix |
|---|------|-----|---------------|
| BUG-37 | /admin/settings | No save confirmation toast after PATCH 200 | Add `toast.success()` after successful save |
| BUG-45 | /timesheets | Auto-fill from Assignments does nothing silently | Debug `useTimesheetWeek` hook — auto-fill logic may not populate state |
| BUG-05 | /dashboard/employee | Admin sees random person's data (no personId) | Show "Select a person" message when `principal.personId` is undefined |
| BUG-09 | /projects | Status shows raw "ON_HOLD" not "On Hold" | Apply `humanizeEnum()` to project status display |
| BUG-12 | /cases | All 3 seed cases show "Onboarding" type — CASE-0002 should be "Performance", CASE-0003 "Offboarding" | Fix case type display — check if `caseTypeKey` maps to correct `displayName` |
| BUG-25 | /reports/time | Time Report shows 0.0h — no APPROVED timesheets in seed | Seed 2+ timesheets with APPROVED status |
| BUG-33 | /projects/:id, /people/:id | Lifecycle Status shows raw "ACTIVE" | Apply `humanizeEnum()` |
| BUG-35 | /projects/:id | "Activate" button shown on already-ACTIVE project | Hide button when `status === 'ACTIVE'` |
| BUG-36 | /people/:id | "Create employee" button on person detail page | Remove or move to directory page only |
| BUG-19 | /staffing-requests | Role links have poor contrast (blue on dark background) | Use `var(--color-accent)` or lighter link color on dark cards |
| BUG-47 | PM Dashboard | Staffing Coverage renders as table not chart | Same as BUG-02 — ensure chart container has height |
| BUG-43 | /dashboard/employee | Pulse history shows dates without mood values | Render emoji or score next to each date |
| BUG-50 | /dashboard/employee | Assignment cards missing project names | Add `projectName` to assignment card render |
| BUG-53 | /dashboard/hr | Headcount Trend chart empty — no data rendered | Ensure chart data is passed correctly from hook |
| BUG-54 | /dashboard/hr | Mood heatmap cells empty — grid but no colors | Check heatmap component data binding |
| BUG-65 | Sign out | Sign out doesn't always redirect to login | Ensure `navigate('/login')` fires after token clear |

## OPEN BUGS — P2 (Medium)

| # | Page | Bug |
|---|------|-----|
| BUG-01 | ALL | Dark theme readability: yellow title text on dark blue, low-contrast description |
| BUG-03 | / (Dashboard) | Staffing Status donut disappears on scroll |
| BUG-04 | / (Dashboard) | Workload Distribution chart very small |
| BUG-06 | /dashboard/employee | "Evidence Last 14 Days" section empty |
| BUG-10 | /projects | Health column header truncated |
| BUG-11 | /assignments | Date picker Cyrillic locale placeholders |
| BUG-15 | /org | Org unit kind shows raw "ORG_UNIT" in nodes |
| BUG-16 | /org | Root node red border (0 members = unhealthy) |
| BUG-17 | /timesheets | Week label in Cyrillic locale |
| BUG-18 | /timesheets | Admin sees empty personal timesheet |
| BUG-20 | /staffing-requests | Date format inconsistent (ISO "2026-06-01 → 2026-12-31") |
| BUG-21 | Notification dropdown | White background clashes with dark theme |
| BUG-27 | /reports/time | Filter labels "Project ID" and "Person ID" expose field names |
| BUG-30 | /teams | Title inconsistency ("Team Management" vs "Teams") |
| BUG-31 | /admin/settings | "Week Start Day (0=Sun, 1=Mon)" exposes implementation detail |
| BUG-34 | /projects/:id | Start Date shows ISO format "2025-01-15" |
| BUG-41 | /login | Session expires after 15min without warning |
| BUG-44 | Notification dropdown | Notification text truncated |
| BUG-49 | /dashboard/employee | "Evidence Last 14 Days" title barely visible |
| BUG-51 | ALL dashboards | Section card titles low contrast (partially fixed by SYS-06 fix) |
| BUG-55 | /dashboard/hr | Heatmap row labels and column headers invisible |
| BUG-56 | /dashboard/delivery-manager | Portfolio table data invisible — only health badges visible |
| BUG-57 | /dashboard/director | Portfolio Summary status column values invisible |
| BUG-59 | Title bar / headers | Page title and user name text low contrast on light background |
| BUG-61 | /staffing-board | Person names and week headers barely visible |
| BUG-62 | /staffing-board | Only 3 people shown — may be scope-filtered |
| BUG-64 | /people/:id | Button label "Employee inactive" instead of "Deactivate employee" |

## OPEN BUGS — P3 (Low)

| # | Page | Bug |
|---|------|-----|
| BUG-07 | /people | Orphaned people (Alex Morgan, Ava Rowe) show "Not assigned" |
| BUG-08 | /people | Only 1 dotted-line visible out of 2 relationships |
| BUG-22 | /work-evidence | Cyrillic date placeholders |
| BUG-23 | /work-evidence | Source Type text input should be dropdown |
| BUG-28 | /leave | Cyrillic date placeholders |
| BUG-29 | /leave | No seed leave request data (now has 1 from QA test) |
| BUG-32 | /admin/settings | Default currency "AUD" |
| BUG-39 | /admin/dictionaries | Employee Roles has 0 entries |
| BUG-40 | /admin/dictionaries | Employee Skillsets has 0 entries |
| BUG-42 | /login | Title "Delivery Central" hardcoded, not from platform settings |
| BUG-52 | /assignments/:id | Assignment summary field values invisible in some contrast modes |
| BUG-60 | Header | Header text very faint in some contrast modes |

---

## SYSTEMIC ISSUES

| ID | Issue | Scope | Status |
|----|-------|-------|--------|
| SYS-01 | PageTitleBar stuck on "Dashboard" | All pages | OPEN — P0 |
| SYS-02 | Raw enum values in display | 5+ pages | OPEN — P1 |
| SYS-03 | Date locale issues (Cyrillic) | 6+ pages | OPEN — P2 |
| SYS-04 | Admin has no personId | 3+ pages | OPEN — P2 |
| SYS-05 | Charts render as data tables (SrOnlyTable) | 3+ dashboards | OPEN — P1 |
| SYS-06 | KPI values invisible (MUI override) | All dashboards | **FIXED** |

---

## IDENTIFIED GAPS

### Functional Gaps

| # | Gap | Priority | Notes |
|---|-----|----------|-------|
| GAP-01 | No chart interactivity (click-to-drill) | P2 | All 21 charts are display-only; clicking a bar/slice does nothing |
| GAP-02 | No chart export (PNG/CSV) | P2 | `ChartExportMenu` component exists but not wired to chart instances |
| GAP-03 | KPI cards not clickable | P2 | Dashboard KPI numbers don't link to relevant list pages |
| GAP-04 | No dedicated trend API endpoint | P2 | Dashboard makes 12 sequential calls for headcount trend; should be a single `/dashboard/workload/trend?weeks=12` |
| GAP-05 | No timesheet approval seed data | P1 | All seeded timesheets are DRAFT — Time Report shows 0h because it only counts APPROVED |
| GAP-06 | Empty role/skillset dictionaries | P2 | Employee Roles and Employee Skillsets dictionaries seeded with 0 entries |
| GAP-07 | Command palette search incomplete | P2 | Ctrl+K opens palette but may not search all routes |
| GAP-08 | No bulk timesheet approve | P3 | Must approve one timesheet at a time |
| GAP-09 | No assignment conflict visualization on person detail | P3 | Overallocation only visible on staffing board and dashboard KPI |
| GAP-10 | No PDF export option | P3 | Only XLSX export available across all pages |

### Data Quality Gaps

| # | Gap | Priority |
|---|-----|----------|
| DQ-01 | No validation preventing assignments for INACTIVE/TERMINATED people | P2 |
| DQ-02 | No unique constraint on (personId + projectId + ACTIVE status) | P2 |
| DQ-03 | Orphaned people without org units visible in directory (by design for testing, but confusing) | P3 |
| DQ-04 | Case type display mismatch — all seed cases show "Onboarding" regardless of actual type | P1 |

### Non-Functional Gaps

| # | Gap | Priority |
|---|-----|----------|
| NF-01 | No Redis caching for dashboard queries | P2 |
| NF-02 | No Playwright E2E tests running in CI | P1 |
| NF-03 | No CSP (Content Security Policy) headers for production | P2 |
| NF-04 | No database slow-query logging (>500ms threshold) | P2 |
| NF-05 | Login rate limit is per-IP not per-account — blocks automated testing | P2 |
| NF-06 | No structured error codes in API responses (only message strings) | P3 |

### Accessibility Gaps

| # | Gap | Priority |
|---|-----|----------|
| A-01 | Color contrast fails WCAG AA on several text elements (staffing links, card titles, field values) | P1 |
| A-02 | No `lang="en"` on `<html>` element — browser locale leaks into date inputs | P1 |
| A-03 | Minimum click target < 44px on some buttons and sidebar items | P2 |
| A-04 | No `aria-label` on icon-only buttons (notification bell, sidebar collapse, export PNG) | P2 |
| A-05 | No keyboard navigation for staffing board drag-and-drop | P3 |

### Design Improvement Suggestions

| # | Suggestion | Priority |
|---|-----------|----------|
| D-01 | Standardize all date displays to use `date-fns format()` with consistent pattern | P1 |
| D-02 | Replace all raw enum displays with `humanizeEnum()` calls | P1 |
| D-03 | Add page-specific `<title>` tags — all tabs currently show "Workload Tracking Platform" | P2 |
| D-04 | Add favicon | P3 |
| D-05 | Notification dropdown should match dark/light theme | P2 |
| D-06 | Make section card title text color explicitly `var(--color-text)` to prevent contrast issues | P1 |

---

## VERIFICATION SUMMARY

### Assignment Lifecycle (fully verified via browser)
```
REQUESTED → [Approve] → APPROVED → [End] → ENDED ✅
REQUESTED → [Reject with reason] → REJECTED ✅
```

### Case Lifecycle (fully verified via browser)
```
[Create] → OPEN → [Complete step] → step COMPLETED → [Close case] → COMPLETED ✅
```

### Entity Creation (all verified via browser)
```
Project: form → validation → submit → DRAFT → [Activate] → ACTIVE ✅
Employee: form → ConfirmDialog → submit → INACTIVE profile ✅
Case: form → submit → OPEN with auto-generated steps ✅
Dictionary entry: form → submit → appears in list ✅
Leave request: form → submit → PENDING in list ✅
Pulse: emoji → Submit → toast confirmation ✅
Settings: change value → Save → persists on refresh ✅
```

### RBAC (verified via browser for all 7 roles)
```
Employee: limited sidebar, no admin ✅
PM: projects + assignments, no admin ✅
RM: capacity + pools + board, no admin ✅
HR: people + cases + dictionaries ✅
DM: delivery dashboard + teams ✅
Director: all pages ✅
Admin: all pages + impersonation ✅
```
