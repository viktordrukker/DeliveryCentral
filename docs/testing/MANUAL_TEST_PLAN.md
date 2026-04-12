# DeliveryCentral — Manual Test Plan

**Version:** 1.0
**Created:** 2026-04-11
**Seed profile:** `phase2`
**Target environment:** Docker local (`http://localhost:5173`)

---

## Prerequisites

```bash
# Reset and seed fresh data
docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --transpile-only --project tsconfig.json prisma/seed.ts"
docker compose restart backend
```

## Test Accounts

| ID | Role | Email | Password |
|----|------|-------|----------|
| ADM | admin | admin@deliverycentral.local | DeliveryCentral@Admin1 |
| DIR | director | noah.bennett@example.com | DirectorPass1! |
| HR | hr_manager | diana.walsh@example.com | HrManagerPass1! |
| RM | resource_manager | sophia.kim@example.com | ResourceMgrPass1! |
| PM | project_manager | lucas.reed@example.com | ProjectMgrPass1! |
| DM | delivery_manager | carlos.vega@example.com | DeliveryMgrPass1! |
| EMP | employee | ethan.brooks@example.com | EmployeePass1! |
| DUAL | rm + hr | emma.garcia@example.com | DualRolePass1! |

---

## 1. AUTHENTICATION & SECURITY

### 1.1 Login Flow

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| AUTH-01 | Valid login | Enter admin email + password → Submit | Redirect to `/`, dashboard loads | ADM | P0 |
| AUTH-02 | Invalid password | Enter admin email + wrong password | Error message shown, no redirect | ADM | P0 |
| AUTH-03 | Empty fields | Submit with empty email or password | Validation error shown | — | P1 |
| AUTH-04 | Session persistence | Login → close tab → reopen same URL | Still authenticated (token refresh) | ADM | P0 |
| AUTH-05 | Logout | Click "Sign out" | Redirect to `/login`, token cleared | ADM | P0 |
| AUTH-06 | Token expiry | Wait 15 min (or manually delete localStorage token) | Auto-refresh or redirect to login | ADM | P1 |

### 1.2 Role-Based Access Control

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| RBAC-01 | Admin sees all sidebar items | Login as admin → check sidebar | All groups visible (Dashboards, People & Org, Work, Governance, Admin) | ADM | P0 |
| RBAC-02 | Employee sees limited sidebar | Login as employee → check sidebar | Only My Work, limited Dashboards, People, Work Evidence, Cases visible | EMP | P0 |
| RBAC-03 | Employee cannot access admin | Login as employee → navigate to `/admin` | "Access denied" message | EMP | P0 |
| RBAC-04 | PM cannot access HR dashboard | Login as PM → navigate to `/dashboard/hr` | "Access denied" message | PM | P1 |
| RBAC-05 | RM can access resource pools | Login as RM → navigate to `/resource-pools` | Resource pools list renders | RM | P1 |
| RBAC-06 | HR can access bulk import | Login as HR → navigate to `/admin/people/import` | Bulk import page renders | HR | P1 |
| RBAC-07 | DM can access capitalisation | Login as DM → navigate to `/reports/capitalisation` | Capitalisation report renders | DM | P1 |

### 1.3 Impersonation (Admin Only)

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| IMP-01 | View-as selector visible | Login as admin → check top header | "View as..." dropdown present | ADM | P0 |
| IMP-02 | View-as changes identity | Select "Ethan Brooks (Employee)" from dropdown | Orange banner "Viewing as Ethan Brooks", sidebar filters to employee routes, dashboard shows employee data | ADM | P0 |
| IMP-03 | View-as changes dashboard data | Select PM → navigate to `/dashboard/project-manager` | PM dashboard renders with PM-specific KPIs | ADM | P1 |
| IMP-04 | Exit impersonation | Click "Exit impersonation" in orange banner | Returns to admin view, all sidebar items reappear | ADM | P0 |
| IMP-05 | View-as not visible for non-admin | Login as employee → check top header | No "View as..." dropdown | EMP | P1 |

---

## 2. ORGANIZATION & PEOPLE

