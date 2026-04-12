> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# Delivery Central — Data Discrepancy & Wiring Fixes Backlog

> **Purpose:** Investor-demo-ready fix list. Every item is a verified finding with reproduction steps, root cause analysis, and acceptance criteria written for Claude Code implementation.
>
> **Generated:** 2026-04-07
>
> **Priority scale:** P0 = demo blocker, P1 = high visibility, P2 = polish

---

## Epic 1 — Main Dashboard Phantom Data (P0)

### 1.1 Replace phantom seed data in workload summary endpoint

**Finding:** `GET /api/dashboard/workload/summary` returns a completely fabricated dataset: 6 fake projects (PRJ-100 through PRJ-105), 0 assignments, and 12 people — 7 of whom do not exist anywhere else in the system (Ava Rowe, Olivia Chen, Liam Patel, Mason Singh, Mia Lopez, Harper Ali, Zoe Turner). Meanwhile, entity-level endpoints return the real data: 8 projects, 23 assignments, 21 people.

**Root cause:** The summary endpoint likely reads from a hard-coded seed fixture or a separate denormalized table that was never updated after real seed data was introduced. The entity endpoints (`/api/projects`, `/api/assignments`, `/api/org/people`) query live Prisma models.

**Reproduction:**
1. Log in as any user (admin, director, PM, etc.)
2. Navigate to `/` (main dashboard)
3. Observe: Workload Distribution chart shows PRJ-100 through PRJ-105 with people not in the directory
4. Compare with: `/api/projects` returns NovaBridge, Orion, Titan, etc.

**Fix:**
- Locate the workload summary service/resolver (likely in `backend/src/dashboard/` module)
- Replace the static/fixture data source with a live aggregation query joining `Project`, `Assignment`, and `Person` tables
- Ensure the endpoint respects the same RBAC scoping as other dashboard endpoints
- Delete the phantom fixture data (PRJ-100 through PRJ-105 and the 7 non-existent people)

**Acceptance criteria:**
- [ ] `GET /api/dashboard/workload/summary` returns the same project set as `GET /api/projects`
- [ ] All people referenced in the summary exist in `GET /api/org/people`
- [ ] Assignment count matches `GET /api/assignments` (currently 23)
- [ ] No hard-coded project codes (PRJ-1xx) remain in the codebase

**Effort:** 3h

---

### 1.2 Workload Matrix shows "No active assignments" despite 23 existing

**Finding:** The Workload Matrix visualization on the main dashboard displays "No active assignments found" for every user, even though 23 assignments exist and are returned by `/api/assignments`.

**Root cause:** Likely the same phantom-data issue as 1.1 — the matrix queries the summary endpoint which returns 0 assignments, or it applies a filter (date range, status) that excludes all real assignments.

**Reproduction:**
1. Log in as admin
2. Navigate to `/` → scroll to Workload Matrix section
3. Observe: "No active assignments found"
4. Verify: `GET /api/assignments` returns 23 records

**Fix:**
- Wire the Workload Matrix component to use live assignment data
- Verify date/status filters match the actual assignment states in the database
- Ensure the matrix populates with the same 23 assignments visible elsewhere

**Acceptance criteria:**
- [ ] Workload Matrix displays all active assignments
- [ ] Matrix people axis matches the real people directory
- [ ] Matrix project axis matches real project list

**Effort:** 2h

---

## Epic 2 — Role Dashboard Defaults (P0)

### 2.1 PM/RM/HR dashboards default to wrong person

**Finding:** When a Project Manager (Lucas Reed), Resource Manager (Sophia Kim), or HR Manager (Diana Walsh) logs in and navigates to their role dashboard, the person selector defaults to Alex Torres (the first person alphabetically, ID `22222222-0000-0000-0000-000000000002`) instead of the logged-in user. Alex Torres holds none of these roles, so all role-specific panels (My Projects, My Team, HR Metrics, etc.) show empty data.

**Root cause:** The person selector dropdown initializes with `people[0]` (first alphabetically) rather than matching the authenticated user's `personId` from the JWT token or session.

**Reproduction:**
1. Log in as `lucas.reed@example.com` (PM)
2. Navigate to PM Dashboard
3. Observe: Person selector shows "Alex Torres", all panels empty
4. Manually switch selector to "Lucas Reed" → data appears correctly

