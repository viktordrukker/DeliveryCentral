# Time Service Consolidation — Implementation Plan

**Created:** 2026-04-16  
**Status:** Ready for review  
**Reference:** EPAM TIME & VACATION best practices

---

## 1. Problem Statement

Time-related functionality is currently scattered across **7 separate routes** with **5 different sidebar entries** for an employee:

| Current Route | What it Does | Problem |
|---------------|-------------|---------|
| `/timesheets` | Weekly hour grid | Only weekly view. No monthly calendar. No bench time concept. No leave integration. |
| `/timesheets/approval` | Manager approval queue | Separate page, no context about the person's situation |
| `/leave` | Leave requests (ANNUAL, SICK, OTHER) | Too few types. No balance tracking. No team calendar. No integration with timesheet. |
| `/reports/time` | Aggregated hours report | Management-only, disconnected from entry flow |
| `/reports/capitalisation` | CAPEX/OPEX split | Disconnected from time entry |
| `/work-evidence` | Raw evidence records | Admin-only, not useful for employees |
| `/dashboard/planned-vs-actual` | Variance analysis | Management-only analytics page |

**An employee visiting 3+ pages to manage their time is a design failure.** EPAM solved this with two unified surfaces: TIME (monthly calendar + assignments + gaps) and VACATION (all leave types + balances + team calendar).

---

## 2. Target Architecture: Two Service Surfaces

### Surface 1: "My Time" (Employee — Time Reporter)

**Route:** `/my-time` (replaces `/timesheets` and parts of `/leave`)  
**Grammar:** Create/Edit Form + Decision Dashboard hybrid  
**Persona:** Any employee  
**JTBD:** "I need to accurately report all my working time, request time off, and see where I stand — in one place."

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ MY TIME                                           [Apr 2026 ◂ ▸]   │
│ ┌─────────┬─────────┬─────────┬─────────┐                          │
│ │ Standard│ Overtime│  Leave  │  Bench  │     [Submit Month]        │
│ │  152h   │   14h   │  16h    │  8h     │     [Copy Last Month]    │
│ └─────────┴─────────┴─────────┴─────────┘                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MONTHLY CALENDAR GRID                                              │
│                                                                     │
│  Assignment      │ 1  2  3  4  5  6  7 │ 8  9 10 11 12 13 14 │... │
│  ────────────────┼──────────────────────┼─────────────────────┼─── │
│  PRJ-101 (80%)   │ 6  6  6  6  6  ·  · │ 6  6  6  6  6  ·  · │   │
│  PRJ-102 (20%)   │ 2  2  2  2  2  ·  · │ 2  2  2  2  2  ·  · │   │
│  Bench: Training │ ·  ·  ·  ·  ·  ·  · │ ·  ·  ·  ·  ·  ·  · │   │
│  ────────────────┼──────────────────────┼─────────────────────┼─── │
│  🏖 Vacation     │ ·  ·  ·  ·  ·  ·  · │ ·  ·  ·  ·  ·  ·  · │16│
│  🤒 Sick Leave   │ ·  ·  ·  ·  ·  ·  · │ ·  ·  ·  ·  ·  ·  · │   │
│  ────────────────┼──────────────────────┼─────────────────────┼─── │
│  Day total       │ 8  8  8  8  8  0  0 │ 8  8  8  8  8  0  0 │   │
│  Expected        │ 8  8  8  8  8  ─  ─ │ 8  8  8  8  8  ─  ─ │   │
│  Gap             │ ✓  ✓  ✓  ✓  ✓       │ ✓  ✓  ✓  ✓  ✓       │   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ TABS: [Time Gaps] [Leave Requests] [Monthly Summary] [History]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TIME GAPS (auto-detected)                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Apr 15 (Tue) — 0h reported, 8h expected                   │    │
│  │  Suggestion: You worked on PRJ-101 (80%) — fill 6.4h?      │    │
│  │  [Fill Suggested] [Enter Manually] [Mark as Leave]          │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  Apr 16 (Wed) — 4h reported, 8h expected                   │    │
│  │  Suggestion: Add 4h bench (self-education)?                 │    │
│  │  [Fill Suggested] [Enter Manually]                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  LEAVE REQUESTS (inline)                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [+ New Request]                                            │    │
│  │  Balance: 15d Annual | 3d Sick used | 2d OT Off available   │    │
│  │                                                             │    │
│  │  Type         Dates           Status      Notes             │    │
│  │  Annual       Apr 21–25       ✅ Approved                  │    │
│  │  Sick         Apr 8           ✅ Approved  Flu              │    │
│  │  OT Off       Apr 30          ⏳ Pending                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  MONTHLY SUMMARY                                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Working days: 22 │ Expected: 176h │ Reported: 168h         │    │
│  │  Standard: 152h │ Overtime: 14h │ Leave: 16h │ Bench: 8h   │    │
│  │  Gap: 8h (1 day) │ Utilization: 86.4%                      │    │
│  │                                                             │    │
│  │  By Project:                                                │    │
│  │  PRJ-101  120h (68%) ████████████████████░░░░░             │    │
│  │  PRJ-102   32h (18%) ██████░░░░░░░░░░░░░░░░░░             │    │
│  │  Bench      8h  (5%) ██░░░░░░░░░░░░░░░░░░░░░░             │    │
│  │  Leave     16h  (9%) ████░░░░░░░░░░░░░░░░░░░░             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Surface 2: "Time Management" (Manager — Time Approver/Informer)

