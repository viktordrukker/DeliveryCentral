# Final Gap & Bug List — DeliveryCentral

**Date:** 2026-04-12 (iteration 6 — comprehensive)
**Iteration:** 6 (all roles + all create flows + lifecycle + API batch)
**107 JTBDs defined | 72 verified via browser | 25 verified via API | 20 pending**
**Total bugs: 64 | Fixed: 3 (BUG-38, BUG-63, SYS-06) | Systemic: 6 | Open: 55**

---

## BUGS FIXED THIS SESSION

| # | Bug | Fix Applied |
|---|-----|------------|
| BUG-38 | **Project/assignment/employee creation fails** — `@IsUUID()` rejects seed UUIDs | Replaced `@IsUUID()` with `@Matches(/^[0-9a-f]{8}-...$/i)` across 31 DTO fields |
| BUG-63 | **Case creation fails** — "Case subject person does not exist" — `InMemoryCaseReferenceRepository` checks demo seed data instead of DB | Created `PrismaCaseReferenceRepository`, swapped in module |
| SYS-06 | **KPI values invisible on all dashboards** — MUI CssBaseline injects light-mode body color overriding CSS variables | Created dynamic `useAppTheme()` hook that detects `prefers-color-scheme` and sets MUI palette accordingly; CssBaseline now uses `var(--color-text)` |

---

## OPEN BUG LIST (47 bugs)

### P0 — Critical (4 bugs)

| # | Component | Bug | Status |
|---|-----------|-----|--------|
| BUG-14 | PageTitleBar | Shows "Dashboard" on EVERY page — never updates on navigation | OPEN |
| BUG-24 | /work-evidence | Evidence data table (24 rows) invisible — cut off below form/filter bar | OPEN |
| BUG-02 | / (Dashboard) | Headcount Trend chart renders as data table (SrOnlyTable fallback) | OPEN |
| BUG-46 | /timesheets | Timesheet project column shows raw UUIDs instead of project names | OPEN |

### P1 — High (12 bugs)

| # | Component | Bug | Status |
|---|-----------|-----|--------|
| BUG-37 | /admin/settings | No save confirmation toast after PATCH 200 | OPEN |
| BUG-45 | /timesheets | Auto-fill from Assignments does nothing silently | OPEN |
| BUG-05 | /dashboard/employee | Admin sees random person's data (no personId) | OPEN |
| BUG-09 | /projects | Status shows raw enum "ON_HOLD" not "On Hold" | OPEN |
| BUG-12 | /cases | All 3 cases show "Onboarding" type — wrong case type display | OPEN |
| BUG-25 | /reports/time | Time Report shows 0.0h for all metrics | OPEN |
| BUG-33 | /projects/:id, /people/:id | Lifecycle Status shows raw "ACTIVE" | OPEN |
| BUG-35 | /projects/:id | "Activate" button on already-ACTIVE project | OPEN |
| BUG-36 | /people/:id | "Create employee" button on person detail page | OPEN |
| BUG-19 | /staffing-requests | Role links have poor contrast (blue on dark) | OPEN |
| BUG-47 | PM Dashboard | Staffing Coverage renders as table not chart | OPEN |
| BUG-43 | /dashboard/employee | Pulse history shows dates without mood values | OPEN |

### P2 — Medium (18 bugs)

| # | Component | Bug |
|---|-----------|-----|
| BUG-01 | ALL | Dark theme has readability issues (yellow title text) |
| BUG-03 | / (Dashboard) | Staffing Status donut disappears on scroll |
| BUG-04 | / (Dashboard) | Workload Distribution chart very small |
| BUG-06 | /dashboard/employee | Evidence Last 14 Days section empty |
| BUG-10 | /projects | Health column header truncated |
| BUG-11 | /assignments | Date picker Cyrillic locale placeholders |
| BUG-15 | /org | Org unit kind shows raw "ORG_UNIT" in nodes |
| BUG-16 | /org | Root node red border (0 members = unhealthy) |
| BUG-17 | /timesheets | Week label in Cyrillic locale |
| BUG-18 | /timesheets | Admin sees empty personal timesheet |
| BUG-20 | /staffing-requests | Date format inconsistent (ISO) |
| BUG-21 | Notification dropdown | White background on dark theme |
| BUG-27 | /reports/time | Labels "Project ID" and "Person ID" |
| BUG-30 | /teams | Title inconsistency (Team Management vs Teams) |
| BUG-31 | /admin/settings | "Week Start Day (0=Sun, 1=Mon)" |
| BUG-34 | /projects/:id | Start Date shows ISO format |
| BUG-41 | /login | Session expires without warning |
| BUG-44 | Notification dropdown | Text truncated |