**Fix:**
- In each role dashboard component (PM, RM, HR), read the authenticated user's `personId` from the auth context/JWT
- Set the person selector's default value to the logged-in user's ID
- Fall back to `people[0]` only if the logged-in user is an admin viewing someone else's dashboard

**Acceptance criteria:**
- [ ] PM dashboard defaults to logged-in PM's profile
- [ ] RM dashboard defaults to logged-in RM's profile
- [ ] HR dashboard defaults to logged-in HR manager's profile
- [ ] Admin viewing role dashboards can still switch between people
- [ ] Dual-role user (Emma Garcia) sees correct default on both RM and HR dashboards

**Effort:** 2h

---

## Epic 3 — Project Data Wiring (P0)

### 3.1 Team tab filter mismatch with assignment badge count

**Finding:** NovaBridge project page header shows "7 Current Assignments" in the badge, but the Team tab displays "No approved assignments found." The badge counts all assignments regardless of `approval_state`, while the Team tab filters for `approval_state = 'approved'` only.

**Root cause:** Two different queries with inconsistent WHERE clauses — the badge query counts all assignments for the project, while the team list query adds `WHERE approval_state = 'approved'`.

**Reproduction:**
1. Log in as admin
2. Navigate to Projects → NovaBridge → Team tab
3. Observe: Header badge says "7 Current Assignments", table says "No approved assignments found"

**Fix:**
- Align the badge count and the team list to use the same filter
- Recommended: show all assignments in the team list with an `approval_state` column/badge so managers can see pending vs approved
- Alternative: filter both badge and list by `approved` only (but then badge would show 0, which is also a problem — the real fix is ensuring assignments have correct approval states)
- Audit all assignment `approval_state` values — if none are `approved`, the seed data is missing this field

**Acceptance criteria:**
- [ ] Badge count matches the number of rows displayed in Team tab
- [ ] Team tab shows all assignments with their approval status visible
- [ ] If filtering is used, badge and list use the same filter

**Effort:** 2h

---

### 3.2 Budget tab shows misleading "$0.00 remaining" when no budget is set

**Finding:** Project budget tab displays "On track — Remaining budget: $0.00" when no budget has been configured. This falsely implies the budget exists and is fully consumed, rather than indicating no budget is set.

**Root cause:** The component renders `$0.00` as the default when the budget field is null/undefined, without distinguishing between "zero budget" and "no budget configured."

**Reproduction:**
1. Navigate to any project → Budget tab
2. Observe: "On track — Remaining budget: $0.00"

**Fix:**
- Check if `project.budget` is null/undefined vs explicitly zero
- When null: display "No budget configured" with a prompt to set one
- When zero: display "$0.00" as current behavior
- When set: display actual remaining calculation

**Acceptance criteria:**
- [ ] Projects without a budget show "No budget configured" instead of "$0.00"
- [ ] Projects with an explicit budget show the correct remaining amount
- [ ] "On track" status only appears when a budget exists and spend is within bounds

**Effort:** 1h

---

## Epic 4 — Staffing Requests (P0)

### 4.1 Raw UUIDs displayed instead of project names

**Finding:** The Staffing Requests page shows raw UUIDs in the Project column (e.g., `33333333-3333-3333-3333-333333333002`) instead of resolved project names.

**Root cause:** The staffing request entity stores `projectId` as a foreign key but the frontend displays it directly without joining/resolving to the project name.

**Reproduction:**
1. Log in as admin or RM
2. Navigate to Staffing Requests
3. Observe: Project column shows UUIDs

**Fix:**
- Backend: Ensure the staffing requests endpoint includes a `project` relation (Prisma `include: { project: true }`) or a `projectName` field
- Frontend: Display `request.project.name` instead of `request.projectId`

**Acceptance criteria:**
- [ ] All staffing requests show human-readable project names
- [ ] No raw UUIDs visible anywhere on the Staffing Requests page

**Effort:** 1h

---

### 4.2 Duplicate staffing request rows

**Finding:** The same staffing request appears 7 times in the list, creating a wall of identical rows.

**Root cause:** Either the seed data inserted 7 duplicate records, or the query joins produce a cartesian product (e.g., joining through a many-to-many without DISTINCT).

**Reproduction:**
1. Navigate to Staffing Requests
2. Observe: 7 identical rows for the same request

**Fix:**
- Check the `StaffingRequest` table for duplicate rows — if present, deduplicate the seed data
- If the query produces duplicates via joins, add DISTINCT or fix the join logic
- Add a unique constraint on the natural key (e.g., `projectId` + `role` + `requestDate`) to prevent future duplicates

