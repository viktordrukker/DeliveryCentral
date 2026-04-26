# Project Radiator v1 — PMBOK 16-Axis Health Scoring

## Overview

The Project Radiator is a PMBOK-grounded, 16-axis radar chart that measures project
health across four quadrants (Scope, Schedule, Budget, People). Each quadrant has
four sub-dimensions; each sub-dimension is scored 0–4. Quadrant totals roll up to a
0–100 overall score.

Replaces the legacy 4-dimension `QuadrantRadiator` + separate Report tab with one
merged **Radiator** tab on the project detail page.

## Taxonomy

Sub-dimension keys are stable identifiers used in the DB, API, and threshold config.

### Scope (25 pts) — PMBOK 6 §5 Scope Mgmt + PMBOK 7 Delivery

| Key | Label | Measure | Source |
|-----|-------|---------|--------|
| `requirementsStability` | Req Stability | % of baselined requirements unchanged in last 4 weeks | `ProjectChangeRequest` + `Project.baselineRequirements` |
| `scopeCreep` | Scope Creep | ratio of approved out-of-baseline CRs to baselined items | `ProjectChangeRequest.outOfBaseline` |
| `deliverableAcceptance` | Deliverable Acc. | % of deliverables accepted on first review | Manual — `ProjectRagSnapshot.dimensionDetails.scope.deliverableAcceptance.rating` (0–5 → 0–1 ratio). WorkEvidence integration deferred to Phase 2. |
| `changeRequestBurden` | CR Burden | severity-weighted open CRs ÷ project size points | `ProjectChangeRequest.status='PROPOSED'`, severity weights LOW=1, MED=2, HIGH=3, CRIT=4, size = `Project.baselineRequirements` |

### Schedule (25 pts) — PMBOK 6 §6 Schedule Mgmt

| Key | Label | Measure | Source |
|-----|-------|---------|--------|
| `milestoneAdherence` | Milestone | % of milestones hit on/before due date in last 56d | `ProjectMilestone.status='HIT' AND actualDate <= plannedDate` |
| `timelineDeviation` | Timeline Dev. | |drift| ÷ duration; drift = `forecastEndsOn − baselineEndsOn` or `now − baselineEndsOn` | `Project.baselineEndsOn`, `forecastEndsOn` |
| `criticalPathHealth` | Critical Path | days of float remaining | `Project.criticalPathFloatDays` |
| `velocityTrend` | Velocity | trailing 4w actual hours ÷ planned hours | `TimesheetEntry` + `ProjectAssignment.allocationPercent` |

### Budget (25 pts) — PMBOK 6 §7 Cost Mgmt + PMBOK 7 Measurement (EVM)

| Key | Label | Measure | Source |
|-----|-------|---------|--------|
| `costPerformanceIndex` | CPI | EV ÷ AC | `ProjectBudget.earnedValue / actualCost` |
| `spendRate` | Spend Rate | delta from ideal (\|actual ÷ planned − 1\|) | `ProjectBudget.actualCost / plannedToDate` |
| `forecastAccuracy` | Forecast Acc. | \|EAC − BAC\| ÷ BAC (inverted) | `ProjectBudget.eac`, BAC = `capexBudget + opexBudget` |
| `capexCompliance` | CAPEX Compl. | % spend correctly capitalised | `ProjectBudget.capexCorrectPct` |

### People (25 pts) — PMBOK 7 Team + Stakeholders

| Key | Label | Measure | Source |
|-----|-------|---------|--------|
| `staffingFillRate` | Staffing Fill | % role-plan seats filled by active assignments | `ProjectRolePlanService.getStaffingSummary().fillRate` |
| `teamMood` | Team Mood | rolling 4w avg pulse (1–5) | `PulseEntry.mood` for active assignees |
| `overAllocationRate` | Over-Alloc. | % team currently >100% allocated (inverted) | `ProjectAssignment.allocationPercent` sum per person across all active projects |
| `keyPersonRisk` | Key-Person Risk | % role-critical skills covered by ≥2 people (higher = better) | `ProjectRolePlan.requiredSkillIds[]` × `PersonSkill` |