### 2.1 Employee Directory

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| PPL-01 | Directory loads | Navigate to `/people` | Table with 32 people, columns: Name, Email, Status, Org Unit, Manager | HR | P0 |
| PPL-02 | Search filter | Type "Ethan" in search box | Filtered to Ethan Brooks | HR | P1 |
| PPL-03 | Status filter | Select "INACTIVE" from status dropdown | Only inactive people shown (or empty state) | HR | P1 |
| PPL-04 | Person detail page | Click person name in directory | Profile page loads with tabs/sections | HR | P0 |
| PPL-05 | XLSX export | Click "Export XLSX" button | `.xlsx` file downloads with directory data | HR | P1 |

### 2.2 Employee Lifecycle

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| ELC-01 | Create employee | Navigate to `/people/new` → fill form → submit | New person appears in directory, toast confirmation | HR | P0 |
| ELC-02 | Required fields validation | Submit create form with empty name | Validation error shown | HR | P1 |
| ELC-03 | Deactivate employee | Open person detail → click Deactivate | Status changes to INACTIVE, confirmation dialog shown first | HR | P0 |
| ELC-04 | Terminate employee | Open person detail → click Terminate | Status changes to TERMINATED, cascading effects noted | HR | P1 |

### 2.3 Org Chart

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| ORG-01 | Org chart loads | Navigate to `/org` | Interactive chart renders with org units | ANY | P0 |
| ORG-02 | Search org units | Type "Engineering" in search | Matching nodes highlighted | ANY | P1 |
| ORG-03 | Zoom/pan controls | Click Fit, +, - buttons on toolbar | Chart zooms/pans correctly | ANY | P1 |
| ORG-04 | Node click opens detail | Click an org unit node | Side drawer opens with unit details | ANY | P2 |

### 2.4 Teams

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| TEAM-01 | Teams list | Navigate to `/teams` | Teams listed with member counts | DM | P0 |
| TEAM-02 | Team dashboard | Click a team → Dashboard | Team metrics, member list, assignment breakdown | DM | P1 |
| TEAM-03 | Create team | Click Create Team → fill form → submit | New team appears in list | DM | P2 |

### 2.5 Resource Pools

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| RP-01 | Resource pools list | Navigate to `/resource-pools` | Pools listed with member counts | RM | P0 |
| RP-02 | Pool detail | Click a pool | Pool detail page with members, assignments | RM | P1 |

---

## 3. PROJECTS & ASSIGNMENTS

### 3.1 Project Registry

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| PRJ-01 | Projects list | Navigate to `/projects` | 12 projects listed with status badges | PM | P0 |
| PRJ-02 | Create project | Navigate to `/projects/new` → fill form → submit | New project created, redirect to detail | PM | P0 |
| PRJ-03 | Project detail | Click a project name | Detail page loads with tabs (Summary, Team, etc.) | PM | P0 |
| PRJ-04 | Project dashboard | Navigate to `/projects/:id/dashboard` | Dashboard with evidence charts, allocation breakdown | PM | P1 |
| PRJ-05 | Close project | Open active project → click Close | Project status changes to CLOSED | PM | P1 |

### 3.2 Assignments

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| ASN-01 | Assignments list | Navigate to `/assignments` | Assignments listed with status, person, project | PM | P0 |
| ASN-02 | Create assignment | Navigate to `/assignments/new` → fill form → submit | New assignment created with REQUESTED status | PM | P0 |
| ASN-03 | Approve assignment | Open REQUESTED assignment → click Approve | Status changes to APPROVED/ACTIVE | RM | P0 |
| ASN-04 | Reject assignment | Open REQUESTED assignment → click Reject | Status changes to REJECTED, reason captured | RM | P1 |
| ASN-05 | End assignment | Open ACTIVE assignment → click End | Status changes to ENDED, end date set | PM | P1 |
| ASN-06 | Assignment detail | Click assignment in list | Detail page with history timeline, approval records | PM | P0 |
| ASN-07 | Bulk assignment | Navigate to `/assignments/bulk` → add multiple → submit | Multiple assignments created | PM | P2 |
| ASN-08 | Overallocation warning | Create assignment that puts person over 100% | Conflict warning shown | PM | P1 |

