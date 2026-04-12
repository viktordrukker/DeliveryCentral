# Manual Smoke Checklist

## Purpose

This checklist is for fast human verification in local, dev, or staging environments after a deployment or before a demo.

## Preconditions

- backend is running
- frontend is running
- demo dataset is available
- if using the database-backed seed path, run:

```bash
npm run db:seed
```

For the full staffing UAT path, also review:

- [uat-happy-path-staffing.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-happy-path-staffing.md)
- [uat-dashboards.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-dashboards.md)

## Key Demo Records

Use these seeded records during smoke checks:

- person with no assignment: `Zoe Turner`
- person with dotted-line manager: `Ethan Brooks`
- person with approved assignment but no evidence: `Mia Lopez`
- person with evidence but no approved assignment: `Harper Ali`
- project with no assignments: `PRJ-100 / Internal Bench Planning`
- Jira-linked project: `PRJ-102 / Atlas ERP Rollout`

## Platform Smoke

- Open `/`
- Confirm dashboard loads without console-breaking errors
- Confirm top navigation and sidebar render
- Confirm page links navigate correctly

## Employee Directory

Route: `/people`

- Confirm employee list loads
- Search for `Zoe Turner`
- Confirm row count changes or filtered results are visible
- Open `Zoe Turner`
- Confirm employee details page loads

Expected checks:

- org unit is shown
- line manager is shown or empty state is sensible
- dotted-line summary is shown if present
- active assignment count is shown

## Employee Details

Route: `/people/:id`

Use `Ethan Brooks`

- Confirm page title shows person name
- Confirm current org unit is displayed
- Confirm line manager is displayed
- Confirm dotted-line summary includes `Lucas Reed`
- Confirm placeholder sections are visibly labeled as placeholders, not real data

## Project Registry

Route: `/projects`

- Search for `Internal Bench Planning`
- Confirm internal project row appears
- Confirm external link summary does not dominate the row
- Search for `Atlas ERP Rollout`
- Confirm Jira link summary appears as secondary information

## Project Details

Route: `/projects/:id`

Use:

- `Internal Bench Planning`
- `Atlas ERP Rollout`

Checks:

- project summary loads
- status is visible
- assignment count is visible
- external links section is present
- internal-only project shows no external links
- Jira-linked project shows external link details in the dedicated section

## Assignment Creation

Route: `/assignments/new`

Create a new assignment for:

- requester: `Liam Patel`
- person: `Zoe Turner`
- project: `Internal Bench Planning`
- role: `Consultant`
- allocation: `25`
- start date: `2025-04-01`

Checks:

- selectors load from API, not hardcoded lists
- inline validation appears for blank form submit
- successful submit shows `REQUESTED`
- new assignment appears in `/assignments`

## Assignment Approval

Route: `/assignments/:id`

Use the assignment created above.

- Open assignment detail page
- Confirm current approval state is visible
- Enter workflow actor
- Approve assignment
- Confirm success message appears
- Refresh page
- Confirm state remains `APPROVED`

Negative smoke:

- try approving the same assignment again
- confirm invalid transition is blocked with a clear error

## Staffing UAT Path

Use this as the highest-value manual happy path when validating staffing operations after a deployment or before stakeholder review.

Suggested sequence:

1. create an employee from the admin employee lifecycle UI or `POST /org/people`
2. assign a solid-line manager with effective date
3. create a project and activate it
4. create an assignment for the new employee
5. approve the assignment
6. confirm the employee dashboard shows the assignment during the staffed period
7. confirm the line manager scope includes the employee
8. record manual work evidence for the staffed employee/project pair
9. end the assignment
10. confirm notification outcomes are visible in admin notifications
11. confirm business audit records are visible in admin audit browsing

Useful UI routes during this sequence:

- employee admin create: `/admin/people/new`
- employee detail and reporting-line management: `/people/:id`
- project registry and details: `/projects` and `/projects/:id`
- employee dashboard: `/dashboard/employee`
- notifications admin: `/admin/notifications`
- business audit browsing: `/admin/audit`

Expected checks:

- employee remains distinct from reporting-line setup
- project remains the internal source of project truth
- assignment state changes are explicit and readable
- work evidence appears without mutating assignment truth
- notification outcomes show workflow send results without exposing secrets
- business audit shows business actions, not technical log noise

