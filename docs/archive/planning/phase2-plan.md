> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# DeliveryCentral Phase 2 — Implementation Plan

---

## Section 1: JTBDs by Role

### Role: employee

**[JTBD-E1]** As an employee, I want to view my current and upcoming project assignments with allocation percentages so that I can understand my committed workload at a glance.

Acceptance criteria:
- `GET /dashboard/employee/:personId` returns `currentAssignments` (status ACTIVE or APPROVED, `validFrom <= asOf <= validTo`) and `futureAssignments` (status ACTIVE or APPROVED, `validFrom > asOf`) with `allocationPercent` included on each item.
- The Employee Dashboard page renders a "Total Allocation" KPI card that turns visually distinct (red border or warning chip) when `totalAllocationPercent > 100`.
- Navigating to `/dashboard/employee?personId=<id>` without authentication redirects to `/login`.

**[JTBD-E2]** As an employee, I want to see recent work evidence attributed to me across all sources so that I can verify my activity is being captured correctly.

Acceptance criteria:
- The "Evidence" section card on the Employee Dashboard shows the 5 most recent `WorkEvidence` records for the selected person within the last 30 days, each showing `sourceType`, `effortHours`, `activityDate`, and `summary`.
- `recentWorkEvidenceSummary.totalEffortHours` matches the sum of `durationMinutes / 60` for all evidence in the 30-day window, rounded to 2 decimal places.
- When no evidence exists in the window, the EmptyState component is shown instead of an empty list.

**[JTBD-E3]** As an employee, I want to know whether I have any pending assignment requests awaiting approval so that I can follow up if necessary.

Acceptance criteria:
- `pendingWorkflowItems.itemCount` in the dashboard response equals the count of my assignments with `approvalState === 'REQUESTED'`.
- The Employee Dashboard page renders a "Pending Workflow Items" section card listing each pending assignment with its project name and staffing role.
- When no pending items exist, the section card shows the EmptyState component.

**[JTBD-E4]** As an employee, I want to view the details of a specific assignment including its approval history so that I can understand the audit trail.

Acceptance criteria:
- `GET /assignments/:id` returns a response that includes `approvals` (list of `AssignmentApproval` with `decision`, `decisionAt`, `decisionReason`, `decidedByPersonId`) and `historyEntries` (list of `AssignmentHistory` with `changeType`, `occurredAt`, `changedByPersonId`).
- The Assignment Details page (`/assignments/:id`) renders two distinct sections — "Approvals" and "History" — each populated from the API response.
- A non-existent assignment ID returns HTTP 404 and the frontend shows an ErrorState.

**[JTBD-E5]** As an employee, I want to be notified when my assignment request has been approved or rejected so that I do not need to poll the system manually.

Acceptance criteria:
- When `ApproveProjectAssignmentService.execute()` completes, a `NotificationRequest` row is created with `eventName = 'assignment.approved'`, `recipient = person.primaryEmail`, and `status = 'QUEUED'`.
- The same applies for rejection: `eventName = 'assignment.rejected'`.
- `GET /admin/notifications` (admin-only) lists the created notification requests with their status.

---

### Role: project_manager

**[JTBD-PM1]** As a project manager, I want to see all my managed projects with their staffing counts and work-evidence counts so that I can quickly identify which projects need attention.

Acceptance criteria:
- `GET /dashboard/project-manager/:personId` returns `managedProjects` array where each item has `staffingCount` (count of ACTIVE or APPROVED assignments covering `asOf`) and `evidenceCount` (count of `WorkEvidence` records linked to the project up to `asOf`).
- The Project Manager Dashboard page renders a table (or monitoring-list) showing project name, status, staffing count, evidence count, and planned end date.
- A project with `status = 'ON_HOLD'` still appears in the list with its correct counts.

**[JTBD-PM2]** As a project manager, I want to see which of my projects have staffing gaps so that I can request additional resources.

Acceptance criteria:
- `projectsWithStaffingGaps` in the response includes any managed project where no ACTIVE or APPROVED assignment covers `asOf`, flagged with reason `NO_ACTIVE_STAFFING`.
- A project with assignments all in `REQUESTED` status is also flagged with reason `ASSIGNED_BUT_NO_EVIDENCE` if evidence exists, or `NO_ACTIVE_STAFFING` otherwise.
- The "Staffing Gaps" section card lists each flagged project with its reason and detail text.

**[JTBD-PM3]** As a project manager, I want to request a new assignment for a person on one of my projects so that staffing can proceed.

Acceptance criteria:
- `POST /assignments` with `requestedByPersonId`, `personId`, `projectId`, `staffingRole`, `allocationPercent`, `validFrom` creates an assignment with `status = 'REQUESTED'`.
- A duplicate assignment (same `personId`, `projectId`, `validFrom`) returns HTTP 409 Conflict.
- On success the Create Assignment page shows a success toast with the text "Assignment created with status REQUESTED." and the new assignment appears in `GET /assignments?projectId=<id>`.

