> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# Phase 13 — Supply & Demand Staffing Flows

**Version:** 1.0  
**Created:** 2026-04-05  
**Status:** Discovery / Pre-implementation

---

## Executive Summary

Phase 13 introduces a formal staffing request pipeline that sits upstream of the existing `ProjectAssignment` model. Project Managers raise typed, prioritised requests against their projects; Resource Managers fulfil those requests by selecting skill-matched candidates and creating assignments; all downstream roles (Employee, HR, Delivery Manager) receive real-time visibility through enhanced dashboards and notification events. No existing tables are broken; new DB entities attach cleanly to `Project`, `ProjectAssignment`, and `Person`.

---

## 1. Domain Model Changes

### 1.1 New enum

```prisma
enum StaffingRequestStatus {
  DRAFT        // PM is still editing — not yet visible to RM
  OPEN         // Submitted, awaiting RM action
  IN_REVIEW    // RM has opened and is evaluating candidates
  FULFILLED    // An assignment was created and linked
  CANCELLED    // PM or RM cancelled the request
}

enum StaffingRequestPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### 1.2 New table: `StaffingRequest`

```prisma
model StaffingRequest {
  id                  String                 @id @default(uuid()) @db.Uuid
  requestNumber       String                 @unique          // e.g. SR-0001
  projectId           String                 @db.Uuid
  requestedByPersonId String                 @db.Uuid         // PM who raised it
  reviewedByPersonId  String?                @db.Uuid         // RM who picked it up
  requiredRole        String                 // free-text role title (e.g. "Senior Java Engineer")
  requiredSkillIds    String[]               @default([])     // FK list to Skill.id (denormalised for query speed)
  headcount           Int                    @default(1)      // number of people needed
  startDate           DateTime               @db.Date
  endDate             DateTime?              @db.Date
  allocationPercent   Decimal?               @db.Decimal(5, 2) // expected allocation per person
  priority            StaffingRequestPriority @default(MEDIUM)
  status              StaffingRequestStatus  @default(DRAFT)
  notes               String?
  cancelReason        String?
  version             Int                    @default(1)
  createdAt           DateTime               @default(now())
  updatedAt           DateTime               @updatedAt
  archivedAt          DateTime?

  project             Project                @relation(fields: [projectId], references: [id])
  requestedBy         Person                 @relation("StaffingRequestedBy", fields: [requestedByPersonId], references: [id])
  reviewedBy          Person?                @relation("StaffingReviewedBy", fields: [reviewedByPersonId], references: [id])
  fulfilments         StaffingRequestFulfilment[]

  @@index([projectId, status])
  @@index([requestedByPersonId, status])
  @@index([status, priority, startDate])
}
```

**Add back-relation on `Project`:**
```prisma
// inside model Project:
staffingRequests    StaffingRequest[]
```

**Add back-relations on `Person`:**
```prisma
// inside model Person:
raisedStaffingRequests    StaffingRequest[] @relation("StaffingRequestedBy")
reviewedStaffingRequests  StaffingRequest[] @relation("StaffingReviewedBy")
staffingFulfilments       StaffingRequestFulfilment[]
```

### 1.3 New table: `StaffingRequestFulfilment`

A single `StaffingRequest` with `headcount > 1` may be fulfilled by multiple assignments over time. This join table makes that explicit.

```prisma
model StaffingRequestFulfilment {
  id                String            @id @default(uuid()) @db.Uuid
  staffingRequestId String            @db.Uuid
  assignmentId      String            @db.Uuid             // the ProjectAssignment created by RM
  assignedPersonId  String            @db.Uuid             // denormalised for query convenience
  fulfiledByPersonId String?          @db.Uuid             // RM who acted
  createdAt         DateTime          @default(now())

  staffingRequest   StaffingRequest   @relation(fields: [staffingRequestId], references: [id])
  assignment        ProjectAssignment @relation(fields: [assignmentId], references: [id])
  assignedPerson    Person            @relation(fields: [assignedPersonId], references: [id])

  @@unique([staffingRequestId, assignmentId])
  @@index([assignmentId])
  @@index([assignedPersonId])
}
```

**Add back-relation on `ProjectAssignment`:**
```prisma
// inside model ProjectAssignment:
staffingFulfilments StaffingRequestFulfilment[]
```

### 1.4 Status lifecycle

```
DRAFT → OPEN            (PM submits)
OPEN → IN_REVIEW        (RM opens request)
IN_REVIEW → FULFILLED   (RM fulfils all headcount)
IN_REVIEW → OPEN        (RM releases without acting — returns to queue)
OPEN / IN_REVIEW → CANCELLED  (PM cancels, or RM marks unworkable)
```

Partial fulfilment (some but not all headcount filled): request stays `IN_REVIEW`. When fulfilment count reaches `headcount`, status auto-transitions to `FULFILLED`.

---

## 2. Backend Endpoints

### 2.1 New module: `staffing-requests`

| Method | Path | Actor(s) | Description |
|--------|------|----------|-------------|
| `POST` | `/staffing-requests` | PM | Create a new request in `DRAFT` status |
| `GET` | `/staffing-requests` | PM, RM, DM, Director | List, filterable by `status`, `projectId`, `requiredRole`, `priority`, `startDate` range, pagination |
| `GET` | `/staffing-requests/:id` | PM, RM, DM | Detail view including fulfilment records |
| `PATCH` | `/staffing-requests/:id` | PM | Update draft fields (role, skills, headcount, dates, priority, notes) |
| `POST` | `/staffing-requests/:id/submit` | PM | DRAFT → OPEN; fires `staffingRequest.submitted` notification |
| `POST` | `/staffing-requests/:id/cancel` | PM | OPEN/IN_REVIEW → CANCELLED; body: `{ reason }` |
| `POST` | `/staffing-requests/:id/review` | RM | OPEN → IN_REVIEW; records `reviewedByPersonId` |
| `POST` | `/staffing-requests/:id/release` | RM | IN_REVIEW → OPEN; clears reviewer without cancelling |
| `POST` | `/staffing-requests/:id/fulfil` | RM | Creates `ProjectAssignment` + `StaffingRequestFulfilment`; auto-sets status to FULFILLED when headcount met |
| `GET` | `/staffing-requests/suggestions` | RM | Query param `requestId`; delegates to existing `SkillsService.skillMatch()` with request's `requiredSkillIds` and `projectId`; returns `SkillMatchCandidateDto[]` sorted by available capacity |

### 2.2 Dashboard endpoint additions

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/dashboard/project-manager` | Add `openRequestCount`, `openRequests[]` (id, requiredRole, status, priority, startDate) to response |
| `GET` | `/dashboard/resource-manager` | Add `incomingRequests[]` (id, projectName, requiredRole, priority, headcount, suggestedCandidateCount) — top 10 by priority then startDate |
| `GET` | `/dashboard/delivery-manager` | Add `staffingGaps[]` (assignments ending in next 28 days with no linked successor request or follow-on assignment), `openRequestsByProject[]` |
| `GET` | `/dashboard/hr-manager` | Add `atRiskEmployees[]` (allocation > 100% AND pulse < 3 AND open case simultaneously) |