**Route:** `/time-management` (replaces `/timesheets/approval`, `/reports/time`, absorbs parts of PvA)  
**Grammar:** Operational Queue + Decision Dashboard hybrid  
**Persona:** RM, PM, DM (with role-appropriate scope)  
**JTBD:** "I need to see my team's time status, approve/reject timesheets, spot problems, and ensure compliance — in one place."

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIME MANAGEMENT                    [Team ▼] [Period: Apr 2026 ▼]    │
├─────────────────────────────────────────────────────────────────────┤
│ KPI STRIP                                                           │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐ │
│ │Pending   │ Approved │ Gaps     │ Overtime │ Leave    │ Compliance│ │
│ │ 5        │ 18/23    │ 12 days  │ 48h      │ 4 people │ 78%      │ │
│ └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABS: [Approval Queue] [Team Calendar] [Compliance] [Overtime]      │
│                                                                     │
│ ── APPROVAL QUEUE ──                                                │
│ [Select All] [Approve Selected] [Reject Selected]                   │
│                                                                     │
│ ☐ Ethan Brooks    Week 14 (Apr 1–7)   42h   SUBMITTED  [▸ Expand]  │
│   └─ PRJ-101: 6h×5=30h | PRJ-102: 2h×5=10h | OT: 2h              │
│ ☐ Priya Nair      Week 14 (Apr 1–7)   49h   SUBMITTED  [▸ Expand]  │
│   └─ PRJ-101: 8h×5=40h | PRJ-102: 3h×3=9h | OT: 9h ⚠️           │
│ ☐ Lucas Reed      Week 13 (Mar 25-31) 47h   SUBMITTED  [▸ Expand]  │
│                                                                     │
│ ── TEAM CALENDAR (absence overview) ──                              │
│                                                                     │
│              Mon  Tue  Wed  Thu  Fri                                 │
│ Ethan        ·    ·    ·    🏖   🏖                                │
│ Priya        ·    ·    ·    ·    ·                                  │
│ Lucas        🤒   🤒   ·    ·    ·                                  │
│ Mia          🏖   🏖   🏖   🏖   🏖                               │
│                                                                     │
│ ── COMPLIANCE ──                                                    │
│ People with gaps, missing timesheets, overdue submissions           │
│                                                                     │
│ ── OVERTIME ──                                                      │
│ Same as current PvA overtime section, scoped to manager's team      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Breakdown: "My Time" (Reporter)

### 3a. Monthly Calendar Grid

**The core UX paradigm.** Replace the current weekly-only grid with a monthly view (EPAM TIME pattern).

| Feature | Detail |
|---------|--------|
| **Rows** | One per active assignment + bench rows + leave rows (auto-populated) |
| **Columns** | Days 1–28/29/30/31 of the month, grouped by ISO week |
| **Cells** | Editable hour inputs. Weekends and public holidays greyed out. |
| **Totals** | Row totals (per assignment/month), column totals (per day), grand total |
| **Gap indicators** | Days where `sum(hours) < expectedHours` highlighted in amber/red |
| **Leave overlay** | Approved leave days show leave-type icon, non-editable, auto-filled with standardHoursPerDay |
| **Status per week** | Each ISO week has its own status (DRAFT/SUBMITTED/APPROVED/REJECTED) since approval is weekly |
| **Copy previous** | "Copy Last Month" button: copies last month's daily pattern, adjusts for weekday alignment |
| **Auto-fill** | "Fill from Assignments" button: for each working day, fills `allocationPercent/100 * standardHoursPerDay` per assignment |

### 3b. Bench Time

New concept — structured non-project time. Backend needs a bench-time category system.

| Category | Code | Description |
|----------|------|-------------|
| Self-Education | BENCH-EDU | Online courses, certifications, reading |
| Internal Project | BENCH-INT | Contributing to company tools, processes |
| Pre-Sales | BENCH-PRE | Supporting business development |
| Interviewing | BENCH-HR | Conducting interviews for hiring |
| Mentoring | BENCH-MEN | Mentoring junior colleagues |
| Administrative | BENCH-ADM | Company meetings, admin tasks |
| Transition | BENCH-TRN | Between projects, handover |

Backend: store as a special "project" with `isBench: true` flag, or as a new `BenchCategory` enum on `TimesheetEntry`.