**[JTBD-PM4]** As a project manager, I want to end an active assignment when a team member leaves a project so that the staffing record is closed accurately.

Acceptance criteria:
- `POST /assignments/:id/end` with `{ endDate, reason }` updates the assignment `validTo` and transitions status to `ENDED`.
- An already-ended assignment returns HTTP 422 with message "Assignment is already ended."
- The assignment history gains a new entry with `changeType = 'ASSIGNMENT_ENDED'` and the supplied reason.

**[JTBD-PM5]** As a project manager, I want to see which projects are nearing their planned closure date so that I can prepare handover activities.

Acceptance criteria:
- `attentionProjects` in the dashboard response includes any managed project where `endsOn` is within 30 calendar days of `asOf`, flagged with reason `NEARING_CLOSURE`.
- The "Attention Projects" section card on the dashboard renders each item with the project name, reason, and the formatted end date.
- A project with `endsOn = null` does not appear in the list.

---

### Role: resource_manager

**[JTBD-RM1]** As a resource manager, I want to see the current allocation status of every person in my managed resource pools so that I can identify idle and overallocated resources.

Acceptance criteria:
- `allocationIndicators` in `GET /dashboard/resource-manager/:personId` includes one entry per person in managed pools, with `indicator` set to one of `UNASSIGNED`, `UNDERALLOCATED`, `FULLY_ALLOCATED`, `OVERALLOCATED` based on current total `allocationPercent`.
- The dashboard page renders an "Allocation Indicators" section showing each person's name, team, indicator chip, and percentage.
- An employee on leave (`employmentStatus = 'LEAVE'`) is still included in the list.

**[JTBD-RM2]** As a resource manager, I want to approve or reject assignment requests for people in my pools so that I control who gets committed to projects.

Acceptance criteria:
- `POST /assignments/:id/approve` transitions status from `REQUESTED` to `APPROVED`, sets `approvedAt`, and creates an `AssignmentApproval` row with `decision = 'APPROVED'`.
- `POST /assignments/:id/reject` transitions status to `REJECTED` and creates an `AssignmentApproval` row with `decision = 'REJECTED'` and the supplied `decisionReason`.
- Attempting to approve an already-approved assignment returns HTTP 422.

**[JTBD-RM3]** As a resource manager, I want to see the future assignment pipeline for my team so that I can plan for upcoming capacity changes.

Acceptance criteria:
- `futureAssignmentPipeline` in the response lists all assignments for managed-pool members where `validFrom > asOf`, sorted ascending by `validFrom`, each including `personDisplayName`, `projectName`, `startDate`, and `approvalState`.
- The "Pipeline" section card on the dashboard renders this list; when empty, the EmptyState is shown.
- Assignments in `REJECTED` or `ENDED` status do not appear in the pipeline.

**[JTBD-RM4]** As a resource manager, I want to view team capacity grouped by resource pool so that I can report on utilisation by pool.

Acceptance criteria:
- `teamCapacitySummary` in the response contains one entry per managed pool with: `memberCount`, `activeAssignmentCount`, `activeProjectCount`, `overallocatedPeopleCount`, `underallocatedPeopleCount`, `unassignedPeopleCount`.
- A pool with zero members returns an entry with all counts set to 0.
- The "Capacity" section card renders these summaries.

**[JTBD-RM5]** As a resource manager, I want to bulk-assign multiple people to a project at once so that onboarding new projects is efficient.

Acceptance criteria:
- `POST /assignments/bulk` accepts an array of assignment objects and creates all of them atomically; on partial failure (one duplicate) no records are created and HTTP 409 is returned.
- The Bulk Assignment page (`/assignments/bulk`) shows per-row validation feedback when a duplicate is detected before submission.
- On success, the page shows a success toast listing how many assignments were created.

---

### Role: delivery_manager

**[JTBD-DM1]** As a delivery manager, I want to see a cross-portfolio view of active projects with their staffing and evidence health so that I can spot delivery risks across all projects, not just my own.

Acceptance criteria:
- `GET /dashboard/delivery-manager/:personId` is a new endpoint that returns `portfolioSummary` including: `totalActiveProjects`, `totalActiveAssignments`, `projectsWithNoStaff` (count), `projectsWithEvidenceAnomalies` (count), and `projectHealthItems` (one entry per ACTIVE project with fields: `projectId`, `projectCode`, `name`, `staffingCount`, `evidenceCount`, `anomalyFlags`).
- The Delivery Manager Dashboard page (currently a stub) renders a KPI bar with the four summary counts and a project health table.
- A project with status `ON_HOLD` or `DRAFT` is excluded from `portfolioSummary`.

