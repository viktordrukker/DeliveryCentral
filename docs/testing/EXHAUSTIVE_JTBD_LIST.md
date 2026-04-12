# Exhaustive JTBD Verification List — DeliveryCentral

**Created:** 2026-04-11
**Method:** Derived from codebase analysis of all routes, endpoints, components, and seed data

---

## EMPLOYEE (ethan.brooks@example.com / EmployeePass1!)

### Dashboard & Self-Service
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-01 | See own assignments | Login → /dashboard/employee → check Assignments section | 2 assignments visible with project names, roles, allocation % |
| E-02 | See overallocation warning | Check Allocation KPI card | Red 120% with "Overallocated" message |
| E-03 | See manager info | Check dashboard header | "Manager: Sophia Kim" link visible |
| E-04 | Submit weekly pulse | Click mood emoji → Submit | Toast confirmation, widget shows "Pulse submitted" |
| E-05 | See pulse history | Check "Last 4 weeks" section | Week dates with mood values shown |
| E-06 | View notifications | Click bell icon | Dropdown shows notifications with unread badges |
| E-07 | Mark notification read | Click × on notification | Item removed, badge count decreases |
| E-08 | Navigate to assignment detail | Click "View assignment" link | Assignment detail page loads with correct data |

### Timesheet
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-09 | See current week timesheet | Navigate to /timesheets | Grid shows Mon-Sun for current week |
| E-10 | Auto-fill from assignments | Click "Auto-fill from Assignments" | Project rows populated from active assignments |
| E-11 | Add manual project row | Click "+ Add Row" | New empty project row appears |
| E-12 | Enter hours | Click cell → type hours | Value saved, "Saved" indicator appears |
| E-13 | Toggle CAPEX | Check CAPEX checkbox on row | Row flagged as capital expenditure |
| E-14 | Navigate weeks | Click Prev/Next arrows | Different week loads with its data |
| E-15 | View seeded week data | Navigate to week of 2026-03-24 | Seeded hours visible (6h + 2h daily) |
| E-16 | Submit timesheet | Click "Submit for Approval" | Status changes from DRAFT to SUBMITTED |

### Work Evidence
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-17 | View work evidence list | Navigate to /work-evidence → scroll to table | Table visible with 24+ entries |
| E-18 | Filter evidence by person | Type "Ethan" in Person filter | Only Ethan's evidence shown |
| E-19 | Export evidence XLSX | Click "Export XLSX" | .xlsx file downloads |

### Leave
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-20 | Request leave | Navigate to /leave → fill form → submit | Leave request created, appears in "My Leave Requests" |
| E-21 | View leave requests | Check "My Leave Requests" section | List shows submitted requests |

### People & Org
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-22 | View people directory | Navigate to /people | Table with 32 people |
| E-23 | View own profile | Click own name or navigate to /people/:id | Profile shows name, org unit, manager, skills |
| E-24 | View org chart | Navigate to /org | Interactive chart renders |
| E-25 | Cannot access admin pages | Check sidebar | No ADMIN section visible |

### Account
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| E-26 | View account settings | Navigate to /settings/account | Password change form visible |
| E-27 | Change password | Enter current + new password → submit | Password changed, can re-login |

---

## PROJECT MANAGER (lucas.reed@example.com / ProjectMgrPass1!)

### Dashboard
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| PM-01 | See PM dashboard | Login → auto-redirect or /dashboard/project-manager | PM-specific KPIs, charts, project list |
| PM-02 | See staffing gaps | Check staffing gap KPIs and list | Gap count > 0, projects with gaps listed |
| PM-03 | See evidence anomalies | Check anomaly KPIs | Anomaly count visible |
| PM-04 | See nearing-closure projects | Check nearing-closure section | Projects closing within 30 days flagged |

### Projects
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| PM-05 | View projects list | Navigate to /projects | 12 projects with status badges |
| PM-06 | Create project | /projects/new → fill name, PM, start date, description → submit | Project created, redirect to detail page |
| PM-07 | View project detail | Click project name | 6-tab detail page (Summary, Team, Timeline, Evidence, Budget, History) |
| PM-08 | Activate draft project | Open DRAFT project → click "Activate" | Status changes to ACTIVE |
| PM-09 | Close project | Open ACTIVE project → click "Close project" | Status changes to CLOSED |
| PM-10 | View project dashboard | Click "Open project dashboard" | Dashboard with evidence charts, allocation breakdown |
| PM-11 | View project health | Check health badge on project list | Green/yellow/red emoji indicator |