### 3.3 Staffing Requests

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| STF-01 | Staffing requests list | Navigate to `/staffing-requests` | Requests listed with status, project, priority | PM | P0 |
| STF-02 | Create request | Navigate to `/staffing-requests/new` → fill form → submit | Request created with DRAFT status | PM | P0 |
| STF-03 | Request detail | Click a request | Detail page with fulfillment options, skill suggestions | RM | P1 |
| STF-04 | Submit request | Open DRAFT request → click Submit | Status changes to OPEN | PM | P1 |

### 3.4 Staffing Board

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| SBD-01 | Staffing board loads | Navigate to `/staffing-board` | 12-week grid with person swimlanes | RM | P0 |
| SBD-02 | Drag assignment | Drag an assignment bar to different week | Assignment moved, conflict check runs | RM | P1 |
| SBD-03 | Overallocation detected | Drag to create >100% allocation | Red highlight on conflicting cell | RM | P1 |

### 3.5 Workload

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| WL-01 | Workload matrix | Navigate to `/workload` | Person × project allocation heatmap | RM | P0 |
| WL-02 | Workload planning | Navigate to `/workload/planning` | 12-week forward timeline with allocation bars | RM | P1 |

---

## 4. WORK EVIDENCE & TIMESHEETS

### 4.1 Work Evidence

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| WE-01 | Evidence list | Navigate to `/work-evidence` | Evidence entries listed with person, project, hours, date | EMP | P0 |
| WE-02 | XLSX export | Click "Export XLSX" | File downloads with evidence data | EMP | P1 |

### 4.2 Timesheets

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| TS-01 | Timesheet loads | Navigate to `/timesheets` | Weekly grid shows Mon-Sun with project rows | EMP | P0 |
| TS-02 | Enter hours | Click a cell → type hours | Value saves (debounce), "Saved" indicator appears | EMP | P0 |
| TS-03 | CAPEX toggle | Toggle CAPEX checkbox on a row | Row flagged as CAPEX (vs OPEX default) | EMP | P1 |
| TS-04 | Submit timesheet | Click Submit | Status changes to SUBMITTED, cells become read-only | EMP | P0 |
| TS-05 | Approval queue | Login as PM → navigate to `/timesheets/approval` | Pending timesheets listed for team members | PM | P0 |
| TS-06 | Approve timesheet | Click Approve on a submitted timesheet | Status changes to APPROVED | PM | P1 |
| TS-07 | Reject timesheet | Click Reject → enter reason | Status changes to REJECTED, reason shown | PM | P1 |
| TS-08 | Week navigation | Click next/previous week arrows | Grid shows different week, data loads | EMP | P1 |

### 4.3 Leave/Time Off

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| LV-01 | Leave request form | Navigate to `/leave` | Leave request form loads (type, dates, notes) | EMP | P0 |
| LV-02 | Submit leave request | Fill form → submit | Request created with PENDING status | EMP | P1 |
| LV-03 | Manager approval | Login as PM → navigate to `/leave` → approve | Request status changes to APPROVED | PM | P1 |

---

## 5. CASES & WORKFLOWS

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| CASE-01 | Cases list | Navigate to `/cases` | 3 seed cases listed (Onboarding, Performance, Offboarding) | HR | P0 |
| CASE-02 | Case detail | Click CASE-0001 (Onboarding) | Detail page with steps, participants, SLA status | HR | P0 |
| CASE-03 | Complete step | Click "Complete" on an open step | Step marked completed with timestamp | HR | P0 |
| CASE-04 | Create case | Navigate to `/cases/new` → fill form → submit | New case created with steps auto-generated | HR | P1 |
| CASE-05 | Close case | Open case → click Close | Status changes to CLOSED, case archived | HR | P1 |
| CASE-06 | Cancel case | Open case → click Cancel → enter reason | Status changes to CANCELLED | HR | P2 |
| CASE-07 | SLA indicator | View case older than SLA hours | SLA countdown shows yellow/red | HR | P2 |

---

## 6. DASHBOARDS