**[JTBD-DM2]** As a delivery manager, I want to see the planned-vs-actual evidence reconciliation across the entire portfolio so that I can confirm delivery commitments are being met.

Acceptance criteria:
- `GET /dashboard/delivery-manager/:personId` response includes a `reconciliation` block containing: `matchedCount`, `assignedButNoEvidenceCount`, `evidenceWithoutAssignmentCount`, sourced from `PlannedVsActualQueryService` without any personId or projectId filter.
- The dashboard page renders a "Reconciliation Status" section card showing these three counts as KPI chips.
- When `evidenceWithoutAssignmentCount > 0`, that KPI chip is rendered with a warning colour.

**[JTBD-DM3]** As a delivery manager, I want to identify which projects have been inactive (no new evidence for 14+ days) despite having active assignments so that I can escalate.

Acceptance criteria:
- `inactiveEvidenceProjects` in the delivery manager dashboard response lists projects where: status is ACTIVE, at least one ACTIVE/APPROVED assignment covers `asOf`, and no `WorkEvidence` has `occurredOn` or `recordedAt` within the last 14 days.
- Each entry includes `projectId`, `projectCode`, `name`, `lastEvidenceDate` (ISO string or null), `activeAssignmentCount`.
- The dashboard page renders an "Inactive Evidence" section card with a row per project.

**[JTBD-DM4]** As a delivery manager, I want to view the full assignment history across all projects for a configurable date range so that I can produce delivery reports.

Acceptance criteria:
- `GET /assignments?from=<date>&to=<date>&status=ENDED` returns all assignments ended in that range, each with the relevant project name and person name enriched from related entities.
- The Assignments page (`/assignments`) supports a date-range filter and a status dropdown filter, both of which trigger a new API call.
- Returned results are paginated and the response includes `totalCount`.

**[JTBD-DM5]** As a delivery manager, I want to drill into a specific project's dashboard to see its assignment timeline and evidence trend so that I can assess delivery progress per project.

Acceptance criteria:
- `GET /projects/:id/dashboard` returns: `project` details, `assignments` (all for this project with person names), `evidenceByWeek` (array of `{ weekStarting: ISO, totalHours: number }` for the past 12 weeks), and `allocationByPerson` (array of `{ personId, displayName, allocationPercent }`).
- The Project Dashboard page (`/projects/:id/dashboard`) renders: a KPI bar (total staffing, total evidence hours last 30d, upcoming end date), a timeline bar chart of `evidenceByWeek`, and an allocation table.
- When a project is in `DRAFT` status, the page shows an info banner and still renders available data.

---

### Role: hr_manager

**[JTBD-HR1]** As an HR manager, I want to see headcount distributed by org unit, grade, and role so that I can understand organisational composition.

Acceptance criteria:
- `GET /dashboard/hr-manager/:personId` returns `orgDistribution`, `gradeDistribution`, and `roleDistribution` each as an array of `{ key, label, count }` sorted by count descending.
- The HR Dashboard renders each distribution as a horizontal bar list showing label and count, with a total line at the top.
- An org unit with zero members still appears if it exists in the org chart (i.e., the org unit is enumerated from `OrgUnit` table, not derived from memberships alone).

**[JTBD-HR2]** As an HR manager, I want to identify employees who have no current manager or are not assigned to any org unit so that I can resolve data quality gaps.

Acceptance criteria:
- `employeesWithoutManager` in the response lists all persons where no current (valid) SOLID_LINE `ReportingLine` with `authority = 'APPROVER'` exists as of `asOf`.
- `employeesWithoutOrgUnit` lists all persons where no active `PersonOrgMembership` with `isPrimary = true` exists as of `asOf`.
- Both lists render in the HR Dashboard under a "Data Quality Signals" section card, each with the person name and email.

**[JTBD-HR3]** As an HR manager, I want to create a new onboarding case for a recently joined employee so that their onboarding workflow is tracked.

Acceptance criteria:
- `POST /cases` with `{ caseTypeKey: 'ONBOARDING', subjectPersonId, ownerPersonId, summary, participants }` creates a `CaseRecord` with `status = 'OPEN'` and auto-generated `caseNumber` in the format `CASE-NNNN`.
- The Create Case page (`/cases/new`) allows selecting `caseTypeKey` from a dropdown populated from the `CaseType` table, then selecting the subject person and owner, and submitting.
- On success, the browser navigates to `/cases/:newId` and the case appears in `GET /cases`.

**[JTBD-HR4]** As an HR manager, I want to view and progress an open case step by step so that the onboarding workflow is completed correctly.

