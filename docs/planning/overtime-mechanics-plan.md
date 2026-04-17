# Overtime Mechanics — Implementation Plan

**Created:** 2026-04-16  
**Status:** Ready for review

---

## 1. Core Concept

Overtime = hours logged above a configurable threshold per week. The threshold is hierarchical:

```
Organization default (platform setting, set by admin)
  └─ Department override (set by RM, must ≤ org default unless HR approves exception)
      └─ Resource Pool override (set by DM, same exception logic with HR)
          └─ Person-level exception (case-based, approved by HR)
```

A person's **effective overtime threshold** resolves bottom-up: person exception → pool override → department override → org default. If any level exceeds its parent, it requires HR approval via the existing case management system.

---

## 2. Data Model

### 2a. New Prisma models

```prisma
/// Overtime threshold overrides per org unit or resource pool.
/// The global default lives in PlatformSetting (timesheets.standardHoursPerWeek).
model OvertimePolicy {
  id                String    @id @default(uuid()) @db.Uuid
  /// Exactly one of orgUnitId or resourcePoolId must be set.
  orgUnitId         String?   @db.Uuid
  resourcePoolId    String?   @db.Uuid
  /// Max standard hours per week for this scope. Hours above this = overtime.
  standardHoursPerWeek  Int           // e.g., 40
  /// Max overtime hours allowed per week before requiring exception approval.
  maxOvertimeHoursPerWeek  Int        // e.g., 8
  /// Who set this policy.
  setByPersonId     String    @db.Uuid
  /// If this exceeds the parent scope, link to the HR approval case.
  approvalCaseId    String?   @db.Uuid
  effectiveFrom     DateTime  @default(now())
  effectiveTo       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  orgUnit           OrgUnit?       @relation(fields: [orgUnitId], references: [id])
  resourcePool      ResourcePool?  @relation(fields: [resourcePoolId], references: [id])
  setBy             Person         @relation(fields: [setByPersonId], references: [id])

  @@index([orgUnitId, effectiveFrom])
  @@index([resourcePoolId, effectiveFrom])
  @@map("overtime_policies")
}

/// Per-person overtime exception approved via case management.
model OvertimeException {
  id                String    @id @default(uuid()) @db.Uuid
  personId          String    @db.Uuid
  caseRecordId      String    @db.Uuid
  maxOvertimeHoursPerWeek  Int       // e.g., 12
  reason            String
  effectiveFrom     DateTime
  effectiveTo       DateTime
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  person            Person      @relation(fields: [personId], references: [id])
  caseRecord        CaseRecord  @relation(fields: [caseRecordId], references: [id])

  @@index([personId, effectiveFrom, effectiveTo])
  @@map("overtime_exceptions")
}
```

### 2b. Extend existing models

**TimesheetWeek** — add computed overtime fields (populated on submit/approve):

```prisma
// Add to TimesheetWeek model:
totalHours         Decimal?  @db.Decimal(5, 2)  // sum of all entries
standardHours      Decimal?  @db.Decimal(5, 2)  // hours up to threshold
overtimeHours      Decimal?  @db.Decimal(5, 2)  // hours above threshold
overtimeApproved   Boolean   @default(false)     // HR/manager approved the overtime
overtimeThreshold  Int?                           // effective threshold when computed
```

**CaseType** — add new key:

```prisma
// Add to CaseTypeKey type:
'OVERTIME_EXCEPTION'
```

### 2c. Platform settings additions

```
overtime.enabled: true                    // feature toggle
overtime.defaultMaxOvertimePerWeek: 8     // global cap before exception required
overtime.requireApproval: true            // require HR approval for exceptions
overtime.warningThresholdPercent: 80      // warn employee at 80% of overtime cap
overtime.autoFlagOnSubmit: true           // auto-flag timesheets with OT on submit
```

---

## 3. Business Rules

### 3a. Threshold resolution