---

## 3. Frontend Pages & Components

### 3.1 New pages

| Route | Component | Primary actor | Description |
|-------|-----------|---------------|-------------|
| `/staffing-requests` | `StaffingRequestsPage` | PM, RM, DM | Filterable list: status chips, role/project search, priority badges, headcount progress bar (filled/total) |
| `/staffing-requests/new` | `CreateStaffingRequestPage` | PM | Wizard-style form: project picker, role field, skill multi-select (calls `GET /skills`), headcount, dates, allocation%, priority, notes; submits to DRAFT then optionally promotes to OPEN |
| `/staffing-requests/:id` | `StaffingRequestDetailPage` | PM, RM | Header with request metadata and status badge; fulfilment progress bar; **Suggestions Panel** (RM only) showing `SkillMatchCandidateDto[]` with current allocation bar and "Assign" button per candidate; history/audit trail at bottom |

### 3.2 New components (shared)

| Component | Used in | Purpose |
|-----------|---------|---------|
| `StaffingRequestStatusBadge` | List + Detail pages | Colour-coded status chip (DRAFT=grey, OPEN=blue, IN_REVIEW=amber, FULFILLED=green, CANCELLED=red) |
| `PriorityBadge` | List + Detail pages | Icon + label (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=grey) |
| `FulfilmentProgressBar` | List + Detail pages | `filled / headcount` ratio bar |
| `SuggestionsPanel` | Detail page (RM role guard) | Table of skill-matched candidates; each row shows name, matched skills, current allocation%, "Assign" CTA |