Acceptance criteria:
- `GET /cases/:id` returns `caseRecord` with `steps` array (each `{ stepKey, displayName, status, assignedToPersonId, dueAt, completedAt }`) and `participants` array.
- `POST /cases/:id/steps/:stepKey/complete` transitions that step to `status = 'COMPLETED'`, sets `completedAt`, and emits a `case.step.completed` outbox event.
- The Case Details page renders the steps as a checklist, allowing the operator to mark each step complete in sequence.

**[JTBD-HR5]** As an HR manager, I want to see recent joiner and termination activity so that I can validate lifecycle events are processed correctly.

Acceptance criteria:
- `recentJoinerActivity` in the HR dashboard response lists the 5 most recently hired persons (`hiredAt <= asOf`) sorted by `hiredAt` descending.
- `recentDeactivationActivity` lists the 5 most recently deactivated persons sourced from `AuditLog` where `eventName = 'employee.deactivated'`, sorted by `createdAt` descending.
- Both lists render in the HR Dashboard under a "Lifecycle Activity" section card.

**[JTBD-HR6]** As an HR manager, I want to record a termination for a departing employee and have their assignments automatically ended so that data remains consistent.

Acceptance criteria:
- `POST /people/:id/terminate` with `{ terminatedAt, reason }` sets `employmentStatus = 'TERMINATED'`, `terminatedAt`, and in the same transaction calls `EndProjectAssignmentService` for all ACTIVE or APPROVED assignments that have `validTo` null or after `terminatedAt`.
- Each ended assignment gains a history entry with `changeType = 'ASSIGNMENT_ENDED'` and reason `'Employee terminated'`.
- `GET /dashboard/employee/:personId` for a terminated employee still returns data but `currentAssignments` is empty.

---

### Role: director

**[JTBD-DIR1]** As a director, I want to see an organisation-wide executive summary showing active project count, total staffed headcount, idle headcount, and evidence coverage rate so that I can assess organisational health at a glance.

Acceptance criteria:
- `GET /dashboard/director` (no personId filter needed) returns: `activeProjectCount`, `activeAssignmentCount`, `staffedPersonCount`, `unstaffedActivePersonCount`, `evidenceCoverageRate` (percentage of active assignments that have at least one evidence record in the last 30 days).
- The director landing page (`/`) is no longer an empty stub; it renders a KPI bar using these five values.
- All counts exclude terminated and inactive persons.

**[JTBD-DIR2]** As a director, I want to see which org units have the highest and lowest resource utilisation so that I can rebalance accordingly.

Acceptance criteria:
- `GET /dashboard/director` response includes `unitUtilisation` array with one entry per ACTIVE org unit: `{ orgUnitId, orgUnitName, memberCount, staffedCount, utilisation: number }` where `utilisation = staffedCount / memberCount * 100`.
- Array is sorted by `utilisation` ascending (lowest first).
- Units with `memberCount = 0` are excluded.

**[JTBD-DIR3]** As a director, I want to review the audit log for any person's lifecycle changes so that I have governance visibility.

Acceptance criteria:
- `GET /admin/audit?entityType=EMPLOYEE&from=<date>&to=<date>` returns paginated `AuditLog` entries for the given date range, each including `eventName`, `actorId`, `payload`, `createdAt`.
- The Business Audit page (`/admin/audit`) renders the results as a paginated table with filters for entity type and date range.
- The page is guarded to `['hr_manager', 'director', 'admin']` roles per the existing `HR_DIR_ADMIN` constant.

---

### Role: admin

**[JTBD-ADM1]** As an admin, I want to create a local account for a person and assign them one or more platform roles so that they can log in with role-appropriate access.

Acceptance criteria:
- `POST /auth/accounts` with `{ personId, email, password, roles }` creates a `LocalAccount` row linked to the person, with `passwordHash` bcrypt-hashed at cost 12.
- Attempting to create an account for a personId that already has one returns HTTP 409 with "Local account already exists for this person."
- The admin panel shows a "Create Account" form that triggers this endpoint and displays the result.

**[JTBD-ADM2]** As an admin, I want to manage metadata dictionaries — create, add entries, disable entries — so that controlled vocabularies stay current.

Acceptance criteria:
- `POST /metadata/dictionaries` creates a `MetadataDictionary`; `POST /metadata/dictionaries/:id/entries` adds a `MetadataEntry`; `PATCH /metadata/dictionaries/:id/entries/:entryId` with `{ isEnabled: false }` disables an entry without deleting it.
- The Metadata Admin page (`/metadata-admin`) renders a list of dictionaries with expandable entry lists and add/disable controls.
- Disabling an entry does not remove it from existing saved data; it only prevents it from appearing in new selection dropdowns.

**[JTBD-ADM3]** As an admin, I want to monitor the outbox and notification delivery queue so that I can identify stuck or failed messages.