**Decision:** Add `benchCategory` nullable field to `TimesheetEntry`. When set, `projectId` can be null or point to a special internal "Bench" project. This is cleaner than creating fake projects.

### 3c. Leave Request Types (expanded)

Expand from 3 to 7 types:

| Type | Code | Approval | Balance Tracked | Notes |
|------|------|----------|-----------------|-------|
| Annual (Planned) | ANNUAL | RM → auto | Yes (entitlement-based) | Standard vacation |
| Sick Leave | SICK | Auto-approved (notify RM) | Tracked but no cap | Medical certificate required >3 days |
| Overtime Off | OT_OFF | RM → auto | Derived from approved OT hours | Spend accumulated OT as time off |
| Personal Reason | PERSONAL | RM (must include comment) | Unpaid or from personal days | Special comment required |
| Maternity/Paternity | PARENTAL | HR | Per policy | Long-term, statutory |
| Bereavement | BEREAVEMENT | Auto-approved (notify HR) | Per policy | Short-term |
| Study Leave | STUDY | RM + HR | Per policy | Education-related |

**Leave balance model:** New `LeaveBalance` entity tracking per-person, per-type entitlements and usage.

### 3d. Time Gap Detection & Suggestions

The system proactively identifies gaps and suggests fixes.

**Gap detection logic:**
1. For each working day (Mon–Fri, minus public holidays, minus approved leave), compute `expected - reported`
2. If `gap > 0`, flag the day

**Suggestion engine:**
1. If person has active assignments → suggest proportional fill based on allocation %
2. If person has no active assignments → suggest bench categories
3. If gap is exactly `standardHoursPerDay` → offer "Mark as Leave" shortcut

**UI:** "Time Gaps" tab shows a list of gap days with one-click resolution actions.

### 3e. Monthly Summary

Read-only summary computed from the month's data:

- Working days, expected hours, reported hours
- Breakdown: standard, overtime, leave, bench
- By-project bar chart
- Utilization rate
- Comparison to previous month

---

## 4. Feature Breakdown: "Time Management" (Approver)

### 4a. Approval Queue (improved)

**Replaces:** current `/timesheets/approval`

| Improvement | Detail |
|-------------|--------|
| **Inline detail** | Expand a row to see the full week grid without navigating away |
| **Batch approve** | Select multiple + "Approve Selected" button |
| **Smart sort** | Default sort: most overdue first, then by OT risk |
| **Context** | Show person's assignment allocation alongside reported hours |
| **OT flag** | Visual warning when week has overtime, with policy info |
| **Reject inline** | Reject with reason in a dropdown (common reasons) + free text |

### 4b. Team Calendar (new)

Visual absence calendar showing the manager's entire team for the selected month:
- Rows = team members
- Columns = days
- Cells = color-coded: working (blank), annual (blue), sick (red), OT off (purple), etc.
- Purpose: before approving leave, see who else is out

### 4c. Compliance View (new)

Table showing time compliance status per team member:

| Person | This Month | Gaps | Submitted | Approved | OT | Leave | Status |
|--------|-----------|------|-----------|----------|-----|-------|--------|
| Ethan  | 168/176h  | 1d   | 3/4 wk   | 2/4 wk  | 14h | 0d    | ⚠️ |
| Priya  | 176/176h  | 0d   | 4/4 wk   | 4/4 wk  | 15h | 0d    | ✅ |

### 4d. Overtime View

Same as the Overtime Analysis section currently in PvA, but scoped to the manager's team.

---

## 5. What Happens to Existing Routes

| Current Route | Action | Rationale |
|---------------|--------|-----------|
| `/timesheets` | **Replaced by** `/my-time` | Monthly calendar subsumes weekly grid |
| `/timesheets/approval` | **Replaced by** `/time-management` tab | Folded into unified manager surface |
| `/leave` | **Absorbed into** `/my-time` tab | Leave requests inline with time reporting |
| `/reports/time` | **Kept** at `/reports/time` | Remains as a deep-dive analytics surface for finance/management |
| `/reports/capitalisation` | **Kept** | Separate concern (finance) |
| `/work-evidence` | **Kept** (admin-only) | Specialist tool, not for regular employees |
| `/dashboard/planned-vs-actual` | **Kept** but links to `/time-management` | Cross-org analytics stays, but manager actions route to new surface |

### Navigation changes

**Before (employee sidebar):**
- My Timesheet
- Time Off
- (+ various dashboard sections)

**After (employee sidebar):**
- **My Time** (single entry point for all time + leave)

**Before (manager sidebar):**
- My Timesheet
- Time Off
- Timesheet Approval
- Time Report
- Planned vs Actual

**After (manager sidebar):**
- **My Time** (their own time — same employee view)
- **Time Management** (approve, review, comply)
- Time Report (kept — analytics)
- Planned vs Actual (kept — cross-org analytics)

---

## 6. JTBD Mapping

### Reporter JTBDs (all converge on `/my-time`)