**Acceptance criteria:**
- [ ] No duplicate rows in the Staffing Requests list
- [ ] Database has unique constraint preventing duplicate staffing requests
- [ ] Seed data contains only unique records

**Effort:** 1.5h

---

## Epic 5 — Person Profile Data Gaps (P1)

### 5.1 Work evidence records not linked to person profiles

**Finding:** Every person's profile Overview tab shows "No work evidence records found," yet 114 work evidence records exist globally in the system. The evidence data exists but is not wired to the person profile view.

**Root cause:** The person profile endpoint either doesn't include work evidence in its response, or the frontend component doesn't fetch/display it. The 114 records likely have `personId` foreign keys but the profile query omits the relation.

**Reproduction:**
1. Navigate to any person's profile → Overview tab
2. Observe: "No work evidence records found"
3. Verify: Work evidence records exist in the database (114 total)

**Fix:**
- Backend: Include work evidence relation in the person profile endpoint (`include: { workEvidence: true }`)
- Frontend: Wire the evidence data to the Overview tab's evidence section
- Ensure evidence is sorted by date descending

**Acceptance criteria:**
- [ ] Person profiles display their associated work evidence records
- [ ] Evidence records show relevant details (date, type, description)
- [ ] At least some people have visible evidence records after the fix

**Effort:** 2h

---

### 5.2 Person profile pages crash or show empty for some people

**Finding:** During systematic iteration through all 21 people, several profiles failed to load or showed empty/missing data sections. This particularly affects people from the third UUID wave (`22222222-*`).

**Root cause:** Incomplete seed data for newer people records — some have user accounts but incomplete person profiles (missing department, manager, role assignments, etc.).

**Reproduction:**
1. Navigate to People directory
2. Click through each person systematically
3. Note which profiles show missing data sections

**Fix:**
- Audit all `Person` records for required field completeness (name, email, department, managerId, role)
- Fill in missing fields in seed data
- Add NOT NULL constraints where appropriate in Prisma schema
- Add frontend graceful fallbacks for any truly optional fields

**Acceptance criteria:**
- [ ] All 21 people have complete, loadable profiles
- [ ] No empty sections where data should exist
- [ ] Database schema enforces required fields

**Effort:** 3h

---

## Epic 6 — Org Chart Data Integrity (P1)

### 6.1 Missing manager relationships

**Finding:** HR Dashboard reports "2 without manager" out of 21 employees, but there is no way to identify which employees are missing managers from any UI surface. Additionally, the org chart may show disconnected nodes for people without manager assignments.

**Root cause:** Some person records have null `managerId`, and no dashboard or report surfaces this information actionably.

**Reproduction:**
1. Log in as HR manager (Diana Walsh)
2. Select Diana Walsh in the person selector
3. View HR Dashboard → note "2 without manager" stat
4. No click-through or drill-down to see which 2