Acceptance criteria:
- `GET /admin/notifications` returns `NotificationRequest` records filterable by `status` (`QUEUED`, `RETRYING`, `SENT`, `FAILED_TERMINAL`), paginated, most recent first.
- The Notifications admin page renders a filter bar with status dropdown and a table showing recipient, event name, attempt count, status, and requested-at.
- Clicking a row shows a detail panel with `renderedBody` from the most recent `NotificationDelivery`.

---

## Section 2: Mock Organization Design

The expanded seed introduces a new `phase2` seed profile (alongside `demo` and `bank-scale`) implemented in `/home/drukker/DeliveryCentral/prisma/seeds/phase2-dataset.ts`, imported by `seed.ts`.

### Org Hierarchy

Three-level hierarchy: Company > Directorate > Department > Team (4 levels total). Introducing a Company root node and adding Team-level units under departments gives richer org-chart data for the HR and Director JTBDs.

```
[ROOT] GlobalTech Ltd  (code: ROOT, no parentOrgUnitId)
  ├── [DIRECTORATE] Delivery Directorate  (DIR-DEL) — existing
  │     ├── [DEPARTMENT] Consulting Delivery  (DEP-CON) — existing
  │     │     ├── [TEAM] APAC Consulting  (TEAM-CON-APAC)
  │     │     └── [TEAM] EMEA Consulting  (TEAM-CON-EMEA)
  │     ├── [DEPARTMENT] Program Management Office  (DEP-PMO) — existing
  │     │     └── [TEAM] Enterprise PMO  (TEAM-PMO-ENT)
  │     └── [DEPARTMENT] HR & People  (DEP-HR)  — NEW
  │           (no child teams initially, managed by the new hr_manager person)
  ├── [DIRECTORATE] Platform Directorate  (DIR-PLT) — existing
  │     ├── [DEPARTMENT] Application Engineering  (DEP-APP) — existing
  │     │     ├── [TEAM] Frontend Guild  (TEAM-APP-FE)
  │     │     └── [TEAM] Backend Guild  (TEAM-APP-BE)
  │     └── [DEPARTMENT] Data Engineering  (DEP-DAT) — existing
  │           └── [TEAM] Analytics Engineering  (TEAM-DAT-ANA)
  └── [DIRECTORATE] Operations Directorate  (DIR-OPS) — NEW
        └── [DEPARTMENT] Delivery Operations  (DEP-OPS-DEL) — NEW
              (will host the delivery_manager person)
```

### People Count and Distribution

Total: 32 persons (up from 12). Distribution across units to enable all JTBDs:

| Unit | Count | Notes |
|---|---|---|
| Consulting Delivery | 5 | 2 in APAC team, 2 in EMEA team, 1 mgr (existing Liam Patel) |
| Program Management Office | 4 | 1 mgr (existing Emma Garcia), 1 PM (existing Lucas Reed), 2 new |
| Application Engineering | 5 | 1 mgr (existing Sophia Kim), 2 FE, 2 BE (Ethan Brooks, Mia Lopez existing + 2 new) |
| Data Engineering | 4 | 1 mgr (existing Mason Singh), Harper Ali existing + 2 new |
| HR & People | 2 | 1 hr_manager (new), 1 HR coordinator (new) |
| Operations Directorate | 3 | 1 director (repurpose Noah Bennett), 1 delivery_manager (new), 1 ops analyst (new) |
| No org unit | 1 | Intentionally orphaned — triggers JTBD-HR2 signal |
| LEAVE status | 1 | Triggers edge case in allocation indicators (JTBD-RM1) |
| TERMINATED status | 1 | Triggers JTBD-HR6 verification |

### Local Accounts (Roles → Emails)

Every role gets at minimum one account that can log in. Passwords follow the pattern `<Role>Pass1!` for easy demo use.

| Email | Roles | personId | Notes |
|---|---|---|---|
| `admin@deliverycentral.local` | `['admin']` | none | existing superadmin |
| `noah.bennett@example.com` | `['director']` | P-002 | re-uses existing person |
| `hr.manager@deliverycentral.local` | `['hr_manager']` | P-HR-01 (new) | new HR manager person |
| `sophia.kim@example.com` | `['resource_manager']` | P-006 | existing Engineering Mgr |
| `lucas.reed@example.com` | `['project_manager']` | P-010 | existing Program Mgr |
| `delivery.mgr@deliverycentral.local` | `['delivery_manager']` | P-DM-01 (new) | new delivery manager person |
| `ethan.brooks@example.com` | `['employee']` | P-008 | existing Senior SWE |
| `emma.garcia@example.com` | `['resource_manager', 'hr_manager']` | P-005 | dual-role edge case |

### Project Portfolio

All `ProjectStatus` enum values must appear. Twelve projects total:

| Code | Name | Status | Manager | Ext Links | Notes |
|---|---|---|---|---|---|
| PRJ-100 | Internal Bench Planning | ACTIVE | Emma Garcia | none | existing |
| PRJ-101 | Delivery Central Platform | ACTIVE | Lucas Reed | none | existing |
| PRJ-102 | Atlas ERP Rollout | ACTIVE | Sophia Kim | JIRA:ATLAS | existing; nearing closure (endsOn = asOf+15d) |
| PRJ-103 | Beacon Mobile Revamp | ACTIVE | Sophia Kim | JIRA:BEACON | existing |
| PRJ-104 | Nova Analytics Migration | ACTIVE | Sophia Kim | JIRA:NOVA | existing; nearing closure (endsOn = asOf+20d) |
| PRJ-105 | Polaris Security Hardening | ACTIVE | Mason Singh | none | existing |
| PRJ-106 | Mercury Infrastructure | DRAFT | Lucas Reed | none | NEW; triggers JTBD-DM5 "info banner" |
| PRJ-107 | Jupiter Client Portal | ACTIVE | Lucas Reed | JIRA:JUPIT | NEW; no active staffing → staffing gap |
| PRJ-108 | Saturn Compliance Audit | ON_HOLD | Emma Garcia | none | NEW; held project edge case |
| PRJ-109 | Venus Onboarding Revamp | COMPLETED | Noah Bennett | none | NEW; closed project edge case |
| PRJ-110 | Mars Data Lakehouse | ACTIVE | Mason Singh | none | NEW; evidence without assignment anomaly |
| PRJ-111 | Pluto Legacy Migration | ARCHIVED | Lucas Reed | none | NEW; archived project |

### Assignments

Target statuses: REQUESTED, APPROVED, ACTIVE, ENDED, REJECTED, REVOKED. At least 2 per status. Total ~25 assignments.

Key scenarios to cover:
- Two people assigned to PRJ-102 (Atlas), both ACTIVE, to prove `staffingCount = 2`.
- One assignment in REQUESTED state for PRJ-107 (Jupiter) — staffing gap scenario still triggers because no APPROVED/ACTIVE assignments exist.
- One person (on leave) has a REVOKED assignment — triggers allocation indicator edge case.
- Two assignments with `validTo` in the past and `status = ENDED` — for JTBD-DM4 date-range filter.
- One assignment for PRJ-110 (Mars) in REJECTED status, while evidence exists for the same person/project — triggers `EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT` anomaly.
- One person assigned 80% to one project and 40% to another — triggers OVERALLOCATED indicator.
- One future-dated assignment (`validFrom = asOf + 60d`) for JTBD-RM3 pipeline.
- One assignment with `allocationPercent = 100%` for FULLY_ALLOCATED.

### Work Evidence

All `WorkEvidenceStatus` values must appear: CAPTURED, RECONCILED, IGNORED, ARCHIVED.

Sources: three `WorkEvidenceSource` rows — existing JIRA_CLOUD, existing INTERNAL_TIMESHEET, plus new MANUAL (for hand-recorded evidence).

Key scenarios:
- Evidence for PRJ-110 (Mars) linked to a person who has no APPROVED assignment there → `EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT` anomaly.
- Evidence for PRJ-102 (Atlas) with `recordedAt` after the assignment `validTo` → `EVIDENCE_AFTER_ASSIGNMENT_END` anomaly.
- Evidence with `status = 'RECONCILED'` for PRJ-101 (Delivery Central) — shows reconciliation done.
- Evidence with `status = 'IGNORED'` for a stale Jira worklog — shows ignored evidence.
- No evidence for PRJ-107 (Jupiter) at all — confirms the staffing-gap + no-evidence scenario.
- Evidence spread across 12 weeks for PRJ-103 (Beacon) — populates `evidenceByWeek` chart (JTBD-DM5).
- At least 6 `WorkEvidence` records for Ethan Brooks across multiple projects to populate his employee dashboard chart.

### Cases

Introduce two `CaseType` rows:
- `key: 'ONBOARDING'`, displayName: "Employee Onboarding", linked to a `WorkflowDefinition` with states: `INITIATED → EQUIPMENT_ORDERED → ACCESS_GRANTED → ORIENTATION_COMPLETE`.
- `key: 'OFFBOARDING'`, displayName: "Employee Offboarding", linked to a `WorkflowDefinition` with states: `INITIATED → ACCESS_REVOKED → EQUIPMENT_RETURNED → COMPLETED`.

Seed cases covering all `CaseStatus` values:
- One OPEN onboarding case for the new HR coordinator — no steps completed.
- One IN_PROGRESS onboarding case — first two steps completed.
- One COMPLETED onboarding case — all steps done.
- One CANCELLED offboarding case.
- One APPROVED case (offboarding for the terminated employee).