### 6.1 Main Dashboard

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| DASH-01 | Dashboard loads | Login → land on `/` | KPI strip, 4-panel grid with charts, no errors | DIR | P0 |
| DASH-02 | KPI values non-zero | Check Active Projects, Active Assignments KPIs | Values > 0 from seed data | DIR | P0 |
| DASH-03 | Headcount trend | Check "Headcount Trend (12 Weeks)" chart | Line chart with 12 data points | DIR | P1 |
| DASH-04 | Date filter | Change "As of" date | Dashboard reloads with new data | DIR | P1 |

### 6.2 Employee Dashboard

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| EMP-01 | Employee dashboard | Navigate to `/dashboard/employee` | Personal KPIs, pulse widget, allocation chart | EMP | P0 |
| EMP-02 | Pulse submit | Click mood emoji → optionally add note → submit | Mood recorded, history updated | EMP | P0 |
| EMP-03 | Pulse history | Check pulse history dots | Last 4+ weeks of mood visible | EMP | P1 |

### 6.3 Role-Specific Dashboards

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| PMD-01 | PM dashboard | Navigate to `/dashboard/project-manager` | Staffing KPIs, project list, coverage chart | PM | P0 |
| RMD-01 | RM dashboard | Navigate to `/dashboard/resource-manager` | Capacity KPIs, allocation heatmap, idle list | RM | P0 |
| HRD-01 | HR dashboard | Navigate to `/dashboard/hr` | Headcount KPIs, org distribution, mood heatmap | HR | P0 |
| DMD-01 | DM dashboard | Navigate to `/dashboard/delivery-manager` | Team KPIs, burn rate, staffing gaps | DM | P0 |
| DIRD-01 | Director dashboard | Navigate to `/dashboard/director` | Org-wide KPIs, portfolio table, FTE trend | DIR | P0 |

### 6.4 Planned vs Actual

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| PVA-01 | Page loads | Navigate to `/dashboard/planned-vs-actual` | Tabbed table (Matched, No Evidence, No Assignment, Anomalies), metric cards | PM | P0 |
| PVA-02 | Tab switching | Click each tab | Table content changes, counts in tab labels | PM | P1 |
| PVA-03 | Row expansion | Click a table row | Detail panel expands below row | PM | P1 |
| PVA-04 | Filter by project | Select a project from dropdown | Table filters to that project only | PM | P1 |

---

## 7. NOTIFICATIONS

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| NTF-01 | Bell icon visible | Login → check top header | Bell icon with unread count badge | EMP | P0 |
| NTF-02 | Inbox dropdown | Click bell icon | Dropdown with notification list (seeded items) | EMP | P0 |
| NTF-03 | Mark read | Click a notification | Notification marked as read, blue border removed | EMP | P1 |
| NTF-04 | Mark all read | Click "Mark all read" | All notifications cleared, badge count → 0 | EMP | P1 |
| NTF-05 | Navigation from notification | Click notification with link | Navigates to linked entity (case, assignment, etc.) | EMP | P1 |

---

## 8. REPORTS & EXPORT

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| REP-01 | Time report | Navigate to `/reports/time` | 4 charts (by project, by person, daily trend, CAPEX/OPEX pie) | PM | P0 |
| REP-02 | Capitalisation report | Navigate to `/reports/capitalisation` | CAPEX/OPEX table, stacked bar chart, period trend | DM | P0 |
| REP-03 | Utilization report | Navigate to `/reports/utilization` | Person × allocation breakdown | RM | P0 |
| REP-04 | Report builder | Navigate to `/reports/builder` → select data source → add columns | Preview table renders with selected columns | DIR | P1 |
| REP-05 | Export Centre | Navigate to `/reports/export` | 5 report cards with Generate & Download buttons | DIR | P0 |
| REP-06 | Generate headcount export | Click Generate on Headcount Report | XLSX file downloads | DIR | P1 |
| REP-07 | Period lock | Login as admin → navigate to Capitalisation → Create Lock | Lock appears in table, timesheet editing blocked for period | ADM | P2 |

---

## 9. ADMIN & CONFIGURATION