### P3 — Low (9 bugs)

| # | Component | Bug |
|---|-----------|-----|
| BUG-07 | /people | Orphaned people (Alex Morgan, Ava Rowe) |
| BUG-08 | /people | Only 1 dotted-line visible out of 2 |
| BUG-22 | /work-evidence | Cyrillic date placeholders |
| BUG-23 | /work-evidence | Source Type text input not dropdown |
| BUG-28 | /leave | Cyrillic date placeholders |
| BUG-29 | /leave | No seed leave request data |
| BUG-32 | /admin/settings | Default currency "AUD" |
| BUG-39 | /admin/dictionaries | Employee Roles has 0 entries |
| BUG-40 | /admin/dictionaries | Employee Skillsets has 0 entries |
| BUG-42 | /login | Title "Delivery Central" hardcoded |

---

## SYSTEMIC ISSUES

| ID | Issue | Scope | Root Cause |
|----|-------|-------|-----------|
| SYS-01 | PageTitleBar stuck on "Dashboard" | All pages | `activeRoute` matching in AppShell fails |
| SYS-02 | Raw enum values in display | 5+ pages | Missing `humanizeEnum()` calls |
| SYS-03 | Date locale issues | 6+ pages | Browser locale leaking into `<input type="date">` |
| SYS-04 | Admin has no personId | 3+ pages | Admin account not linked to person record |
| SYS-05 | Charts render as data tables | 3+ dashboards | SrOnlyTable accessibility fallback used instead of recharts |
| SYS-06 | **KPI values and section card text invisible** | ALL dashboards | Dark section-card backgrounds with dark/transparent text — KPI numbers, table data, and section titles have near-zero contrast. CRITICAL UX issue affecting Employee, PM, RM, HR, DM, Director dashboards. Root cause: CSS custom property `--color-text` or card text color is too dark/transparent on `.section-card` dark backgrounds |

### Bugs Found During Iteration 4 (2026-04-12)

| # | Component | Bug | Severity |
|---|-----------|-----|----------|
| BUG-48 | ALL dashboards | KPI card values **invisible** — card titles visible but numbers not rendered or have zero contrast | P0 |
| BUG-49 | /dashboard/employee | "Evidence Last 14 Days" title barely visible | P2 |
| BUG-50 | /dashboard/employee | Assignment cards missing project names — only shows role + allocation | P1 |
| BUG-51 | ALL dashboards | Section card titles (e.g., "Assignments", "Portfolio Health") have near-zero contrast | P0 |
| BUG-52 | /assignments/:id | Assignment summary field values invisible — labels visible but values not | P0 |
| BUG-53 | /dashboard/hr | Headcount Trend chart completely empty — no chart or data table | P1 |
| BUG-54 | /dashboard/hr | Mood heatmap cells empty/white — grid structure exists but no mood data visible | P1 |
| BUG-55 | /dashboard/hr | Heatmap row labels and column headers invisible | P1 |
| BUG-56 | /dashboard/delivery-manager | Portfolio table data invisible — only health badges visible | P1 |
| BUG-57 | /dashboard/director | Portfolio Summary status column values invisible | P1 |
| BUG-58 | /dashboard/resource-manager | RM sidebar missing Resource Pools and Staffing Board links | P1 |

---

## GAP LIST (features not implemented or incomplete)

### Functional Gaps

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| GAP-01 | No chart interactivity (click-to-drill) | P2 | All 21 charts are display-only |
| GAP-02 | No chart export (PNG/CSV) | P2 | ChartExportMenu component exists but not wired |
| GAP-03 | KPI cards not clickable | P2 | Numbers don't link to relevant list pages |
| GAP-04 | No dedicated trend API endpoint | P2 | Dashboard makes 12 sequential calls |
| GAP-05 | No leave request seed data | P3 | Leave page always empty |
| GAP-06 | No timesheet approval seed data | P1 | Time Report shows 0h (no APPROVED timesheets) |
| GAP-07 | No role/skillset dictionary entries seeded | P2 | Dropdowns empty for these dictionaries |
| GAP-08 | Command palette (Ctrl+K) not fully wired | P2 | Exists but search may not cover all routes |
| GAP-09 | No bulk approve for timesheets | P3 | Must approve one at a time |
| GAP-10 | No assignment conflict visualization on person detail | P3 | Only visible on staffing board |

### Data Quality Gaps

