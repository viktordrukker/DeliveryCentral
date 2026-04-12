> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# DeliveryCentral Phase 3 — Business Flow Gap Analysis & Implementation Roadmap

**Authored:** 2026-04-05  
**Authors:** Product Manager + Principal Engineer perspectives synthesised from full codebase audit  
**Scope:** Next increment after Phase 2 (all 38 JTBDs functionally complete, TypeScript clean, Docker images built)  
**Status:** Approved for implementation

---

## Executive Summary

Phase 2 delivered strong coverage of _creation, approval, and read_ operations across every core domain. Every JTBD acceptance criterion is met. However, the platform has a structural gap pattern: **workflows that begin well but cannot be closed cleanly**. Cases can be created but not closed. Work evidence is immutable once recorded. Projects cannot be edited after creation. Assignments cannot be amended — only ended. Exception queues are observable but not resolvable.

Phase 3 corrects this by delivering **lifecycle depth**, **data correction flows**, **dashboard interactivity**, and **event coverage completeness**. It is divided into four sub-phases of ascending scope, each independently shippable.

---

## Gap Inventory

### G1 — Case Lifecycle Incomplete

**Domain states defined:** `OPEN → IN_PROGRESS → COMPLETED | ARCHIVED | CANCELLED | REJECTED`  
**Currently implemented:** `OPEN` only (step completion transitions steps but not the case record itself)  
**Backend gap:** No `POST /cases/:id/close`, `POST /cases/:id/archive`, `POST /cases/:id/cancel` endpoints. `CaseRecord` has the status field; no service transitions it.  
**Frontend gap:** Case detail page shows steps but has no "Close case" or "Archive" action.  
**Impact:** HR managers cannot complete the onboarding workflow formally. Open cases accumulate indefinitely.

### G2 — Work Evidence Immutable

**Currently implemented:** `POST /work-evidence` (create), `GET /work-evidence` (list)  
**Missing:** No update or delete. Once a timesheet entry or manual record is submitted, it cannot be corrected. No `amendedAt` / `originalEntryId` correction chain.  
**Impact:** Delivery managers cannot correct erroneous hours without support intervention. Evidence coverage rate is permanently skewed by bad data.

### G3 — Assignment Amendment Absent

**Currently implemented:** Approve, reject, end.  
**Missing:** No way to change `allocationPercent`, `staffingRole`, `validFrom`, or `validTo` without ending the assignment and creating a new one (which resets approval state).  
**REVOKED status** is defined in `ApprovalState` but no revocation endpoint exists.  
**Impact:** Resource managers cannot reduce allocation when a team member's scope narrows. PMs cannot extend end dates. All changes require destructive end + recreate.

### G4 — Project Metadata Frozen

**Currently implemented:** Create, activate, close, close-override.  
**Missing:** No way to edit `name`, `description`, `endsOn`, `projectManagerId`, or external links after project creation.  
**Impact:** PMs cannot correct typos in project names, update projected closure dates, or reassign management.

### G5 — Resource Pool Management Absent

**Domain:** `ResourcePool` and `ResourcePoolMembership` entities exist in Prisma schema and domain layer.  
**Currently implemented:** Zero public API endpoints. Pools exist in the database (seeded for phase2) but cannot be created, updated, or managed through the platform.  
**Frontend:** No UI surface at all.  
**Impact:** Resource managers cannot organise their teams into pools, which is the primary grouping mechanism for the RM dashboard and allocation indicators.

### G6 — Exception Queue Is Query-Only

**Currently implemented:** `GET /exceptions`, `GET /exceptions/:id` — list and view.  
**Missing:** No resolution flow. Exceptions cannot be marked resolved, suppressed, or linked to a corrective action.  
**Frontend:** Admin exception page shows queue but has no action buttons.  
**Impact:** Exceptions accumulate without closure. Operators cannot track which anomalies have been investigated.

### G7 — Reporting Line Amendment Has No UI

**Backend:** `POST /org/reporting-lines` creates new effective-dated lines.  
**Missing:** No endpoint to end/terminate an existing reporting line (set `validTo`). New lines override old ones but the old line record remains open-ended in the database.  
**Frontend:** Employee detail shows reporting lines and has a create form, but no "End this relationship" action.  
**Impact:** HR managers cannot clean up stale manager relationships from the UI.