Current limitation to account for during manual UAT:

- notifications are currently validated as recorded workflow outcomes routed to configured operational recipients
- the platform does not yet provide person-specific employee/resource-manager notification targeting for this happy path

## Manager Scope

Route: `/org/managers/:id/scope`

Use manager `Liam Patel` when testing newly created assignment visibility, and seeded managers for general scope checks.

Checks:

- manager summary loads
- direct reports section is populated if applicable
- dotted-line section is separate from direct reports
- quick links to person details work
- quick links to assignments open filtered results

## Work Evidence

Route: `/work-evidence`

Create manual evidence for:

- person: `Zoe Turner`
- project: `Internal Bench Planning`
- source: `MANUAL`

Checks:

- work evidence form submits successfully
- observed work table updates after submit
- source is explicitly visible
- work evidence appears without mutating assignment status

## Planned vs Actual

Route: `/dashboard/planned-vs-actual`

Checks:

- filter by project and/or person works
- `assigned but no evidence` is shown for seeded cases where expected
- `evidence but no approved assignment` includes `Harper Ali`
- after creating and approving assignment plus recording evidence for `Zoe Turner`, matched output becomes visible
- categories remain clearly separated

## Dashboard

Route: `/`

Checks:

- summary cards load
- `projects with no staff` includes `Internal Bench Planning` before manual assignment creation
- `people with no active assignments` includes `Zoe Turner` before manual assignment creation
- quick links navigate to people, projects, assignments, and planned-vs-actual pages

## Role Dashboard UAT

Use this as the manual dashboard validation pass after the role UAT dataset has been created.

Reference:

- [uat-dashboards.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-dashboards.md)

### Project Manager Dashboard

Route: `/dashboard/project-manager`

Use `Sophia Kim`

Checks:

- managed projects list is populated
- `UAT Staffing Scenario Project` is visible during the July 2025 staffing snapshot
- staffing gaps remain visible as a dedicated section
- evidence anomalies remain visible as a dedicated section

### Resource Manager Dashboard

Route: `/dashboard/resource-manager`

Use `Olivia Chen`

Checks:

- managed team summary is visible
- `Engineering Pool` is visible
- people without assignments remain visible
- cross-project team spread remains visible

### HR Dashboard

Route: `/dashboard/hr`

Use `Emma Garcia`

Checks:

- headcount summary is visible
- org distribution is visible
- roles and grades are visible
- people-data governance signals remain visible
- after the anomaly UAT pack, `Uat Inactive Employee` and `Uat Active Employee` appear in the missing-manager view

### Team Dashboard

Route: `/teams/26666666-0000-0000-0000-000000000001/dashboard`

Checks:

- `Engineering Pool` dashboard loads
- member count, active assignments count, and project count are visible
- people with no assignments are visible
- anomaly summary is visible
- project and people navigation links are usable

### Admin Operator Views

Routes:

- `/admin/monitoring`
- `/admin/notifications`
- `/admin/integrations`
- `/exceptions`
- `/admin/audit`

Checks:

- monitoring shows database, integration, and notification health summaries
- notifications page shows recent outcomes for assignment/project workflow events
- integrations page shows failed `M365` sync history if the anomaly UAT pack was run
- exception queue shows staffing/project anomaly categories clearly
- audit browsing shows the business actions behind the dashboard-visible scenario

## Jira Integration Status

Route: `/integrations`

Checks:

- Jira status card loads
- last sync outcome is visible
- trigger sync action runs without exposing secrets
- after a successful sync, status summary updates

Risk check:

- confirm no staffing page changed just because project sync ran

## Metadata Admin

Route: `/metadata-admin`

Checks:

- dictionary list loads
- selecting a dictionary loads entry details
- entries show active/inactive state clearly
- related custom fields, workflows, and layouts are visible
- add/edit scaffolding is visibly disabled or placeholder-only where write APIs do not exist

## Known Risk Checks

Run these explicitly during smoke:

- assignment and work evidence remain separate
- org changes do not erase historical manager truth
- Jira sync updates project registry state only
- metadata pages do not hardcode business dictionary values in the UI