**Fix:**
- Add a drill-down/click-through on the "without manager" metric to show the specific people
- Assign managers to the 2 orphaned employees in seed data (or flag them as top-level if they're C-suite)
- Ensure org chart handles null `managerId` gracefully (shows as root node or "Unassigned" group)

**Acceptance criteria:**
- [ ] "Without manager" metric is clickable and shows the specific people
- [ ] All non-executive employees have a manager assigned
- [ ] Org chart renders without disconnected/missing nodes

**Effort:** 2h

---

### 6.2 HR Dashboard doesn't identify inactive employees

**Finding:** HR Dashboard shows "20 active, 1 inactive" but provides no way to see which employee is inactive. The inactive status could be important for assignment auditing and resource planning.

**Root cause:** The dashboard shows aggregate counts without drill-down capability.

**Reproduction:**
1. View HR Dashboard with Diana Walsh selected
2. Note: "21 headcount, 20 active, 1 inactive"
3. No way to filter or identify the inactive person

**Fix:**
- Add filter/drill-down on active/inactive status metrics
- Show status badge on the People directory list
- Ensure inactive employees are excluded from assignment eligibility

**Acceptance criteria:**
- [ ] Active/inactive metrics are clickable with drill-down
- [ ] People directory shows active/inactive status
- [ ] Inactive employees are visually distinguished

**Effort:** 1.5h

---

## Epic 7 — Data Consistency Across Views (P1)

### 7.1 Director Dashboard vs Main Dashboard count mismatch

**Finding:** Director (DM) Dashboard shows 7 Active Projects and 20 Active Assignments, while the main dashboard shows 6 projects and 0 assignments. These should show consistent data for the same user.

**Root cause:** DM Dashboard queries live data correctly; main dashboard uses the phantom seed data (see Epic 1). This is a downstream symptom of 1.1, but worth noting as a separate verification point.

**Reproduction:**
1. Log in as Noah Bennett (director)
2. View main dashboard `/` → 6 projects, 0 assignments
3. View DM dashboard → 7 projects, 20 assignments

**Fix:**
- Resolving Epic 1 (1.1) should fix this, but verify after that fix
- Confirm project counts align: DM sees 7 (scoped to their org), main should show the same or global count (8)

**Acceptance criteria:**
- [ ] Main dashboard and DM dashboard show consistent project/assignment counts
- [ ] Any count differences are explainable by scoping rules (global vs org-scoped)

**Effort:** 0.5h (verification after Epic 1 fix)

---

### 7.2 Resource Pools vs Teams member count discrepancy

**Finding:** Resource Pools page shows 2 pools: Engineering (4 members), Consulting (4 members). Teams page shows 3 teams: Data Pool (2), Design & UX (1), Engineering Pool (8). Engineering shows 4 members in Pools but 8 in Teams — these appear to be the same concept with different data sources.

**Root cause:** Pools and Teams may be separate database entities that should be unified, or they represent different groupings that aren't clearly distinguished in the UI. The member counts diverge because they query different relations.

**Reproduction:**
1. Navigate to Resource Pools → Engineering: 4 members
2. Navigate to Teams → Engineering Pool: 8 members
3. Note the discrepancy

**Fix:**
- Clarify the domain model: are Pools and Teams the same entity or different?
- If the same: unify the data source and remove duplication
- If different: clearly label each in the UI to prevent confusion (e.g., "Resource Pool" vs "Project Team")
- Reconcile member counts to match reality

**Acceptance criteria:**
- [ ] Pools and Teams have clearly differentiated purpose in the UI
- [ ] Member counts are accurate and traceable
- [ ] No unexplained discrepancies between similar-looking views

**Effort:** 2h

---

### 7.3 Ethan Brooks at 120% allocation — no manager alert

**Finding:** Ethan Brooks shows 120% allocation on his employee dashboard (overallocation flag visible). However, no PM, RM, or Director dashboard surfaces an alert about this overallocation. Managers have no visibility into resource overallocation.

**Root cause:** The overallocation calculation exists per-employee but is not aggregated or surfaced on any manager-facing dashboard.

**Reproduction:**
1. Log in as Ethan Brooks → Employee Dashboard shows 120% allocation
2. Log in as any manager → no overallocation alert anywhere

**Fix:**
- Add an "Overallocated Resources" alert/widget to PM, RM, and Director dashboards
- Flag any person with total allocation > 100%
- Include: person name, current allocation %, list of contributing assignments

**Acceptance criteria:**
- [ ] Manager dashboards show overallocation alerts
- [ ] Ethan Brooks (120%) appears in the alert
- [ ] Alert includes actionable details (which assignments cause overallocation)

**Effort:** 3h

---

## Epic 8 — Navigation & Session Issues (P1)

### 8.1 Employee role cannot access main dashboard

**Finding:** When logged in as an employee (Ethan Brooks) and navigating to `/`, the user is redirected to the login page instead of seeing a dashboard. All other roles can access `/` normally.

**Root cause:** The route guard for `/` likely checks for a role not in the employee's permission set, or the main dashboard component requires a role that employees don't have.

**Reproduction:**
1. Log in as `ethan.brooks@example.com` (employee)
2. Navigate to `/`
3. Observe: redirected to login page

**Fix:**
- Update the route guard to allow the employee role to access `/`
- Or redirect employees to `/dashboard/employee` instead of blocking access
- Ensure the redirect doesn't clear the session

**Acceptance criteria:**
- [ ] Employees can navigate to `/` without being redirected to login
- [ ] Employee sees an appropriate dashboard (either main dashboard with their scope, or auto-redirect to employee dashboard)

**Effort:** 1h

---

### 8.2 Sign out does not clear session or redirect

**Finding:** Clicking the Sign Out button does not properly terminate the session. The httpOnly cookie persists, and the user is not redirected to the login page.

**Root cause:** The sign-out handler likely only clears client-side state (React context, localStorage token) but doesn't call the backend's logout endpoint to invalidate the httpOnly refresh cookie, and doesn't force a redirect.

**Reproduction:**
1. Log in as any user
2. Click Sign Out in the sidebar
3. Observe: no redirect to login, session may still be valid

**Fix:**
- Backend: Implement `POST /api/auth/logout` that clears the httpOnly cookie (`Set-Cookie: token=; Max-Age=0; HttpOnly`)
- Frontend: Call the logout endpoint, clear all client-side auth state, redirect to `/login`

**Acceptance criteria:**
- [ ] Sign out clears the httpOnly session cookie
- [ ] User is redirected to login page after sign out
- [ ] Navigating to any protected route after sign out redirects to login

**Effort:** 1.5h

---

### 8.3 Sidebar has duplicate navigation links for employees

**Finding:** The employee sidebar shows both "My Dashboard" and "Employee Dashboard" links that navigate to the same route (`/dashboard/employee`). This is confusing and wastes precious sidebar space.

**Root cause:** The navigation config (`frontend/src/app/navigation.ts`) likely defines both entries without deduplication for the employee role.

**Reproduction:**
1. Log in as employee
2. Observe sidebar: "My Dashboard" and "Employee Dashboard" both present

**Fix:**
- Remove the duplicate entry from the navigation config
- Keep "My Dashboard" as the canonical link for employees
- Audit other roles for similar duplicate links

**Acceptance criteria:**
- [ ] Only one dashboard link per role in the sidebar
- [ ] No duplicate routes in the navigation config

**Effort:** 0.5h

---

## Epic 9 — Seed Data Hygiene (P2)

### 9.1 Remove "Test Employee QA" from production seed

**Finding:** A person named "Test Employee QA" exists in the people directory alongside real demo personas. This is clearly test data that leaked into the production seed.

**Root cause:** QA test record was not removed after testing.

**Fix:**
- Remove the "Test Employee QA" record from the Prisma seed file
- Remove any associated assignments, work evidence, or user account
- Add a seed data validation step that rejects records with "test" in the name (or move them to a separate test-only seed)

**Acceptance criteria:**
- [ ] "Test Employee QA" does not appear in the people directory
- [ ] No orphaned references to the deleted person
- [ ] Seed validation prevents future test data leaks

**Effort:** 0.5h

---

### 9.2 Normalize UUID patterns across all seed data

**Finding:** Three distinct UUID patterns exist across person records, indicating three separate seed data waves that were never harmonized:
- `11111111-1111-1111-1111-111111111xxx` — Original wave (Emma, Ethan, Lucas, Noah, Sophia)
- `11111111-1111-1111-2222-000000000xxx` — Second wave (Carlos, Diana)
- `22222222-0000-0000-0000-00000000xxxx` — Third wave (Alex, Dev, Isabel, Jordan, Kai, Lena, Marcus, Maya, Priya, Ryan, Sam, Test, Tom, Zara)

**Root cause:** Multiple developers or migration scripts added seed data at different times without a consistent ID generation strategy.

**Fix:**
- Regenerate all seed UUIDs using a consistent pattern (e.g., UUIDv4 or a single predictable pattern for demo data)
- Update all foreign key references (assignments, work evidence, user accounts, manager relationships)
- Run a full referential integrity check after migration

**Acceptance criteria:**
- [ ] All person UUIDs follow a single consistent pattern
- [ ] All foreign key references are updated
- [ ] No orphaned records after UUID normalization

**Effort:** 2h

---

### 9.3 Remove 7 phantom people from summary data source

**Finding:** Seven people referenced only in the workload summary endpoint do not exist in the people directory: Ava Rowe, Olivia Chen, Liam Patel, Mason Singh, Mia Lopez, Harper Ali, Zoe Turner.

**Root cause:** These are remnants of an old seed fixture that the summary endpoint still reads from.

**Fix:**
- Delete these 7 records from whatever data source the summary endpoint uses
- This should be resolved as part of Epic 1 (1.1), but verify independently
- Search the entire codebase for any references to these names

**Acceptance criteria:**
- [ ] No references to the 7 phantom people in any data source
- [ ] `grep -r "Ava Rowe\|Olivia Chen\|Liam Patel\|Mason Singh\|Mia Lopez\|Harper Ali\|Zoe Turner"` returns zero results

**Effort:** 0.5h (verification after Epic 1 fix)

---

## Epic 10 — Session & Auth Hardening (P2)

### 10.1 Short session timeout causes mid-workflow expiry

**Finding:** During automated testing, sessions expired frequently during normal navigation sequences (clicking through 10-15 person profiles). The session timeout appears to be very short (possibly 5-15 minutes) with no token refresh mechanism or warning.

**Root cause:** JWT access token has a short expiry and the refresh token mechanism (httpOnly cookie) may not be triggered automatically by frontend API calls.

**Fix:**
- Implement silent token refresh: frontend interceptor should catch 401 responses, call refresh endpoint, retry the original request
- Extend access token lifetime to at least 30 minutes for demo purposes
- Add a session expiry warning toast 2 minutes before timeout

**Acceptance criteria:**
- [ ] Sessions survive 30+ minutes of active use without manual re-login
- [ ] 401 responses trigger automatic token refresh
- [ ] User sees a warning before session expires

**Effort:** 3h

---

## Summary Table

| # | Item | Priority | Effort | Epic |
|---|------|----------|--------|------|
| 1.1 | Phantom seed data in workload summary | P0 | 3h | Dashboard Data |
| 1.2 | Workload Matrix empty despite 23 assignments | P0 | 2h | Dashboard Data |
| 2.1 | Role dashboards default to wrong person | P0 | 2h | Role Defaults |
| 3.1 | Team tab vs badge assignment filter mismatch | P0 | 2h | Project Wiring |
| 3.2 | Budget tab misleading $0.00 empty state | P1 | 1h | Project Wiring |
| 4.1 | Staffing Requests show raw UUIDs | P0 | 1h | Staffing |
| 4.2 | Duplicate staffing request rows | P0 | 1.5h | Staffing |
| 5.1 | Work evidence not linked to profiles | P1 | 2h | Person Profiles |
| 5.2 | Incomplete person profiles (third UUID wave) | P1 | 3h | Person Profiles |
| 6.1 | Missing manager relationships + no drill-down | P1 | 2h | Org Chart |
| 6.2 | No way to identify inactive employee | P1 | 1.5h | Org Chart |
| 7.1 | DM Dashboard vs Main Dashboard count mismatch | P1 | 0.5h | Cross-View |
| 7.2 | Resource Pools vs Teams member count discrepancy | P1 | 2h | Cross-View |
| 7.3 | Overallocation not surfaced on manager dashboards | P1 | 3h | Cross-View |
| 8.1 | Employee role blocked from main dashboard | P1 | 1h | Navigation |
| 8.2 | Sign out doesn't clear session | P1 | 1.5h | Navigation |
| 8.3 | Duplicate sidebar links | P2 | 0.5h | Navigation |
| 9.1 | "Test Employee QA" in production seed | P2 | 0.5h | Seed Data |
| 9.2 | Inconsistent UUID patterns | P2 | 2h | Seed Data |
| 9.3 | 7 phantom people in summary data | P2 | 0.5h | Seed Data |
| 10.1 | Short session timeout with no refresh | P2 | 3h | Auth |

**Total: 21 items across 10 epics — ~34h estimated effort**

---

## Recommended Implementation Order

```
Phase 1 — Demo Blockers (P0, ~10.5h):
  1.1 → 1.2 → 7.1 (phantom data chain)
  2.1 (role defaults — independent)
  3.1 (team tab filter — independent)
  4.1 → 4.2 (staffing requests — paired)

Phase 2 — High Visibility (P1, ~17.5h):
  5.1 → 5.2 (person profiles — paired)
  6.1 → 6.2 (org chart / HR — paired)
  3.2 (budget empty state)
  7.2 → 7.3 (cross-view consistency)
  8.1 → 8.2 (navigation/auth)

Phase 3 — Polish (P2, ~6h):
  9.1 → 9.3 → 9.2 (seed data cleanup)
  8.3 (duplicate links)
  10.1 (session hardening)
```

---

## Test Credentials (Verified Working)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@deliverycentral.local | DeliveryCentral@Admin1 |
| Director | noah.bennett@example.com | DirectorPass1! |
| HR Manager | diana.walsh@example.com | HrManagerPass1! |
| Resource Manager | sophia.kim@example.com | ResourceMgrPass1! |
| Project Manager | lucas.reed@example.com | ProjectMgrPass1! |
| Employee | ethan.brooks@example.com | EmployeePass1! |
| Dual-role (RM+HR) | emma.garcia@example.com | DualRolePass1! |