### G8 — Dashboard Interactivity Missing

Specific gaps per dashboard:

| Dashboard | Missing Action |
|-----------|----------------|
| Employee | Assignment rows are not clickable links to `/assignments/:id` |
| Employee | Evidence section shows totals only — no drill-through to evidence list |
| PM | Project cards have no "Open Dashboard" link (must navigate via Projects menu) |
| PM | Anomaly panel shows flags but no "View project" or "Request resource" action |
| RM | No "Request assignment" action button (must navigate to `/assignments/new`) |
| RM | No capacity planning surface (future allocation editor) |
| Director | Org unit utilisation list has no drill-down to unit detail page |
| Director | Snapshot only — no week-over-week trend comparison |

### G9 — Notification Event Coverage Sparse

**Implemented events:** `assignment.created`, `assignment.approved`, `assignment.rejected`, `project.activated`, `project.closed`, `integration.sync_failed` (6 events)  
**Missing for operational completeness:**

| Event | Expected Recipients | Priority |
|-------|---------------------|----------|
| `case.created` | Case owner, subject person | High |
| `case.step_completed` | Case owner | High |
| `case.closed` | Case participants | High |
| `assignment.ended` | Assignee, requestedBy person | High |
| `employee.terminated` | HR manager, direct manager | High |
| `assignment.amended` | Assignee, RM | Medium |
| `project.metadata_updated` | PM, team leads | Low |
| `integration.sync_succeeded` | Admins (summary only) | Low |

**Missing admin capability:** No endpoint to requeue a `FAILED_TERMINAL` notification (admin can only view — not retry).

### G10 — Integration Manual Sync Trigger Absent

**Frontend:** `IntegrationsAdminPage` has `M365ReconciliationPanel` and `RadiusReconciliationPanel` components but they render static status — no backend service accepts a manual sync trigger.  
**Backend:** No `POST /integrations/sync` or `POST /integrations/:provider/trigger` endpoint.  
**Impact:** Admins must restart containers or wait for scheduled sync to force a data refresh.

### G11 — Auth & Account Self-Service Gaps

**Backend implemented:** Login, logout, refresh, password reset (email), 2FA setup/verify/disable, providers list.  
**Frontend implemented:** Login, forgot-password, reset-password, 2FA setup pages.  
**Missing:**
- No "Change password" flow for authenticated users (only reset via email)
- No account self-service settings page
- Admin account list shows all accounts in DB but no enable/disable/delete actions
- No `GET /admin/accounts` endpoint (creation only via `POST /admin/accounts`)

---

## Phase 3 Sub-phases

### Phase 3a — Lifecycle Completions _(Highest Business Value)_

Fix workflows that cannot be closed. Every item in this sub-phase unblocks an active user workflow.

#### 3a-1: Case Lifecycle (Close / Cancel / Archive)

**Backend:**
- `POST /cases/:id/close` — transitions `status → COMPLETED`, sets `closedAt`, validates all required steps are completed
- `POST /cases/:id/cancel` — transitions `status → CANCELLED`, accepts `reason`
- `POST /cases/:id/archive` — transitions `status → ARCHIVED` (admin/HR only)
- New `CloseCaseService`, `CancelCaseService`, `ArchiveCaseService` in `src/modules/case-management/application/`
- Update `PrismaCaseRecordRepository` to support status update
- Emit `case.closed` domain event → wired to notification translator

**Frontend:**
- Case detail page: add "Close Case" button (visible when all steps COMPLETED, owner only)
- Case detail page: add "Cancel Case" button + reason textarea (owner/HR only)
- Case status badge updates reactively after action
- `closeCaseRecord()`, `cancelCaseRecord()` functions in `frontend/src/lib/api/cases.ts`

**Acceptance criteria:**
- OPEN → COMPLETED when all steps done and Close button clicked
- OPEN → CANCELLED when Cancel + reason submitted
- Case list shows correct status badges after transitions
- Notification sent to case owner and subject on close

---

#### 3a-2: Exception Resolution Flow

