# Workforce Planner — Interactive Simulation Tool

---

## Industry Intelligence & SWOT

### Competitive Landscape — What We Steal and Improve

| Tool | What They Do Brilliantly | What They Fail At | What We Steal | How We Improve It |
|------|-------------------------|-------------------|---------------|-------------------|
| **Runn** | Financial impact married to resource allocation — see revenue/cost change instantly when you move a person | Forecasting is shallow; reporting requires export; no custom reports | **Instant cost ticker** that updates on every drag/toggle | Add skill-gap dimension (Runn only shows cost, not skill fit) |
| **Meisterplan** | Scenario comparison is unmatched — toggle projects on/off, see resource impact in seconds | Requires training to unlock power; no time tracking; no financial integration | **Project toggle** — checkbox to include/exclude projects from simulation | Make it zero-learning: toggles are visible inline, not hidden in menus |
| **Float** | So simple that people actually open it daily. Drag-and-drop that a 5-year-old could use. 4.5★ on Capterra | No financials, no timezone support, mobile is broken, breaks at 100+ people | **Simplicity-first grid** — the grid IS the editing surface, not a report you look at | Add the financial/skill layer Float lacks without adding Float's simplicity tax |
| **Kantata** | True all-in-one (project + resource + time + billing + financials) | Two separate resource management systems cause confusion; steep 12-month onboarding | **Unified data model** — we already have assignments + requests + projects + costs in one DB | Avoid their dual-system mistake: ONE grid, ONE interaction model |
| **Anaplan** | Enterprise-grade multi-dimensional modeling; AI-powered scenario generation | Too complex for non-specialists; requires "model builder" role to maintain; $100K+ annual cost | **What-if that doesn't need a specialist** — checkboxes for hire/release, drag for reassign | No model builders needed — the grid IS the model |
| **Agentnoon** | Drag org chart nodes → instant cost recalculation. Visual-first editing. | Only org design, not project staffing; no timeline dimension | **Visual-first editing with instant calculation** — every interaction updates numbers | Apply to project-timeline grid, not org charts |

### SWOT — Our Workforce Planner

| | Helpful | Harmful |
|---|---|---|
| **Internal** | **STRENGTHS** | **WEAKNESSES** |
| | All data in one Prisma DB (no integration needed) | No historical bench data (computed, not stored) |
| | ProjectRolePlan already defines demand per project | No cost rates seeded for all people |
| | Skill matching algorithm already built | What-if is client-side only (no persistence) |
| | Existing assignment workflow (DRAFT→APPROVED→ACTIVE) | No multi-user collaboration on scenarios |
| | PersonCostRate + ProjectBudget models exist | 70% of features go unused (research) — must stay lean |
| **External** | **OPPORTUNITIES** | **THREATS** |
| | 71% of planners still use spreadsheets — huge adoption gap | Feature bloat kills adoption (industry-wide) |
| | $12.24 ROI per $1 spent on WFM tools (proven) | 18-month implementations arrive outdated |
| | Competitors charge $15-50/user/month — we're free (internal tool) | Users revert to Excel if tool takes >30sec to answer a question |
| | IBM saved $270M with workforce planning | Inflated skill ratings by managers destroy planning accuracy |
| | 88% of spreadsheets contain errors — tool can beat Excel on accuracy | Complex scenario builders get abandoned |

### Anti-Patterns We MUST Avoid (from real failures)

1. **8,000-skill taxonomy** → Financial services firm paralyzed managers. We use existing PersonSkill (max ~50 skills in seed data).
2. **18-month implementation** → Users see value in <3 months or they abandon. We ship in days, iterate weekly.
3. **"Model builder" role required** → Anaplan's curse. Our tool needs zero training — grid IS the model.
4. **Duplicate data entry** → Kantata's dual system. We read from existing assignments/requests — zero new data entry.
5. **10-year forecasts** → Almost always wrong. We cap at 12 months. 3-6 months is the sweet spot.
6. **Feature creep** → 70% of features unused. We build 5 interactions, not 50.
7. **Directives vs options** → Managers hate being told "your target is X". We show scenarios, they choose.

### The 5 Interactions That Matter (stolen from research)

From adoption research, these are the ONLY interactions that drive daily use:

1. **Drag to reassign** (Float/Runn pattern) — move a person between projects
2. **Toggle to simulate** (Meisterplan pattern) — include/exclude a project to see impact
3. **Checkbox to hire/release** (Agentnoon pattern) — add/remove phantom headcount
4. **Instant feedback** (all successful tools) — every action updates numbers in <100ms
5. **One-click undo** (Linear pattern) — reversible actions remove fear of commitment

Everything else is secondary. If these 5 work flawlessly, the tool gets adopted.

---

## Goal
Replace Timeline, Board, and Bench views with a single **interactive planning surface** where resource managers can simulate staffing decisions and see their impact in real-time. NOT a dashboard — a tool you work IN.

## The 6 Questions This Tool Answers