### Metadata Dictionaries

Retain the existing three dictionaries. Add:
- `dictionaryKey: 'assignment-close-reasons'`, entityType: `ProjectAssignment`, entries: `COMPLETED`, `SCOPE_CHANGE`, `RESOURCE_CONFLICT`, `EMPLOYEE_TERMINATED`. Needed for JTBD-PM4 end-assignment reason dropdown.
- `dictionaryKey: 'onboarding-intake-channel'`, entityType: `Case`, scopeOrgUnitId: DEP-HR, entries: `HRIS_IMPORT`, `MANUAL_ENTRY`, `SELF_SERVICE`. Org-unit scoped to demonstrate scoping logic.
- `dictionaryKey: 'project-risk-tier'`, entityType: `Project`, entries: `TIER_1_CRITICAL`, `TIER_2_STANDARD`, `TIER_3_LOW`. Used to demonstrate custom field metadata on projects.

Custom field definitions (2):
- Entity `Project`, fieldKey `risk_tier`, dataType `ENUM`, linked to `project-risk-tier` dictionary. Required=false.
- Entity `ProjectAssignment`, fieldKey `billing_code`, dataType `TEXT`. Required=false.

---

## Section 3: Flow Gaps → Implementation Work

### Cluster A: Missing Backend Endpoints

**A1. Delivery Manager Dashboard — no service exists**

The `DeliveryManagerDashboardPage.tsx` is a "Coming soon" stub and there is no corresponding query service in `/home/drukker/DeliveryCentral/src/modules/dashboard/application/`.

- Create `/home/drukker/DeliveryCentral/src/modules/dashboard/application/delivery-manager-dashboard-query.service.ts` implementing the logic described in JTBD-DM1, DM2, DM3. It must call `PlannedVsActualQueryService` without filters, iterate all ACTIVE projects from `InMemoryProjectRepository`, and compute `inactiveEvidenceProjects` using the same 14-day window already in `ProjectManagerDashboardQueryService`.
- Create `/home/drukker/DeliveryCentral/src/modules/dashboard/application/contracts/delivery-manager-dashboard.dto.ts` with the response shape.
- Add `GET /dashboard/delivery-manager/:personId` to `/home/drukker/DeliveryCentral/src/modules/dashboard/presentation/role-dashboard.controller.ts`.
- Register the new service in `/home/drukker/DeliveryCentral/src/modules/dashboard/dashboard.module.ts`.

**A2. Director Dashboard — no endpoint exists**

`/` route renders a generic `DashboardPage` that fetches the workload dashboard query service (which reads from hard-coded demo data). The director needs a real cross-org summary endpoint.

- Create `/home/drukker/DeliveryCentral/src/modules/dashboard/application/director-dashboard-query.service.ts` reading from `InMemoryPersonRepository`, `InMemoryProjectRepository`, `InMemoryProjectAssignmentRepository`, and `InMemoryWorkEvidenceRepository` to compute the five KPIs in JTBD-DIR1 and `unitUtilisation` in JTBD-DIR2.
- Create `/home/drukker/DeliveryCentral/src/modules/dashboard/application/contracts/director-dashboard.dto.ts`.
- Add `GET /dashboard/director` to `role-dashboard.controller.ts`.
- Register in `dashboard.module.ts`.

**A3. Assignment End Endpoint — contract exists, wiring may be incomplete**

`EndProjectAssignmentService` exists in `/home/drukker/DeliveryCentral/src/modules/assignments/application/end-project-assignment.service.ts`. Verify the controller wires `POST /assignments/:id/end`. The `end-project-assignment.request.ts` contract needs a `reason` field if not present.

- In `/home/drukker/DeliveryCentral/src/modules/assignments/application/contracts/end-project-assignment.request.ts`: add `reason?: string` field.
- In `/home/drukker/DeliveryCentral/src/modules/assignments/application/end-project-assignment.service.ts`: pass `reason` to the history entry `changeReason`.
- In `/home/drukker/DeliveryCentral/src/modules/assignments/presentation/assignments.controller.ts`: confirm the `POST /assignments/:id/end` handler exists and returns the updated assignment.

**A4. Terminate Employee — no endpoint exists**

`DeactivateEmployeeService` only sets `status = 'INACTIVE'`. Termination is a distinct lifecycle event.

- Create `/home/drukker/DeliveryCentral/src/modules/organization/application/terminate-employee.service.ts` that: sets `employmentStatus = 'TERMINATED'`, sets `terminatedAt`, calls `EndProjectAssignmentService` for all active assignments, and logs `employee.terminated` to the audit log.
- Add `POST /people/:id/terminate` to the existing people controller.
- Register `TerminateEmployeeService` in `organization.module.ts`.