**Backend:**
- `POST /exceptions/:id/resolve` — marks exception as `RESOLVED`, accepts `resolution` note and `resolvedBy` actorId
- `POST /exceptions/:id/suppress` — marks as `SUPPRESSED` with reason (admin only)
- `ExceptionRecord` entity needs `resolvedAt`, `resolvedBy`, `resolution`, `status` fields
- New `ResolveExceptionService`, `SuppressExceptionService`
- `GET /exceptions` filter should include `status=OPEN|RESOLVED|SUPPRESSED`

**Frontend:**
- Exception queue page: add "Mark resolved" action per row with resolution textarea
- Exception queue: add status filter (OPEN / RESOLVED / SUPPRESSED)
- Resolved exceptions shown in muted style with resolution note

---

#### 3a-3: Notification Failed Requeue

**Backend:**
- `POST /notifications/queue/:id/requeue` — resets `FAILED_TERMINAL` request to `QUEUED`, resets `attemptCount`, clears `failureReason` (admin only)
- `RequeueNotificationService` calls `notificationRequestRepository.save()` with updated status
- Dispatches via existing `NotificationDispatchService`

**Frontend:**
- Notification queue table: add "Requeue" button per row when `status === 'FAILED_TERMINAL'`
- Calls `POST /notifications/queue/:id/requeue`
- Success reloads the queue row

---

### Phase 3b — Data Correction & Amendment Flows

Fix immutability problems that prevent data quality management.

#### 3b-1: Work Evidence Correction

**Backend:**
- `PATCH /work-evidence/:id` — update `effortHours` (via `durationMinutes`), `summary`, `activityDate`, `sourceRecordKey`
- Creates a correction audit record: `previousValues`, `correctedBy`, `correctedAt` in metadata
- `UpdateWorkEvidenceService` enforces: only manual/internal evidence can be edited; JIRA evidence is read-only
- Business audit log entry emitted on each correction

**Frontend:**
- Work evidence list: add "Edit" icon per row (disabled for JIRA_WORKLOG and MEETING types)
- Inline edit form (or modal): editable fields `effortHours`, `summary`, `activityDate`
- Shows "Last corrected by X at Y" badge after update
- `updateWorkEvidence()` in `frontend/src/lib/api/work-evidence.ts`

---

#### 3b-2: Assignment Amendment

**Backend:**
- `PATCH /assignments/:id` — update `allocationPercent`, `staffingRole`, `validTo` (extend), `note`
- Cannot update `validFrom` (immutable — would change approval scope)
- Amendment creates a new `AssignmentHistory` entry with `changeType: 'ASSIGNMENT_AMENDED'`
- Requires same role guard as create (PM or RM)
- `AmendProjectAssignmentService`

**Backend (Revocation):**
- `POST /assignments/:id/revoke` — transitions status to `REVOKED`, with `reason`
- `RevokeProjectAssignmentService` — enforces only ACTIVE/APPROVED → REVOKED
- Emits revocation history entry

**Frontend:**
- Assignment detail page: "Edit allocation" inline form (allocation %, staffing role, note, extend end date)
- Assignment detail page: "Revoke" button with reason textarea (RM/admin only, separate from "End")
- `amendAssignment()`, `revokeAssignment()` in `frontend/src/lib/api/assignments.ts`

---

#### 3b-3: Project Metadata Editing

**Backend:**
- `PATCH /projects/:id` — update `name`, `description`, `endsOn`, `projectManagerId`
- Cannot change `status` (done via activate/close) or `projectCode` (immutable key)
- `UpdateProjectService` with optimistic concurrency check
- Business audit log entry on update

**Frontend:**
- Project detail page: "Edit project" section or inline edit fields (name, description, planned end date, manager)
- Save button → `PATCH /api/projects/:id`
- History section shows "Updated by X" entries

---

#### 3b-4: Reporting Line Termination

**Backend:**
- `PATCH /org/reporting-lines/:id` — set `validTo` to terminate a reporting line
- `TerminateReportingLineService`
- Validates `validTo >= validFrom`

**Frontend:**
- Employee detail page: reporting lines table has "End relationship" button per row
- Date picker for end date
- Calls `PATCH /api/org/reporting-lines/:id`