| # | JTBD | Current Pages | New Location |
|---|------|--------------|-------------|
| R1 | Report my project hours for the week/month | `/timesheets` | `/my-time` calendar grid |
| R2 | Report bench time (training, interviews, etc.) | Not supported | `/my-time` calendar grid (bench rows) |
| R3 | Request planned vacation | `/leave` | `/my-time` → Leave Requests tab |
| R4 | Report sick leave | `/leave` | `/my-time` → Leave Requests tab (auto-approve) |
| R5 | Request overtime off | Not supported | `/my-time` → Leave Requests tab (from OT balance) |
| R6 | Request personal time off | `/leave` (as OTHER) | `/my-time` → Leave Requests tab (PERSONAL type) |
| R7 | See my time gaps and fix them quickly | Not supported (PvA is manager-only) | `/my-time` → Time Gaps tab |
| R8 | See my monthly hours summary and utilization | Not supported | `/my-time` → Monthly Summary tab |
| R9 | Copy last month's time pattern | Not supported | `/my-time` → "Copy Last Month" button |
| R10 | Auto-fill time from assignments | Not supported | `/my-time` → "Fill from Assignments" button |
| R11 | See my leave balance | Not supported | `/my-time` → Leave Requests tab (balance bar) |
| R12 | See my overtime balance (hours earned, used) | Not supported | `/my-time` → Monthly Summary |
| R13 | Submit my time for approval | `/timesheets` (per week) | `/my-time` → "Submit Month" / per-week submit |

### Approver JTBDs (converge on `/time-management`)

