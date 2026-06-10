# Amendment to the Lean Simplification Initiative — Employee Workspace, Time Management & Leave Self-Service

**Amendment id:** `in-addition-of-quiet-friendly-otter`
**Drafted:** 2026-05-23
**Amends:** [lean-simplification-initiative.md](docs/planning/claude-design/lean-simplification-initiative.md) (`now-it-is-essential-kind-candy`)
**Companion amendment:** [lean-simplification-staffing-desk-amendment.md](docs/planning/claude-design/lean-simplification-staffing-desk-amendment.md) (`in-addition-of-now-lovely-sloth`)
**Status:** For handoff to main developer; not yet ratified in the master plan
**Scope:** Three coupled amendments — (1) Design System (`Calendar` primitive + `BalanceMeter` primitive + `Timeline` lifecycle reuse), (2) Employee Workspace IA + product surfaces (`/me/*`), (3) Closing the leave-capacity-notifications gap left open by F-14 and 20b-10/20c-05

---

## Context

The lean-simplification initiative tightens the operator stack — staffing, projects, money. The **employee-facing surface area** has grown organically and is now scattered across five top-level routes — `/my-time`, `/leave`, `/notifications/inbox`, `/assignments`, `/settings` — none of which compose into a coherent "this is your workspace" experience.

Three structural problems live in that scatter today:

1. **No unified workspace.** An employee opens the app and lands on a role-keyed dashboard that surfaces some self-service items but treats time, leave, projects, and inbox as separate destinations. There is no single page that answers *"what am I doing this week, what's owed, what changed, what needs my attention now?"* — the JTBD that `persona-jtbds.md` already lists as #1 for the `employee` persona.
2. **Leave is a half-feature.** [LeaveRequestPage.tsx](frontend/src/routes/leave/LeaveRequestPage.tsx) ships create + approve + reject. But `LeaveBalance.used` / `pending` is never incremented on approval (open tracker item **20c-05**), the planner does not reserve capacity for approved leave (only disqualifies overlapping assignments), the **leave-decision notifications are not wired** (open tracker item **20b-10**), and there is no employee-visible balance / entitlement view at all. The model exists; the loop is unclosed.
3. **Project-role visibility for the employee is implicit.** An employee can find their assignments only by drilling into `/assignments` (filtered to self) or by reading project hierarchy off `/my-time`. There is no card that tells them *"these are the projects I am on, in what role, at what allocation, with what start and end dates, with what status."* That is the most-asked employee question on day-one.

This amendment is **additive**. It does not retire any existing surface. It:

- Adds a new top-level `/me/*` IA — a workspace shell that hosts existing pages as tabs while preserving every current deep link (back-compat redirects).
- Closes the leave-capacity-notification gap so the loop is whole (balance, capacity reservation, decision notifications, digest channel).
- Introduces two new DS primitives — a **`Calendar`** month-grid (the planner's `Timeline` is a date-axis bar, not a month grid; the gap is real) and a **`BalanceMeter`** segmented gauge — both reusable by the staffing surfaces.
- Re-uses the staffing-desk amendment's upgraded **`Timeline`** (lifecycle bars, group aggregates) for time-entry visualization, so two flagship initiatives share one primitive.

### What this amendment does NOT change

- The lean-simplification master plan's Sprint 3 (3-tab project consolidation), Sprint 4 (operational budgeting + EVM + approvals), and Sprint 5 (legacy drop) stand as-is.
- The staffing-desk amendment's `Timeline` upgrades (Part 1 of `in-addition-of-now-lovely-sloth`) are a hard dependency — this amendment **consumes** them; it does not redefine them.
- Existing routes (`/my-time`, `/leave`, `/timesheets`, `/notifications/inbox`, `/assignments`, `/settings`) keep working. Adding `/me/*` is layering, not replacement.
- The `LeaveRequest` / `LeaveBalance` / `PublicHoliday` Prisma models are kept. Schema deltas are limited to two columns and one new model (`LeavePolicy`).

---

## Part 1 — PM perspective: WHY and the JTBDs we are solving

### 1.1 Why now

Three signals justify pulling this into the lean-simplification window rather than deferring:

| Signal | Evidence |
|---|---|
| **Open gap items already on the tracker** | `20b-10` (missing leave notifications) and `20c-05` (transaction boundaries on balance) have lingered since Sprint F-14. Both unblock honest leave management. |
| **Persona JTBDs unmet for employee #1 / #2 / #5** | [persona-jtbds.md](docs/planning/claude-design/persona-jtbds.md) lists "see what I owe this week" / "submit time without re-orienting" / "know my leave status" as employee top-3. None are answered in ≤ 3 clicks from a single page today. |
| **Symmetry with the staffing-desk amendment** | That amendment makes the RM/PM/Director surface premium and opinionated. Doing the same for the employee surface produces a coherent product story; doing one without the other leaves a lopsided UX. |

### 1.2 JTBDs in scope

| # | Persona | Job to be done | Surface |
|---|---|---|---|
| J-1 | Employee | See what I owe this week (timesheet status, leave gaps, approvals pending against me, overdue items) at a glance. | `/me` workspace landing |
| J-2 | Employee | Log time without re-orienting; resume last week's entries; auto-fill from assignments. | `/me/time` (reuses `MyTimePage` + `TimesheetPage` lifecycle internals) |
| J-3 | Employee | Submit a leave request and immediately know my remaining balance, public holidays in range, and any overlap with my approved assignments. | `/me/leave` |
| J-4 | Employee | See every project I am on, in what role, at what allocation, with what dates and status. One screen. | `/me/projects` (NEW surface) |
| J-5 | Employee | Read incoming notifications (assignments changed, leave decisions, timesheet decisions, nudges) and act on them without leaving the inbox. | `/me/inbox` (reuses `InboxPage`) |
| J-6 | Employee | Manage my own profile (display name, locale, timezone, channel preferences, password, MFA). | `/me/settings` (reuses `AccountSettingsPage`) |
| J-7 | Manager / HR | Decide leave requests with full context (balance, conflicts, team coverage, capacity impact) on one screen. | `/time-management` (existing; extended) |
| J-8 | Manager / HR | Receive the right notification at the right time when a direct report submits leave or time. | Notifications + digest |

### 1.3 Success metrics (measured 30 days after rollout)

| Metric | Today | Target |
|---|---|---|
| Time-to-submit weekly timesheet (median, sessionStorage-derived) | unmeasured | ≤ 90 s |
| Leave-request submission completion rate | unmeasured | ≥ 95 % of started requests submitted |
| Employee "where are my projects" support tickets (HR + IT inbound) | baseline 0–5 / week | ≤ 1 / week |
| Leave-balance accuracy (sample audit, balance vs sum of approved+pending) | not enforced; drift possible | 100 % consistent |
| Notification delivery for leave decisions (approval/rejection) | 0 % wired | ≥ 99.5 % delivered to chosen channel within 60 s |

### 1.4 Out of scope (explicit non-goals)

- Multi-tenant leave policy editing UI. Policies stay seed-driven for this amendment; tenant-customizable policy editing is a follow-on.
- Replacing the manager-side `TimeManagementPage` chrome. We extend, not re-skin.
- Adding mobile-native time-entry. We commit to a clean responsive layout; a PWA-shell is out of scope.
- SMS adapter implementation. Channel stays a stub (`NotificationChannel` row exists; no transport).

---

## Part 2 — BA perspective: current-state inventory, gaps, acceptance criteria

### 2.1 What is already shipped (do not rebuild)

| Capability | Source | Status |
|---|---|---|
| Weekly timesheet model + lifecycle (DRAFT → SUBMITTED → APPROVED / REJECTED) | [src/modules/timesheets/](src/modules/timesheets/), `TimesheetWeek` + `TimesheetEntry` at [schema.prisma](prisma/schema.prisma) | ✅ Shipped — Phase 5 |
| Monthly timesheet view + gaps + auto-fill from assignments | [my-time.controller.ts](src/modules/timesheets/presentation/my-time.controller.ts), `MyTimePage.tsx` | ✅ Shipped |
| Period locks + CAPEX/OPEX flag + hash-chained audit | Phase 5 + Phase 8 | ✅ Shipped |
| Public holidays (multi-region, country-code tagged) | `PublicHoliday` at [schema.prisma](prisma/schema.prisma) line ~2901, `PublicHolidayService` | ✅ Shipped (F-7.2 / D-163) |
| Leave-request CRUD + approve / reject | [src/modules/leave-requests/](src/modules/leave-requests/), `LeaveRequestPage.tsx` | ✅ Shipped — F-14 |
| Leave overlap detection (concurrent approved leave) | `findFirstOverlappingApproved` in service | ✅ Shipped (20b-11) |
| In-app notifications + channel preferences + email + SSE inbox | [src/modules/in-app-notifications/](src/modules/in-app-notifications/), [src/modules/notifications/](src/modules/notifications/) | ✅ Shipped — Phase 10 / F-0.8 |
| Activity feed for a person (lifecycle event timeline) | `PersonActivityFeed.tsx`, `EmployeeActivityEvent` model | ✅ Shipped — Phase 19 |
| Account settings (password, channel prefs, locale, timezone, theme) | `AccountSettingsPage.tsx` | ✅ Shipped — 18-H-02 |
| Approver nudge button with 24h rate limit | `NudgeButton.tsx`, `POST /notifications/nudge` | ✅ Shipped — F-3.4 (21-09) |

### 2.2 Gaps this amendment closes

| # | Gap | Severity | Today | Target |
|---|---|---|---|---|
| G-1 | **No `/me` workspace landing.** | High | Employee opens app → role-keyed dashboard. No single self-service entry. | New `/me` route with five tabs: Overview, Time, Leave, Projects, Inbox, Settings. |
| G-2 | **No "My Projects" view.** | High | Employees drill `/assignments` filtered to self; allocation, dates, role, status scattered. | `/me/projects` lists active + recent assignments + position memberships in one table with status + drill-down. |
| G-3 | **Leave balance never updated.** | High | `LeaveBalance.used` / `pending` columns exist but are never written. Approval mutates `LeaveRequest.status` only. (20c-05 open) | `LeaveBalanceService.applyTransition()` invoked inside `$transaction` on approve / reject / cancel. Reads always recompute from request rows as the authoritative source; columns are an indexed projection refreshed in-transaction. |
| G-4 | **Leave decisions emit no notifications.** | High | Outbox + in-app pipeline exists; no producer for `leave.approved` / `leave.rejected` / `leave.cancelled`. (20b-10 open) | Three new domain events + `NotificationEventTranslator` entries + tests. |
| G-5 | **Approved leave does not reserve planner capacity.** | Medium | Planner disqualifies overlapping assignments at simulation time; allocation % is unchanged. | `WorkforcePlannerService.buildCapacityProfile()` subtracts approved leave hours from weekly capacity. |
| G-6 | **No leave balance + entitlement card for the employee.** | Medium | Employees can only see their own request list. No balance, no carryover, no "what type used how much". | `BalanceMeter` component on `/me/leave` + `/people/:id` Person 360. |
| G-7 | **No leave policy configuration.** | Medium | Entitlement is a free Decimal in `LeaveBalance`; no rules: accrual, carryover, max negative, advance freeze. | New `LeavePolicy` model + seed (org-wide default). One policy per tenant for v1; per-grade override is a follow-on. |
| G-8 | **No notification digest / quiet hours.** | Low | Every event ships immediately on email + in-app. | Per-person `digestSchedule` (`OFF` / `DAILY_9AM` / `WEEKLY_MON_9AM`) + quiet hours (`22:00–07:00 local`). Backfills email channel only; in-app stays real-time. |
| G-9 | **`/me` deep links not back-compat.** | Low | New IA must not break bookmarks. | Old routes (`/my-time`, `/leave`, `/notifications/inbox`, `/assignments?personId=$me`, `/settings`) keep working; `/me/*` is an alias-and-redirect layer until at least one release after rollout. |

### 2.3 Acceptance criteria (per JTBD)

**J-1 — `/me` workspace landing**

- Renders within 800 ms TTFB on the gold-standard latency budget.
- Has six tabs: Overview · Time · Leave · Projects · Inbox · Settings.
- Overview tab shows four KPI tiles in the existing `kpi-strip` grammar: *Hours this week (filed / expected)*, *Leave balance (remaining / entitlement)*, *Open notifications (unread count)*, *Projects (active count)*. Every tile is a `<Link>` to the corresponding tab (UX Law 9).
- Filter persistence via URL: `?tab=time&week=2026-05-25` round-trips (Law 5).
- Empty / loading / error states use the `LoadingState` / `EmptyState` / `ErrorState` DS atoms.
- Every action reachable in ≤ 3 clicks from `/me` (Law 1).

**J-3 — `/me/leave`**

- Shows current-year balance per leave type as a `BalanceMeter` (`entitlement` − `used` − `pending` = remaining).
- "Request leave" inline form with: type, date range, notes, **inline preview** of: (a) working days requested (excludes weekends + public holidays per the person's country), (b) conflicting assignments in range, (c) remaining balance after request.
- On submit: optimistic UI update; reverts on server reject; toast confirms.
- Pending requests visible inline with "Cancel" action; cancelled requests render struck-through.
- Calendar tab renders the year with month grid (`Calendar` DS primitive) — green dots for approved leave, amber for pending, blue for public holidays, grey for weekends.

**J-4 — `/me/projects`**

- Renders within 800 ms.
- Lists every assignment / position where `personId === principal.personId` and `activeValidTo ≥ today − 90 days`. Columns: Project · Role · Allocation % · Start · End · Status · Manager.
- Active assignments first, then historical (collapsed by default, expand to show).
- Each row drills to `/projects/:id` (Law 2: forward action present).
- Empty state CTA: "Talk to your RM about your next assignment" with link to Resource Manager (resolved from `Person.lineManagerId` if set, else the org-default RM).

**J-7 — Manager leave decision**

- `TimeManagementPage` "Leave" tab shows pending requests with: balance impact (`pre / post`), team coverage in the requested range (count of people on leave, count remaining ≥ 1 per pool), conflicting approved assignments for the requester, and an "Approve / Reject" action ≤ 200 px from the request row (Law 4).
- Approve action runs in `$transaction`: status → APPROVED, balance increment, emit `leave.approved` event.
- Reject action requires a reason (already enforced) + emits `leave.rejected`.

**G-3 — Balance integrity**

- For every `(personId, year, leaveType)` triple, after every transition: `LeaveBalance.used = Σ days of APPROVED LeaveRequest in that year of that type` and `LeaveBalance.pending = Σ days of PENDING LeaveRequest`. Drift detected by a nightly sweep job ⇒ raises a `LeaveBalanceDrift` exception entry visible to admins.
- Tests: a property-based test driving 100 random sequences of create / approve / reject / cancel and asserting the invariant holds.

---

## Part 3 — Solution Architect perspective: schema, modules, contracts, RBAC

### 3.1 Schema additions

#### 3.1.1 `LeavePolicy` (new model)

One row per tenant for v1 (no per-grade or per-org-unit overrides yet — those are future).

```prisma
model LeavePolicy {
  id                      String   @id @default(uuid()) @db.Uuid
  tenantId                String   @db.Uuid
  yearStartMonth          Int      @default(1)   // 1..12; fiscal-leave year boundary
  annualEntitlementDays   Decimal  @db.Decimal(5, 2) @default(25)
  accrualMode             LeaveAccrualMode @default(UPFRONT)
  accrualFrequency        LeaveAccrualFrequency @default(YEARLY)
  carryoverMaxDays        Decimal  @db.Decimal(5, 2) @default(5)
  carryoverExpiresMonths  Int?                                  // null = never expires
  minAdvanceNoticeDays    Int      @default(0)
  maxNegativeBalanceDays  Decimal  @db.Decimal(5, 2) @default(0)
  weekendCountsAsWork     Boolean  @default(false)              // false = exclude Sat+Sun
  publicHolidayCountsAsWork Boolean @default(false)             // false = exclude public holidays for the person's country
  effectiveFrom           DateTime @db.Timestamptz(3)
  effectiveTo             DateTime? @db.Timestamptz(3)
  createdAt               DateTime @default(now()) @db.Timestamptz(3)
  updatedAt               DateTime @updatedAt @db.Timestamptz(3)
  createdByPersonId       String?  @db.Uuid
  updatedByPersonId       String?  @db.Uuid

  tenant                  Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, effectiveFrom])
  @@map("leave_policies")
}

enum LeaveAccrualMode      { UPFRONT MONTHLY_ACCRUAL }
enum LeaveAccrualFrequency { YEARLY MONTHLY }
```

#### 3.1.2 `LeaveRequest` — three new columns

```prisma
model LeaveRequest {
  // ... existing fields ...
  workingDays   Decimal  @db.Decimal(5, 2)            // computed at create; recomputed on approve if dates changed
  policyVersion Int      @default(1)                  // points at the LeavePolicy effective at request creation
  cancelledAt   DateTime?
  cancelledBy   String? @db.Uuid
}
```

`workingDays` is computed by `LeaveCalculatorService.workingDaysBetween(start, end, countryCode, policyFlags)`. Recompute happens during approve **inside the transaction**, never after, so balance writes can use the same value.

#### 3.1.3 `LeaveBalance` — derived projection, not source of truth

Existing model kept. We add:

```prisma
model LeaveBalance {
  // ... existing fields ...
  carryoverDays    Decimal @db.Decimal(5, 2) @default(0)
  carryoverExpiresOn DateTime? @db.Date
  computedAt       DateTime @default(now()) @db.Timestamptz(3)
}
```

The authoritative computation is the sum of approved + pending request `workingDays` for the year + carryover from the prior year (capped by policy). Columns are a denormalized projection refreshed in-transaction on every transition and by a nightly job. Reads from the UI always hit the projection.

### 3.2 Module structure (backend)

```
src/modules/leave-management/                       ← renamed from leave-requests
  application/
    leave-requests.service.ts                       ← existing; now wraps approve/reject in $transaction
    leave-balance.service.ts                        ← existing; gets applyTransition() method
    leave-calculator.service.ts                     ← new: workingDays + carryover math (pure)
    leave-policy.service.ts                         ← new: resolve policy effective at a moment
    leave-balance-drift-sweep.ts                    ← new cron: nightly drift detect → exception
  domain/
    events/
      leave-approved.event.ts                       ← new
      leave-rejected.event.ts                       ← new
      leave-cancelled.event.ts                      ← new
      leave-balance-drift.event.ts                  ← new (raises admin-visible exception)
  presentation/
    leave-requests.controller.ts                    ← existing; +cancel endpoint, +balance endpoint
    leave-policy.controller.ts                      ← new (admin-only, read for now)
  infrastructure/
    prisma-leave-policy.repository.ts               ← new
```

```
src/modules/notifications/
  application/
    notification-digest.service.ts                  ← new: enqueues digests on schedule
    notification-event-translator.ts                ← existing; +leave.* mappings, +time.* mappings
  domain/
    digest-schedule.ts                              ← new enum (OFF / DAILY_9AM / WEEKLY_MON_9AM)
```

```
src/modules/staffing-desk/
  application/
    workforce-planner.service.ts                    ← existing; capacity profile now subtracts approved leave hours
    capacity-profile.builder.ts                     ← new (extracted): pure capacity math, leave-aware
```

```
src/modules/employee-workspace/                     ← NEW thin orchestrator module
  application/
    workspace-overview.service.ts                   ← aggregates KPIs for /me overview
    my-memberships.service.ts                       ← reads ProjectPosition / ProjectAssignment filtered to self
  presentation/
    workspace.controller.ts                         ← GET /me/overview, GET /me/memberships
```

### 3.3 Routes

| Route | View | Purpose | New / Existing |
|---|---|---|---|
| `/me` | Workspace landing → `?tab=overview` | Employee top-level | **New** |
| `/me/overview` | Overview tab — 4 KPI tiles + recent activity + upcoming approvals | Employee daily start | **New** |
| `/me/time` | Time tab — hosts `MyTimePage` inside the workspace shell | Self time entry | New shell, existing content |
| `/me/leave` | Leave tab — request form + balance + calendar | Self leave | New shell, hosts `LeaveRequestPage` content with `BalanceMeter` + `Calendar` |
| `/me/projects` | Projects tab — my memberships table | Self project view | **New** |
| `/me/inbox` | Inbox tab — hosts `InboxPage` content | Self notifications | New shell, existing content |
| `/me/settings` | Settings tab — hosts `AccountSettingsPage` content | Self account | New shell, existing content |
| `/my-time` | Existing route | Back-compat | Redirects to `/me/time` (alias). Keeps current behavior; both work for ≥ 1 release. |
| `/leave` | Existing route | Back-compat | Redirects to `/me/leave`. |
| `/notifications/inbox` | Existing route | Back-compat | Redirects to `/me/inbox`. |
| `/settings` | Existing route | Back-compat | Redirects to `/me/settings`. |
| `/assignments?personId=$me` | Existing route | Back-compat | When `personId === principal.personId`, page renders an inline "→ Open in your workspace" link to `/me/projects`. No redirect (preserves admin / RM utility). |

### 3.4 New API contracts

```http
GET /api/me/overview
→ {
    weekHours: { filed: number; expected: number; weekStart: string },
    leaveBalance: { remaining: Decimal; entitlement: Decimal; pending: Decimal },
    inbox: { unread: number },
    projects: { active: number; upcoming: number },
    upcomingApprovalsAgainstMe: number,
    recentActivity: ActivityItem[],            // last 10 events for principal.personId
  }

GET /api/me/memberships?since=YYYY-MM-DD
→ {
    active: MembershipRow[],
    upcoming: MembershipRow[],
    historical: MembershipRow[],
  }

MembershipRow = {
  projectId, projectName, role, allocationPercent,
  startDate, endDate, status,                  // BOOKED / ASSIGNED / ONBOARDING / RELEASED / PROPOSED
  managerDisplayName, managerPersonId,
  source: 'position' | 'assignment',           // post-S5 only 'position'
  positionId?: string                          // when source === 'position'
}

GET /api/leave-requests/balance?year=YYYY
→ {
    policyVersion: number,
    entitlement: Decimal, used: Decimal, pending: Decimal, remaining: Decimal,
    carryoverDays: Decimal, carryoverExpiresOn: string|null,
    byType: { type: LeaveRequestType, used: Decimal, pending: Decimal }[]
  }

POST /api/leave-requests/:id/cancel
→ 204 (own pending only; or hr/admin on approved)
  Emits leave.cancelled event.

GET /api/leave-requests/preview
  ?startDate&endDate&type
→ {
    workingDays: Decimal,
    publicHolidaysExcluded: string[],
    conflicts: { positionId|assignmentId, projectName, role, overlapDays }[],
    balanceAfter: Decimal
  }
```

### 3.5 New domain events (outbox)

| Event | Topic | Payload | Producer | Translator entry |
|---|---|---|---|---|
| `LeaveApprovedEvent` | `leave.approved` | `{ requestId, personId, type, startDate, endDate, workingDays, balanceAfter, decidedBy, reason? }` | `LeaveRequestsService.approve` | `leave.approved → leave-approved` template |
| `LeaveRejectedEvent` | `leave.rejected` | `{ requestId, personId, type, startDate, endDate, decidedBy, reason }` | `LeaveRequestsService.reject` | `leave.rejected → leave-rejected` template |
| `LeaveCancelledEvent` | `leave.cancelled` | `{ requestId, personId, type, cancelledBy, wasApproved }` | `LeaveRequestsService.cancel` | `leave.cancelled → leave-cancelled` template |
| `LeaveBalanceDriftEvent` | `leave.balance.drift` | `{ personId, year, type, projectionUsed, computedUsed, diff }` | `LeaveBalanceDriftSweep` | Admin-only exception entry; no employee notification |

All four register in [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts) using the established pattern.

### 3.6 Capacity reservation algorithm

`WorkforcePlannerService.buildCapacityProfile(personId, weeks[])`:

1. Start with `weeklyCapacityHours = Person.standardHoursPerWeek` (default 40).
2. For each week in `weeks`:
   a. Compute `publicHolidayHours = workingDayHoursForCountry × publicHolidaysInWeek(person.countryCode)`.
   b. Compute `leaveHours = Σ LeaveRequest where status='APPROVED' and overlaps week`. Per-day hours = `weeklyCapacityHours / 5` unless `LeavePolicy.weekendCountsAsWork` is true.
   c. `availableHours[week] = max(0, weeklyCapacityHours − publicHolidayHours − leaveHours)`.
3. Cache `(personId, weekStart) → availableHours` for one minute (tunable). Invalidation via outbox subscriber for `leave.approved` / `leave.cancelled` / `position.fill.changed`.

The planner's existing allocation-percent math reads from this profile instead of the static `standardHoursPerWeek`. The change is transparent to scenario state and the UI heat band (which already operates on actual vs available).

### 3.7 RBAC

| Endpoint | Roles |
|---|---|
| `GET /me/*` | ALL_AUTHENTICATED (filtered to caller's `personId` always; ignores any `?personId=` override) |
| `GET /leave-requests/balance` | ALL_AUTHENTICATED for self; HR_GOVERNANCE_ROLES for others (with `?personId=` allowed) |
| `POST /leave-requests/:id/cancel` | Owner (PENDING only) OR HR_GOVERNANCE_ROLES (PENDING or APPROVED) |
| `GET /leave-policy/current` | ALL_AUTHENTICATED (read of the global policy) |
| Admin policy edit | DEFERRED — admin-only read for v1 |

`@AllowSelfScope` is used on `/me/*` endpoints; the workspace controller resolves the caller's `personId` from `principal` and rejects any inbound override (RBAC pitfall #2: public tabs leaked information past scope — same precaution applies to `personId` in URL).

---

## Part 4 — UI/UX Designer perspective: DS additions, grammars, interaction states

### 4.1 New DS primitives (only two — every other surface is composition)

#### 4.1.1 `Calendar` (NEW)

A month-grid renderer. The existing `Timeline` is a date-axis bar laid out horizontally. A leave page needs the orthogonal lens: rows = weeks, columns = days, cells = day. The Calendar is not Timeline-replaceable.

```ts
// frontend/src/components/ds/Calendar.tsx
export interface CalendarProps {
  month: string;                                          // 'YYYY-MM'
  countryCode?: string;                                   // for public-holiday overlay
  weekStartsOn?: 0 | 1;                                   // 0=Sun, 1=Mon (locale-aware default)
  events?: CalendarEvent[];                               // dot markers per day
  selection?: { startDate: string; endDate: string };     // highlighted range
  onSelectionChange?: (range: { startDate: string; endDate: string }) => void;
  onMonthChange?: (month: string) => void;
  renderDayBadge?: (date: string) => ReactNode;           // override for custom day chip
  size?: 'sm' | 'md' | 'lg';
}

export interface CalendarEvent {
  date: string;
  tone: 'active' | 'warning' | 'info' | 'neutral';        // re-uses StatusBadge tones
  label?: string;                                         // accessible name; surfaced in tooltip
  href?: string;                                          // drill-down target (Law 9)
}
```

**Behaviors:**
- Range selection via click-then-click (mobile-safe) or click-and-drag.
- Public holidays render as blue dots; weekends shaded.
- Today receives the `--color-accent` border (mirrors `Timeline`'s today line).
- Keyboard nav: arrow keys move focus by day; PageUp / PageDown by month; Home / End to week edges. (`Timeline` does similar.)
- Empty state: month with no events still renders the grid (no `EmptyState` needed — the grid is the content).

**Tests:**
- `Calendar.test.tsx` — render, range-select, holiday tinting, keyboard nav, locale week start.

**Stories:**
- `Calendar.stories.tsx` — `Default`, `WithEvents`, `LeaveRequestPreview`, `WithRangeSelection`, `Dark`.

#### 4.1.2 `BalanceMeter` (NEW)

A segmented horizontal gauge for showing `used / pending / remaining` against an `entitlement`. Reusable for any "consumed vs available" semantic — leave today, project budget tomorrow, license seats later.

```ts
// frontend/src/components/ds/BalanceMeter.tsx
export interface BalanceMeterProps {
  segments: BalanceSegment[];                  // ordered left-to-right
  total: number;                               // denominator (entitlement)
  formatValue?: (n: number) => string;         // default: number; for time we pass time-format
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
}

export interface BalanceSegment {
  key: string;                                 // 'used' | 'pending' | 'remaining'
  label: string;                               // 'Used' | 'Pending' | 'Remaining'
  value: number;                               // in same unit as total
  tone: 'active' | 'warning' | 'info' | 'neutral' | 'danger';
  href?: string;                               // segment click drills down (Law 9)
  tipBody?: ReactNode;                         // hover-card body
}
```

**Visual:**
- One horizontal track (full width). Segments tile left-to-right proportional to `value / total`.
- Each segment is keyboard-focusable; hover reveals a `TipBalloon` with the tip body.
- Empty / over-entitled states: when `Σ value > total`, the last segment over-runs and renders a danger-tone outline; the legend shows the over-amount.
- Tabular-num formatting via the same `NUM` style the dashboard uses.

**Tests:**
- `BalanceMeter.test.tsx` — segment proportions, over-run rendering, tip body, drill-down click.

**Stories:**
- `Default`, `LeaveBalance` (used / pending / remaining), `Overdrawn`, `Dark`.

#### 4.1.3 `Timeline` (REUSE — depends on staffing-desk amendment Part 1)

`/me/time` uses the upgraded `Timeline` (`lifecycleStatusOf`, `groupBy`, `showGroupAggregate`) to visualize "the projects I logged time against this week" — same primitive as the planner. The two flagship initiatives share one DS upgrade investment.

### 4.2 Page grammars

Per [phase18-page-grammars.md](docs/planning/phase18-page-grammars.md):

| Surface | Grammar | Notes |
|---|---|---|
| `/me` (overview tab) | **Decision Dashboard** | KPI strip → hero `Timeline` showing the week → secondary cards (upcoming approvals + recent activity). Matches `DashboardPage.tsx` chrome verbatim. |
| `/me/time` | **Operational Queue** (variant) | Hosts the existing `MyTimePage` content unchanged inside the workspace shell. Tab strip + URL filters from §4.5 apply. |
| `/me/leave` | **List-Detail Workflow** | List = `BalanceMeter` + request table; Detail = inline form / calendar preview. Calendar is a secondary visualization, not a third pane. |
| `/me/projects` | **List-Detail Workflow** | List = memberships table; Detail = drills to `/projects/:id`. |
| `/me/inbox` | **Operational Queue** | Existing `InboxPage`, hosted. |
| `/me/settings` | **Admin Control Surface** (single-tenant variant) | Existing `AccountSettingsPage`, hosted. |

### 4.3 Workspace chrome

Tab strip ergonomics borrowed verbatim from the staffing-desk amendment (left-aligned, scrollable, keyboard navigable). The tabs here are **fixed** (no public / private user-defined tabs) — Overview · Time · Leave · Projects · Inbox · Settings. Layer:

```
┌─ TitleBar:  Avatar + Display name + role chips + tz/locale chip          [Cmd+K hint]
├─ TabStrip:  Overview | Time | Leave | Projects | Inbox | Settings        (←→ keyboard)
├─ FilterBar: ?week=… ?month=… ?year=… (depends on tab)
└─ Content:   Tab body
```

Tab choice mirrors URL: `?tab=time` is canonical; legacy `/my-time` redirects to `/me?tab=time`. Tab state is preserved on browser back via the same `URLSearchParams` round-trip as the staffing desk.

### 4.4 Color tokens

**No new color tokens.** All states map onto the existing token set:

| Concept | Token |
|---|---|
| Leave APPROVED | `--color-status-active` |
| Leave PENDING | `--color-status-warning` |
| Leave REJECTED | `--color-status-danger` |
| Leave CANCELLED | `--color-status-neutral` |
| Public holiday | `--color-status-info` |
| Today line | `--color-accent` |
| Balance "Used" segment | `--color-chart-1` |
| Balance "Pending" segment | `--color-chart-3` |
| Balance "Remaining" segment | `--color-status-active` |

This is deliberate: the existing palette is already proven, and the staffing-desk amendment is consuming the only new-token budget this initiative has (lifecycle bars + heat band). Token check (`npm run tokens:check`) does not need a baseline update for this amendment.

### 4.5 URL filter contract (Law 5)

| Tab | Filters | URL shape |
|---|---|---|
| Overview | `week` | `/me?tab=overview&week=YYYY-MM-DD` |
| Time | `month` (monthly view) or `week` (weekly view) | `/me?tab=time&month=YYYY-MM` |
| Leave | `year`, optional `view=calendar\|list` | `/me?tab=leave&year=2026&view=calendar` |
| Projects | `range=active\|upcoming\|history`, optional `q=` | `/me?tab=projects&range=active` |
| Inbox | `unreadOnly`, `eventType` | `/me?tab=inbox&unreadOnly=true` |
| Settings | none | `/me?tab=settings` |

Every filter round-trips on browser back (Law 5). Tab and filter state are persisted to `sessionStorage` keyed by `me-workspace-state` for workspace continuity (Law 10).

### 4.6 Interaction-state matrix (per surface, expected in design handoff)

| State | `/me` Overview | `/me/leave` | `/me/projects` | `/me/inbox` |
|---|---|---|---|---|
| Loading | Skeleton — KPI strip + 6-row table | Skeleton — meter + 5-row form | Skeleton — 8-row table | Skeleton — 10-row list |
| Empty | "No activity this week" + CTA to log time | "No leave requested" + CTA "Request leave" | "No active assignments" + CTA "Talk to your RM" | "Inbox zero" celebratory copy |
| Error | `ErrorState` with retry | `ErrorState` with retry | `ErrorState` with retry | `ErrorState` with retry |
| Saving (optimistic) | n/a | Form button → spinner; meter ghost-updates | n/a | "Mark all read" → toast |
| Forbidden | n/a (workspace is always authorized for self) | If user views `/me/leave` after deactivation: `ErrorState` "Your account is inactive" + link to support | Same | Same |

---

## Part 5 — Dev Team Lead perspective: stories, sprint placement, verification

### 5.1 Two work blocks, **no new sprints**

#### S2.5b — "Workspace + Calendar + BalanceMeter foundations" (1 week, inserted in parallel with S2.5)

Runs alongside the staffing-desk amendment's S2.5. Independent — no shared files except `index.ts`. Can be done by a second FE engineer.

| ID | Goal | Effort | Files touched |
|---|---|---|---|
| **S2.5b-1** | `Calendar` DS primitive + tests + stories | M | new [Calendar.tsx](frontend/src/components/ds/Calendar.tsx), [Calendar.test.tsx](frontend/src/components/ds/Calendar.test.tsx), [Calendar.stories.tsx](frontend/src/components/ds/Calendar.stories.tsx), [index.ts](frontend/src/components/ds/index.ts), [global.css](frontend/src/styles/global.css) |
| **S2.5b-2** | `BalanceMeter` DS primitive + tests + stories | S | new [BalanceMeter.tsx](frontend/src/components/ds/BalanceMeter.tsx), [BalanceMeter.test.tsx](frontend/src/components/ds/BalanceMeter.test.tsx), [BalanceMeter.stories.tsx](frontend/src/components/ds/BalanceMeter.stories.tsx), [index.ts](frontend/src/components/ds/index.ts) |
| **S2.5b-3** | Workspace shell at `/me` — chrome, tab strip, URL state, back-compat redirects | M | new `frontend/src/routes/me/MeWorkspacePage.tsx`, new `frontend/src/components/me/MeTabStrip.tsx`, [route-manifest.ts](frontend/src/app/route-manifest.ts) |

**Acceptance:** Calendar + BalanceMeter render in Storybook; `/me` route lands on Overview tab; back-compat redirects (`/my-time → /me?tab=time` etc.) verified; no regressions in 53 existing test files.

#### S5 — extended scope (~ +1 week alongside the staffing-desk S5 extension)

Lives inside the same Sprint 5 cutover window — no calendar slip.

| ID | Goal | Effort | Files touched |
|---|---|---|---|
| **S5-E1** | `LeavePolicy` Prisma model + idempotent forward-only migration + seed (single org-wide row) | S | [schema.prisma](prisma/schema.prisma), new migration, new [leave-policy.seed.ts](prisma/seeds/leave-policy.seed.ts) |
| **S5-E2** | `LeaveRequest` + `LeaveBalance` schema deltas (`workingDays`, `policyVersion`, `cancelledAt/By`, `carryoverDays`, `computedAt`) | S | `schema.prisma`, migration |
| **S5-E3** | `LeaveCalculatorService` — pure `workingDaysBetween` + `carryover` math | S | new `src/modules/leave-management/application/leave-calculator.service.ts` + spec |
| **S5-E4** | `LeavePolicyService` + repository + admin-read controller | S | new files under `src/modules/leave-management/` |
| **S5-E5** | `LeaveRequestsService.approve / reject / cancel` wrapped in `$transaction`; `LeaveBalanceService.applyTransition` writes projection in-tx (closes 20c-05) | M | [leave-requests.service.ts](src/modules/leave-management/application/leave-requests.service.ts), [leave-balance.service.ts](src/modules/leave-management/application/leave-balance.service.ts) |
| **S5-E6** | Emit 3 leave events (`leave.approved`, `leave.rejected`, `leave.cancelled`); register in outbox; `NotificationEventTranslator` maps each to in-app + email template (closes 20b-10) | M | new event files; [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts); [notification-event-translator.ts](src/modules/notifications/application/notification-event-translator.ts); new templates seeded |
| **S5-E7** | `LeaveBalanceDriftSweep` nightly cron; emits drift events as admin exceptions | S | new `src/modules/leave-management/application/leave-balance-drift-sweep.ts` |
| **S5-E8** | `WorkforcePlannerService` capacity profile — subtract approved leave hours; extract `CapacityProfileBuilder` | M | [workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts), new `capacity-profile.builder.ts`, planner integration test |
| **S5-E9** | `EmployeeWorkspaceModule` — `GET /me/overview`, `GET /me/memberships` | M | new `src/modules/employee-workspace/**` |
| **S5-F1** | `MeWorkspacePage` Overview tab — KPI strip + Timeline + recent activity + upcoming approvals | M | `frontend/src/routes/me/MeWorkspacePage.tsx`, hooks in `frontend/src/features/me/` |
| **S5-F2** | `MeWorkspacePage` Time tab — host `MyTimePage` content inside the shell | S | route refactor |
| **S5-F3** | `MeWorkspacePage` Leave tab — `BalanceMeter` + form with **preview API** + `Calendar` view | M | new components; consumes `GET /leave-requests/preview` |
| **S5-F4** | `MeWorkspacePage` Projects tab — memberships table | M | new `frontend/src/components/me/MyMembershipsTable.tsx`, consumes `GET /me/memberships` |
| **S5-F5** | `MeWorkspacePage` Inbox tab + Settings tab — host existing pages | S | route refactor |
| **S5-F6** | `LeaveRequestPage` retired as a top-level route; redirect to `/me/leave`. Existing page is decomposed — form component moves into Me Leave tab; manager queue stays on `/time-management`. | S | route-manifest, redirect, `LeaveRequestPage.tsx` deletion |
| **S5-F7** | Manager leave decision drawer on `/time-management` — adds balance impact + team coverage + conflicting assignments preview | M | [TimeManagementPage.tsx](frontend/src/routes/time-management/TimeManagementPage.tsx), new `frontend/src/components/leave/LeaveDecisionDrawer.tsx` |
| **S5-G1** | Notification digest enum + per-person setting + scheduled enqueuer | M | `notification-digest.service.ts`, schema delta on `PersonNotificationPreference` (one column), `AccountSettingsPage` toggle |
| **S5-G2** | Quiet-hours setting (per person, local-time window, email channel only) | S | same migration as G1, channel adapter respects quiet hours |
| **S5-V1** | Property-based test: balance invariant after random transition sequences | S | new spec |
| **S5-V2** | E2E Playwright spec: employee submits leave → manager approves → leave appears on calendar → balance updated → planner capacity reflects new available hours | M | new `playwright/tests/employee-workspace.spec.ts` |

**Acceptance gate for S5:** verification §5.3 passes, both Playwright specs (staffing flagship + employee workspace) are green, the balance-invariant property test is green, and at least one full leave-request decision round-trip produces an in-app **and** email notification observable in staging.

### 5.2 Why this placement (not Sprint 6)

- The DS primitives (Calendar, BalanceMeter) are pure and dependency-free — they belong in S2.5 alongside the staffing Timeline upgrades, so S5 can immediately consume them.
- The leave-loop closure (balance + capacity + notifications) is on the open-bug tracker already (20b-10, 20c-05). Sliding it into S5 closes those debts during the same cutover window when the legacy assignments are dropped and the planner is re-targeting to `ProjectPosition` anyway — capacity-profile work piggybacks on planner refactor work.
- A separate "Sprint 6 — Employee Workspace" duplicates planner / capacity touches that S5 is already making. Rejected.

### 5.3 Verification gates

1. **CI gate — schema sanity.** `pnpm prisma format && pnpm prisma validate`; new migrations idempotent (`IF EXISTS` / `IF NOT EXISTS`).
2. **CI gate — balance invariant test.** Property-based test must pass.
3. **CI gate — DS regressions.** `npm --prefix frontend run test` — all existing 53 test files pass plus new tests for `Calendar`, `BalanceMeter`, `MeWorkspacePage`, `MyMembershipsTable`, `LeaveDecisionDrawer`.
4. **CI gate — token check.** `npm run tokens:check` baseline unchanged (no new raw colors).
5. **Manual gate — back-compat URLs.** Bookmarked URLs (`/my-time`, `/leave`, `/notifications/inbox`, `/settings`) all reach the corresponding tab content. `/assignments?personId=$me` still loads but shows the workspace shortcut link.
6. **Playwright flagship — staffing.** Existing spec from the staffing-desk amendment.
7. **Playwright flagship — employee workspace.** New spec (§5.1 / S5-V2).
8. **Staging smoke.** Apply the migration on staging, run the seed, log in as `ethan.brooks@itco.local` (employee), then `lucas.reed@itco.local` (PM/manager), verify the full leave round-trip end-to-end and `/api/health/deep` reports `"status":"ready"`.

### 5.4 Emergency rollback feature flag

```
key:     employeeWorkspace.enabled
default: true                          (new IA on by default once shipped)
scope:   global
purpose: When false, /me/* routes return 404 and legacy routes (/my-time, /leave,
         /notifications/inbox, /settings, /assignments) render their original
         pages without any "→ workspace" affordances. Write paths (leave
         transition, balance projection, capacity profile) are unaffected by
         this flag — they are correctness fixes, not UX. Removed two sprints
         after S5 ships green.
```

The flag is read-side IA only. The leave-balance integrity fix and notification wiring are unconditional — they are bug closures, not feature gates.

---

## Part 6 — Risks

### 6.1 Balance drift during cutover

Risk: at the moment migration `S5-E5` flips the projection writer on, in-flight leave requests may have inconsistent `LeaveBalance.used` rows. **Mitigation:** the migration runs a one-shot reconciliation pass that recomputes `used / pending` from request rows for every `(personId, year, type)` triple. Idempotent. Re-runnable. Logs every row written. The drift sweep cron is also armed immediately so any miss surfaces as an admin exception within 24 h.

### 6.2 Email volume spike from leave notifications

Risk: 3 new event topics that fan out to email + in-app per request decision could surprise SMTP throughput. **Mitigation:** the digest channel + quiet hours (S5-G1, S5-G2) ship in the same release; org-wide default is **DAILY_9AM** for managers, **IMMEDIATE** for employees (so requesters see decisions in real time but approvers don't drown). Email transport rate-limit (existing) caps to 100 messages / minute / tenant.

### 6.3 Workspace shell + back-compat URL collision

Risk: `/leave`, `/my-time`, etc. are bookmarked by users; redirecting can break deep-linked content (e.g., `/my-time?month=2026-04`). **Mitigation:** redirect targets preserve query params verbatim — `/my-time?month=X → /me?tab=time&month=X`. Tested in [auth-context.tsx](frontend/src/app/auth-context.tsx)'s router setup; spec covers each preserved-param case.

### 6.4 Capacity-profile invalidation race

Risk: planner caches `(personId, weekStart) → availableHours` for 1 minute. A leave approval mid-planner-session could be invisible until cache TTL. **Mitigation:** subscribe `CapacityProfileBuilder` to outbox topics `leave.approved`, `leave.cancelled`, `position.fill.changed`; on receipt, invalidate the affected key. The 1-minute TTL is a fallback, not the primary invalidation signal.

### 6.5 Public-holiday country gap

Risk: `Person.countryCode` is populated for the IT-Company seed, but not enforced as required. A person without a country has no holiday subtraction. **Mitigation:** workspace overview reads `Person.countryCode`; if null, surfaces a non-blocking banner: "Set your country in Settings to see public holidays in your calendar." Setting flows are already shipped in [AccountSettingsPage.tsx](frontend/src/routes/settings/AccountSettingsPage.tsx); we just route through it.

### 6.6 LeavePolicy uniqueness

Risk: schema allows multiple `LeavePolicy` rows per tenant with overlapping `effectiveFrom / effectiveTo` ranges; nothing prevents conflicting policies. **Mitigation:** a CHECK constraint enforces that for a given tenant there is at most one row where `effectiveTo IS NULL`; admin-edit (future) must close the current row before opening the next. v1 seed creates exactly one open row per tenant.

---

## Part 7 — Critical Files

### Design system

- [Calendar.tsx](frontend/src/components/ds/Calendar.tsx) **(new)**
- [BalanceMeter.tsx](frontend/src/components/ds/BalanceMeter.tsx) **(new)**
- [Timeline.tsx](frontend/src/components/ds/Timeline.tsx) **(reused — upgraded by staffing-desk amendment)**
- [index.ts](frontend/src/components/ds/index.ts)
- [global.css](frontend/src/styles/global.css)

### Backend — leave loop closure

- [schema.prisma](prisma/schema.prisma)
- `src/modules/leave-management/application/leave-calculator.service.ts` **(new)**
- `src/modules/leave-management/application/leave-policy.service.ts` **(new)**
- `src/modules/leave-management/application/leave-balance.service.ts`
- `src/modules/leave-management/application/leave-requests.service.ts`
- `src/modules/leave-management/application/leave-balance-drift-sweep.ts` **(new)**
- `src/modules/leave-management/domain/events/` (4 new event files)
- `src/modules/notifications/application/notification-event-translator.ts`
- `src/modules/notifications/application/notification-digest.service.ts` **(new)**
- `src/modules/staffing-desk/application/capacity-profile.builder.ts` **(new)**
- [workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts)
- [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts)
- `prisma/seeds/leave-policy.seed.ts` **(new)**

### Backend — workspace orchestrator

- `src/modules/employee-workspace/application/workspace-overview.service.ts` **(new)**
- `src/modules/employee-workspace/application/my-memberships.service.ts` **(new)**
- `src/modules/employee-workspace/presentation/workspace.controller.ts` **(new)**

### Frontend — workspace

- `frontend/src/routes/me/MeWorkspacePage.tsx` **(new)**
- `frontend/src/components/me/MeTabStrip.tsx` **(new)**
- `frontend/src/components/me/MyMembershipsTable.tsx` **(new)**
- `frontend/src/components/me/UpcomingApprovalsRail.tsx` **(new)**
- `frontend/src/components/leave/LeaveDecisionDrawer.tsx` **(new)**
- `frontend/src/components/leave/LeaveBalanceCard.tsx` **(new)** — uses `BalanceMeter`
- `frontend/src/components/leave/LeaveCalendarTab.tsx` **(new)** — uses `Calendar`
- `frontend/src/features/me/useWorkspaceOverview.ts` **(new)**
- `frontend/src/features/me/useMyMemberships.ts` **(new)**
- `frontend/src/features/leave/useLeavePreview.ts` **(new)**
- [route-manifest.ts](frontend/src/app/route-manifest.ts)
- [TimeManagementPage.tsx](frontend/src/routes/time-management/TimeManagementPage.tsx)
- [LeaveRequestPage.tsx](frontend/src/routes/leave/LeaveRequestPage.tsx) (retired — content folds into `/me/leave`)

---

## Part 8 — Claude Design Brief (paste-in)

A handoff bundle for Claude Design covering the six employee-workspace surfaces and the two new DS primitives. Same shape as the staffing-desk amendment: paste the brief verbatim, upload the files listed below, receive mockups + token diff + CSS diff.

### 8.1 Where to run it

Claude Code at `claude.ai/code` in a fresh conversation, model with image attachments enabled.

### 8.2 Primer — the existing surfaces this amendment replaces / hosts

Anyone reading this brief should first understand the **existing** employee-touching surfaces. They are not being removed; they are being hosted inside the new `/me` workspace shell and (in the case of leave) the page-level chrome is being replaced while the form/list mechanics inside are preserved.

| Existing surface | File | What it does today | Disposition under this amendment |
|---|---|---|---|
| `/my-time` | [MyTimePage.tsx](frontend/src/routes/my-time/MyTimePage.tsx) | Monthly time entry — calendar + workload grid + auto-fill from assignments + leave overlay + gaps detection | Hosted inside `/me?tab=time`; the page renders **inside** the workspace shell. No internal changes. |
| `/timesheets` | [TimesheetPage.tsx](frontend/src/routes/timesheets/TimesheetPage.tsx) | Weekly grid + day-by-day entries + submit | Kept as a secondary entry — same content reachable at `/me?tab=time&view=week`. |
| `/leave` | [LeaveRequestPage.tsx](frontend/src/routes/leave/LeaveRequestPage.tsx) | Single page with form + my-requests + (for HR) approval queue | **Retired as a top-level route.** Form + my-requests collapse into `/me?tab=leave`. Approval queue moves into `/time-management`'s "Leave" tab where the rest of approvals already live. |
| `/notifications/inbox` | [InboxPage.tsx](frontend/src/routes/notifications/InboxPage.tsx) | Real-time inbox + mark-read + CSV export | Hosted inside `/me?tab=inbox`. No internal changes. |
| `/settings` | [AccountSettingsPage.tsx](frontend/src/routes/settings/AccountSettingsPage.tsx) | Password + channel prefs + locale + timezone + theme | Hosted inside `/me?tab=settings`. New controls: digest schedule + quiet hours. |
| `/assignments` (filtered to self) | [AssignmentsPage.tsx](frontend/src/routes/assignments/AssignmentsPage.tsx) | List of assignments + filters | Kept; gains a "→ Open in your workspace" affordance when `personId === principal.personId`. The new `/me?tab=projects` is the canonical self-view. |

The new surfaces are: `/me?tab=overview` and `/me?tab=projects` — neither has a current analog.

The two **new DS primitives** are:

- `Calendar` — month grid with day cells, range selection, holiday tinting, today line, keyboard nav. Visually distinct from the existing `Timeline`: Timeline is a horizontal axis with bars; Calendar is a 7×N grid of day cells.
- `BalanceMeter` — segmented horizontal gauge for `used / pending / remaining` against `entitlement`. Reusable for any "consumed vs available" semantic.

The `Timeline` primitive is reused **as upgraded by the staffing-desk amendment** (lifecycle bars, `groupBy`, group aggregate sparkline). Read §7.2 of that amendment for the Timeline primer.

### 8.3 Brief (paste-in verbatim)

> You are designing the visual refresh for DeliveryCentral's **Employee Workspace** at `/me/*` — the canonical self-service surface for every authenticated employee. This complements (and follows the same visual ethos as) the staffing-desk amendment: the workspace is the place where employees see what they owe, log time, request leave, see their projects, read their inbox, and manage their account.
>
> **Read §8.2 of this amendment first** — it lists the existing surfaces being hosted / retired and introduces the two new DS primitives (`Calendar`, `BalanceMeter`). Also read §7.2 of the staffing-desk amendment (`in-addition-of-now-lovely-sloth`) for the `Timeline` primer — `Timeline` is reused here.
>
> **Surfaces to design (priority order):**
>
> 1. **Workspace landing — Overview tab** at `/me?tab=overview` — page chrome with: title bar (avatar + display name + role chips + tz/locale chip); the six-tab strip below the title (Overview · Time · Leave · Projects · Inbox · Settings); the URL filter bar; the KPI strip (4 tiles: *Hours this week*, *Leave balance*, *Open notifications*, *Active projects* — each a clickable `Link`, never a `<button>`); a hero `Timeline` showing the current week's logged time grouped by project; a secondary section with two cards — *Upcoming approvals against me* (queue) and *Recent activity* (rail).
>
> 2. **Workspace — Leave tab** at `/me?tab=leave&view=list|calendar` — same chrome as #1, then a two-column layout: left column is the `BalanceMeter` (entitlement / used / pending / remaining + per-type breakdown) followed by the inline request form (type, dates, notes, **live preview** showing working days, public holidays excluded, conflicting assignments, balance after); right column is the `Calendar` showing the year with approved leave (green), pending (amber), public holidays (blue), and weekends (grey). Show one form state in the **preview-with-conflict-warning** state (a planner-blue overlap rail visible at the bottom of the form).
>
> 3. **Workspace — Projects tab** at `/me?tab=projects&range=active` — the *My Memberships* table: columns `Project · Role · Allocation % · Start · End · Status · Manager`. Active assignments by default, with a section break and "Show historical (n)" expander below. Each row drills to `/projects/:id`. Empty state shows "No active assignments — talk to your RM" with a `mailto:` link to the resolved RM. **Show one Active state with 3 assignments stacked, and one Empty state with the CTA.**
>
> 4. **Workspace — Time tab** at `/me?tab=time&month=YYYY-MM` — host the existing monthly time-entry surface inside the workspace shell. Add a `Timeline` strip at the top showing the current week's logged hours grouped by project (uses the upgraded staffing-desk Timeline with `lifecycleStatusOf`). **Show one in-edit state with the active day cell open.**
>
> 5. **Workspace — Inbox tab** at `/me?tab=inbox&unreadOnly=true` — host the existing `InboxPage` content inside the shell. Visually align the row density with the rest of the workspace (`DataTable variant="compact"`). Add a "Mark all read" action ≤ 200 px from the rows (Law 4).
>
> 6. **Workspace — Settings tab** at `/me?tab=settings` — host `AccountSettingsPage` content inside the shell. Show the two new sections: **Digest schedule** (radio: Immediate · Daily 9 AM · Weekly Mon 9 AM) and **Quiet hours** (time-range input: from–to, with a "Apply to email only" checkbox, locked on).
>
> 7. **Manager surface — Leave Decision Drawer** at `/time-management?type=leave` — a `Drawer` opened from a pending leave row, showing: the requester's avatar + balance impact (pre / post with `BalanceMeter` mini), their current allocation in the requested range, the conflicting assignments (table with project + role + allocation), team coverage in the range (count of people on leave + count remaining in their pool), and the Approve / Reject action ≤ 200 px from the data. Reject requires a reason. **Show the drawer in its primary state and a reject-with-reason state.**
>
> 8. **DS-level documentation pages** — one each for `Calendar` and `BalanceMeter`. Calendar: month-grid render, range-selection state, holiday overlay, today marker, three sizes. BalanceMeter: legend-on / legend-off, overdrawn state, three sizes, segment hover tip.
>
> 9. **Empty / loading / error states** for the workspace landing and each tab (no data, no permission, RBAC denial, retry, optimistic-pending).
>
> **For each surface, produce:**
>
> - (a) high-fidelity static mockup at 1440 × 900 in BOTH light and dark modes
> - (b) interaction state matrix (hover, focus, selected-range, conflict-warning, optimistic-save, loading skeleton, error, empty)
> - (c) a token / CSS-class spec for any new colors, spacings, or radii — though we expect **no new color tokens** (see Non-negotiable constraints below)
>
> **Non-negotiable constraints:**
>
> - Reuse existing DS atoms — `DataTable`, `DataView`, `SectionCard`, `EmptyState`, `ErrorState`, `LoadingState`, `StatusBadge`, `TipBalloon`, `ConfirmDialog`, `Sparkline`, `Drawer`, `Sheet`, `Modal`, `DatePicker`, `DateRangePicker`, `FormField`, `Combobox`, `Select`, `Switch`. Two new primitives only: `Calendar` and `BalanceMeter`. Justify any other new primitive by naming what existing atom it replaces and why.
> - Respect existing color tokens (`--color-status-*`, `--color-surface*`, `--color-text*`, `--color-border*`, `--color-chart-1..8`, `--color-accent`). **No new color tokens for this amendment** — the staffing-desk amendment is consuming the only new-token budget this initiative has. Map every state onto existing tokens (per §4.4 of the amendment).
> - Workspace chrome conforms to the **List-Detail Workflow** grammar (`phase18-page-grammars.md`); the Overview tab follows the **Decision Dashboard** grammar (`DashboardPage.tsx` is the gold standard for chrome).
> - Calendar follows accessibility patterns from the existing `DatePicker` (keyboard nav, ARIA roles, focus trap when used inside a popover); BalanceMeter follows accessibility patterns from `Sparkline` (`role="img"`, `aria-label`, keyboard-focusable segments).
> - Satisfy UX Operating Laws (`.claude/rules/ux-laws.md`) — especially Law 1 (≤ 3 clicks), Law 2 (no dead-end screens), Law 4 (action ≤ 200 px from data), Law 5 (filter persistence via URL — every tab + filter combination serializes), Law 6 (no duplicated input — leave form pre-fills from context: country for holidays, current year, person's standard hours), Law 9 (every KPI is a doorway), Law 10 (workspace continuity — last tab + scroll position persisted in `sessionStorage`).
> - **Employee-first stance:** the workspace must feel like a productivity tool, not an HR portal. Density is moderate (more whitespace than the planner, less than a marketing site). Accent color used sparingly and deliberately on primary actions ("Request leave", "Submit timesheet", "Mark all read").
> - All actions reachable in ≤ 3 clicks.
>
> **Files to upload alongside this brief:**
>
> - This amendment document (`lean-simplification-employee-workspace-amendment.md`)
> - The companion `lean-simplification-staffing-desk-amendment.md` (Timeline primer + DS context)
> - `docs/planning/claude-design/lean-simplification-initiative.md` (master plan)
> - `docs/planning/claude-design/ux-operating-system-v2.md`
> - `docs/planning/claude-design/page-grammars.md`
> - `docs/planning/claude-design/design-tokens.md`
> - `docs/planning/claude-design/persona-jtbds.md`
> - `docs/planning/phase18-refactor-standards.md` (verification template)
> - `frontend/src/components/ds/Timeline.tsx` (will be upgraded; current implementation)
> - `frontend/src/components/ds/DatePicker.tsx` (a11y / keyboard-nav reference for Calendar)
> - `frontend/src/components/ds/Sparkline.tsx` if present (a11y reference for BalanceMeter)
> - `frontend/src/routes/dashboard/DashboardPage.tsx` (gold-standard page chrome + KPI strip)
> - `frontend/src/routes/my-time/MyTimePage.tsx` (existing content being hosted)
> - `frontend/src/routes/leave/LeaveRequestPage.tsx` (existing content being decomposed)
> - `frontend/src/routes/notifications/InboxPage.tsx` (existing content being hosted)
> - `frontend/src/routes/settings/AccountSettingsPage.tsx` (existing content being hosted)
> - `frontend/src/styles/design-tokens.ts` (token source of truth)
> - `frontend/src/styles/global.css` (class source of truth)
>
> **Expected handoff contents (deliverables):**
>
> 1. PNG mockups (1440 × 900 light + dark) for each of the nine surfaces
> 2. Interaction state matrix — one PNG per state per component
> 3. CSS additions — a single CSS snippet for `global.css` (no edits to existing classes; pure additions) covering `.ds-calendar*` and `.ds-balance-meter*` selectors
> 4. Storybook-ready Calendar + BalanceMeter props matrix — table of every prop with default, type, and example value
> 5. A 1-page "design decisions" doc explaining: workspace tab strip ergonomics (relative to the staffing-desk tab strip — same component or two siblings?), Calendar event-dot vs full-cell-tint decision, BalanceMeter segment-vs-stack visual choice, leave-form preview placement (inline vs side rail), manager Leave Decision Drawer composition, and any deviations from the existing DS atoms (with rationale).

### 8.4 Constraints summary (one-glance)

- Two new primitives only — `Calendar` and `BalanceMeter`. Everything else is composition.
- No new color tokens. Map onto the existing palette.
- Workspace chrome conforms to the Decision Dashboard grammar (overview) + List-Detail Workflow grammar (other tabs).
- Satisfies UX Laws 1, 2, 4, 5, 6, 9, 10.
- Employee-first feel: productivity tool, not HR portal. Moderate density.
- Back-compat: every legacy route still works (alias-and-redirect).

---

## Part 9 — Sign-off criteria

Before this amendment is merged into the master plan:

- [ ] **PM persona** — confirms the `/me/*` workspace fully answers employee JTBDs J-1..J-6 within the success-metric thresholds, and the manager-side J-7/J-8 are credibly addressed by the Leave Decision Drawer plus digest scheduling.
- [ ] **BA persona** — confirms G-1..G-9 are closed by the listed acceptance criteria, and `LeavePolicy` v1 (org-wide single row, no per-grade overrides) is sufficient for the initial rollout.
- [ ] **Architect persona** — confirms the `$transaction` wrapping in `LeaveRequestsService.approve` closes 20c-05 cleanly, the outbox events close 20b-10, the capacity-profile leave subtraction does not break existing planner scenarios, and the back-compat URL layer holds.
- [ ] **UX persona** — confirms `Calendar` and `BalanceMeter` are net-new (not duplicating an existing atom), the workspace chrome matches the staffing-desk amendment's tab-strip ergonomics, all six UX Laws called out in §8.3 are satisfied, and the workspace landing page passes the gold-standard chrome compliance check.
- [ ] **Dev Lead persona** — confirms S2.5b fits in parallel with S2.5 (no shared files except `index.ts`), S5-E* / S5-F* / S5-G* fit inside the existing S5 cutover window (~+1 week alongside the staffing-desk extension), and the verification gates in §5.3 are implementable.
- [ ] **DevOps persona** — confirms the email-volume mitigations (digest + quiet hours + rate-limit) ship in the same release as the new leave-notification producers, and the `employeeWorkspace.enabled` rollback flag is wired before S5 PR opens.

---

## End of amendment

Hand this file to the main developer alongside:

- [lean-simplification-initiative.md](docs/planning/claude-design/lean-simplification-initiative.md)
- [lean-simplification-staffing-desk-amendment.md](docs/planning/claude-design/lean-simplification-staffing-desk-amendment.md) (Timeline + DS budget context)

When ratified, fold the S2.5b block and the S5-E / S5-F / S5-G stories into `docs/planning/MASTER_TRACKER.md`, close open items **20b-10** and **20c-05** as part of that batch, and update §3 of the lean-simplification doc to reflect the kept-and-expanded employee surface.