## Scoring Scale

| Score | Band | CSS Token |
|-------|------|-----------|
| 0 | Critical | `--color-status-critical` (`#7B0A0A`) |
| 1 | Red | `--color-status-danger` |
| 2 | Amber | `--color-status-warning` |
| 3 | Amber | `--color-status-warning` |
| 4 | Green | `--color-status-active` |

**Aggregation rules:**

- Quadrant score = `round(avg(sub-scores) × 6.25)` → 0–25.
- Overall score = sum of 4 quadrant scores → 0–100.
- Overall band: 0–25 Critical, 26–50 Red, 51–75 Amber, 76–100 Green.
- Null sub-scores are skipped when averaging; when all four are null the quadrant itself is null.

**Null handling:** If a signal is missing, the sub-score is `null` and the axis
renders as a dashed ring in the UI with "No data" in the drill-down.

## Scoring Formulas (Defaults)

All formulas live in `src/modules/project-registry/application/radiator-scorers.ts`
as pure functions. Each function takes an optional `ThresholdSet` argument; when
omitted, the hard-coded default below is used.

Example:

```ts
costPerformanceIndex(cpi: number, t = DEFAULT_CPI): 0|1|2|3|4 {
  if (cpi >= 0.95) return 4;
  if (cpi >= 0.90) return 3;
  if (cpi >= 0.80) return 2;
  if (cpi >= 0.70) return 1;
  return 0;
}
```

Full default-threshold table (see `DEFAULT_THRESHOLDS` constant):

| Key | t4 | t3 | t2 | t1 | Direction |
|-----|----|----|----|----|-----------|
| requirementsStability | 0.95 | 0.85 | 0.70 | 0.50 | HIGHER_IS_BETTER |
| scopeCreep | 0.05 | 0.10 | 0.20 | 0.35 | LOWER_IS_BETTER |
| deliverableAcceptance | 0.95 | 0.85 | 0.70 | 0.50 | HIGHER_IS_BETTER |
| changeRequestBurden | 0.02 | 0.05 | 0.10 | 0.20 | LOWER_IS_BETTER |
| milestoneAdherence | 0.95 | 0.85 | 0.70 | 0.50 | HIGHER_IS_BETTER |
| timelineDeviation | 0.02 | 0.05 | 0.10 | 0.20 | LOWER_IS_BETTER |
| criticalPathHealth | 10 | 5 | 2 | 0 | HIGHER_IS_BETTER |
| velocityTrend | 0.95 | 0.85 | 0.70 | 0.50 | HIGHER_IS_BETTER |
| costPerformanceIndex | 0.95 | 0.90 | 0.80 | 0.70 | HIGHER_IS_BETTER |
| spendRate | 0.05 | 0.10 | 0.20 | 0.35 | LOWER_IS_BETTER (delta from 1.0) |
| forecastAccuracy | 0.03 | 0.07 | 0.12 | 0.25 | LOWER_IS_BETTER (error %) |
| capexCompliance | 0.99 | 0.95 | 0.85 | 0.70 | HIGHER_IS_BETTER |
| staffingFillRate | 0.98 | 0.90 | 0.75 | 0.50 | HIGHER_IS_BETTER |
| teamMood | 4.0 | 3.5 | 3.0 | 2.5 | HIGHER_IS_BETTER |
| overAllocationRate | 0.00 | 0.05 | 0.15 | 0.30 | LOWER_IS_BETTER |
| keyPersonRisk | 0.95 | 0.80 | 0.60 | 0.40 | HIGHER_IS_BETTER |

Admins can override any threshold at `/admin/radiator-thresholds`. Changes
invalidate the scoring cache and apply to all projects on next compute.

## PM Override Workflow

Any sub-score can be manually overridden by a PM, Delivery Manager, Director, or
Admin. Each override:

1. Requires a reason ≥ 10 characters.
2. Is stored as an immutable audit row (`project_radiator_overrides`).
3. Writes a `radiator.override` entry to `AuditLog`.
4. Triggers an in-app notification to the project's PM if the override represents
   a drop from ≥ 2 auto-score to ≤ 1 override-score.
5. Invalidates the per-project 60-second cache and recomputes immediately.

## Snapshot Write Path (No Cron)

Weekly snapshots are written when:

- A PM submits the weekly narrative form (`POST /projects/:id/rag-snapshots`).
  Backend computes the 16 scores at submission time and persists them alongside
  the narrative.
- An override is applied: the current-week snapshot is upserted if missing and
  override scores are recalculated onto it.

This replaces the originally-scoped nightly cron per user decision. The 60-second
per-project cache plus on-demand compute keep the `/radiator` endpoint
response-time under budget.

## Architecture

### Backend

```
src/modules/project-registry/application/
├── radiator-scorers.ts                     # 16 pure functions, tests in *.spec.ts
├── radiator-signal-collector.service.ts    # Fetches raw signals (parallel)
├── radiator-threshold.service.ts           # Threshold CRUD + 5-min cache
├── radiator-scoring.service.ts             # Orchestrator (60s cache per project)
├── radiator-override.service.ts            # Override + audit + notify
├── radiator-notification.service.ts        # In-app drop notifications
├── portfolio-radiator.service.ts           # Portfolio rollup (60s cache)
├── project-milestone.service.ts            # Milestones CRUD + hit-rate signal
└── project-change-request.service.ts       # CR CRUD + scope signals
```

### Frontend

```
frontend/src/
├── components/projects/
│   ├── ProjectRadiator.tsx                 # 16-axis recharts radar
│   ├── RadiatorDrillDown.tsx               # Right-rail quadrant detail
│   ├── OverrideModal.tsx                   # Manual override form
│   ├── RadiatorTimeTravelSlider.tsx        # Week scrubber
│   └── MilestoneGanttSimple.tsx            # V1 Gantt (see gantt-design.md for V2)
├── routes/projects/tabs/
│   ├── RadiatorTab.tsx                     # Merged status+report
│   ├── MilestonesTab.tsx                   # Simple Gantt + CRUD
│   └── ChangeRequestsTab.tsx               # CR register + approve/reject
├── routes/dashboard/PortfolioRadiatorPage.tsx
├── routes/admin/RadiatorThresholdsPage.tsx
├── lib/api/project-radiator.ts
├── lib/api/project-milestones.ts
├── lib/api/project-change-requests.ts
├── lib/api/portfolio-radiator.ts
└── lib/api/radiator-thresholds.ts
```

### Endpoints

```
GET    /api/projects/:id/radiator
POST   /api/projects/:id/radiator/override
GET    /api/projects/:id/radiator/history?weeks=N
GET    /api/projects/:id/radiator/snapshot/:weekStarting

GET    /api/portfolio/radiator                      # delivery_manager, director, admin

GET    /api/admin/radiator-thresholds               # admin
PUT    /api/admin/radiator-thresholds/:key          # admin

GET    /api/projects/:id/milestones
POST   /api/projects/:id/milestones
PATCH  /api/projects/:id/milestones/:milestoneId
DELETE /api/projects/:id/milestones/:milestoneId

GET    /api/projects/:id/change-requests?status=...
POST   /api/projects/:id/change-requests
PATCH  /api/projects/:id/change-requests/:crId
POST   /api/projects/:id/change-requests/:crId/approve
POST   /api/projects/:id/change-requests/:crId/reject
```

## Deprecations

- `QuadrantRadiator.tsx` — legacy 4-dim radar. Still in tree but unused; will be
  removed in v2.
- `RagRadiator.tsx` — older 4-dim variant. Still in tree but unused; will be
  removed in v2.
- `/rag-computed`, `/rag-enhanced`, `/rag-snapshots` endpoints — retained for
  backwards compatibility with the weekly status form. Will be merged into
  `/radiator` in v2.