### Assignments
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| PM-12 | View assignments | Navigate to /assignments | 22 assignments listed |
| PM-13 | Create assignment | /assignments/new → fill person, project, role, allocation, dates → submit | Assignment created with REQUESTED status |
| PM-14 | View assignment detail | Click assignment row | Detail page with history timeline |
| PM-15 | Approve assignment | Open REQUESTED assignment → click Approve | Status changes to APPROVED/ACTIVE |
| PM-16 | Reject assignment | Open REQUESTED assignment → click Reject → enter reason | Status changes to REJECTED |
| PM-17 | End assignment | Open ACTIVE assignment → click End | Status changes to ENDED |
| PM-18 | Bulk assign | /assignments/bulk → add multiple entries → submit | Multiple assignments created |

### Planned vs Actual
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| PM-19 | View planned vs actual | Navigate to /dashboard/planned-vs-actual | Tabbed table with Matched, No Evidence, No Assignment, Anomalies |
| PM-20 | Switch tabs | Click each tab | Content changes, counts update |
| PM-21 | Expand row | Click a row | Detail panel opens below |
| PM-22 | Filter by project | Select project from dropdown | Table filtered |

### Staffing Requests
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| PM-23 | Create staffing request | /staffing-requests/new → fill → submit | Request created with DRAFT status |
| PM-24 | Submit request | Open DRAFT → click Submit | Status changes to OPEN |

---

## RESOURCE MANAGER (sophia.kim@example.com / ResourceMgrPass1!)

### Dashboard
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| RM-01 | See RM dashboard | Login → /dashboard/resource-manager | Capacity KPIs, allocation heatmap |
| RM-02 | See idle people | Check idle people list | People with < 20% allocation listed |
| RM-03 | See overallocation alerts | Check overallocation section | People exceeding 100% flagged |
| RM-04 | Quick assign from dashboard | Click quick-assign action | Assignment modal appears |

### Workload
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| RM-05 | View workload matrix | Navigate to /workload | Person × project heatmap |
| RM-06 | View workload planning | Navigate to /workload/planning | 12-week forward timeline |
| RM-07 | Check allocation conflict | Drag assignment on staffing board | Conflict highlighted in red if > 100% |

### Staffing Board
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| RM-08 | View staffing board | Navigate to /staffing-board | 12-week grid with person swimlanes |
| RM-09 | Drag assignment | Drag bar to different week | Assignment moved, conflict check runs |

### Resource Pools
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| RM-10 | View resource pools | Navigate to /resource-pools | 4 pools listed |
| RM-11 | View pool detail | Click a pool | Members, assignments, capacity |
| RM-12 | Add member to pool | Click "Add member" on pool detail | Person added |

### Staffing Requests
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| RM-13 | Review staffing requests | Navigate to /staffing-requests | 6 requests with status |
| RM-14 | View request detail | Click a request | Skill suggestions panel visible |
| RM-15 | Propose candidate | View suggestion panel → select candidate | Fulfillment recorded |

---

## HR MANAGER (diana.walsh@example.com / HrManagerPass1!)

### Dashboard
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| HR-01 | See HR dashboard | Login → /dashboard/hr | Headcount, org distribution, mood heatmap |
| HR-02 | See grade distribution | Check grade breakdown | Grades G7-G14 with counts |
| HR-03 | See role distribution | Check role distribution chart | Role categories with counts |
| HR-04 | See mood heatmap | Check team mood section | Person × week grid with mood colors |
| HR-05 | See at-risk employees | Check at-risk alerts | People with mood ≤ 2 for 2+ weeks flagged |

### People Management
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| HR-06 | Create employee | Navigate to /people/new → fill form → submit | New person created, appears in directory |
| HR-07 | View employee detail | Click person name → Overview tab | Profile with name, email, org unit, manager |
| HR-08 | View 360 tab | Click "360 View" tab on person detail | Mood, workload, hours trends (12 weeks) |
| HR-09 | View skills tab | Click "Skills" tab on person detail | Skills with proficiency levels |
| HR-10 | Deactivate employee | Click "Deactivate employee" on person detail | Status changes to INACTIVE |
| HR-11 | Terminate employee | Click "Terminate employee" on person detail | Status changes to TERMINATED |
| HR-12 | Find orphaned people | Filter people directory for "No line manager" | Alex Morgan, Ava Rowe shown |

### Cases
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| HR-13 | View cases list | Navigate to /cases | 3 cases listed |
| HR-14 | Create case | /cases/new → select type, subject, owner → submit | Case created with auto-generated steps |
| HR-15 | View case detail | Click "Open case" | Steps, SLA, participants visible |
| HR-16 | Complete case step | Click "Complete" on an open step | Step marked COMPLETED with timestamp |
| HR-17 | Close case | Click "Close Case" on case detail | Status changes to CLOSED |
| HR-18 | View case SLA | Check SLA indicator on case detail | Countdown timer with color (green/yellow/red) |

### Dictionaries
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| HR-19 | View dictionaries | Navigate to /admin/dictionaries | 6 dictionaries listed |
| HR-20 | View dictionary entries | Click a dictionary | Entries table with key, value, status |
| HR-21 | Add dictionary entry | Fill "Add Entry" form → click "Add entry" | New entry appears in list |
| HR-22 | Disable entry | Click "Disable" on an entry | Entry status changes to Disabled |