### 9.1 Admin Panel

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| ADM-01 | Admin panel | Navigate to `/admin` | Admin panel with account management, config sections | ADM | P0 |
| ADM-02 | Create account | Fill create account form → submit | New account appears in list | ADM | P1 |
| ADM-03 | Disable account | Toggle enable/disable on an account | Account status changes | ADM | P1 |

### 9.2 Platform Settings

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| SET-01 | Settings page | Navigate to `/admin/settings` | 6+ sections (General, Timesheets, Security, etc.) | ADM | P0 |
| SET-02 | Update setting | Change a setting value → click Save | Setting saved, confirmation shown | ADM | P1 |

### 9.3 Dictionaries

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| DICT-01 | Dictionary list | Navigate to `/admin/dictionaries` | 6 dictionaries listed (grades, roles, skills, etc.) | HR | P0 |
| DICT-02 | Add entry | Select a dictionary → click Add → fill form → save | New entry appears in list | HR | P1 |
| DICT-03 | Toggle entry | Click enable/disable on an entry | Entry status changes | HR | P1 |

### 9.4 Monitoring

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| MON-01 | Monitoring page | Navigate to `/admin/monitoring` | Health checks, readiness, diagnostics sections | ADM | P0 |
| MON-02 | All checks green | Check System Readiness section | All checks passing (8/8 or 9/9) | ADM | P0 |

### 9.5 Business Audit

| # | Test | Steps | Expected | Account | P |
|---|------|-------|----------|---------|---|
| AUD-01 | Audit page | Navigate to `/admin/audit` | Audit timeline or table (may be empty after fresh seed) | ADM | P1 |
| AUD-02 | Audit after action | Perform an action (e.g., update setting) → check audit | New audit record appears with old/new values | ADM | P2 |

---

## 10. NON-FUNCTIONAL TESTS

### 10.1 Performance

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| PERF-01 | Dashboard load time | Login → measure time to first meaningful paint on main dashboard | < 3 seconds | P1 |
| PERF-02 | People directory with 32 records | Navigate to `/people` | Table renders in < 1 second | P1 |
| PERF-03 | No 429 errors | Navigate rapidly between pages | No "Too Many Requests" errors in console | P0 |
| PERF-04 | Sequential trend loading | Open main dashboard → check Network tab | Headcount trend calls are sequential (not 12 parallel) | P1 |

### 10.2 Responsive Layout

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| RESP-01 | Desktop 1920×1080 | Set viewport to 1920×1080 | Full layout, sidebar expanded, 2+ column grids | P1 |
| RESP-02 | Laptop 1280×720 | Set viewport to 1280×720 | Layout adapts, no horizontal scroll | P1 |
| RESP-03 | Tablet 768×1024 | Set viewport to 768×1024 | Sidebar collapses, single column layout | P2 |
| RESP-04 | Sidebar collapse/expand | Click collapse button (◀) → click expand (▶) | Sidebar toggles between expanded and icon-only mode | P0 |
| RESP-05 | Ctrl+B sidebar toggle | Press Ctrl+B | Sidebar toggles | P2 |

### 10.3 Error Handling

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| ERR-01 | 404 page | Navigate to `/nonexistent-page` | "Page not found" message with back button | P1 |
| ERR-02 | API error | Stop backend → navigate to dashboard | Error state shown (not blank page) | P1 |
| ERR-03 | No console errors on clean navigation | Login → visit 5 main pages → check console | No red errors (warnings OK) | P0 |

---

## 11. UX & UI TESTS

### 11.1 Navigation

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| UX-01 | Sidebar groups | Expand/collapse sidebar section groups | Smooth toggle, active route highlighted | P1 |
| UX-02 | Pin favorites | Click star (★) on a sidebar item | Item appears in Favorites section | P2 |
| UX-03 | Command palette | Press Ctrl+K | Command palette opens with search | P1 |
| UX-04 | Breadcrumbs | Navigate to a detail page | Breadcrumb trail shows correct path | P1 |