| # | Question | How the tool answers it |
|---|----------|------------------------|
| 1 | How many FTEs do I need to hire and with what skills? | Gap row shows unmatched demand by skill. "Hire" action adds phantom headcount → cost/gap updates instantly |
| 2 | How many FTEs can't be assigned and need to be dismissed? | Bench row shows idle people with aging. "Release" action removes them → cost savings shown |
| 3 | How many draft projects are planned and what do they need? | DRAFT projects visible in the grid with their `ProjectRolePlan` headcount. Toggle "Include Draft Projects" to see impact |
| 4 | How many projects will close and release people soon? | Projects with `endsOn` in the horizon show a closing marker. Roll-off people appear in Bench row |
| 5 | How many empty gaps in project staffing? | Each project row shows filled/required ratio. Red cells = unfilled weeks |
| 6 | Budget impact? | Running cost ticker updates with every simulation action (feature-toggled via `budgetSimulation.enabled`) |

## Layout — One Screen, Two Zones

```
+====================================================================+
| TOOLBAR: [3m|6m|9m|12m] [◀ Today ▶] [☐ Include Drafts] [Simulate] |
|          [↩ Undo]  [Apply]  [Reset]                                |
+====================================================================+
|                                                                      |
| PROJECT ZONE (scrollable grid, 70% height)                          |
| +---------+---+------+------+------+------+------+------+------+   |
| | Project  | ◻ | W1   | W2   | W3   | W4   | ...  | W12  | W13 |   |
| +---------+---+------+------+------+------+------+------+------+   |
| | Mercury | ■ |[A 50][B100]|[C 40]|      |      |      |  ⚠  |   |
| |  5/8 HC |   |···QA 80%···|      |      |      |      |CLOSE|   |
| +---------+---+------+------+------+------+------+------+------+   |
| | Jupiter | ■ |[S 80]|      |      |      |      |      |      |   |
| |  1/3 HC |   |···FE 80%··|···BE 100%···|      |      |      |   |
| +---------+---+------+------+------+------+------+------+------+   |
| | ⊕ Atlas | ◻ |      |      | DRAFT — needs 4 roles              |   |
| |  0/4 HC |   |      |      |      |      |      |      |      |   |
| +---------+---+------+------+------+------+------+------+------+   |
|                                                                      |
| IMPACT ZONE (fixed bottom panel, 30% height)                        |
| +------------------+-------------------+------------------+          |
| | SUPPLY FORECAST  | DEMAND FORECAST   | GAP & ACTIONS   |          |
| | ▓▓▓▓░░░░░░░░    | ████████▓▓▓▓     |                 |          |
| | 31 FTE → 28 FTE | 45 HC → 52 HC    | Gap: -17 → -24  |          |
| | 6 bench, 3 exit  | +4 draft projects | Need: 7 hire    |          |
| |                  |                   | Release: 2       |          |
| | [Person list     | [Role list        | [Hire ◻ Java x3]|          |
| |  with status]    |  with skill gaps] | [Hire ◻ QA x2]  |          |
| +------------------+-------------------+------------------+          |
| | BUDGET: Baseline $420K/mo → Scenario $485K/mo (+$65K) 🔒toggle    |
+====================================================================+
```

## How It Works — Interactions

### Project Zone (the grid)
- **Rows = Projects** (ACTIVE + optionally DRAFT). Each row shows:
  - Project name + filled/required HC ratio (from `ProjectRolePlan` + assignments)
  - Closing marker if `project.endsOn` is within horizon
  - DRAFT badge for planned-but-not-active projects
- **Columns = Weeks** (3/6/9/12 month horizon)
- **Cells** contain:
  - **Green blocks**: assigned people (from `ProjectAssignment`)
  - **Dashed amber blocks**: unfilled demand (from `StaffingRequest` + `ProjectRolePlan`)
  - **Dotted blue blocks**: simulated moves (user-created what-ifs)
- **Drag** a person block from one project to another → instant simulation
- **Click empty demand block** → person picker appears → assign from bench or hire phantom

### Impact Zone (the live calculator)
Three panels that update in real-time as you manipulate the grid:

**Supply Forecast** (left):
- Stacked bar showing current workforce → projected (accounting for roll-offs, bench)
- List of people: who's leaving bench, who's rolling off, who's being released (simulated)

**Demand Forecast** (center):
- Stacked bar showing current demand → projected (accounting for draft projects, closing projects)
- List of roles needed with skills

**Gap & Actions** (right):
- Net gap = demand - supply per skill
- **"Hire" checkboxes**: tick to add phantom hires → gap and cost update
- **"Release" checkboxes**: tick to simulate dismissals → cost savings shown
- Each action is reversible (untick to undo)

**Budget Line** (bottom bar, feature-toggled):
- `Baseline cost/mo` → `Scenario cost/mo` (delta shown)
- Uses `PersonCostRate.hourlyRate × 160hrs/mo` per person
- Feature toggle: `budgetSimulation.enabled` in PlatformSetting table

### Drag Mechanics (exact flow)