---

### Phase 3c — Dashboard Interactivity & UX Depth

Make every dashboard surface actionable, not just observational.

#### 3c-1: Navigation Links (Quick Wins)

- **Employee dashboard:** Assignment rows → clickable links to `/assignments/:id`
- **Employee dashboard:** "View all evidence" link → `/work-evidence?personId=:id`
- **PM dashboard:** Each project card has "Open dashboard →" link to `/projects/:id/dashboard`
- **PM dashboard:** Each staffing gap item has "Request resource →" link to `/assignments/new?projectId=:id`
- **Director dashboard:** Each org unit row has "View team →" link to `/teams?orgUnitId=:id`

Implementation: these are purely frontend link additions to existing components.

---

#### 3c-2: RM "Request Assignment" Quick Action

- RM dashboard: "New Assignment Request" button opens a modal (person selector pre-filtered to pool members, project selector)
- Submits `POST /assignments` without leaving the dashboard
- Success reloads dashboard data

---

#### 3c-3: Resource Pool Management

**Backend (new module: resource-pools):**
- `GET /resource-pools` — list all pools (RM/admin)
- `POST /resource-pools` — create pool with `name`, `managerPersonId`
- `PATCH /resource-pools/:id` — update name, manager
- `POST /resource-pools/:id/members` — add person
- `DELETE /resource-pools/:id/members/:personId` — remove person

**Frontend:**
- New route `/resource-pools` — list with create form
- Pool detail shows members list with add/remove actions
- Links from RM dashboard to pool detail

---

#### 3c-4: Director Trend Data

**Backend:**
- `GET /dashboard/director` extended: add `weeklyTrend` block — last 8 weeks of `{ weekStarting, activeProjectCount, staffedPersonCount, evidenceCoverageRate }`
- Sourced from `WorkEvidence.recordedAt` grouped by ISO week

**Frontend:**
- Director dashboard: new "Trend" section with a simple sparkline or bar chart (reuse `evidenceByWeek` chart component from project dashboard)

---

### Phase 3d — Platform Maturity

Event coverage, auth self-service, integration operations.

#### 3d-1: Notification Event Expansion

Wire the following events in `notification-event-translator.service.ts`:

| Event | Template key | Channel |
|-------|--------------|---------|
| `case.created` | `case-created-email` | email |
| `case.step_completed` | `case-step-completed-email` | email |
| `case.closed` | `case-closed-email` | email |
| `assignment.ended` | `assignment-ended-email` | email |
| `employee.terminated` | `employee-terminated-teams` | teams |

For each:
1. Add template in the seeded template repository
2. Add domain event emission at the relevant service (e.g., `CloseCaseService.execute()` emits `case.closed`)
3. Add translator method in `NotificationEventTranslatorService`
4. Subscribe in the module

---

#### 3d-2: Integration Manual Sync Trigger

**Backend:**
- `POST /integrations/jira/sync` — triggers `JiraProjectSyncService.syncProjects()` immediately (admin only)
- `POST /integrations/m365/sync` — triggers M365 sync
- `POST /integrations/radius/sync` — triggers RADIUS sync
- Returns `{ status: 'triggered', startedAt }` immediately (async execution)

**Frontend:**
- Integrations admin page: "Trigger sync" button per integration row
- Shows last sync timestamp and "Syncing..." state while in progress

---

#### 3d-3: Auth Self-Service

**Backend:**
- `POST /auth/password/change` — authenticated user changes own password (requires current password)
- `GET /admin/accounts` — paginated list of all local accounts (admin only)
- `PATCH /admin/accounts/:id` — update roles, enable/disable account (admin only)
- `DELETE /admin/accounts/:id` — delete account (admin only, not own account)

**Frontend:**
- New "Account Settings" page at `/settings/account` — change password form
- Admin panel User Accounts section: display existing accounts list with enable/disable toggle
- Calls new admin account management endpoints

---

## Implementation Roadmap

### Sub-phase order and rationale

