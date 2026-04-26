# Project Budget + EVM Roadmap

## Context

Project Radiator v1 introduced five EVM columns on `project_budgets`:

- `earnedValue` — value of work completed
- `actualCost` — money actually spent to date
- `plannedToDate` — budgeted cost of work scheduled
- `eac` — estimate at completion
- `capexCorrectPct` — percentage of spend correctly capitalised

These are **manually seeded** today for demo purposes. V1 uses them directly for
the four Budget quadrant scorers (CPI, SpendRate, ForecastAccuracy, CapexCompliance).

This doc captures the roadmap for making these columns **auto-computed** from the
operational data already flowing through the system — bringing the Budget
quadrant on par with the People quadrant (which derives from timesheets + pulse).

## Phases

### Phase 2a — Standardized Production Cost (SPC)

Today, individual cost rates live on `person_cost_rates`. This yields a true
per-person cost but breaks down as soon as:

- A person works on multiple projects in a week (who eats the cost?)
- A person is billed at one rate externally and costs another internally
  (which number goes into EVM?)
- Headcount plans aren't filled (no actual person = no rate)

**SPC** resolves this by attaching a **standardized hourly rate** to each
`ProjectRolePlan` row, representing "what this role costs on this project
regardless of who fills it". The computation becomes:

```
actualCost(week) = Σ over timesheet entries for project in week
                   of entry.hours × spc_rate_for_role(entry.assignment.staffingRole)
```

**Schema additions:**

```prisma
model ProjectRolePlan {
  // ... existing ...
  standardHourlyRate Decimal? @db.Decimal(10, 2)  // SPC rate
  standardRateSource RateSource @default(DEFAULT)
}

enum RateSource {
  DEFAULT       // derived from org-unit default
  ROLE_CARD     // looked up by staffing role
  MANUAL        // explicitly set by PM/Finance
}

model OrgUnitDefaultRate {
  orgUnitId    String @db.Uuid
  fiscalYear   Int
  hourlyRate   Decimal @db.Decimal(10, 2)
  @@id([orgUnitId, fiscalYear])
}
```

**Derivation pipeline:**

1. `plannedToDate(now)` = Σ role-plan `headcount × allocation % × 40h × weeks_elapsed × standardHourlyRate`
2. `earnedValue(now)` = Σ of completed milestones' planned value (requires milestone.plannedCost field — V2).
3. `actualCost(now)` = derived as above from approved timesheets.
4. `eac(now)` = `actualCost + (bac − earnedValue) / cpi` — standard EVM formula.

### Phase 2b — Vendor Cost Accrual

Today `ProjectVendorEngagement` captures a vendor's role + monthly/day rate, but
the cost doesn't flow into `actualCost`. Vendors show up as **invisible money**
that blows the Budget quadrant.

**Fix:** accrual workers write an `actualCost` delta per-day into a new
`project_cost_accruals` table.

```prisma
model ProjectCostAccrual {
  id              String   @id @default(uuid()) @db.Uuid
  projectId       String   @db.Uuid
  accrualDate     DateTime @db.Date
  sourceType      CostAccrualSource
  sourceId        String?  @db.Uuid     // vendorEngagementId | timesheetEntryId | personCostRateId
  amount          Decimal  @db.Decimal(15, 2)
  isCapex         Boolean  @default(false)
  createdAt       DateTime @default(now())
  @@index([projectId, accrualDate])
}

enum CostAccrualSource {
  TIMESHEET_SPC       // internal staff via SPC
  VENDOR_MONTHLY      // monthly vendor retainer
  VENDOR_DAYRATE      // daily vendor rate × attendance
  MANUAL_ADJUSTMENT   // finance correction
}
```

**Accrual logic (runs nightly):**

1. For each day in the last N days not yet accrued, for each active
   `ProjectVendorEngagement`:
   - Monthly rate: accrue `monthlyRate ÷ days_in_month` per day.
   - Daily rate: accrue `blendedDayRate × headcount` per weekday.
2. For each approved timesheet entry in the last N days, accrue
   `hours × spc_rate` (TIMESHEET_SPC source).
3. Roll up daily accruals → `actualCost`, `capexCorrectPct` for the current
   fiscal year.

**Critical:** do NOT double-count. If a vendor resource is ALSO in
`ProjectAssignment` + submitting timesheets, prefer the timesheet path (it's
more accurate). Vendor accruals only cover time not captured in timesheets.

### Phase 2c — Reconciliation Views

A new admin page `/admin/budget-reconciliation` showing:

- Per-project: planned vs actual vs forecast vs timesheet-derived vs accrual-derived.
- Variance reasons attached as notes per quarter.
- "Apply reconciliation" button that writes a `MANUAL_ADJUSTMENT` accrual row
  (with audit trail and approver).

This closes the loop so Finance and PMs see the same numbers.

## Linking Budget, Utilization, and People (the trio)

The Radiator's three operational quadrants **should share a coherent data story**:

| Signal | Source (now) | Source (V2 target) |
|--------|-------------|-------------------|
| `staffingFillRate` | Role-plan vs active assignments | unchanged |
| `teamMood` | Pulse entries | unchanged |
| `overAllocationRate` | Assignment sums per person | unchanged |
| `keyPersonRisk` | Skills matrix | unchanged |
| `costPerformanceIndex` | Manual EVM columns | **SPC-derived actualCost + milestone-derived earnedValue** |
| `spendRate` | Manual columns | **SPC + vendor accrual vs plannedToDate** |
| `forecastAccuracy` | Manual EAC | **CPI-based EAC recalculation** |
| `capexCompliance` | Manual % | **Derived from `TimesheetEntry.capex` boolean × SPC accruals** |
| `velocityTrend` | Actual timesheet hours ÷ planned | unchanged |

Once V2 ships, the Budget quadrant is **zero-touch** for the PM — it always
reflects the real operational situation. The PM only interacts with Budget
through three levers:

1. Setting the plan (CAPEX/OPEX budget, fiscal year).
2. Signing off on the periodic reconciliation.
3. Manual override on a single sub-score (with reason + audit) if they believe
   the computed number is misleading for an extraordinary reason.

## Timeline

- **Radiator v1 (shipped):** columns exist, manually seeded, scorers produce
  real values from seed data.
- **Radiator v2:** SPC rates on role plans, accrual table + nightly worker,
  reconciliation admin page.
- **Radiator v3:** Full auto-recompute; Budget quadrant thresholds become
  company-specific policy rather than demo guesswork.

## References

- PMBOK Guide 6th Edition, §7.4 — Control Costs / Earned Value Management.
- PMI Practice Standard for Earned Value Management, 2nd Edition.
- Internal finance doc: `CAPEX-vs-OPEX Classification Policy v3` (Legal/Finance).