### 3.3 Dashboard enhancements

| Dashboard | Section to add | Component |
|-----------|---------------|-----------|
| `ProjectManagerDashboardPage` | "Open Staffing Requests" | `OpenRequestsList` — shows up to 5 unfulfilled requests for PM's projects, each with priority badge, role, headcount gap, start date, and quick link to detail |
| `ResourceManagerDashboardPage` | "Incoming Request Queue" | `IncomingRequestsQueue` — ordered by CRITICAL→LOW then startDate; inline candidate count chip; "Review" button that calls `POST /staffing-requests/:id/review` and navigates to detail |
| `DeliveryManagerDashboardPage` | "Staffing Gaps" | `StaffingGapsTable` — assignments ending ≤28 days with no follow-on; columns: employee, project, role, end date, days remaining |
| `DeliveryManagerDashboardPage` | "Open Requests by Project" | `ProjectRequestsRollup` — count of OPEN+IN_REVIEW requests per project |
| `HrDashboardPage` | "At-Risk Employees" | `AtRiskEmployeeList` — employees flagged with high allocation AND low pulse AND open case; columns: name, allocation%, pulse score, open case link |

---

## 4. Notification Events

All new events wire into the existing `NotificationEventTranslatorService` pattern (email via `sendEmail()` + in-app via `InAppNotificationService.createNotification()`).

| Event name | Trigger | Email recipient | In-app recipient | Template key |
|------------|---------|-----------------|------------------|--------------|
| `staffingRequest.submitted` | PM calls `POST .../submit` | RM group (configured default email) | All users with `resource_manager` role (broadcast via in-app) | `staffing-request-submitted-email` |
| `staffingRequest.inReview` | RM calls `POST .../review` | PM (requestedByPersonId) | PM | `staffing-request-in-review-email` |
| `staffingRequest.fulfilled` | headcount met on `POST .../fulfil` | PM (requestedByPersonId) | PM + assigned employee | `staffing-request-fulfilled-email` |
| `staffingRequest.cancelled` | PM or RM calls `POST .../cancel` | Counterparty (if RM cancelled → PM; if PM cancelled → RM reviewer) | Same | `staffing-request-cancelled-email` |
| `assignment.created` (existing) | Already fires on `CreateProjectAssignmentService`; `fulfil` endpoint reuses this | — | Employee (personId) | Already wired |

**Implementation note:** RM broadcast (`staffingRequest.submitted`) cannot use a personId today because notifications target individuals. Options:
1. Send to the configured `notificationsDefaultEmailRecipient` (already used by other events) — simplest and zero new infrastructure.
2. Query all active `resource_manager` user accounts and dispatch one in-app notification per person — preferred for in-app; loop inside `NotificationEventTranslatorService`.

Option 2 is recommended. The `UserAccount` table (or `identityAccess` module) already holds role data. The translator can fetch all `resource_manager` accounts and call `createNotification()` once per person.

---

## 5. HR Monitoring View — At-Risk Panel