| # | JTBD | Current Pages | New Location |
|---|------|--------------|-------------|
| A1 | Approve/reject submitted timesheets | `/timesheets/approval` | `/time-management` → Approval Queue tab |
| A2 | See which team members have time gaps | `/dashboard/planned-vs-actual` | `/time-management` → Compliance tab |
| A3 | Approve/reject leave requests | `/leave` (manager section) | `/time-management` → Approval Queue (leave items alongside time) |
| A4 | See team absence calendar | Not supported | `/time-management` → Team Calendar tab |
| A5 | See team overtime status | PvA dashboard | `/time-management` → Overtime tab |
| A6 | Bulk approve a team's timesheets | `/timesheets/approval` (basic) | `/time-management` → enhanced batch actions |
| A7 | See compliance (who's submitted, gaps, overdue) | Scattered across dashboards | `/time-management` → Compliance tab |
| A8 | Set overtime policy for my department/pool | Not currently in UI | `/time-management` → Overtime tab → Policy widget |

### Role-specific scope

| Role | `/my-time` | `/time-management` scope |
|------|-----------|--------------------------|
| Employee | Full access | N/A |
| PM | Full access | Projects they manage → team members on those projects |
| RM | Full access | People in their resource pools / department |
| DM | Full access | People across their delivery teams |
| HR | Full access | Organization-wide (all people) |
| Director | Full access | Organization-wide |
| Admin | Full access | Organization-wide |

---

## 7. Data Model Changes

### 7a. Extend `TimesheetEntry`

```prisma
// Add to TimesheetEntry:
benchCategory   String?    // BENCH-EDU, BENCH-INT, BENCH-PRE, BENCH-HR, BENCH-MEN, BENCH-ADM, BENCH-TRN
                           // null = regular project time
```

When `benchCategory` is set, `projectId` can point to a system "Bench" project (created in seed). This keeps the existing foreign key intact.

### 7b. Expand `LeaveRequestType` enum

```prisma
enum LeaveRequestType {
  ANNUAL
  SICK
  OT_OFF
  PERSONAL
  PARENTAL
  BEREAVEMENT
  STUDY
}
```

### 7c. New `LeaveBalance` model

```prisma
model LeaveBalance {
  id           String           @id @default(uuid()) @db.Uuid
  personId     String           @db.Uuid
  year         Int              // e.g. 2026
  leaveType    LeaveRequestType
  entitlement  Decimal          @db.Decimal(5, 1) // e.g. 20.0 days
  used         Decimal          @db.Decimal(5, 1) @default(0)
  pending      Decimal          @db.Decimal(5, 1) @default(0) // requested but not approved
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  person       Person           @relation(fields: [personId], references: [id])

  @@unique([personId, year, leaveType])
  @@index([personId, year])
  @@map("leave_balances")
}
```

### 7d. New `PublicHoliday` model

```prisma
model PublicHoliday {
  id          String   @id @default(uuid()) @db.Uuid
  date        DateTime @db.Date
  name        String
  countryCode String   @default("AU") // ISO 3166-1 alpha-2
  createdAt   DateTime @default(now())

  @@unique([date, countryCode])
  @@index([countryCode, date])
  @@map("public_holidays")
}
```

### 7e. Platform settings additions

```
leave.annualEntitlementDays: 20
leave.sickAutoApprove: true
leave.sickCertificateRequiredDays: 3
leave.overtimeOffEnabled: true
leave.personalRequiresComment: true
timeEntry.benchEnabled: true
timeEntry.benchCategories: ['BENCH-EDU','BENCH-INT','BENCH-PRE','BENCH-HR','BENCH-MEN','BENCH-ADM','BENCH-TRN']
timeEntry.copyPreviousEnabled: true
timeEntry.autoFillFromAssignments: true
timeEntry.gapDetectionEnabled: true
```

---

## 8. Backend Changes

### 8a. New/Modified Services

| Service | Module | Purpose |
|---------|--------|---------|
| `MonthlyTimesheetService` | timesheets | Get/compute monthly view: all weeks, entries, leave overlays, gaps, summary |
| `TimeGapDetectionService` | timesheets | Detect gaps, generate suggestions |
| `LeaveBalanceService` | leave-requests | Track entitlements, compute used/pending, validate requests |
| `PublicHolidayService` | platform-settings | CRUD for public holidays, working-day calculation |
| `BenchTimeService` | timesheets | Validate bench categories, bench project management |
| `TimesheetApprovalService` (enhanced) | timesheets | Batch approve, inline reject, unified queue (time + leave) |

### 8b. New API Endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/my-time/month?month=2026-04` | ALL | Monthly view: weeks, entries, leave, gaps, summary |
| POST | `/my-time/auto-fill` | ALL | Fill from assignments |
| POST | `/my-time/copy-previous` | ALL | Copy last month's pattern |
| GET | `/my-time/gaps?month=2026-04` | ALL | List gap days with suggestions |
| POST | `/my-time/gaps/:date/fill` | ALL | Apply gap suggestion |
| GET | `/leave-balances/my` | ALL | Get own leave balances for current year |
| GET | `/leave-balances/:personId` | RM, HR | Get person's leave balances |
| GET | `/time-management/queue` | MANAGERS | Unified approval queue (timesheets + leave) |
| GET | `/time-management/team-calendar?month=2026-04` | MANAGERS | Team absence calendar |
| GET | `/time-management/compliance?month=2026-04` | MANAGERS | Team compliance status |
| GET | `/public-holidays?year=2026&country=AU` | ALL | List public holidays |

---

## 9. Frontend Changes

### 9a. New Pages

| File | Route | Purpose |
|------|-------|---------|
| `MyTimePage.tsx` | `/my-time` | Unified employee time surface |
| `TimeManagementPage.tsx` | `/time-management` | Unified manager time surface |

### 9b. New Components

| Component | Purpose |
|-----------|---------|
| `MonthlyCalendarGrid` | The core monthly grid component (rows × 31 cols) |
| `TimeGapPanel` | Gap list with suggestions and quick-fill actions |
| `LeaveRequestInline` | Inline leave request form + history + balance bar |
| `MonthlySummaryPanel` | Read-only monthly breakdown with charts |
| `TeamAbsenceCalendar` | Manager view of team leave calendar |
| `ComplianceTable` | Per-person compliance status table |
| `UnifiedApprovalQueue` | Combined timesheet + leave approval with batch actions |

### 9c. Route Manifest Changes

```typescript
// Remove from navVisible:
// '/timesheets' — replaced by /my-time
// '/timesheets/approval' — replaced by /time-management
// '/leave' — absorbed into /my-time

// Add:
{ path: '/my-time', title: 'My Time', group: 'work', navVisible: true, allowedRoles: ALL_ROLES,
  description: 'Monthly timesheet, leave requests, time gaps, and summary.' },
{ path: '/time-management', title: 'Time Management', group: 'work', navVisible: true,
  allowedRoles: TIMESHEET_MANAGER_ROLES,
  description: 'Approve timesheets and leave, review compliance, manage overtime.' },

// Keep old routes as redirects for bookmarks:
// '/timesheets' → redirect to '/my-time'
// '/timesheets/approval' → redirect to '/time-management'
// '/leave' → redirect to '/my-time?tab=leave'
```

---

## 10. Implementation Steps

### Phase A: Data Foundation (backend-only)

| # | Task | Files |
|---|------|-------|
| A1 | Prisma: add `benchCategory` to `TimesheetEntry` | schema.prisma, migration |
| A2 | Prisma: expand `LeaveRequestType` enum (add OT_OFF, PERSONAL, PARENTAL, BEREAVEMENT, STUDY) | schema.prisma, migration |
| A3 | Prisma: add `LeaveBalance` model | schema.prisma, migration |
| A4 | Prisma: add `PublicHoliday` model | schema.prisma, migration |
| A5 | Platform settings: add leave + bench + gap detection settings | platform-settings.service.ts |
| A6 | Seed: public holidays (AU 2026), bench project, leave balances for test accounts | seed.ts |
| A7 | Build `LeaveBalanceService` | leave-requests module |
| A8 | Build `PublicHolidayService` | platform-settings module |
| A9 | Build `MonthlyTimesheetService` | timesheets module |
| A10 | Build `TimeGapDetectionService` | timesheets module |
| A11 | Build new API endpoints (`/my-time/*`, `/leave-balances/*`, `/public-holidays`) | controllers |
| A12 | Backend TS check | — |

### Phase B: "My Time" Frontend

| # | Task | Files |
|---|------|-------|
| B1 | Frontend API module: `my-time.ts`, `leave-balances.ts`, `public-holidays.ts` | lib/api/ |
| B2 | Build `MonthlyCalendarGrid` component | components/ |
| B3 | Build `TimeGapPanel` component | components/ |
| B4 | Build `LeaveRequestInline` component (form + balance + history) | components/ |
| B5 | Build `MonthlySummaryPanel` component | components/ |
| B6 | Build `MyTimePage.tsx` (assembly of B2–B5) | routes/ |
| B7 | Update route manifest and router | app/ |
| B8 | Add redirects from old routes | router.tsx |
| B9 | Frontend tests for MyTimePage | test |

### Phase C: "Time Management" Frontend

| # | Task | Files |
|---|------|-------|
| C1 | Build `UnifiedApprovalQueue` component (time + leave items) | components/ |
| C2 | Build `TeamAbsenceCalendar` component | components/ |
| C3 | Build `ComplianceTable` component | components/ |
| C4 | Build `TimeManagementPage.tsx` (assembly of C1–C3 + existing OT section) | routes/ |
| C5 | Update route manifest | app/ |
| C6 | Frontend tests for TimeManagementPage | test |

### Phase D: Dashboard Integration

| # | Task |
|---|------|
| D1 | Employee Dashboard: replace timesheet/leave quick links with "My Time" link |
| D2 | RM Dashboard: add "Time Compliance" summary card linking to `/time-management` |
| D3 | PM Dashboard: add time compliance for project members |
| D4 | DM Dashboard: add team time status |
| D5 | HR Dashboard: add org-wide time compliance + leave balance overview |
| D6 | PvA Dashboard: ensure all "Resolve" actions link to `/time-management` or `/my-time` |

### Phase E: Cleanup & Migration

| # | Task |
|---|------|
| E1 | Mark old routes as deprecated redirects |
| E2 | Update all internal navigation links |
| E3 | Update E2E tests |
| E4 | Update MASTER_TRACKER |

---

## 11. Open Questions

None — all resolved based on your inputs:

| Question | Resolution |
|----------|-----------|
| Monthly vs weekly? | Monthly grid (EPAM pattern), but submission/approval remains per ISO week |
| Bench categories? | 7 categories defined above, configurable via platform settings |
| Leave types? | 7 types (expanded from 3) |
| OT off tracking? | Derived from approved overtime hours — new `OT_OFF` leave type |
| Who approves leave? | RM for ANNUAL/OT_OFF/PERSONAL/STUDY; auto-approve for SICK/BEREAVEMENT; HR for PARENTAL |
| Who approves timesheets? | Same as today: RM/PM based on org structure |
| Gap detection? | Auto-detect based on working days minus leave minus holidays minus reported hours |
| How does bench time relate to projects? | Single system "Bench" project in DB, category on the entry |
| What about the PvA dashboard? | Reworked — see Section 12 |
| What about Time Report? | Reworked — see Section 12 |
| What about Capitalisation? | Reworked — see Section 12 |

---

## 12. Analytics Surfaces Rework

Three analytics pages are kept but reworked to integrate with the new time service architecture. They consume data from the same backend but present it for different audiences.

### 12a. Time Report (`/reports/time`) → "Time Analytics"

**Current state:** Basic aggregation page with 4 charts (by project, by person, by day, CAPEX donut) and raw filters.  
**Problem:** No connection to the new monthly model. No bench time breakdown. No overtime split. No leave context. No utilization.

**Reworked design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIME ANALYTICS                      [Period ▼] [Dept ▼] [Pool ▼]   │
│                                     [Project ▼] [Export XLSX ▼]     │
├─────────────────────────────────────────────────────────────────────┤
│ KPI STRIP                                                           │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐ │
│ │ Total    │ Standard │ Overtime │ Bench    │ Leave    │ Util %   │ │
│ │ 4,280h   │ 3,840h   │ 192h     │ 128h     │ 320h     │ 86.2%   │ │
│ └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ HERO: Time Distribution (stacked area chart — weekly trend)         │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │  Layers: Standard (green) | Overtime (amber) | Bench (grey)  │   │
│ │          Leave (blue) | Expected (dotted line)               │   │
│ │  X-axis: weeks    Y-axis: hours                              │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ 2×2 GRID                                                            │
│ ┌───────────────────────────┬───────────────────────────────────┐   │
│ │ Hours by Project          │ Hours by Person                   │   │
│ │ (horizontal bar, stacked: │ (horizontal bar, stacked:         │   │
│ │  std | OT | bench)        │  std | OT | bench)               │   │
│ ├───────────────────────────┼───────────────────────────────────┤   │
│ │ CAPEX vs OPEX             │ Utilization by Department        │   │
│ │ (stacked bar by project   │ (horizontal bars, colored by     │   │
│ │  or donut for totals)     │  utilization band)               │   │
│ └───────────────────────────┴───────────────────────────────────┘   │
│                                                                     │
│ DETAIL TABLE (sortable, exportable)                                 │
│ Person | Dept | Pool | Standard | OT | Bench | Leave | Total | Util│
│ ───────┼──────┼──────┼──────────┼────┼───────┼───────┼───────┼─────│
│ Ethan  │ Eng  │ FS   │ 152h     │14h │ 0h    │ 0h    │ 166h  │ 95% │
│ ...                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Key changes from current:**
- KPI strip with hour category breakdown (not just CAPEX/OPEX)
- Hero chart: stacked area trend showing standard/OT/bench/leave over time (replaces basic line)
- Hours by Project/Person now stacked to show hour composition (std vs OT vs bench)
- New utilization-by-department chart (currently on a separate page)
- Detail table with all dimensions (person, dept, pool, hour types, utilization)
- CAPEX/OPEX as one of the grid sections (not a separate page concept — dual presence here and on Capitalisation)

**Backend changes:**
- Extend `GET /reports/time` response to include:
  - `standardHours`, `overtimeHours`, `benchHours`, `leaveHours` per project and per person
  - `utilizationByPerson` array (available, assigned, actual, util%)
  - `weeklyTrend` array (week, standard, overtime, bench, leave, expected)
  - `byDepartment` array (dept, hours, utilization)

### 12b. Capitalisation (`/reports/capitalisation`) → stays as "Capitalisation Report"

**Current state:** Solid page with project-level CAPEX/OPEX breakdown, trend chart, period locks. Well-designed for its purpose.  
**Problem:** Minor — no bench/leave context, no connection to overtime (OT hours that are CAPEX-tagged should be visible).

**Reworked design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ CAPITALISATION REPORT               [Period ▼] [Project ▼]         │
│                                     [Export XLSX] [Print PDF]       │
├─────────────────────────────────────────────────────────────────────┤
│ KPI STRIP                                                           │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐           │
│ │ CAPEX    │ OPEX     │ Total    │ CAPEX %  │ Alerts   │           │
│ │ 1,240h   │ 2,600h   │ 3,840h   │ 32.3%    │ 2 prj    │           │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ HERO: CAPEX % Trend by Month (line chart — keep existing)           │
│                                                                     │
│ PROJECT TABLE (keep existing, enhanced)                              │
│ Project | CAPEX h | OPEX h | OT CAPEX h | Total | CAPEX % | Alert  │
│ ────────┼─────────┼────────┼────────────┼───────┼─────────┼──────  │
│ PRJ-101 │ 480h    │ 640h   │ 28h        │ 1120h │ 42.9%   │        │
│ PRJ-102 │ 120h    │ 440h   │ 0h         │ 560h  │ 21.4%   │ ⚠     │
│                                                                     │
│ CAPEX/OPEX BY PROJECT (stacked bar — keep existing)                 │
│                                                                     │
│ PERIOD LOCKS (admin section — keep existing)                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Add KPI strip (currently absent — just raw cards)
- Add "OT CAPEX Hours" column to the table — overtime hours tagged as CAPEX deserve separate visibility since they may have different billing rates
- Minor: ensure bench time is excluded from capitalisation (bench is internal, never CAPEX)

**Backend changes:**
- Add `overtimeCapexHours` to the by-project response
- Filter out bench entries from capitalisation aggregation

### 12c. Planned vs Actual (`/dashboard/planned-vs-actual`) → stays, cross-links enhanced

**Current state:** Recently reworked with 7 KPIs, hero chart, action table, 4 secondary sections, overtime analysis, variance explorer, detail tabs.  
**Problem:** Some actions ("Resolve", "Review time") currently link to `/timesheets/approval` or `/assignments` — need to repoint to new surfaces.

**Reworked design — layout stays, links change:**

| Current Link Target | New Link Target | Context |
|---------------------|-----------------|---------|
| `/timesheets/approval` | `/time-management` | "Time Approval" quick link in title bar |
| `/timesheets/approval` | `/time-management` | "Review time submission" suggested action |
| `/assignments/new` | `/assignments/new` | Keep — assignment creation is not part of time service |
| `/assignments` | `/assignments` | Keep |
| `/staffing-requests` | `/staffing-requests` | Keep |

**Additional enhancement:**
- Add "Missing Timesheet" action items link to `/my-time?person={id}&month={month}` so a manager can see *what* the person should have reported
- Add a "View in Time Analytics" link from the KPI strip → `/reports/time?period=...`
- The "Overtime" KPI card now links to `/time-management?tab=overtime` instead of just scrolling

**Backend changes:** None — PvA backend already returns all needed data.

### 12d. Utilization Report (`/reports/utilization`) → absorbed into Time Analytics

**Current state:** Standalone page with bar chart + table showing available vs assigned vs actual hours.  
**Decision:** Absorb into the reworked Time Analytics page (`/reports/time`) as one of the 2×2 grid sections. The standalone route becomes a redirect.

**Rationale:** Utilization is just another lens on the same time data. Having it separate forces managers to context-switch. The Time Analytics page already shows hours by person — adding available/assigned/util% columns and a department-level utilization chart covers this completely.

### 12e. Report Builder + Export Centre → keep as-is

These are generic infrastructure pages not specific to time. No changes needed.

---

## 13. Route Redirect Map

Complete map of all route changes:

| Old Route | Action | New Target | Method |
|-----------|--------|------------|--------|
| `/timesheets` | Redirect | `/my-time` | React Router `<Navigate>` |
| `/timesheets/approval` | Redirect | `/time-management` | React Router `<Navigate>` |
| `/leave` | Redirect | `/my-time?tab=leave` | React Router `<Navigate>` |
| `/reports/utilization` | Redirect | `/reports/time?view=utilization` | React Router `<Navigate>` |
| `/reports/time` | Rework in place | (same URL) | Page rewrite |
| `/reports/capitalisation` | Rework in place | (same URL) | Page enhance |
| `/dashboard/planned-vs-actual` | Rework links | (same URL) | Link updates only |
| `/reports/export` | Keep | (same URL) | No change |
| `/reports/builder` | Keep | (same URL) | No change |

### Bookmark-safe redirect implementation

```tsx
// In router.tsx — add redirect routes BEFORE catch-all
{ path: 'timesheets', element: <Navigate to="/my-time" replace /> },
{ path: 'timesheets/approval', element: <Navigate to="/time-management" replace /> },
{ path: 'leave', element: <Navigate to="/my-time?tab=leave" replace /> },
{ path: 'reports/utilization', element: <Navigate to="/reports/time?view=utilization" replace /> },
```

### Sidebar navigation (final state)

**Employee sees:**
```
── Work ──
  My Time                  /my-time             ★ NEW (single entry point)
── Projects ──
  ...existing...
```

**Manager (RM/PM/DM) sees:**
```
── Work ──
  My Time                  /my-time             ★ NEW
  Time Management          /time-management     ★ NEW
── Analytics ──
  Time Analytics           /reports/time        ★ REWORKED
  Capitalisation           /reports/capitalisation
  Planned vs Actual        /dashboard/planned-vs-actual
  Export Centre            /reports/export
  Report Builder           /reports/builder
```

**HR sees:**
```
── Work ──
  My Time                  /my-time
  Time Management          /time-management
── Analytics ──
  Time Analytics           /reports/time
  Planned vs Actual        /dashboard/planned-vs-actual
  Export Centre            /reports/export
  Report Builder           /reports/builder
```

---

## 14. Updated Implementation Steps (Analytics + Redirects)

### Phase F: Analytics Rework (after Phases A–E)

| # | Task | Files |
|---|------|-------|
| F1 | Backend: extend `/reports/time` response with OT/bench/leave breakdown, weekly trend, utilization, by-department | `timesheets.service.ts` or new `time-analytics.service.ts` |
| F2 | Backend: extend `/reports/capitalisation` response with `overtimeCapexHours`, exclude bench | `capitalisation.service.ts` |
| F3 | Frontend: rework `TimeReportPage.tsx` → Time Analytics (KPI strip, stacked area hero, 2×2 grid, detail table) | `TimeReportPage.tsx` |
| F4 | Frontend: enhance `CapitalisationPage.tsx` (add KPI strip, OT CAPEX column) | `CapitalisationPage.tsx` |
| F5 | Frontend: update PvA page links (approval → `/time-management`, missing → `/my-time`) | `PlannedVsActualPage.tsx` |
| F6 | Frontend: absorb utilization into Time Analytics (`?view=utilization` query param) | `TimeReportPage.tsx` |

### Phase G: Redirects & Cleanup

| # | Task | Files |
|---|------|-------|
| G1 | Add redirect routes in `router.tsx` for `/timesheets`, `/timesheets/approval`, `/leave`, `/reports/utilization` | `router.tsx` |
| G2 | Update `route-manifest.ts`: remove old entries, add new ones, update nav groups | `route-manifest.ts` |
| G3 | Update all internal `<Link>` and `nav()` calls across dashboards | All dashboard pages |
| G4 | Update E2E test routes | `e2e/` |
| G5 | Remove old page components (keep as empty re-export shells for 1 release cycle, then delete) | `TimesheetPage.tsx`, `TimesheetApprovalPage.tsx`, `LeaveRequestPage.tsx`, `UtilizationPage.tsx` |
| G6 | Update sidebar navigation order and grouping | `navigation.ts` |
| G7 | Update MASTER_TRACKER and current-state docs | `docs/planning/` |