| Sub-phase | Items | Estimated work | Dependency |
|-----------|-------|----------------|------------|
| **3a** (Lifecycle Completions) | Case close/cancel, Exception resolution, Notification requeue | ~4–5 days | None — unblocks active user workflows |
| **3b** (Data Correction) | Work evidence edit, Assignment amendment + revocation, Project edit, Reporting line termination | ~5–6 days | None — parallel to 3a |
| **3c** (Dashboard UX) | Navigation links, RM quick action, Resource pools, Director trend | ~4–5 days | 3b (resource pools need pool CRUD backend) |
| **3d** (Platform Maturity) | Notification events, Manual sync, Auth self-service | ~3–4 days | 3a (notification events use new case/assignment events) |

### Detailed item checklist (implementation order within each sub-phase)

#### Phase 3a checklist

- [x] `CloseCaseService` + `POST /cases/:id/close` + frontend close button
- [x] `CancelCaseService` + `POST /cases/:id/cancel` + frontend cancel button
- [x] `ArchiveCaseService` + `POST /cases/:id/archive`
- [x] `ExceptionResolutionStore` (in-memory) + `ResolveExceptionService` + `POST /exceptions/:id/resolve` + frontend resolve action
- [x] `SuppressExceptionService` + `POST /exceptions/:id/suppress` + frontend suppress action
- [x] Exception queue status filter (OPEN/RESOLVED/SUPPRESSED) — backend filter + frontend dropdown
- [x] `RequeueNotificationService` + `POST /notifications/queue/:id/requeue` + frontend requeue button

#### Phase 3b checklist

- [ ] `UpdateWorkEvidenceService` + `PATCH /work-evidence/:id` + frontend inline edit + test
- [ ] Work evidence: disable edit for external source types (JIRA_WORKLOG, MEETING) + test
- [ ] `AmendProjectAssignmentService` + `PATCH /assignments/:id` + frontend amendment form + test
- [ ] `RevokeProjectAssignmentService` + `POST /assignments/:id/revoke` + frontend revoke button + test
- [ ] Assignment revocation history entry (`ASSIGNMENT_REVOKED` changeType) + test
- [ ] `UpdateProjectService` + `PATCH /projects/:id` + frontend project edit form + test
- [ ] `TerminateReportingLineService` + `PATCH /org/reporting-lines/:id` + frontend end-relationship button + test

#### Phase 3c checklist

- [x] Employee dashboard: assignment rows → `Link` to `/assignments/:id`
- [x] Employee dashboard: "View all evidence" link to filtered evidence page
- [x] PM dashboard: project cards → "Open Dashboard" link
- [x] PM dashboard: staffing gap items → "Request resource" link to create-assignment pre-filled
- [x] Director dashboard: org unit rows → "View team" link
- [x] RM dashboard: "New Assignment Request" quick-action modal
- [ ] Resource pool backend: `GET/POST /resource-pools`, `PATCH /resource-pools/:id`, `POST/DELETE /resource-pools/:id/members`
- [ ] Resource pool frontend: `/resource-pools` route, pool list + create, pool detail with members
- [ ] RM dashboard: link to pool detail page
- [ ] Director dashboard: `weeklyTrend` from `GET /dashboard/director`
- [ ] Director dashboard frontend: trend sparkline/bar chart section

#### Phase 3d checklist

- [ ] `case-created-email` notification template (seeded) + event wiring in translator
- [ ] `case-step-completed-email` notification template + event wiring
- [ ] `case-closed-email` notification template + event wiring (fired from `CloseCaseService`)
- [ ] `assignment-ended-email` notification template + event wiring
- [ ] `employee-terminated-teams` notification template + event wiring
- [ ] `POST /integrations/jira/sync` + `POST /integrations/m365/sync` + `POST /integrations/radius/sync`
- [ ] Integrations admin page: "Trigger sync" button per provider
- [ ] `POST /auth/password/change` + frontend account settings page
- [ ] `GET /admin/accounts` paginated list
- [ ] `PATCH /admin/accounts/:id` (roles, enabled) + frontend admin account list with toggle
- [ ] `DELETE /admin/accounts/:id` + frontend delete action (with confirm)

---

## New Backend Endpoints Summary