### 5.1 "At-risk" definition

An employee is flagged **at risk** when ALL three conditions are true simultaneously:
- **Over-allocated:** sum of `allocationPercent` across active APPROVED/ACTIVE `ProjectAssignment` records > 100%
- **Low pulse:** latest `PulseEntry.mood` ≤ 2 (on a 1–5 scale)
- **Open HR case:** at least one `CaseRecord` where `subjectPersonId = person.id` AND `status IN (OPEN, IN_PROGRESS)`

### 5.2 Backend query

Add a new service `HrAtRiskQueryService` inside `dashboard/application/`:

```
GET /dashboard/hr-manager  (existing endpoint)
→ add atRiskEmployees[] field
```

Each item in `atRiskEmployees[]`:
```ts
{
  personId: string;
  displayName: string;
  primaryEmail: string | null;
  currentAllocationPercent: number;
  latestPulseMood: number;           // 1–5
  openCaseCount: number;
  openCaseIds: string[];             // for navigation to case detail
}
```

### 5.3 Frontend component: `AtRiskEmployeeList`

Location: `frontend/src/routes/dashboard/HrDashboardPage.tsx`

- Red warning banner at top of HR dashboard when `atRiskEmployees.length > 0`
- Table rows: name (link to `/people/:id`), allocation% with danger colour if >100%, pulse mood chip, case count with link to first open case
- Empty state: green check "No at-risk employees"

---

## 6. Delivery Manager View — Staffing Gap Analysis

### 6.1 "Upcoming gap" definition

An upcoming gap is a `ProjectAssignment` record where:
- `status IN (ACTIVE, APPROVED)`
- `validTo` is within the next 28 calendar days from request date
- No `StaffingRequest` with `status IN (OPEN, IN_REVIEW, FULFILLED)` exists for the same `projectId` covering the period immediately after `validTo`
- No other `ProjectAssignment` for the same `personId + projectId` starts within 7 days of `validTo`

### 6.2 Backend additions to DM dashboard

```ts
// Inside DeliveryManagerDashboardResponseDto:
staffingGaps: Array<{
  assignmentId: string;
  personId: string;
  personDisplayName: string;
  projectId: string;
  projectName: string;
  staffingRole: string;
  validTo: string;           // ISO date
  daysUntilEnd: number;
}>;

openRequestsByProject: Array<{
  projectId: string;
  projectName: string;
  openCount: number;         // OPEN + IN_REVIEW
  criticalCount: number;     // subset with priority CRITICAL
}>;
```

### 6.3 Frontend components

`StaffingGapsTable` — sortable by `daysUntilEnd` ascending; rows link to assignment detail.

`ProjectRequestsRollup` — compact card list; each card links to `/staffing-requests?projectId=X`.

Both land in the existing `DeliveryManagerDashboardPage.tsx` below the current portfolio health table.

---

## 7. Implementation Order

The following sub-phases sequence dependencies correctly and allow incremental delivery.

### Sub-phase A — Data layer (prerequisite for everything)
1. Add `StaffingRequestStatus` and `StaffingRequestPriority` enums to `schema.prisma`
2. Add `StaffingRequest` model
3. Add `StaffingRequestFulfilment` model
4. Add back-relations on `Project`, `Person`, `ProjectAssignment`
5. Run and verify Prisma migration

### Sub-phase B — Backend core (can be developed in parallel after A)
6. `StaffingRequestsModule` scaffold (module file, controller stub, service stubs)
7. `CreateStaffingRequestService` + `POST /staffing-requests`
8. `ListStaffingRequestsService` + `GET /staffing-requests` (with filters)
9. `GetStaffingRequestByIdService` + `GET /staffing-requests/:id`
10. `SubmitStaffingRequestService` + `POST .../submit` + `staffingRequest.submitted` notification
11. `CancelStaffingRequestService` + `POST .../cancel` + `staffingRequest.cancelled` notification
12. `ReviewStaffingRequestService` + `POST .../review` + `POST .../release`
13. `FulfilStaffingRequestService` + `POST .../fulfil` (delegates to existing `CreateProjectAssignmentService`; creates fulfilment record; auto-transitions status)
14. `StaffingRequestSuggestionsService` + `GET /staffing-requests/suggestions` (wraps existing `SkillsService.skillMatch()`)
15. Dashboard additions: PM, RM, DM, HR manager endpoints updated