1. User clicks "Simulate" → `simulating = true` → all assignment blocks get `draggable` attribute
2. User grabs "Alice 50%" block from Mercury row, week 3
3. `onDragStart` fires → stores `{ personId: alice, personName: 'Alice', allocationPercent: 50, staffingRole: 'Backend Developer', fromProjectId: mercury, weekStart: W3 }`
4. User drags over Jupiter row, week 3 → `onDragOver` highlights cell blue
5. User drops → `simulation.addMove({ personId, personName, allocationPercent, staffingRole, fromProjectId: mercury, toProjectId: jupiter, weekStart: W3 })`
6. Grid re-renders:
   - Mercury W3: Alice block gets `opacity: 0.3, textDecoration: line-through` (removed from source)
   - Jupiter W3: new dotted blue block appears "Alice 50%" (added to target)
7. Impact panel recalculates:
   - Mercury supply: decreased by 50%
   - Jupiter supply: increased by 50%
   - If Alice had a cost rate: budget delta updates
   - Skill gaps recalculate
8. Undo stack: push `{ type: 'move', ...moveData }` → undo button appears with tooltip "Undo: Move Alice to Jupiter"

### Click-to-Hire Mechanics (exact flow)

1. User sees skill gap in Impact Panel: "Java: need 3, have 1, gap -2"
2. User checks `☐ Hire Java ×2`
3. `simulation.addHire({ role: 'Java Developer', skill: 'Java', count: 2 })` → generates 2 phantom entries
4. Impact panel recalculates:
   - Supply: +2 phantom FTE
   - Gap: Java gap closes from -2 to 0
   - Budget: +2 × avgCostPerFte added to scenario cost