| # | Gap | Severity |
|---|-----|----------|
| DQ-01 | No validation preventing assignments for INACTIVE people | P2 |
| DQ-02 | No unique constraint on (personId + projectId + ACTIVE status) | P2 |
| DQ-03 | Orphaned people without org units visible in directory | P3 |
| DQ-04 | Case type display doesn't match actual type key | P1 |

### Non-Functional Gaps

| # | Gap | Severity |
|---|-----|----------|
| NF-01 | No Redis caching for dashboard queries | P2 |
| NF-02 | No Playwright E2E in CI | P1 |
| NF-03 | No CSP headers | P2 |
| NF-04 | No slow-query logging | P2 |
| NF-05 | Login rate limit is per-IP not per-account | P2 |

### Accessibility Gaps

| # | Gap | Severity |
|---|-----|----------|
| A-01 | Color contrast fails WCAG AA on staffing links | P1 |
| A-02 | No `lang="en"` on HTML element | P1 |
| A-03 | Min click target <44px on some buttons | P2 |
| A-04 | No aria-label on icon-only buttons | P2 |
| A-05 | No keyboard nav for drag-drop staffing board | P3 |

---

## JTBD VERIFICATION SUMMARY (Updated 2026-04-12)

| Role | Total JTBDs | Browser-Tested | API-Tested | Pass | Fail/Bug | Untested |
|------|-------------|---------------|-----------|------|----------|----------|
| Employee | 27 | 18 | 3 | 15 | 6 | 6 |
| Project Manager | 24 | 10 | 4 | 10 | 4 | 10 |
| Resource Manager | 15 | 8 | 4 | 8 | 4 | 3 |
| HR Manager | 24 | 14 | 3 | 12 | 5 | 7 |
| Delivery Manager | 10 | 6 | 2 | 5 | 3 | 2 |
| Director | 7 | 5 | 3 | 6 | 2 | 0 |
| Admin | 16 | 10 | 4 | 10 | 4 | 2 |
| Cross-role | 5 | 1 | 2 | 2 | 1 | 2 |
| **TOTAL** | **107** | **72** | **25** | **68** | **29** | **20** |

### Key Findings (Updated 2026-04-12)

1. **BUG-38 FIXED**: `@IsUUID()` → `@Matches()` across 31 DTO fields — unblocks ALL entity creation
2. **SYS-06 (P0 BLOCKER)**: KPI values and section card text invisible on ALL 7 dashboards — dark card backgrounds with dark/transparent text. This is the #1 priority fix needed before demo. Root cause: CSS contrast on `.section-card` elements.
3. **SYS-05**: Charts render as data tables (SrOnlyTable fallback) — affects main dashboard headcount trend and PM staffing coverage
4. **SYS-01**: PageTitleBar stuck on "Dashboard" — affects every page navigation
5. **SYS-02**: Raw enum values (ACTIVE, ON_HOLD, ORG_UNIT) shown instead of humanized labels

### All 7 Role Dashboards Verified

| Role | Dashboard | Login Works | Data Loads | KPIs Visible | Charts Render |
|------|-----------|------------|-----------|-------------|---------------|
| Employee | /dashboard/employee | ✅ | ✅ | ❌ (invisible values) | ⚠️ (gauge OK, evidence empty) |
| PM | /dashboard/project-manager | ✅ | ✅ | ❌ (invisible values) | ❌ (table fallback) |
| RM | /dashboard/resource-manager | ✅ | ✅ | ❌ (invisible values) | ❌ (data invisible) |
| HR | /dashboard/hr | ✅ | ✅ | ❌ (invisible values) | ❌ (trend empty, heatmap blank) |
| DM | /dashboard/delivery-manager | ✅ | ✅ | ❌ (invisible values) | ⚠️ (badges visible, table data invisible) |
| Director | /dashboard/director | ✅ | ✅ | ⚠️ (some visible) | ⚠️ (portfolio links visible) |
| Admin | / (main) | ✅ | ✅ | ✅ (visible) | ⚠️ (headcount table fallback) |

### Next Priority Actions

1. **FIX SYS-06**: Fix CSS contrast on section cards — make KPI values, table data, and section titles visible. This single fix will resolve BUG-48, 49, 50, 51, 52, 53, 54, 55, 56, 57 (11 bugs at once).
2. **FIX SYS-05**: Investigate why recharts renders SrOnlyTable instead of charts on some dashboards
3. **FIX SYS-01**: Fix PageTitleBar route matching
4. **FIX BUG-46**: Resolve project names in timesheet instead of raw UUIDs
5. Test remaining 43 JTBDs: create flows (employee, assignment, case), lifecycle flows (activate, close, approve), cross-role data flows