### Sub-phase C — Notifications
16. Add `staffingRequest.*` methods to `NotificationEventTranslatorService`
17. Seed notification templates (`NotificationTemplate` rows) for the 4 new events
18. Wire RM broadcast (loop over resource_manager accounts for in-app)

### Sub-phase D — Frontend
19. `StaffingRequestsPage` (list with filters)
20. `CreateStaffingRequestPage`
21. `StaffingRequestDetailPage` + `SuggestionsPanel` (RM role-guarded)
22. PM Dashboard "Open Staffing Requests" section
23. RM Dashboard "Incoming Request Queue" section
24. DM Dashboard "Staffing Gaps" + "Open Requests by Project" sections
25. HR Dashboard "At-Risk Employees" panel

### Sub-phase E — Tests
26. Unit tests: `CreateStaffingRequestService`, `FulfilStaffingRequestService`, `HrAtRiskQueryService`
27. Integration tests: fulfilment auto-transition, partial headcount logic
28. Playwright E2E: PM creates request → RM fulfils → employee notified flow
29. Playwright E2E: HR at-risk panel shows flagged employee
30. Playwright E2E: DM staffing gaps list

---

## 8. Estimated Tracker Items

```
[ ] 13-A1: Add StaffingRequestStatus + StaffingRequestPriority enums to schema.prisma [BE]
[ ] 13-A2: Add StaffingRequest model to schema.prisma [BE]
[ ] 13-A3: Add StaffingRequestFulfilment model to schema.prisma [BE]
[ ] 13-A4: Add back-relations on Project, Person, ProjectAssignment for new models [BE]
[ ] 13-A5: Generate and run Prisma migration for Phase 13 schema additions [BE]
[ ] 13-B1: Scaffold StaffingRequestsModule (module, controller stub, service stubs) [BE]
[ ] 13-B2: CreateStaffingRequestService — POST /staffing-requests [BE]
[ ] 13-B3: ListStaffingRequestsService — GET /staffing-requests (status/project/role/priority filters + pagination) [BE]
[ ] 13-B4: GetStaffingRequestByIdService — GET /staffing-requests/:id (with fulfilments) [BE]
[ ] 13-B5: UpdateStaffingRequestService — PATCH /staffing-requests/:id (DRAFT only) [BE]
[ ] 13-B6: SubmitStaffingRequestService — POST /staffing-requests/:id/submit (DRAFT→OPEN) [BE]
[ ] 13-B7: CancelStaffingRequestService — POST /staffing-requests/:id/cancel (OPEN/IN_REVIEW→CANCELLED) [BE]
[ ] 13-B8: ReviewStaffingRequestService — POST /staffing-requests/:id/review + POST .../release [BE]
[ ] 13-B9: FulfilStaffingRequestService — POST /staffing-requests/:id/fulfil (creates assignment + fulfilment record, auto-transitions to FULFILLED when headcount met) [BE]
[ ] 13-B10: StaffingRequestSuggestionsService — GET /staffing-requests/suggestions?requestId= (delegates to SkillsService.skillMatch) [BE]
[ ] 13-B11: PM dashboard endpoint — add openRequestCount + openRequests[] fields [BE]
[ ] 13-B12: RM dashboard endpoint — add incomingRequests[] queue (ordered by priority then startDate) [BE]
[ ] 13-B13: DM dashboard endpoint — add staffingGaps[] (assignments ending ≤28 days, no follow-on) [BE]
[ ] 13-B14: DM dashboard endpoint — add openRequestsByProject[] rollup [BE]
[ ] 13-B15: HR dashboard endpoint — add atRiskEmployees[] (allocation>100% + pulse≤2 + open case) [BE]
[ ] 13-C1: Add staffingRequest.submitted method to NotificationEventTranslatorService (email + RM broadcast in-app) [BE]
[ ] 13-C2: Add staffingRequest.inReview notification (in-app + email to PM) [BE]
[ ] 13-C3: Add staffingRequest.fulfilled notification (in-app + email to PM and employee) [BE]
[ ] 13-C4: Add staffingRequest.cancelled notification (counterparty in-app + email) [BE]
[ ] 13-C5: Seed NotificationTemplate rows for 4 new staffingRequest.* events [BE]
[ ] 13-D1: StaffingRequestsPage at /staffing-requests — list with status/role/project/priority filters [FE]
[ ] 13-D2: CreateStaffingRequestPage at /staffing-requests/new — PM wizard form [FE]
[ ] 13-D3: StaffingRequestDetailPage at /staffing-requests/:id — header, fulfilment progress, audit trail [FE]
[ ] 13-D4: SuggestionsPanel component (RM role-guarded) on StaffingRequestDetailPage [FE]
[ ] 13-D5: Shared StaffingRequestStatusBadge, PriorityBadge, FulfilmentProgressBar components [FE]
[ ] 13-D6: PM Dashboard — OpenRequestsList section (up to 5 unfulfilled requests for PM's projects) [FE]
[ ] 13-D7: RM Dashboard — IncomingRequestsQueue section (top 10 by priority/startDate, inline candidate count, Review CTA) [FE]
[ ] 13-D8: DM Dashboard — StaffingGapsTable section (assignments ending ≤28 days) [FE]
[ ] 13-D9: DM Dashboard — ProjectRequestsRollup section (open+in_review counts per project) [FE]
[ ] 13-D10: HR Dashboard — AtRiskEmployeeList panel (allocation>100% + low pulse + open case) [FE]
[ ] 13-E1: Unit tests — CreateStaffingRequestService, FulfilStaffingRequestService, partial headcount auto-transition logic [BE]
[ ] 13-E2: Unit tests — HrAtRiskQueryService + DM staffingGaps query logic [BE]
[ ] 13-E3: Playwright E2E — PM creates request → submits → RM reviews → fulfils → employee gets in-app notification [BOTH]
[ ] 13-E4: Playwright E2E — HR at-risk panel displays flagged employee when conditions met [BOTH]
[ ] 13-E5: Playwright E2E — DM staffing gaps list shows assignment ending within 28 days [BOTH]
```

---

## Appendix: Key design decisions

### Why a separate `StaffingRequest` table rather than reusing `ProjectAssignment`?

`ProjectAssignment` carries a `personId` (non-nullable) and represents a confirmed staffing fact. A staffing request is a *demand* signal with no person attached yet. Forcing a null-person assignment would corrupt the workload calculation logic throughout the codebase (allocation sums, planned-vs-actual, dashboard queries all assume `personId` is always meaningful on a real assignment).

### Why `StaffingRequestFulfilment` instead of a direct FK on `ProjectAssignment`?

A request with `headcount > 1` maps to multiple assignments. A join table avoids a multi-value foreign key and cleanly supports the partial-fulfilment lifecycle.

### Skill match reuse

`SkillsService.skillMatch()` already takes `skillIds[]` + optional `projectId` and returns candidates sorted by available capacity. The suggestions endpoint is a thin adapter over this — no new matching logic required.

### In-app RM broadcast

The `NotificationEventTranslatorService` today targets a single `personId` per in-app notification. For the RM broadcast case, query all active user accounts with role `resource_manager` from the identity-access module and loop, calling `createNotification()` once per person. This keeps the notification model simple and avoids a "group notification" concept.