5. Grid: NO change (phantom hires don't appear in project rows — they appear in supply total only)
6. When user clicks "Apply": phantom hires are NOT created as assignments (there's no real person). Instead, toast shows "2 hire requests noted — create staffing requests to action them." Apply only creates real assignments from moves.

### Click-to-Release Mechanics (exact flow)

1. User sees bench person in Impact Panel: "Dave K. — 67d on bench"
2. User checks `☐ Release Dave K.`
3. `simulation.addRelease({ personId: dave, personName: 'Dave K.' })` → removes Dave from supply calculations
4. Impact panel recalculates:
   - Supply: -1 FTE
   - Bench: -1
   - Budget: -1 × Dave's costPerMonth saved
5. Grid: NO change (bench people aren't in project rows)
6. When user clicks "Apply": releases are NOT executed (no API for dismissal). Toast shows "1 release noted — coordinate with HR."

### Scenario Management

Phase 1 (this implementation):
- **No named scenarios** — there's one simulation state per session
- **Reset** clears all moves/hires/releases
- **Apply** creates real assignments from moves only (via `POST /assignments/bulk`)
- **Undo** reverses the last action (move/hire/release)
- Simulation state lives in React state (lost on page refresh)

Phase 2 (future — NOT in this plan):
- Named scenarios saved to localStorage
- Compare two scenarios side-by-side
- Server-side scenario persistence

## Data Sources — Verified Against Codebase (2026-04-17)

| Data | Source | Exists? | Exact Field Names | Seed Data? |
|------|--------|---------|-------------------|------------|
| Project list + status + dates | `Project` model | ✅ | `status: ProjectStatus` (DRAFT\|ACTIVE\|ON_HOLD\|CLOSED\|COMPLETED\|ARCHIVED), `startsOn: DateTime?`, `endsOn: DateTime?` | ✅ Phase 2 seeds DRAFT projects |
| Project role requirements | `ProjectRolePlan` model | ✅ | `roleName`, `headcount: Int`, `allocationPercent: Decimal(5,2)?`, `plannedStartDate?`, `plannedEndDate?`, `requiredSkillIds: String[]`, `source: RolePlanSource` (INTERNAL\|VENDOR\|EITHER), `seniorityLevel?` | ❌ NOT SEEDED — must add to phase2-dataset.ts |
| Current assignments | `ProjectAssignment` | ✅ | `personId`, `projectId`, `staffingRole`, `status: AssignmentStatus`, `allocationPercent: Decimal(5,2)`, `validFrom`, `validTo?` | ✅ |
| Open demand | `StaffingRequest` | ✅ | `role`, `skills: String[]`, `headcountRequired: Int`, `headcountFulfilled: Int`, `allocationPercent: Int`, `priority`, `status`, `startDate`, `endDate` | ✅ |
| People + skills | `Person` + `PersonSkill` | ✅ | `PersonSkill.proficiency: Int` (1-5), `PersonSkill.certified: Boolean` | ✅ |
| Cost rates | `PersonCostRate` | ✅ | `hourlyRate: Decimal(10,2)`, `effectiveFrom: Date`, `rateType: String` (default "INTERNAL"). Table name: `person_cost_rates`. No relation to Project. | ❌ NOT SEEDED — must add to phase2-dataset.ts |
| Project budgets | `ProjectBudget` | ✅ | `capexBudget: Decimal(15,2)`, `opexBudget: Decimal(15,2)`, `fiscalYear: Int`. Table: `project_budgets`. Unique on `[projectId, fiscalYear]`. | ❌ NOT SEEDED — must add to phase2-dataset.ts |
| Capacity forecast | `workload.service.ts` | ✅ | `CapacityForecastWeek { week, projectedBench, atRiskPeople[], expectedAbsorptionDays }` | N/A (computed) |
| Feature toggles | `PlatformSetting` model (key/value store) | ✅ | Key-value JSON store. `budgetSimulation.enabled` does NOT exist yet — must be added to seed. Existing pattern: `timesheets.enabled`, `pulse.enabled`. | ❌ Must create |
| Bulk assignment API | `POST /assignments/bulk` | ✅ | Returns `{ createdCount, createdItems[], failedCount, failedItems[], message, strategy, totalCount }` | N/A |

### ⚠ Critical Pre-Requisite: Seed Data Gaps

Before the planner works with real data, task 0 must seed:
1. `ProjectRolePlan` records for existing phase2 projects (define how many roles each project needs)
2. `PersonCostRate` records for phase2 people (hourly rates)
3. `ProjectBudget` records for phase2 projects (CAPEX/OPEX per fiscal year)
4. `PlatformSetting` row: `{ key: 'budgetSimulation.enabled', value: true }`

Without these, the planner grid will show assignments but NO demand from role plans, NO cost calculations, and NO budget impact.

## Backend — New Endpoint

```
GET /staffing-desk/planner
  ?from=2026-04-14  &weeks=26  &includeDrafts=true  &poolId=  &orgUnitId=
```

**Response: `WorkforcePlannerResponse`**
```typescript
interface PlannerAssignmentBlock {
  assignmentId: string;
  personId: string;
  personName: string;
  staffingRole: string;       // from ProjectAssignment.staffingRole — needed for Apply conversion
  allocationPercent: number;  // from ProjectAssignment.allocationPercent (Decimal → number)
  status: string;             // AssignmentStatus enum value
  costPerMonth: number | null; // PersonCostRate.hourlyRate × 160 × (allocationPercent/100), null if no rate
}

interface PlannerDemandBlock {
  // Exactly one of these is non-null (demand comes from either StaffingRequest OR ProjectRolePlan)
  requestId: string | null;    // from StaffingRequest.id (if demand from request)
  rolePlanId: string | null;   // from ProjectRolePlan.id (if demand from role plan)
  role: string;                // StaffingRequest.role or ProjectRolePlan.roleName
  skills: string[];            // StaffingRequest.skills or resolved from ProjectRolePlan.requiredSkillIds
  allocationPercent: number;   // StaffingRequest.allocationPercent or ProjectRolePlan.allocationPercent
  headcountOpen: number;       // StaffingRequest: headcountRequired - headcountFulfilled. RolePlan: headcount - matched assignments
  priority: string | null;     // StaffingRequest.priority (null for role plan demand)
}

interface PlannerProjectWeek {
  weekStart: string;           // ISO date YYYY-MM-DD (Monday)
  assignments: PlannerAssignmentBlock[];
  demands: PlannerDemandBlock[];
  totalSupplyPercent: number;  // sum of assignment allocationPercent
  totalDemandPercent: number;  // sum of demand allocationPercent × headcountOpen
}

interface PlannerProjectRow {
  projectId: string;
  projectName: string;
  projectCode: string;         // Project.projectCode (unique identifier)
  status: string;              // ProjectStatus: DRAFT | ACTIVE | ON_HOLD | CLOSED | COMPLETED | ARCHIVED
  startsOn: string | null;     // Project.startsOn ISO date
  endsOn: string | null;       // Project.endsOn ISO date — used for closing marker
  filledHc: number;            // count of distinct personIds in APPROVED/ACTIVE assignments
  requiredHc: number;          // sum of ProjectRolePlan.headcount for this project (0 if no role plans)
  weekData: PlannerProjectWeek[];
}

interface PlannerBenchPerson {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];            // from PersonSkill → Skill.name
  daysOnBench: number;         // computed: now - MAX(ended assignment validTo), fallback to hiredAt
  availablePercent: number;    // 100 - current total allocation
  costPerMonth: number | null; // PersonCostRate.hourlyRate × 160, null if no rate
}

interface PlannerRollOff {
  personId: string;
  displayName: string;
  projectName: string;
  projectId: string;
  assignmentEndDate: string;   // ProjectAssignment.validTo ISO date
  allocationPercent: number;
  daysUntilRollOff: number;    // computed: validTo - now
  hasFollowOn: boolean;        // true if another assignment.validFrom <= this.validTo for same person
}

interface PlannerSkillGap {
  skill: string;
  needed: number;              // headcount of open demand requiring this skill
  available: number;           // count of bench + underallocated people with this skill
  gap: number;                 // needed - available (positive = deficit)
}

interface WorkforcePlannerResponse {
  weeks: string[];             // array of ISO date strings (Mondays)
  projects: PlannerProjectRow[];
  supply: {
    totalFte: number;          // count of ACTIVE people
    benchPeople: PlannerBenchPerson[];   // people with allocation < 20%
    rollOffs: PlannerRollOff[];          // assignments ending within horizon
  };
  demand: {
    totalHcRequired: number;   // sum of all ProjectRolePlan.headcount + StaffingRequest.headcountRequired - headcountFulfilled
    bySkill: PlannerSkillGap[];
    draftProjectDemand: number; // HC from DRAFT status projects only
  };
  budget: {
    enabled: boolean;          // from PlatformSetting 'budgetSimulation.enabled' (false if key missing)
    baselineMonthlyCost: number; // sum of PersonCostRate.hourlyRate × 160 for all ACTIVE people with rates
    avgCostPerFte: number;     // baselineMonthlyCost / totalFte (0 if no rates)
  };
}
```

## Frontend — Files

```
frontend/src/components/staffing-desk/WorkforcePlanner.tsx        — Main component (replaces Timeline+Board+Bench)
frontend/src/components/staffing-desk/PlannerProjectGrid.tsx      — Project × week grid
frontend/src/components/staffing-desk/PlannerImpactPanel.tsx      — Bottom impact zone (supply/demand/gap/budget)
frontend/src/components/staffing-desk/PlannerScenarioBar.tsx      — Scenario management toolbar
frontend/src/features/staffing-desk/useWorkforcePlanner.ts        — Data hook
frontend/src/features/staffing-desk/usePlannerSimulation.ts       — Simulation state (moves, hires, releases)

src/modules/staffing-desk/application/workforce-planner.service.ts — Backend aggregation
```

## Tasks

- [ ] 0. **Seed data** — Add to `prisma/seeds/phase2-dataset.ts`:
  - `ProjectRolePlan` records for 4+ projects (Mercury, Jupiter, Atlas, Polaris) with roleName, headcount, skills, dates
  - `PersonCostRate` records for all phase2 people (hourlyRate between 50-150)
  - `ProjectBudget` records for active projects (capexBudget, opexBudget, fiscalYear: 2026)
  - `PlatformSetting` row: `{ key: 'budgetSimulation.enabled', value: true }`
  - Run seed: `docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"`
  → Verify: `SELECT count(*) FROM project_role_plans` returns >0; `SELECT count(*) FROM person_cost_rates` returns >0

- [ ] 1. **Backend service** — Create `src/modules/staffing-desk/application/workforce-planner.service.ts`
  - Method: `getPlan(params: { from: string; weeks: number; includeDrafts: boolean; poolId?: string; orgUnitId?: string }): Promise<WorkforcePlannerResponse>`
  - Query `Project` where `status IN ('ACTIVE', ...(includeDrafts ? ['DRAFT'] : []))` and either `endsOn IS NULL` or `endsOn >= from`
  - For each project: query `ProjectRolePlan` for requiredHc, query `ProjectAssignment` for filledHc, build weekData
  - For demand: merge `StaffingRequest` (status OPEN/IN_REVIEW) + unfilled `ProjectRolePlan` (headcount > matched assignments)
  - For supply: compute bench (<20% alloc) with daysOnBench, roll-offs (validTo within horizon)
  - For budget: read `PlatformSetting` key `budgetSimulation.enabled`, query `PersonCostRate` for all active people, compute baselineMonthlyCost
  - Register in `staffing-desk.module.ts` (same pattern as other services: `useFactory` with PrismaService)
  → Verify: `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` — zero errors

- [ ] 2. **Backend endpoint** — Add to `src/modules/staffing-desk/presentation/staffing-desk.controller.ts`:
  - `@Get('planner')` with query params: `from` (required), `weeks` (optional, default 13), `includeDrafts` (optional, default false), `poolId`, `orgUnitId`
  - Same role guard as other staffing-desk endpoints: `@RequireRoles('resource_manager', 'project_manager', 'delivery_manager', 'director', 'admin')`
  → Verify: rebuild container, `curl` returns JSON with `projects[]` and `supply.benchPeople[]`

- [ ] 3. **Frontend API + simulation hook** — Two files:
  - `frontend/src/lib/api/staffing-desk.ts` — add `WorkforcePlannerResponse` type (EXACTLY as defined above) + `fetchWorkforcePlanner(params)` function
  - `frontend/src/features/staffing-desk/usePlannerSimulation.ts` — React hook managing:
    - `state.moves: Array<{ id: string; personId: string; personName: string; fromProjectId: string; toProjectId: string; weekStart: string; allocationPercent: number; staffingRole: string }>`
    - `state.hires: Array<{ id: string; role: string; skill: string; weekStart: string; count: number }>`
    - `state.releases: Array<{ id: string; personId: string; personName: string }>`
    - `state.undoStack: Array<Action>` — each action is a move/hire/release that can be reversed
    - Methods: `addMove()`, `addHire()`, `addRelease()`, `undo()`, `reset()`, `getModifiedProjects()` (returns project data with simulations overlaid)
  → Verify: `cd frontend && node node_modules/typescript/bin/tsc --noEmit` — zero errors

- [ ] 4. **Project grid component** — Create `frontend/src/components/staffing-desk/PlannerProjectGrid.tsx`:
  - Renders `<table>` with: sticky left column (project name + filledHc/requiredHc + status badge + endsOn marker), month header row (merged cells by month), week header row
  - Each project is a `<tr>`. Each week is a `<td>` containing:
    - Assignment blocks: green `<div>` with `personName allocationPercent%`, `draggable={simulating}`
    - Demand blocks: dashed amber `<div>` with `role allocationPercent%`
    - Simulated blocks: dotted blue `<div>` (from simulation state)
    - Removed blocks: original assignment dimmed with strikethrough (when moved away by simulation)
  - Cell background: use `cellBg(supplyPercent, demandPercent)` — green if fully staffed, amber if partial, red if demand with no supply
  - DRAFT projects: show with `opacity: 0.7` and "DRAFT" badge. Only visible when `includeDrafts` is true.
  - Closing projects: show ⚠ icon in the week cell where `endsOn` falls
  - Props: `projects: PlannerProjectRow[]`, `weeks: string[]`, `simulation: SimulationState`, `onDragStart`, `onDrop`, `onRemoveSimulation`, `simulating: boolean`
  → Verify: renders at `/staffing-desk?view=planner` with seed data projects visible

- [ ] 5. **Impact panel component** — Create `frontend/src/components/staffing-desk/PlannerImpactPanel.tsx`:
  - Fixed-height bottom panel (200px) with 3 columns:
    - **Supply** (left): `totalFte` number, bench count, roll-off count. List of bench people (name, days, skills). List of roll-offs (name, project, days until).
    - **Demand** (center): `totalHcRequired` number, `draftProjectDemand` count. Skill gap list: `skill | needed | available | gap` with color-coded gap (red=deficit, green=surplus).
    - **Gap & Actions** (right): Net gap number. Hire checkboxes: for each skill with gap>0, show `☐ Hire [skill] ×[gap]`. Release list: bench people with `☐ Release [name]`. Each checkbox calls `simulation.addHire()` or `simulation.addRelease()`.
  - Budget bar (bottom, 30px): `Baseline: $X/mo → Scenario: $Y/mo (±$Z)`. Only shown when `budget.enabled === true`.
  - ALL numbers recalculate from `simulation.getModifiedProjects()` + original supply/demand data — NOT from a separate API call.
  - Props: `supply`, `demand`, `budget`, `simulation: SimulationState`
  → Verify: toggle a hire checkbox → gap number decreases by 1

- [ ] 6. **Scenario bar** — Create `frontend/src/components/staffing-desk/PlannerScenarioBar.tsx`:
  - Single toolbar row with:
    - Horizon selector: 4 buttons [3m|6m|9m|12m] setting `weeks` to 13/26/39/52
    - Week navigation: [◀ Prev] [Today] [Next ▶] shifting weekOffset by ±4
    - Draft toggle: `☐ Include Draft Projects` — sets `includeDrafts` URL param
    - Simulate toggle: `[Simulate]` button — toggles `simulating` state (enables drag in grid)
    - When simulating and moves>0: show `[Apply]` (calls POST /assignments/bulk with moves converted to CreateAssignmentRequest[]) and `[Reset]` (calls simulation.reset())
    - Undo button: `[↩ Undo]` — visible when undoStack.length > 0, tooltip shows last action description
  - Props: `horizon`, `onHorizonChange`, `weekOffset`, `onWeekOffsetChange`, `includeDrafts`, `onIncludeDraftsChange`, `simulating`, `onSimulatingChange`, `simulation: SimulationState`, `onApply: () => void`
  → Verify: click 6m → 26 weeks of columns appear; click Simulate → grid blocks become draggable

- [ ] 7. **Main orchestrator** — Create `frontend/src/components/staffing-desk/WorkforcePlanner.tsx`:
  - Fetches data via `fetchWorkforcePlanner({ from, weeks, includeDrafts, poolId, orgUnitId })`
  - Manages state: `horizon`, `weekOffset`, `includeDrafts`, `simulating`
  - Creates simulation instance via `usePlannerSimulation(data)`
  - Renders: `<PlannerScenarioBar>` on top, `<PlannerProjectGrid>` in middle (flex: 1, overflow scroll), `<PlannerImpactPanel>` fixed at bottom
  - Apply handler: converts `simulation.moves` to `BulkAssignmentRequest` format, calls `bulkCreateAssignments()`, refetches data on success
  → Verify: full flow — load page, see projects, toggle simulate, drag block, see impact update, click apply

- [ ] 8. **Wire into StaffingDeskPage** — In `frontend/src/routes/staffing-desk/StaffingDeskPage.tsx`:
  - Add `'planner'` to `StaffingDeskViewSwitcher` VIEWS array (replace 'timeline', 'board', 'bench' with single 'planner')
  - Replace the 3 conditional render blocks (`view === 'timeline'`, `view === 'board'`, `view === 'bench'`) with single block: `view === 'planner'` → `<WorkforcePlanner poolId={filters.poolId} orgUnitId={filters.orgUnitId} />`
  - Keep `view === 'table'` as-is (the supply/demand table view)
  - Update FILTER_DEFAULTS: change `view: 'table'` default (planner is opt-in)
  → Verify: `/staffing-desk?view=planner` renders the planner; `/staffing-desk` still shows table

- [ ] 9. **Budget feature toggle** — In the backend `workforce-planner.service.ts`:
  - Query: `this.prisma.platformSetting.findUnique({ where: { key: 'budgetSimulation.enabled' } })`
  - If not found or value is falsy → `budget.enabled = false`, `baselineMonthlyCost = 0`, `avgCostPerFte = 0`
  - If enabled → query `PersonCostRate` for all active people, compute costs
  - Frontend: `PlannerImpactPanel` reads `budget.enabled` and conditionally renders the budget bar
  → Verify: delete the platform setting row → budget bar disappears; re-add → budget bar appears

## Done When (testable acceptance criteria)

1. Navigate to `/staffing-desk?view=planner` → grid loads showing seed projects (Mercury, Jupiter, etc.) with assignment blocks and demand blocks
2. Click "6m" → grid expands to 26 week columns with month headers
3. Click "Include Draft Projects" → DRAFT projects appear with badge and their ProjectRolePlan demand
4. A project with `endsOn` within horizon shows ⚠ closing marker in the correct week cell
5. Click "Simulate" → assignment blocks become draggable (cursor changes to grab)
6. Drag "Alice 50%" from Mercury to Jupiter → Mercury block dims, Jupiter gets dotted blue block → Impact Panel supply numbers update
7. Click "↩ Undo" → drag is reversed, both projects return to original state
8. In Impact Panel, check "☐ Hire Java ×2" → supply total increases by 2, Java gap closes
9. In Impact Panel, check "☐ Release Dave" → supply total decreases by 1, budget savings shown
10. Click "Apply" → POST /assignments/bulk fires → success toast → grid refetches with real assignment
11. Click "Reset" → all simulated state clears, grid returns to baseline
12. `budgetSimulation.enabled = false` in platform settings → budget bar hidden
13. Both `tsc --noEmit` (backend) and `tsc --noEmit` (frontend) pass with zero errors

## Critical Implementation Details (resolving ambiguities)

### 1. Demand Deduplication: StaffingRequest vs ProjectRolePlan
A project can have BOTH a `ProjectRolePlan` saying "need 3 Java devs" AND a `StaffingRequest` for "Java dev". These are NOT additive. The rule:
- `ProjectRolePlan` defines the PLAN (strategic demand)
- `StaffingRequest` is the OPERATIONAL realization of that plan
- If a StaffingRequest exists for the same project + role combination, the RolePlan demand for that role is REPLACED (not added) by the request
- If no StaffingRequest exists for a RolePlan entry, show the RolePlan demand directly
- Backend must deduplicate: for each project, collect RolePlan entries, then overlay matching StaffingRequests (match by projectId + approximate role name)

### 2. ProjectRolePlan.requiredSkillIds → Skill Names
`requiredSkillIds` is a `String[]` of UUIDs pointing to the `Skill` table. The backend MUST resolve these to skill names via `this.prisma.skill.findMany({ where: { id: { in: ids } } })` before returning `PlannerDemandBlock.skills: string[]`.

### 3. RolePlan Week-Overlap Logic
A `ProjectRolePlan` with `plannedStartDate: June 1` and `plannedEndDate: Dec 31` means the demand exists in EVERY week cell from June 1 to Dec 31. If `plannedStartDate` is null, demand starts from project's `startsOn`. If both null, demand exists in ALL weeks of the horizon. Same overlap check as assignment: `plannedStartDate <= weekEnd && plannedEndDate >= weekStart`.

### 4. getModifiedProjects() — Exact Specification
This is the core simulation method. It does NOT call the API. It takes the original `WorkforcePlannerResponse.projects[]` and returns a modified copy:

```typescript
function getModifiedProjects(
  original: PlannerProjectRow[],
  moves: SimMove[],
  hires: SimHire[],
  releases: SimRelease[],
): {
  projects: PlannerProjectRow[];  // cloned with moves applied
  supplyDelta: number;            // +hires.sum(count) - releases.length
  demandDelta: number;            // 0 (hires/releases don't change demand)
  costDelta: number;              // +hires × avgCost - releases × their cost
} {
  // 1. Deep-clone projects array
  // 2. For each move: remove assignment from source project weekData, add to target project weekData
  // 3. Recalculate filledHc for affected projects
  // 4. Compute supply/cost deltas from hires and releases
  // 5. Return modified data + deltas
}
```
The Impact Panel reads BOTH the original API data AND the deltas to show "Baseline → Scenario" numbers.

### 5. Apply → BulkAssignmentRequest Conversion
Each move becomes a `CreateAssignmentRequest`:
```typescript
{
  actorId: principal.personId,           // from useAuth()
  personId: move.personId,               // from the drag source
  projectId: move.toProjectId,           // the drop target project
  staffingRole: originalAssignment.staffingRole,  // looked up from the source assignment data
  allocationPercent: move.allocationPercent,
  startDate: move.weekStart,             // the week the user dropped into
  endDate: undefined,                    // open-ended (user can edit later)
}
```
The `staffingRole` is obtained from the original assignment block that was dragged (it's in `PlannerAssignmentBlock`). The simulation move type must store it:
```typescript
interface SimMove {
  id: string;
  personId: string;
  personName: string;
  fromProjectId: string;
  toProjectId: string;
  weekStart: string;
  allocationPercent: number;
  staffingRole: string;      // ← MUST be included, copied from source assignment
}
```

### 6. Roll-off hasFollowOn Logic
Only count APPROVED or ACTIVE assignments as follow-ons. REQUESTED/DRAFT are uncertain and should NOT count. The query:
```typescript
where: { personId: { in: rollOffPersonIds }, status: { in: ['APPROVED', 'ACTIVE'] }, validFrom: { gte: now } }
```

### 7. Performance for Large Grids
For 50+ projects × 52 weeks (2600+ cells), the grid MUST NOT render all cells. Implementation:
- Render only the visible week columns (use `overflowX: auto` on the grid wrapper)
- The browser only paints visible columns — the `<table>` with 52 `<td>` per row is acceptable since table cells are lightweight
- Do NOT use React virtualization for columns (it breaks the table structure and sticky headers)
- For 100+ projects: paginate the project rows (show 25 at a time) or use `max-height` with `overflowY: auto` on `<tbody>`

### 8. KPI Strip on Planner View
When `view=planner`, the Staffing Desk KPI strip at the top of the page is HIDDEN. The planner has its own summary in the Impact Panel. The `useStaffingDesk()` hook should NOT be called when `view=planner` to avoid a wasted API request. The page should conditionally fetch:
```typescript
const shouldLoadTableData = filters.view === 'table';
const state = useStaffingDesk(shouldLoadTableData ? query : null);  // null = skip fetch
```
The `useStaffingDesk` hook must be updated to accept `null` and return empty state when null.

### 9. Person Picker on Demand Click
The line "Click empty demand block → person picker appears" is described but NOT tasked. It is CUT from Phase 1. In Phase 1, the only way to fill demand is:
- Drag a bench person from the Impact Panel supply list (if implemented)
- Check "Hire" checkbox for the skill
- Go to `/assignments/new` manually

Phase 2 may add an inline person picker.

### 10. Layout Mockup Inconsistency
The mockup shows `Scenario: [Baseline ▾] [+ New] [Compare]` — but Phase 1 has NO named scenarios. The coding agent MUST NOT implement scenario dropdown/new/compare. The toolbar in Phase 1 has:
```
[3m|6m|9m|12m] [◀ Today ▶] [☐ Include Drafts] [Simulate] [↩ Undo] [Apply] [Reset]
```
No scenario dropdown. No compare.

### 11. Old Component Cleanup
When wiring the planner into `StaffingDeskPage.tsx` (task 8), the old view components (`ProjectTimeline.tsx`, `StaffingDeskBoard.tsx`, `BenchDashboard.tsx`, `StaffingDeskTimeline.tsx`) are NOT deleted. They are simply unlinked from the page. Deletion is deferred — the old code may be useful for reference or future features.

### 12. Budget Toggle Key Consistency
The feature toggle key is `budgetSimulation.enabled` (NOT `ENABLE_BUDGET_SIMULATION`). All references in the plan use this key. The Notes section reference to `ENABLE_BUDGET_SIMULATION` is incorrect — corrected below.

### 13. PlannerHireAction.tsx — Removed
This file was listed in Frontend Files but never referenced in tasks. It is REMOVED from the file list. The hire interaction lives inside `PlannerImpactPanel.tsx` (task 5) as checkboxes, not as a separate component.

## Design Principles (from interaction research)

1. **Spreadsheet feel, not dashboard feel** — The grid is the editing surface. Click a cell to act on it. No modals for simple actions. 88% of spreadsheets have errors but people love them because of instant feedback + direct manipulation.
2. **Progressive disclosure** — Show essentials (project, people, weeks). Reveal advanced (budget, skills, scenarios) on demand. Linear app strategy: minimize visual weight for non-essential elements.
3. **Immediate feedback loop** — Every drag, toggle, checkbox updates the Impact Panel in <100ms. No "Save" button. No "Recalculate". Changes are live. This is what makes Figma feel magical.
4. **Reversible everything** — Command pattern: every action can be undone. Tooltip shows "Undo: Move Alice from Mercury to Jupiter". Removes fear of commitment. Users experiment more when they can undo.
5. **Direct manipulation, not indirect** — Users interact with the person block (drag it), not a form that says "Reassign person: [dropdown] to project: [dropdown]". Direct > indirect for planning tasks (NN/G research).
6. **Overview + Detail** — The grid is the overview. The Impact Panel is the detail. Both visible simultaneously. No tab-switching to see consequences.

## Notes
- Budget simulation is behind feature toggle `budgetSimulation.enabled` in PlatformSetting because cost data may not be seeded for all environments
- Scenarios are client-side only in Phase 1 (localStorage). Server-side persistence is a Phase 2 enhancement
- "Apply" action converts simulated moves into real `POST /assignments/bulk` requests — same API already used by BulkAssignmentPage
- Anti-pattern guard: if task list exceeds 9 items, we're overbuilding. Cut scope, ship, iterate.