### Reports
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| HR-23 | View utilization report | Navigate to /reports/utilization | Person × hours breakdown |
| HR-24 | Export people directory | Navigate to /reports/export → Headcount Report → Generate | XLSX downloads |

---

## DELIVERY MANAGER (carlos.vega@example.com / DeliveryMgrPass1!)

### Dashboard
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| DM-01 | See DM dashboard | Login → /dashboard/delivery-manager | Team KPIs, burn rate, staffing gaps |
| DM-02 | See burn rate trend | Check burn rate chart | 8-week line chart with evidence entries |
| DM-03 | See staffing gaps table | Check staffing gaps section | Projects with open positions listed |
| DM-04 | See open requests | Check open requests section | Staffing request status breakdown |

### Teams
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| DM-05 | View teams | Navigate to /teams | 4 teams with member counts |
| DM-06 | View team dashboard | Click "Open team dashboard" | Team metrics, member allocation |
| DM-07 | Add team member | Click "Add member" on team | Member added, count increases |
| DM-08 | Remove team member | Click "Remove" on member | Member removed, count decreases |

### Capitalisation
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| DM-09 | View capitalisation report | Navigate to /reports/capitalisation | CAPEX/OPEX table, charts |
| DM-10 | Export capitalisation XLSX | Click Export XLSX | File downloads |

---

## DIRECTOR (noah.bennett@example.com / DirectorPass1!)

### Dashboard
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| DIR-01 | See director dashboard | Login → /dashboard/director | Org-wide KPIs, portfolio table |
| DIR-02 | See total headcount | Check headcount KPI | Number > 0 |
| DIR-03 | See FTE trend | Check FTE trend chart | Line chart with data points |
| DIR-04 | See portfolio summary | Check portfolio table | Projects with status, health, cost |

### Cross-Org Access
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| DIR-05 | Access all pages | Check sidebar for all sections | All groups visible |
| DIR-06 | View business audit | Navigate to /admin/audit | Audit records visible |
| DIR-07 | View exceptions | Navigate to /exceptions | Exception queue visible |

---

## ADMIN (admin@deliverycentral.local / DeliveryCentral@Admin1)

### Platform Settings
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-01 | Change setting value | /admin/settings → change field → Save | PATCH 200, value persists on refresh |
| ADM-02 | View all setting sections | Scroll through settings page | General, Timesheets, Capitalisation, Pulse, Notifications, Security sections visible |

### User Management
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-03 | View accounts | Navigate to /admin → Accounts section | 8 accounts listed |
| ADM-04 | Create account | Fill create form → submit | New account appears in list |
| ADM-05 | Disable account | Toggle enable/disable | Account status changes |
| ADM-06 | Impersonate user | Select person from "View as..." dropdown | Dashboard and sidebar change to impersonated role |

### Monitoring
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-07 | System health | Navigate to /admin/monitoring | All checks green |
| ADM-08 | Database connectivity | Check Database card | "Connected" with latency |
| ADM-09 | Migration status | Check Migration Sanity card | "0 pending" |

### Integrations
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-10 | View integration status | Navigate to /admin/integrations | Jira, M365, Radius cards |
| ADM-11 | Trigger sync | Click sync button on integration card | Sync runs (or appropriate error) |

### Webhooks
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-12 | View webhooks | Navigate to /admin/webhooks | Subscription list |
| ADM-13 | Create webhook | Fill form → submit | Subscription created |

### Bulk Import
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-14 | View bulk import | Navigate to /admin/people/import | CSV upload form |

### Notifications Admin
| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| ADM-15 | View notification templates | Navigate to /admin/notifications | 15 templates listed |
| ADM-16 | View notification queue | Check queue section | Queue with status filters |

---

## CROSS-ROLE WORKFLOWS

| ID | JTBD | Test Steps | Verify |
|----|------|-----------|--------|
| CR-01 | PM creates project → visible in registry | Login PM → create → Login anyone → /projects | New project in list |
| CR-02 | HR creates employee → visible in directory | Login HR → create → Login anyone → /people | New person in list |
| CR-03 | Employee submits timesheet → PM can approve | Login EMP → submit → Login PM → /timesheets/approval | Timesheet appears in approval queue |
| CR-04 | Settings change → reflected in app | Login ADM → change setting → verify behavior changes | Setting affects platform behavior |
| CR-05 | Case created → notification sent | Login HR → create case → Login subject → check bell | Notification in inbox |

---

**TOTAL JTBDs: 107**
- Employee: 27
- Project Manager: 24
- Resource Manager: 15
- HR Manager: 24
- Delivery Manager: 10
- Director: 7
- Admin: 16
- Cross-role: 5