```
function getEffectivePolicy(personId, weekDate):
  1. Check OvertimeException for this person covering weekDate → if found, use it
  2. Check OvertimePolicy for person's resource pool → if found, use it
  3. Check OvertimePolicy for person's department → if found, use it
  4. Fall back to PlatformSetting:
     - standardHoursPerWeek (default 40)
     - overtime.defaultMaxOvertimePerWeek (default 8)
  
  Return { standardHours, maxOvertimeHours, source }
```

### 3b. Overtime detection (on timesheet submit)

When `timesheets.service.submitWeek()` is called:

1. Sum all entry hours for the week → `totalHours`
2. Resolve effective policy → `{ standardHours, maxOvertimeHours }`
3. Compute `overtimeHours = max(0, totalHours - standardHours)`
4. If `overtimeHours > 0`:
   - Set `TimesheetWeek.overtimeHours`, `standardHours`, `totalHours`, `overtimeThreshold`
   - If `overtimeHours > maxOvertimeHours` and `overtime.requireApproval`:
     - Block submission, return error: "Overtime exceeds allowed {maxOvertimeHours}h. Request an exception."
   - If `overtimeHours > 0` and `overtimeHours ≤ maxOvertimeHours`:
     - Allow submission, flag `overtimeHours` on the timesheet week
     - Auto-notify the person's line manager

### 3c. Policy override approval flow

When an RM sets a department overtime policy that exceeds the org default, or a DM sets a pool policy that exceeds the department policy:

1. System creates an `OVERTIME_EXCEPTION` case
2. HR manager is added as APPROVER participant
3. Until HR approves, the policy is saved with status "PENDING" (not effective)
4. On HR approval → policy becomes effective (`effectiveFrom` = approval date)
5. On HR rejection → policy is deleted or archived

### 3d. Person-level exception flow

When a person needs more overtime than their dept/pool allows:

1. RM or the person's manager creates an `OVERTIME_EXCEPTION` case
2. Subject = the person, Owner = RM
3. HR manager is APPROVER
4. Case payload contains: `{ requestedMaxOvertimeHours, reason, effectiveFrom, effectiveTo }`
5. On approval → `OvertimeException` record created, linked to case
6. On rejection → no record created, case closed

---

## 4. Backend Implementation

### 4a. New module: `src/modules/overtime/`

```
src/modules/overtime/
  overtime.module.ts
  application/
    overtime-policy.service.ts       — CRUD for OvertimePolicy
    overtime-exception.service.ts    — create/resolve exceptions via cases
    overtime-resolver.service.ts     — getEffectivePolicy(personId, weekDate)
    contracts/
      overtime-policy.dto.ts
      overtime-exception.dto.ts
      overtime-summary.dto.ts        — per-person/project/dept overtime aggregation
  presentation/
    overtime.controller.ts           — API endpoints
  infrastructure/
    overtime-policy.repository.ts    — Prisma access
```

### 4b. API endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/overtime/policy` | RM, DM, HR, admin | List active policies |
| POST | `/overtime/policy` | RM, DM | Create/update policy (triggers HR approval if exceeds parent) |
| DELETE | `/overtime/policy/:id` | RM, DM, admin | Remove policy |
| GET | `/overtime/exceptions` | HR, admin | List person-level exceptions |
| POST | `/overtime/exceptions` | RM, DM | Request exception (creates case) |
| GET | `/overtime/resolve/:personId` | any | Get effective policy for a person |
| GET | `/overtime/summary` | RM, DM, HR, director, admin | Overtime aggregation for dashboards |

### 4c. Overtime summary endpoint (for dashboards)

`GET /overtime/summary?weeks=4&asOf=...`

Returns:

```typescript
interface OvertimeSummaryResponse {
  period: { weekStart: string; weekEnd: string; weeksIncluded: number };

  // Org-wide
  totalOvertimeHours: number;
  totalStandardHours: number;
  overtimeRate: number;              // overtimeHours / standardHours * 100
  peopleWithOvertime: number;
  peopleExceedingCap: number;        // above their maxOvertimeHours

  // Per-person
  personSummaries: Array<{
    personId: string;
    displayName: string;
    departmentId: string;
    departmentName: string;
    poolId: string | null;
    poolName: string | null;
    totalHours: number;
    standardHours: number;
    overtimeHours: number;
    effectiveThreshold: number;      // their max OT allowed
    exceedsThreshold: boolean;
    hasException: boolean;           // has approved OvertimeException
    weekBreakdown: Array<{
      weekStart: string;
      total: number;
      standard: number;
      overtime: number;
    }>;
  }>;

  // Per-project (which projects drive overtime)
  projectSummaries: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    overtimeHours: number;           // sum of OT hours on entries for this project
    contributorCount: number;        // people logging OT to this project
  }>;

  // Per-department
  departmentSummaries: Array<{
    orgUnitId: string;
    orgUnitName: string;
    personCount: number;
    totalOvertimeHours: number;
    overtimeRate: number;
    policyMaxHours: number | null;   // dept policy if set
    exceedingPolicyCount: number;
  }>;

  // Per-pool
  poolSummaries: Array<{
    poolId: string;
    poolName: string;
    personCount: number;
    totalOvertimeHours: number;
    overtimeRate: number;
    policyMaxHours: number | null;
    exceedingPolicyCount: number;
  }>;

  // Pending exceptions
  pendingExceptions: Array<{
    caseId: string;
    personId: string;
    personName: string;
    requestedMaxHours: number;
    reason: string;
    requestedAt: string;
  }>;
}
```

### 4d. Timesheet service changes

In `timesheets.service.ts`:

- **`submitWeek()`**: after status validation, before setting SUBMITTED:
  1. Call `overtimeResolver.getEffectivePolicy(personId, weekStart)`
  2. Sum entries → `totalHours`
  3. If `totalHours > policy.standardHours`:
     - Compute overtime
     - If `overtime > policy.maxOvertimeHours` → throw `BadRequestException` with clear message
     - Otherwise set overtime fields on the TimesheetWeek
  4. Emit notification event `timesheet.overtimeDetected` if OT > 0

- **`upsertEntry()`**: add a soft warning (returned in response, not blocking):
  - If running total for the week would exceed `policy.standardHours`, include `warning: 'This entry will result in overtime'`

---

## 5. Dashboard Integration

### 5a. Planned vs Actual dashboard (already reworked)

**New KPI card:** "Overtime Hours" (position: insert after "Pending Pipeline")
- Value: total overtime hours in the period
- Context: "{n} people with overtime"
- Color: green if 0, amber if <5% of total hours, red if ≥5%
- Click → scroll to new Overtime section

**New secondary section:** "Overtime Analysis" (replace one of the 2×2 grid cells, or add a 3rd row)
- Toggle: [By Person] [By Project] [By Department] [By Pool]
- Bar chart showing overtime hours per dimension
- Color-coded by threshold compliance (green = within cap, red = exceeding)
- Table toggle showing: name, standard hours, overtime hours, threshold, % of cap used, exception status

### 5b. Workload Overview (DashboardPage)

**New KPI card:** "Overtime This Period"
- Value: org-wide overtime hours
- Context: "across {n} people"
- Color threshold: amber >20h, red >50h
- Click → navigates to PvA dashboard filtered to overtime

**Action table addition:** new category "Overtime Exceeds Cap"
- Severity: High
- For each person exceeding their maxOvertimeHours without an approved exception

### 5c. Resource Manager dashboard

**New section in team allocation:** "Team Overtime"
- For each managed person: show `standardHours | overtimeHours | threshold | status`
- Status badge: "Within Cap", "Near Cap" (>80%), "Over Cap" (red)
- Quick action: "Request Exception" → creates OVERTIME_EXCEPTION case

**Policy management widget:**
- Current department policy (editable by RM)
- "Set Policy" button → opens inline form
- If exceeds org default → "Requires HR Approval" badge, creates case on save

### 5d. Delivery Manager dashboard