### 11.2 Visual Consistency

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| UI-01 | Scrollbars | Check sidebar and content scrollbars | Ultra-thin, color-matched (light content / dark sidebar) | P1 |
| UI-02 | Cards and borders | Check section cards across pages | Consistent border radius, shadow, padding | P1 |
| UI-03 | Typography | Check headings, body text, labels | Consistent font sizes, weights per element type | P2 |
| UI-04 | Status badges | Check assignment/project/case status badges | Color-coded consistently (green=active, yellow=pending, red=rejected) | P1 |
| UI-05 | Empty states | Navigate to a page with no data (e.g., filtered to zero) | EmptyState component with description, optional CTA | P1 |
| UI-06 | Loading states | Navigate to a data-heavy page | Skeleton/spinner shown while loading | P1 |

### 11.3 Forms

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| FORM-01 | Required field validation | Submit forms with empty required fields | Validation messages shown | P1 |
| FORM-02 | Date picker locale | Check date inputs | Consistent date format (not locale-mixed) | P2 |
| FORM-03 | Confirmation dialogs | Trigger destructive action (deactivate, delete) | ConfirmDialog appears (not window.confirm) | P1 |
| FORM-04 | Toast notifications | Perform a create/update/delete action | Toast appears with success/error message | P1 |

---

## 12. DATA QUALITY TESTS

| # | Test | Steps | Expected | P |
|---|------|-------|----------|---|
| DQ-01 | No UUIDs in UI | Navigate through all main pages | No raw UUIDs visible — all resolved to names | P0 |
| DQ-02 | No SCREAMING_CASE enums | Check status badges, dropdown labels | All enums humanized (e.g., "Active" not "ACTIVE") | P1 |
| DQ-03 | Dates are formatted | Check all date displays | Consistent format (e.g., "Apr 8, 2026") not ISO strings | P1 |
| DQ-04 | KPI values match data | Compare dashboard KPIs to list page counts | Numbers should match (e.g., Active Projects KPI = project list count) | P0 |
| DQ-05 | Seed data integrity | Check people count in directory | 32 people from phase2 seed | P0 |
| DQ-06 | Assignment counts match | Check main dashboard assignment KPI vs `/assignments` list | Numbers should match | P1 |
| DQ-07 | Timesheet data present | Navigate to `/timesheets` as Ethan Brooks | Seed timesheet entries visible for recent weeks | P0 |
| DQ-08 | Pulse data present | Navigate to Employee Dashboard as Ethan Brooks | Pulse history shows 12 weeks of mood data | P0 |
| DQ-09 | Skills data present | Navigate to person detail for Ethan Brooks | Skills section shows TypeScript, React, NestJS, etc. | P1 |
| DQ-10 | Cases have steps | Navigate to `/cases` → open CASE-0001 | Steps listed (Provision Access, Complete Paperwork, etc.) | P0 |
| DQ-11 | Notification templates seeded | Login as admin → `/admin/notifications` | 15 templates across 3 channels | P1 |
| DQ-12 | Platform settings seeded | Login as admin → `/admin/settings` | 42 settings across all sections with default values | P1 |
| DQ-13 | Metadata dictionaries seeded | Login as HR → `/admin/dictionaries` | 6 dictionaries with entries (grades G7-G14, etc.) | P1 |

---

## Summary

| Category | Test Count | P0 | P1 | P2 |
|----------|-----------|----|----|-----|
| Auth & Security | 18 | 8 | 8 | 2 |
| Organization & People | 16 | 5 | 7 | 4 |
| Projects & Assignments | 21 | 7 | 11 | 3 |
| Work Evidence & Timesheets | 11 | 4 | 6 | 1 |
| Cases & Workflows | 7 | 3 | 2 | 2 |
| Dashboards | 14 | 7 | 7 | 0 |
| Notifications | 5 | 2 | 3 | 0 |
| Reports & Export | 7 | 3 | 3 | 1 |
| Admin & Configuration | 10 | 3 | 4 | 3 |
| Non-Functional | 10 | 2 | 6 | 2 |
| UX & UI | 10 | 0 | 7 | 3 |
| Data Quality | 13 | 5 | 7 | 1 |
| **TOTAL** | **142** | **49** | **71** | **22** |