**A5. Case Step Completion — no endpoint exists**

`CaseRecord` has `steps` and `CaseStep` has `status`, but there is no mutation endpoint for stepping through workflow states.

- Create `/home/drukker/DeliveryCentral/src/modules/case-management/application/complete-case-step.service.ts` that: validates the step belongs to the case, transitions `step.status = 'COMPLETED'`, sets `completedAt`, and writes an `OutboxEvent` with `eventName = 'case.step.completed'`.
- Add `POST /cases/:id/steps/:stepKey/complete` to `/home/drukker/DeliveryCentral/src/modules/case-management/presentation/cases.controller.ts`.
- Update the `CaseCaseRecord` domain entity or a new `CompleteCaseStepCommand` port as needed in the domain layer.

**A6. Notification Triggering on Assignment Approval/Rejection**

`ApproveProjectAssignmentService` and `RejectProjectAssignmentService` do not currently write `NotificationRequest` rows.

- In both services, inject a `NotificationDispatchService` (already exists in `/home/drukker/DeliveryCentral/src/modules/notifications/application/notification-dispatch.service.ts`) and call it with the appropriate `eventName` after a successful state transition.
- The person's `primaryEmail` must be resolved — inject `PersonRepositoryPort` to look up the person by `assignment.personId`.
- Register any new dependencies in `assignments.module.ts`.

**A7. Project Dashboard Endpoint — stub exists**

`ProjectDashboardPage.tsx` exists but `GET /projects/:id/dashboard` is not yet implemented on the backend.

- Create `/home/drukker/DeliveryCentral/src/modules/project-registry/application/project-dashboard-query.service.ts` that computes: project details, all assignments for the project, `evidenceByWeek` (group `WorkEvidence.occurredOn` by ISO week, sum `durationMinutes / 60`), and `allocationByPerson`.
- Add `GET /projects/:id/dashboard` handler in `/home/drukker/DeliveryCentral/src/modules/project-registry/presentation/projects.controller.ts`.
- Register in `project-registry.module.ts`.

**A8. Assignment Listing — enrichment gaps**

`ListAssignmentsService` currently uses hard-coded `demoPeople` / `demoProjects` arrays to enrich display names. After the seed expansion these arrays no longer cover all persons.

- Replace the `demoPeople.find(...)` / `demoProjects.find(...)` lookups with injected repository calls to `InMemoryPersonRepository.findByPersonId()` and `InMemoryProjectRepository.findById()`.
- Add `status` filter support: `ENDED` assignments must be included when `status=ENDED` is passed.
- Add `from` / `to` date filter: filter `validTo >= from` and `validFrom <= to` when provided.
- Return `totalCount` alongside `items` (pagination support, page + pageSize query params).

**A9. Admin Account Creation — no endpoint**

There is no `POST /auth/accounts` for admin-initiated account provisioning.

- Create `/home/drukker/DeliveryCentral/src/modules/auth/application/create-local-account.service.ts` that validates no existing account for the `personId`, hashes the password, creates the `LocalAccount`, and publishes an audit log entry `account.created`.
- Add `POST /auth/accounts` to the auth controller, guarded with `@RequireRoles(['admin'])`.

---

### Cluster B: Frontend Gaps

**B1. Delivery Manager Dashboard Page**

`/home/drukker/DeliveryCentral/frontend/src/routes/dashboard/DeliveryManagerDashboardPage.tsx` is a stub.

- Create `/home/drukker/DeliveryCentral/frontend/src/features/dashboard/useDeliveryManagerDashboard.ts` hook (pattern matches `useResourceManagerDashboard.ts`).
- Replace the stub page with a full page component: KPI bar (total active projects, total assignments, no-staff projects, evidence anomalies), "Portfolio Health" table, "Reconciliation Status" section card, "Inactive Evidence" section card.
- Add `useDeliveryManagerDashboard` to the relevant export barrel.

**B2. Director Dashboard Page**

`/` currently renders `DashboardPage` (a generic placeholder).

- Create `/home/drukker/DeliveryCentral/frontend/src/features/dashboard/useDirectorDashboard.ts`.
- Replace or augment `DashboardPage.tsx` with content rendered for the `director` role — 5 KPI cards, unit utilisation table sorted ascending.

**B3. Assignment Details Page — placeholder only**

`AssignmentDetailsPlaceholderPage.tsx` exists but renders no real data. `AssignmentDetailsPage.tsx` is listed in the directory but may not be fully wired.

- In `/home/drukker/DeliveryCentral/frontend/src/features/assignments/useAssignmentDetails.ts`: ensure it fetches `GET /assignments/:id` and exposes `approvals` and `historyEntries`.
- In the actual details page component: render an "Approvals" section card and a "History" section card with the data.