**New section:** "Project Overtime Exposure"
- Table: Project | OT Hours | Contributors | % of Project Hours
- Sorted by OT hours desc
- Shows which projects are driving overtime cost

**Team policy widget:**
- Same as RM but for resource pools
- DM can set pool-level override

### 5e. HR Manager dashboard

**New at-risk factor:** `EXCESSIVE_OVERTIME`
- Added to existing at-risk employee detection
- Triggers when: person has >X overtime hours in last 4 weeks without exception

**New section:** "Overtime Governance"
- Pending exception requests (from RM/DM) — approve/reject inline
- Active exceptions — list with expiry dates
- Department/pool policy overrides that exceed org default — review status
- Org-wide overtime trend chart (last 12 weeks)

### 5f. Employee dashboard

**Timesheet context:**
- When entering hours, show dynamic indicator: "32h standard | 3h overtime | 5h remaining before cap"
- Visual progress bar: green up to standard, amber for overtime, red near cap
- If overtime exceeds cap: "You've exceeded your overtime allowance. Contact your manager."

**Pending items:**
- If an overtime exception case is open for them, show it in workflow items

---

## 6. Implementation Steps

| # | Task | Layer | Depends on |
|---|------|-------|------------|
| 1 | Prisma migration: add `OvertimePolicy`, `OvertimeException`, extend `TimesheetWeek`, add `OVERTIME_EXCEPTION` case type | DB | — |
| 2 | Add overtime platform settings | BE | 1 |
| 3 | Build `overtime` module: resolver, policy service, exception service | BE | 1, 2 |
| 4 | Build overtime controller with API endpoints | BE | 3 |
| 5 | Build overtime summary query service (for dashboards) | BE | 3 |
| 6 | Modify `timesheets.service.submitWeek()` to detect and validate overtime | BE | 3 |
| 7 | Modify `timesheets.service.upsertEntry()` to return overtime warnings | BE | 3 |
| 8 | Seed case type `OVERTIME_EXCEPTION` with workflow steps | SEED | 1 |
| 9 | Seed sample overtime policies and exceptions | SEED | 8 |
| 10 | Frontend: overtime API module + types | FE | 4 |
| 11 | Frontend: PvA dashboard — add Overtime KPI card + Overtime Analysis section | FE | 5, 10 |
| 12 | Frontend: Workload Overview — add Overtime KPI card + action items | FE | 5, 10 |
| 13 | Frontend: RM dashboard — team overtime section + policy management | FE | 5, 10 |
| 14 | Frontend: DM dashboard — project overtime exposure + pool policy | FE | 5, 10 |
| 15 | Frontend: HR dashboard — overtime governance section + exception approval | FE | 5, 10 |
| 16 | Frontend: Employee dashboard — overtime indicator in timesheet context | FE | 7, 10 |
| 17 | Frontend: Overtime policy admin page (admin role) | FE | 4, 10 |
| 18 | Tests: backend unit tests for resolver, policy, exception, timesheet validation | TEST | 3, 6, 7 |
| 19 | Tests: frontend component tests for new dashboard sections | TEST | 11-16 |
| 20 | Update selectors and PvA page test fixtures | TEST | 11 |

---

## 7. Risk Notes

- **Performance**: overtime summary requires joining timesheets × persons × org memberships × policies. For the 4-week default window this is manageable. For 12-week window, consider caching the overtime summary endpoint (60s TTL, same as workload trend).
- **Backward compatibility**: existing timesheets without overtime fields will have `null` for `overtimeHours` etc. The resolver treats null as "no overtime computed" — these timesheets predate the feature.
- **Policy conflicts**: if a person belongs to both a department and a pool with different policies, pool takes precedence (more specific). If they have a person-level exception, that always wins.
- **Billing**: overtime hours will need a cost multiplier when the billing page is built. The `OvertimePolicy` model can be extended with `costMultiplier` (e.g., 1.5) later — not needed now.
- **GDPR**: overtime data is employee-sensitive. The existing RBAC already restricts dashboard data by role, so no new access patterns needed.