| Endpoint | Method | Auth | Sub-phase |
|----------|--------|------|-----------|
| `/cases/:id/close` | POST | hr_manager, admin | 3a |
| `/cases/:id/cancel` | POST | hr_manager, admin | 3a |
| `/cases/:id/archive` | POST | admin | 3a |
| `/exceptions/:id/resolve` | POST | admin | 3a |
| `/exceptions/:id/suppress` | POST | admin | 3a |
| `/notifications/queue/:id/requeue` | POST | admin | 3a |
| `/work-evidence/:id` | PATCH | employee, pm, rm | 3b |
| `/assignments/:id` | PATCH | pm, rm | 3b |
| `/assignments/:id/revoke` | POST | rm, admin | 3b |
| `/projects/:id` | PATCH | pm, admin | 3b |
| `/org/reporting-lines/:id` | PATCH | hr_manager, admin | 3b |
| `/resource-pools` | GET, POST | rm, admin | 3c |
| `/resource-pools/:id` | PATCH | rm, admin | 3c |
| `/resource-pools/:id/members` | POST, DELETE | rm, admin | 3c |
| `/dashboard/director` (weeklyTrend) | GET (extended) | director | 3c |
| `/integrations/jira/sync` | POST | admin | 3d |
| `/integrations/m365/sync` | POST | admin | 3d |
| `/integrations/radius/sync` | POST | admin | 3d |
| `/auth/password/change` | POST | any authenticated | 3d |
| `/admin/accounts` | GET | admin | 3d |
| `/admin/accounts/:id` | PATCH, DELETE | admin | 3d |

---

## New Frontend Routes Summary

| Route | Component | Sub-phase |
|-------|-----------|-----------|
| `/resource-pools` | ResourcePoolsPage | 3c |
| `/resource-pools/:id` | ResourcePoolDetailPage | 3c |
| `/settings/account` | AccountSettingsPage | 3d |

---

## Domain Events to Emit (Phase 3)

| Emitter service | Event | Sub-phase |
|-----------------|-------|-----------|
| `CloseCaseService` | `case.closed` | 3a |
| `CancelCaseService` | `case.cancelled` | 3a |
| `CompleteCaseStepService` (existing) | `case.step_completed` | 3d |
| `CreateCaseService` (existing) | `case.created` | 3d |
| `EndProjectAssignmentService` (existing) | `assignment.ended` | 3d |
| `TerminateEmployeeService` (existing) | `employee.terminated` | 3d |

---

## Architectural Notes

### Pattern consistency
All new services must follow the existing pattern:
- Domain service in `application/` — single public `execute()` method
- Input validation at controller layer via existing guard chain
- Business audit log entry via `AuditLoggerService.record()` for all state mutations
- Optimistic concurrency via `version` field where entity has one (projects, assignments)

### Exception entity migration
The `ExceptionRecord` entity does not currently have `status`, `resolvedAt`, `resolvedBy`, `resolution` fields. A Prisma migration is required before Phase 3a exception items can land. This is the only schema change required for Phase 3a/3b.

### Resource pools module
Phase 3c resource pools require a new NestJS module `src/modules/resource-pools/` following the same modular pattern as existing modules. The Prisma schema already has `ResourcePool` and `ResourcePoolMembership` tables — no schema migration needed.

### Notification templates
New notification templates must be added to the seeded in-memory template repository. Each template requires:
1. A `templateKey` constant
2. A `bodyTemplate` (Handlebars-compatible)
3. A `channelKey` reference (email or teams-webhook)
4. Entry in `createSeededInMemoryNotificationTemplateRepository()`

---

## Success Criteria for Phase 3

Phase 3 is complete when:

1. All 21 items in the Phase 3 endpoint summary are implemented and tested
2. `tsc --noEmit` passes with zero errors across backend and frontend
3. All new endpoints have corresponding E2E tests in `e2e/phase3/`
4. Business audit entries are emitted for every state mutation (case close, assignment amend, evidence correction)
5. Notification events fire for: case created, case closed, assignment ended, employee terminated
6. Exception queue items can be marked resolved and filtered by status
7. Resource pool CRUD is functional end-to-end
8. PM dashboard project cards link to project dashboard
9. Employee dashboard assignment rows link to assignment detail
10. `docs/planning/current-state.md` updated to reflect Phase 3 delivery
