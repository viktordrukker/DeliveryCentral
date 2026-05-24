# Amendment to the Lean Simplification Initiative — Staffing Desk + Distribution Studio as Flagship Features

**Amendment id:** `in-addition-of-now-lovely-sloth`
**Drafted:** 2026-05-23
**Amends:** [lean-simplification-initiative.md](docs/planning/claude-design/lean-simplification-initiative.md) (`now-it-is-essential-kind-candy`, drafted 2026-05-23)
**Status:** For handoff to main developer; not yet ratified in the master plan
**Scope:** Two coupled amendments — (1) Design System (Timeline component) and (2) Lean-Simplification Roadmap (Sprints 2.5 + 5)

---

## Context

The lean-simplification initiative makes one decision this amendment overrides: it retires the Staffing Desk and the Workforce Planner "Distribution Studio" 3-tier solver, replacing them with a simple "Suggest fills" panel inside `/projects/:id/positions/:positionId`.

That decision flattens what the product owner considers two **flagship features**:

- **Staffing Desk** at `/staffing-desk?view=board` — the cross-project, RM-centric supply/demand console (KPI strip, drill-downs, drawers, saved filters)
- **Workforce Planner / Distribution Studio** at `/staffing-desk?view=planner` — the scenario-driven grid with the 3-tier solver (chain → qualified → fallback), 5 strategies (BALANCED / BEST_FIT / UTILIZE_BENCH / CHEAPEST / GROWTH), heatmap layers (coverage / cost / match / risk), server-persisted `PlannerScenario` model, force-assign, extensions, anomaly table, bench sidebar

This amendment keeps both surfaces, ports them onto the new `ProjectPosition` aggregate (so the Sprint 5 contract still happens — the legacy models still die), and upgrades the shared `Timeline` DS component to be editable, swimlane-aware, and lifecycle-styled so it can serve as the visual backbone of the planner.

The other major addition the user asked for is a **JQL-style filter engine with persisted tabs (public / private)** that gives RMs and PMs a single mechanism to slice the desk and planner by-position or by-people. A prototype already exists in [jql-tokenizer.ts](frontend/src/features/staffing-desk/jql-tokenizer.ts) and [jql-parser.ts](frontend/src/features/staffing-desk/jql-parser.ts); this amendment promotes it to first-class with a typed field registry, server-side translation, and a `StaffingDeskTab` Prisma model.

### What this amendment does NOT change

- The `ProjectPosition` aggregate (S2-1 … S2-8). That work is already shipped and remains correct.
- The 3-tab consolidation of project pages (Sprint 3) — Pulse / Plan / Money still happens.
- The legacy drop in Sprint 5 — `ProjectAssignment`, `StaffingRequest`, `*ProposalSlate`, `AssignmentApproval`, `AssignmentHistory`, `PersonReleaseRequest` still die.
- Sprint 4 (operational budgeting + EVM + approvals) is untouched.
- People Hub in Sprint 5 is untouched.
- The Position detail page at `/projects/:id/positions/:positionId` still uses a simple inline "Find candidates" panel powered by `SuggestFillsService.suggestForPosition()`. PMs do not need the Distribution Studio in-context.

The amendment is additive (S2.5 mini-sprint) and refactor-on-cutover (extended S5 stories). It does not add new sprints to the calendar.

---

## Part 1 — Design System Amendment: `Timeline` component upgrade

The shared `Timeline` at [Timeline.tsx](frontend/src/components/ds/Timeline.tsx) is used in 14 places today (assignments, audit trail, lifecycle, RAG trend, demand, project Gantt, evidence, staffing desk, etc.). It is read-only, ungrouped, single-row overallocation only, with `tone`-based bar styling. To serve as the planner's editable backbone it needs four orthogonal upgrades, all opt-in and backward compatible.

### 1.1 New `TimelineProps` (additive, opt-in)

```ts
// — Editable bars (default: disabled)
editable?: boolean;
editMode?: 'move' | 'resize' | 'move+resize';
snapTo?: 'day' | 'week';                       // default 'week' when editable
minSegmentDays?: number;                       // default 7
onSegmentChange?: (
  segment: TimelineSegment,
  draft: { startDate: string; endDate: string;
           reason: 'move' | 'resize-start' | 'resize-end' },
) => void;                                     // fires during drag (live preview)
onSegmentChangeCommit?: (
  segment: TimelineSegment,
  draft: { startDate: string; endDate: string },
) => void;                                     // fires on mouseup (commit)

// — Swimlane grouping (default: ungrouped, identical to today)
groupBy?: (s: TimelineSegment) => string;      // returns groupKey
renderGroupHeader?: (group: TimelineGroup) => ReactNode;
defaultCollapsed?: string[];                   // groupKeys collapsed on first render
collapsible?: boolean;                         // default true when groupBy is set
showGroupAggregate?: boolean;                  // weekly Σ allocation in group header

// — Multi-row overallocation heat (default: disabled)
heatBand?: 'none' | 'group' | 'global';
heatBandThreshold?: number;                    // default 100 (percent)
heatBandPalette?: 'amber-red' | 'red' | 'mono';

// — Position lifecycle bar styling (default: disabled; falls back to `tone`)
lifecycleStatusOf?: (s: TimelineSegment) =>
  | 'DRAFT' | 'OPEN' | 'PROPOSED' | 'BOOKED'
  | 'ONBOARDING' | 'ASSIGNED' | 'ON_HOLD' | 'RELEASED'
  | null;
```

New supporting type:

```ts
export interface TimelineGroup {
  groupKey: string;
  label: string;
  segments: TimelineSegment[];
  collapsed: boolean;
  weeklyAllocation: number[];     // length = bucketed weeks in rangeStart..rangeEnd
  overallocatedWeeks: number;     // count of weeks where Σ > heatBandThreshold
}
```

### 1.2 Backward compatibility contract

All 14 existing callsites pass none of the new props. The implementation gates every new code path on the corresponding prop being explicitly defined (no implicit defaults that change rendering). The internal layout functions (`computeStackedLayout`, `computeBarLayout`) are unchanged; grouped layout is a new function `computeGroupedLayout` activated only when `groupBy` is supplied. Constants (`TRACK_HEIGHT`, `LABEL_HEIGHT`, `ALLOC_OPACITY`) untouched.

The existing test file [Timeline.test.tsx](frontend/src/components/ds/Timeline.test.tsx) keeps every current assertion. New test files cover only the new code paths:

- `Timeline.editable.test.tsx` — pointer events, snap math, `onSegmentChange`/`onSegmentChangeCommit` payloads
- `Timeline.grouped.test.tsx` — group header render, collapse toggle, aggregate row math
- `Timeline.heat.test.tsx` — heat band cell color thresholds, `heatBand='none'` hides band
- `Timeline.lifecycle.test.tsx` — every `PositionFillStatus` resolves to the expected token class

### 1.3 Single source of truth — scenario state, not Timeline internals

The `Timeline` never holds persistent segment positions across renders. During drag, it emits `onSegmentChange` with draft bounds; the parent (the planner) immediately updates scenario state in [usePlannerSimulation.ts](frontend/src/features/staffing-desk/usePlannerSimulation.ts); the parent re-derives `segments` from scenario state; the Timeline re-renders. There is no internal draft state beyond the single drag-in-progress segment's transient coordinates, cleared on `onSegmentChangeCommit`.

The mapping from drag gesture to scenario action:

| Gesture | Scenario action |
|---|---|
| Drag bar onto another project lane (swimlane mode) | `addMove({ fromProjectId, toProjectId, weekStart })` |
| Resize right edge later (extend) | `addExtension({ assignmentId, currentValidTo, newValidTo })` |
| Resize left edge (DRAFT/OPEN only) | `addStartShift({ positionId, currentValidFrom, newValidFrom })` — **new mutator** |
| Drag bar shorter (right edge earlier) | `addEarlyRelease({ positionId, currentValidTo, newValidTo })` — **new mutator** |
| Drag a phantom-hire segment | `updateHireIntent(id, { startDate, endDate })` |

### 1.4 New CSS tokens

Add to [design-tokens.ts](frontend/src/styles/design-tokens.ts) and reference in [global.css](frontend/src/styles/global.css):

**Lifecycle bar tokens** (light / dark / border / pattern):

| Status | Token | Light fill | Dark fill | Border | Pattern |
|---|---|---|---|---|---|
| DRAFT | `--lifecycle-bar-draft` | transparent | transparent | `1px dashed --color-status-neutral` | — |
| OPEN | `--lifecycle-bar-open` | `#fef3c7` | `#78350f` | `1px solid --color-status-warning` | — |
| PROPOSED | `--lifecycle-bar-proposed` | `--color-status-warning` | `--color-status-warning` | `1px solid` | — |
| BOOKED | `--lifecycle-bar-booked` | `#dbeafe` | `#1e3a8a` | `1px solid --color-status-info` | — |
| ONBOARDING | `--lifecycle-bar-onboarding` | `--color-status-info` | `--color-status-info` | `1px solid` | subtle diagonal stripes |
| ASSIGNED | `--lifecycle-bar-assigned` | `--color-status-active` | `--color-status-active` | `1px solid` | — |
| ON_HOLD | `--lifecycle-bar-on-hold` | `#e5e7eb` | `#374151` | `1px solid --color-status-neutral` | heavy diagonal stripes |
| RELEASED | `--lifecycle-bar-released` | `#f3f4f6` | `#1f2937` | `1px solid --color-status-neutral` | 50% opacity, no pattern |

Stripe patterns rendered via inline SVG fills (not CSS background-image) to survive the existing clip / portal behavior.

**Heat band tokens**:

```css
--timeline-heat-100: #fef3c7;   /* 100–119 % */
--timeline-heat-120: #fde68a;   /* 120–149 % */
--timeline-heat-150: #fb923c;   /* 150–199 % */
--timeline-heat-200: #ef4444;   /* ≥ 200 % */
```

Token check (`npm run tokens:check`) baseline is updated to permit these new raw colors in `design-tokens.ts` only.

### 1.5 Storybook additions

Append to [Timeline.stories.tsx](frontend/src/components/ds/Timeline.stories.tsx):

- `EditableBars` — drag/resize, panel logs `onSegmentChange`
- `Grouped` — three swimlanes, one collapsed by default
- `GroupedOverallocated` — same as `Grouped`, `heatBand='group'`, one person at 150 %
- `LifecycleStates` — one bar per `PositionFillStatus` for token verification
- `WorkforcePlannerExample` — kitchen-sink composition matching the planner's actual config

---

## Part 2 — Roadmap Amendment: keep Staffing Desk + Distribution Studio

### 2.1 Decisions overridden

| Section in master plan | Original decision | This amendment |
|---|---|---|
| §3.1 "Pivot / carve-out" | Drop WorkforcePlanner Distribution Studio 3-tier solver; replace with a simple "Suggest fills" panel inside Position detail. | **Keep the Distribution Studio.** Port the 3-tier solver, 5 strategies, scenarios, heatmap, force-assign, extensions, and anomaly table to operate over `ProjectPosition` instead of `StaffingRequest` + `ProjectAssignment`. Position detail keeps a simpler "Find candidates" inline panel, but it is powered by the *same* `SuggestFillsService` (degenerate single-position call). |
| §3.1 "Slate / candidate ranking model as separate concept" | Collapses into Position + candidates. | Unchanged. `ProjectPositionCandidate` is the only candidate model. The planner reads candidates from `ProjectPositionCandidate` instead of `StaffingRequestProposalCandidate`. |
| Sprint 5 contract phase | Drop `ProjectAssignment`, `StaffingRequest`, `*ProposalSlate`, `AssignmentApproval`, `AssignmentHistory`, `PersonReleaseRequest`. Migrate 21 callsites of `ProjectAssignment` to `ProjectPosition.activeFill`. | Unchanged in intent — same models still die. Added in this amendment: the planner / desk / bench reads are also migrated in the same window (extra ~1 week of S5 effort, no new sprint). |

### 2.2 IA — routes preserved

| Route | View | Purpose | Status |
|---|---|---|---|
| `/staffing-desk?view=board` | Cross-project table (KPI strip, supply / demand drill-downs, drawers) | RM-centric console | **Kept** (was previously `?view=table`; `?view=table` is a back-compat alias) |
| `/staffing-desk?view=planner` | Distribution Studio grid | Scenario-driven planning | **Kept** |
| `/staffing-desk?view=bench` | Bench-only convenience view | Quick bench scan from the same surface | **New** (subset of `board` pre-filtered) |
| `/projects/:projectId/positions` | Per-project Position list | PM drill-down | Unchanged (S2-8 skeleton; matures in S3) |
| `/projects/:projectId/positions/:positionId` | Position detail with simple suggest-fills panel | PM single-position work | Unchanged (S2-8 / S3) |
| `/people/bench` | Dedicated bench page | Muscle memory + deep linking | Unchanged (S2-8 skeleton) |

No new top-level routes. The "by-position vs by-people" duality is **not** a route or a view-switcher — it is a **tab.rowMode** property on the persisted tab (§2.3 below). Switching tab swaps row semantics inside the active view (board, planner, or bench).

### 2.3 JQL-style filter engine + persisted tabs

A **tab** is a typed view definition that combines a filter expression, a row mode, a column set, and a sort. Tabs are persisted server-side and can be `public` (org-wide) or `private` (owner-only).

#### Tab shape

```ts
interface StaffingDeskTab {
  id: string;
  name: string;
  ownerPersonId: string;
  scope: 'public' | 'private';
  rowMode: 'positions' | 'people';          // by-position vs by-people duality
  filterExpr: FilterGroup;                   // typed parser output (JSONB)
  expressionText: string;                    // canonical user-typed text for display + URL
  columnSet: string[];                       // ordered column keys
  sort: { field: string; dir: 'asc' | 'desc' } | null;
  isBuiltIn: boolean;
  builtInKey?: string;                       // stable key for platform-shipped tabs
  displayOrder: number;
  savedAt: string;
  updatedAt: string;
}
```

#### Parser — keep hand-rolled recursive descent

The prototype at [jql-parser.ts](frontend/src/features/staffing-desk/jql-parser.ts) (167 LOC) already handles AND/OR precedence, parentheses, `IN` / `NOT IN`, `IS [NOT] EMPTY`, quoted strings, and the standard operator set. Extending to the full field set grows it to ~300 LOC — still small. A PEG grammar generator (`peggy`) was considered and rejected: it adds a build step, a ~30 KB runtime dependency, and isn't justified at this field/operator scale.

Three additions on top of the existing parser:

1. **Field-aware validation pass** — after parsing produces `FilterGroup`, run `validateAgainstRegistry(group, rowMode)` against the field registry. Surface errors as `{ position, message }` for inline display in [JqlQueryBar.tsx](frontend/src/components/staffing-desk/JqlQueryBar.tsx).
2. **Server-side translator** — new file [jql-to-prisma.ts](src/modules/staffing-desk/application/jql-to-prisma.ts) compiles a `FilterGroup` to a Prisma `where` object. Derived fields (`person.daysOnBench`, `person.allocationPercent`, `scenario.modified`) compile to subqueries / post-filters.
3. **Autocomplete** — new file `frontend/src/features/staffing-desk/jql-autocomplete.ts` provides `getSuggestions(input, caretPos)` returning `{ kind: 'field'|'operator'|'value', items: string[] }`.

#### Field registry

New file [jql-field-registry.ts](frontend/src/features/staffing-desk/jql-field-registry.ts) defines the typed field set:

| Field key | Type | Valid in row mode | Server path |
|---|---|---|---|
| `project.status` | enum | both | `position.project.status` |
| `position.fillStatus` | enum | both | `position.fillStatus` |
| `position.role` | string | both | `position.role` |
| `position.skills` | string[] | both | `position.skills` |
| `position.startDate` | date | both | `position.startDate` |
| `position.endDate` | date | both | `position.endDate` |
| `position.priority` | enum | both | `position.priority` |
| `person.gradeId` | string | both | `person.gradeId` |
| `person.skills` | string[] | both | `person.skills` |
| `person.allocationPercent` | number (derived) | both | `__derived.allocationPercent` |
| `person.daysOnBench` | number (derived) | `people` | `__derived.daysOnBench` |
| `person.orgUnitId` | string | both | `person.orgUnitId` |
| `person.poolId` | string | both | `person.poolId` |
| `scenario.modified` | bool (derived) | both | `__scenario.touched` |

`$me.orgUnit` and similar tokens are resolved server-side in `jql-to-prisma.ts`.

#### Storage — new Prisma model

Append to [schema.prisma](prisma/schema.prisma):

```prisma
model StaffingDeskTab {
  id              String                @id @default(uuid()) @db.Uuid
  name            String
  ownerPersonId   String                @db.Uuid
  scope           StaffingDeskTabScope  @default(PRIVATE)
  rowMode         StaffingDeskTabRowMode
  filterExpr      Json                  // serialized FilterGroup
  expressionText  String                // canonical text for display + URL
  columnSet       String[]              @default([])
  sortField       String?
  sortDir         String?
  isBuiltIn       Boolean               @default(false)
  builtInKey      String?               @unique
  displayOrder    Int                   @default(0)
  createdAt       DateTime              @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime              @updatedAt @db.Timestamptz(3)

  owner           Person                @relation("StaffingDeskTabOwner",
                                          fields: [ownerPersonId],
                                          references: [id],
                                          onDelete: Cascade)

  @@index([ownerPersonId, scope])
  @@index([scope, displayOrder])
  @@map("staffing_desk_tabs")
}

enum StaffingDeskTabScope   { PUBLIC PRIVATE }
enum StaffingDeskTabRowMode { POSITIONS PEOPLE }
```

Access rules enforced in the new controller:

- Only the owner can edit / delete a `PRIVATE` tab.
- An Admin (or the original owner) can edit / delete a `PUBLIC` tab.
- `isBuiltIn=true` tabs cannot be edited or deleted via the API; they can only be cloned to a user-owned tab.

#### Built-in tabs (seeded)

Seeded by [staffing-desk-tabs.seed.ts](prisma/seeds/staffing-desk-tabs.seed.ts):

| `builtInKey` | Name | Row mode | Expression |
|---|---|---|---|
| `open-positions-this-quarter` | Open positions this quarter | POSITIONS | `position.fillStatus IN ("OPEN","PROPOSED") AND position.startDate >= "<Q-start>" AND position.startDate <= "<Q-end>"` |
| `my-teams-bench` | My team's bench | PEOPLE | `person.daysOnBench > 0 AND person.orgUnitId = "$me.orgUnit"` |
| `overallocated-people` | Overallocated people | PEOPLE | `person.allocationPercent > 100` |
| `positions-without-candidates` | Positions without candidates | POSITIONS | `position.fillStatus = "OPEN" AND scenario.modified IS EMPTY` |
| `draft-scenarios` | Draft scenarios | POSITIONS | `scenario.modified = true AND position.fillStatus = "DRAFT"` |

#### URL state

- Active tab → `?tab=<id>`
- Inline-edited built-in tab → `?tab=<id>&jql=<urlEncoded>` (live expression overrides saved)
- Ad-hoc filter without a tab → `?jql=<urlEncoded>` only
- Long expressions fall back to `#jql.b64=<base64>` to avoid URL length limits; the page reads both forms.

### 2.4 Backend — `SuggestFillsService` with two methods, one solver

The current [workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts) (1604 LOC) contains the 3-tier solver inline. Extract it.

**New module structure:**

```
src/modules/project-positions/application/
  suggest-fills.service.ts          ← orchestrator with 2 public methods
  suggest-fills-solver.ts            ← pure functions: 3-tier solver core
  suggest-fills-strategies.ts        ← pure functions: 5 strategy plugins
```

**Service surface:**

```ts
@Injectable()
export class SuggestFillsService {
  // Single-Position simple path — used by Position detail page.
  public async suggestForPosition(
    positionId: string,
    opts: { limit?: number },
  ): Promise<CandidateMatchDto[]>;

  // Bulk path — used by Distribution Studio.
  // Honors 3-tier (chain / qualified / fallback) and 5 strategies.
  // Returns SimSuggestion[]-compatible payloads.
  public async suggestForBatch(
    input: BatchSuggestInput,
  ): Promise<BatchSuggestResult>;
}
```

`suggestForPosition` is a degenerate single-position call into `suggestForBatch`, ensuring one source of truth for matching logic. The solver core has no I/O — it operates on `Position[] + Person[] + horizon` and returns ranked candidates.

After extraction, `workforce-planner.service.ts` becomes a thin orchestrator that calls `SuggestFillsService.suggestForBatch` and folds the result into the planner-grid response shape (heatmap layers, anomaly table, scenario overlays).

### 2.5 Domain additions to `ProjectPosition`

#### `ProjectPositionFillChangeType.AMENDED`

The existing enum at [schema.prisma](prisma/schema.prisma) (around line 422) is missing `AMENDED`. Add via forward-only idempotent migration:

```sql
ALTER TYPE "ProjectPositionFillChangeType" ADD VALUE IF NOT EXISTS 'AMENDED';
```

This unblocks "extension from planner" without inventing a synthetic state transition.

#### Planner-only ephemeral statuses stay UI-only

`PHANTOM_HIRE`, `SIMULATED`, `SUGGESTED`, `EXTENDED` exist only in [usePlannerSimulation.ts](frontend/src/features/staffing-desk/usePlannerSimulation.ts) as UI labels and never reach the database. On Apply they translate as:

| UI label | DB write on Apply |
|---|---|
| `PHANTOM_HIRE` | New `ProjectPosition` with `fillStatus='DRAFT'`, `activePersonId=NULL` |
| `SIMULATED` (move) | `ProjectPositionFillHistory` row via `TransitionProjectPositionFillService` transition `BOOKED → ASSIGNED` |
| `SUGGESTED` | New `ProjectPositionCandidate` row; if accepted, transition Position to `PROPOSED` |
| `EXTENDED` | `ProjectPosition.activeValidTo` update + `ProjectPositionFillHistory(changeType='AMENDED')` |

No new fill-status enum values. The 8 existing states cover every Apply path.

### 2.6 Scenario migration — `PlannerScenario` re-targets to Positions

The model at [schema.prisma](prisma/schema.prisma) (around line 3664) has a `state Json` blob referencing legacy IDs (`ProjectAssignment.id`, `StaffingRequest.id`). When those models drop in S5, those IDs disappear. Forward-only translation:

1. **Schema change** — add two columns:
   ```prisma
   model PlannerScenario {
     // ... existing fields ...
     schemaVersion   Int     @default(1)   // 1 = legacy refs, 2 = position refs
     migrationNotes  String?
   }
   ```
2. **Lazy on-read translator** — new service [planner-scenario-migrator.service.ts](src/modules/staffing-desk/application/planner-scenario-migrator.service.ts). Builds a mapping from `ProjectPosition.legacyAssignmentId` and `legacyStaffingRequestId` (both already populated by the S2-5 backfill — see [schema.prisma](prisma/schema.prisma) around line 3955). Unresolvable IDs preserved as `{ legacy: true, originalId, reason }` and surfaced in the UI as a non-fatal banner ("X of Y references still translate cleanly"). Translator writes back `schemaVersion=2` on read.
3. **Eager catch-all script** — [migrate-planner-scenarios-to-positions.ts](scripts/migrate-planner-scenarios-to-positions.ts) runs as part of the S5 cutover, walks all `schemaVersion=1` rows, translates, persists. Re-runnable.

### 2.7 New outbox events from scenario Apply

Three new event files in [src/modules/project-positions/domain/events/](src/modules/project-positions/domain/events/), following the existing `ProjectPositionFillChangedEvent` pattern:

| Event | Topic | Payload |
|---|---|---|
| `ProjectPositionDraftSimulatedEvent` | `position.draft.simulated` | `{ positionId, scenarioId, projectId, role, requiredAllocationPercent, startDate, endDate }` |
| `ProjectPositionFillProposedFromPlannerEvent` | `position.fill.proposed.from-planner` | `{ positionId, candidatePersonId, matchScore, scenarioId, scenarioName, actorPersonId }` |
| `ProjectPositionFillExtendedFromPlannerEvent` | `position.fill.extended.from-planner` | `{ positionId, previousValidTo, newValidTo, scenarioId, actorPersonId }` |

Registered in [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts). Apply-flow transactional boundary unchanged (event emission is non-blocking).

### 2.8 Bench derivation cutover

Four callsites in [bench-management.service.ts](src/modules/staffing-desk/application/bench-management.service.ts) (lines 115, 131, 270, 282) query `prisma.projectAssignment.findMany`. Replace with `prisma.projectPosition.findMany` filtered on `fillStatus IN ('ASSIGNED','ONBOARDING','BOOKED')` plus the `activeValidFrom`/`activeValidTo` window. Bench = `Person` with no such row covering "today". Roll-off projections (today: assignment.endDate within N days) become `projectPosition.activeValidTo` within N days. Frontend DTOs unchanged.

---

## Part 3 — Sprint placement

Two work blocks, **no new sprints added** to the calendar.

### S2.5 — "Timeline + JQL foundations" (1 week, inserted after S2-8)

| ID | Goal | Effort | Files touched |
|---|---|---|---|
| **S2.5-1** | Timeline editable bars (move / resize / snap) | M | [Timeline.tsx](frontend/src/components/ds/Timeline.tsx), `Timeline.editable.test.tsx`, [Timeline.stories.tsx](frontend/src/components/ds/Timeline.stories.tsx) |
| **S2.5-2** | Timeline swimlane grouping + collapse | M | `Timeline.tsx`, `Timeline.grouped.test.tsx`, `Timeline.stories.tsx` |
| **S2.5-3** | Timeline multi-row overallocation heat | S | `Timeline.tsx`, [design-tokens.ts](frontend/src/styles/design-tokens.ts), `Timeline.heat.test.tsx` |
| **S2.5-4** | Timeline lifecycle bar styling | S | `Timeline.tsx`, `design-tokens.ts`, [global.css](frontend/src/styles/global.css), `Timeline.lifecycle.test.tsx` |
| **S2.5-5** | JQL field registry + autocomplete + validation pass | M | [jql-tokenizer.ts](frontend/src/features/staffing-desk/jql-tokenizer.ts), [jql-parser.ts](frontend/src/features/staffing-desk/jql-parser.ts), new `jql-field-registry.ts`, new `jql-autocomplete.ts`, [JqlQueryBar.tsx](frontend/src/components/staffing-desk/JqlQueryBar.tsx) |

**Acceptance:** all 14 existing Timeline callsites render unchanged; new stories present in Storybook; JQL parser validates every clause against the field registry and surfaces position-anchored errors in the query bar.

### S5 — extended scope (~ +1 week within Sprint 5)

The existing S5 already plans to drop legacy models and migrate 21 callsites. This amendment adds 17 stories specifically about preserving the planner + desk + bench through the cutover.

| ID | Goal | Effort | Files touched |
|---|---|---|---|
| **S5-A1** | Add `ProjectPositionFillChangeType.AMENDED` enum value | S | `prisma/schema.prisma`, new migration |
| **S5-A2** | Add `PlannerScenario.schemaVersion` + `migrationNotes` columns | S | `prisma/schema.prisma`, new migration |
| **S5-A3** | `StaffingDeskTab` Prisma model + enums | S | `prisma/schema.prisma`, new migration |
| **S5-B1** | Extract `SuggestFillsService` with 2 methods + pure solver + pure strategies | L | new `src/modules/project-positions/application/suggest-fills.service.ts`, `suggest-fills-solver.ts`, `suggest-fills-strategies.ts`; refactor [workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts) |
| **S5-B2** | Re-target `WorkforcePlannerService` reads to `ProjectPosition` | L | `workforce-planner.service.ts` |
| **S5-B3** | Bench cutover — `bench-management.service.ts` 4 callsites | M | [bench-management.service.ts](src/modules/staffing-desk/application/bench-management.service.ts) |
| **S5-B4** | Delete / refactor [derive-staffing-request-status.service.ts](src/modules/staffing-requests/application/derive-staffing-request-status.service.ts) + 6 sibling assignment service files | M | `src/modules/staffing-requests/**`, `src/modules/assignments/**` |
| **S5-B5** | Scenario Apply flow writes to `ProjectPosition` (not `ProjectAssignment`) | L | [staffing-desk.controller.ts](src/modules/staffing-desk/presentation/staffing-desk.controller.ts), `workforce-planner.service.ts`, [PlannerApplyDrawer.tsx](frontend/src/components/staffing-desk/PlannerApplyDrawer.tsx) |
| **S5-B6** | Emit 3 new outbox events from Apply | M | new event files under `src/modules/project-positions/domain/events/`, registration in [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts) |
| **S5-B7** | `PlannerScenarioMigratorService` (lazy on-read) + eager script | M | new `planner-scenario-migrator.service.ts`, new [migrate-planner-scenarios-to-positions.ts](scripts/migrate-planner-scenarios-to-positions.ts) |
| **S5-C1** | `StaffingDeskTab` module — controller, service, DTOs, RBAC | M | new `src/modules/staffing-desk-tabs/**` |
| **S5-C2** | Built-in tab seed (5 tabs) | S | new [staffing-desk-tabs.seed.ts](prisma/seeds/staffing-desk-tabs.seed.ts), [seed.ts](prisma/seed.ts) |
| **S5-C3** | `jql-to-prisma.ts` server-side translator (incl. derived fields + `$me.*` tokens) | M | new [jql-to-prisma.ts](src/modules/staffing-desk/application/jql-to-prisma.ts) |
| **S5-D1** | Tab strip UI + tab CRUD modals (rename, clone, scope toggle, delete) | M | new `frontend/src/components/staffing-desk/StaffingDeskTabStrip.tsx`, [StaffingDeskPage.tsx](frontend/src/routes/staffing-desk/StaffingDeskPage.tsx) |
| **S5-D2** | Add `view=bench` to the view switcher (back-compat redirect `view=table → view=board`) | S | [StaffingDeskViewSwitcher.tsx](frontend/src/components/staffing-desk/StaffingDeskViewSwitcher.tsx), `StaffingDeskPage.tsx` |
| **S5-D3** | Planner wires new Timeline props (`editable`, `groupBy`, `heatBand`, `lifecycleStatusOf`); collapse ad-hoc timeline renderers | L | [WorkforcePlanner.tsx](frontend/src/components/staffing-desk/WorkforcePlanner.tsx), [DemandTimeline.tsx](frontend/src/components/staffing-desk/DemandTimeline.tsx), [WorkloadTimeline.tsx](frontend/src/components/staffing-desk/WorkloadTimeline.tsx), [StaffingDeskTimeline.tsx](frontend/src/components/staffing-desk/StaffingDeskTimeline.tsx) |
| **S5-D4** | Scenario state additions: `addStartShift`, `addEarlyRelease`, `updateHireIntent` | S | [usePlannerSimulation.ts](frontend/src/features/staffing-desk/usePlannerSimulation.ts) |

**Acceptance gate for S5:** the verification script in §4.2 must pass — zero `projectAssignment.` or `staffingRequest.` Prisma accesses remaining in production code, all 14 existing Timeline callsites still render unchanged, the Playwright flagship spec is green, and the legacy-planner fallback flag (§4.3) is in place.

### Why this placement (and not a new Sprint 6)

- Timeline upgrades (S2.5-1 … S2.5-4) are pure DS work, dependency-free, and unblock the planner port. Putting them in S2.5 means the planner port in S5 can immediately consume them.
- The planner port (S5-B1 … S5-B7) must happen in the same window as the legacy drop. Doing it earlier means maintaining two solvers; doing it later means the planner is broken during the cutover.
- A separate "Sprint 6 — Staffing Desk Promotion" would push flagship-feature recovery past the initiative's tail, leaving the product without a coherent staffing story for a full release cycle. Rejected.

---

## Part 4 — Verification

### 4.1 End-to-end Playwright spec

New file `playwright/tests/staffing-desk-flagship.spec.ts`:

```
1.  Navigate to /staffing-desk
2.  Assert default tab loads (built-in "Open positions this quarter")
3.  Switch to tab "Overallocated people" via the tab strip
4.  Assert every visible row has allocationPercent > 100
5.  Switch view to ?view=planner
6.  Assert the planner grid renders the same filtered set
7.  Open a person's swimlane (groupBy=person, collapsible)
8.  Drag the right edge of an ASSIGNED bar +2 weeks
9.  Assert onSegmentChangeCommit fired; toast appears;
    scenario "dirty" badge shows in header
10. Click "Save scenario as…"; name it; submit
11. Assert PlannerScenario row written; UI reflects saved name + clean state
12. Click "Apply"; confirm in PlannerApplyDrawer
13. Assert: ProjectPosition.activeValidTo updated;
            ProjectPositionFillHistory row with changeType='AMENDED';
            position.fill.extended.from-planner outbox row exists
14. Navigate to /projects/:id; lifecycle tab shows the new timeline range
15. Audit trail shows the apply with actor + reason
```

### 4.2 Legacy-cutover safety — CI gate

New read-only CI script [verify-projectassignment-callsites.ts](scripts/verify-projectassignment-callsites.ts):

1. Grep `src/` for `projectAssignment\.` (Prisma access) and `ProjectAssignment` (TS type). Expected post-S5: zero in production code.
2. Same for `staffingRequest\.` and `StaffingRequest`.
3. Run `pnpm prisma format && pnpm prisma validate`; assert `ProjectAssignment` and `StaffingRequest` models are absent or tombstoned `@@ignore`.
4. Run Playwright flagship spec headless.

CI blocks the S5 PR until all four pass.

### 4.3 Emergency rollback feature flag

New flag, owned by [src/modules/admin-feature-flags/](src/modules/admin-feature-flags/):

```
key:     staffingDesk.legacyPlanner.enabled
default: false
scope:   global
purpose: During S5 cutover window, when true the planner READ path falls back
         to ProjectAssignment + StaffingRequest. Writes still go to
         ProjectPosition (dual-write window), so toggling back to false
         is safe and idempotent. Removed in the sprint after S5 ships green.
```

[workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts) keeps both code paths for one sprint after the cutover. The flag is read-side only — write paths always go to `ProjectPosition` — so audit integrity is preserved regardless of flag state.

---

## Part 5 — Risks

### 5.1 JQL parser complexity

The hand-rolled parser grows from ~167 LOC to ~300 LOC with field-aware validation. **Mitigation:** keep the AST minimal (`FilterClause | FilterGroup`), push all type / row-mode validity into a separate pass against the field registry, and refuse to add functions / macros to the grammar — use `$me.*` substitution tokens that the server resolves. If users later want richer expressions, the extension point is the field registry, not the parser.

### 5.2 Editable Timeline ↔ scenario state inconsistencies

Risk: Timeline draws bar positions from internal state; scenario state holds the truth; race conditions become possible. **Mitigation: scenario state is the single source of truth.** The Timeline receives `segments` as a prop, emits `onSegmentChange` / `onSegmentChangeCommit`, and never holds persistent segment positions across renders. The single drag-in-progress segment's transient coordinates are cleared on commit. The `Timeline.editable.test.tsx` includes an explicit test that fires a drag, asserts `onSegmentChange` fired, and asserts the rendered position has NOT moved until the parent re-renders with new `segments`.

### 5.3 Saved scenarios with dangling legacy IDs

Existing `PlannerScenario.state` references `ProjectAssignment.id` / `StaffingRequest.id`. **Mitigation: lazy on-read translation + eager catch-all script.** On any read of a `schemaVersion=1` scenario, the migrator resolves IDs via `ProjectPosition.legacyAssignmentId` / `legacyStaffingRequestId` (populated by S2-5 backfill). Unresolvable references are preserved verbatim with sentinels and surfaced as a non-fatal "X of Y references translate cleanly" banner. The eager script runs during S5 cutover and is re-runnable.

### 5.4 RBAC on public tabs

Risk: a malicious user creates a `PUBLIC` tab whose filter expression leaks information they shouldn't see (e.g., `person.daysOnBench > 0 AND person.orgUnitId = "<other-org>"`). **Mitigation:** the JQL-to-Prisma translator always applies the caller's existing RBAC scope (`@AllowSelfScope`, org / pool ownership) **after** the JQL where-clause. Filter expressions reduce the rowset; they cannot expand it past the caller's authorized scope. Add a server-side test asserting this for each persona in `staffing-desk-tabs.controller.spec.ts`.

### 5.5 Token check (`npm run tokens:check`) regression

New raw hex colors are introduced in `design-tokens.ts` (lifecycle bar fills + heat band tokens). **Mitigation:** add the new colors to [design-token-baseline.json](scripts/design-token-baseline.json) under `design-tokens.ts` only. Page-level callers must reference the `--lifecycle-bar-*` / `--timeline-heat-*` tokens, never the raw hex.

---

## Part 6 — Critical Files

### Design system

- [Timeline.tsx](frontend/src/components/ds/Timeline.tsx)
- [index.ts](frontend/src/components/ds/index.ts)
- [design-tokens.ts](frontend/src/styles/design-tokens.ts)
- [global.css](frontend/src/styles/global.css)
- [design-token-baseline.json](scripts/design-token-baseline.json)

### Backend — port + tabs

- [schema.prisma](prisma/schema.prisma)
- `src/modules/project-positions/application/suggest-fills.service.ts` (new)
- `src/modules/project-positions/application/suggest-fills-solver.ts` (new)
- `src/modules/project-positions/application/suggest-fills-strategies.ts` (new)
- [workforce-planner.service.ts](src/modules/staffing-desk/application/workforce-planner.service.ts)
- [bench-management.service.ts](src/modules/staffing-desk/application/bench-management.service.ts)
- `src/modules/staffing-desk/application/jql-to-prisma.ts` (new)
- `src/modules/staffing-desk/application/planner-scenario-migrator.service.ts` (new)
- `src/modules/staffing-desk-tabs/` (new module)
- `src/modules/project-positions/domain/events/` (3 new event files)
- [outbox-event-handler-registry.ts](src/modules/audit-observability/application/outbox-event-handler-registry.ts)
- `prisma/seeds/staffing-desk-tabs.seed.ts` (new)
- `scripts/migrate-planner-scenarios-to-positions.ts` (new)
- `scripts/verify-projectassignment-callsites.ts` (new, CI gate)

### Frontend — desk, planner, tabs

- [StaffingDeskPage.tsx](frontend/src/routes/staffing-desk/StaffingDeskPage.tsx)
- [WorkforcePlanner.tsx](frontend/src/components/staffing-desk/WorkforcePlanner.tsx)
- `frontend/src/components/staffing-desk/StaffingDeskTabStrip.tsx` (new)
- [StaffingDeskViewSwitcher.tsx](frontend/src/components/staffing-desk/StaffingDeskViewSwitcher.tsx)
- [JqlQueryBar.tsx](frontend/src/components/staffing-desk/JqlQueryBar.tsx)
- [PlannerApplyDrawer.tsx](frontend/src/components/staffing-desk/PlannerApplyDrawer.tsx)
- [usePlannerSimulation.ts](frontend/src/features/staffing-desk/usePlannerSimulation.ts)
- [jql-tokenizer.ts](frontend/src/features/staffing-desk/jql-tokenizer.ts)
- [jql-parser.ts](frontend/src/features/staffing-desk/jql-parser.ts)
- `frontend/src/features/staffing-desk/jql-field-registry.ts` (new)
- `frontend/src/features/staffing-desk/jql-autocomplete.ts` (new)
- [staffing-desk.ts](frontend/src/lib/api/staffing-desk.ts)
- `frontend/src/lib/api/staffing-desk-tabs.ts` (new)

---

## Part 7 — Claude Design Brief (paste-in)

A handoff bundle for Claude Design covering the two surfaces (Staffing Desk + Distribution Studio) and the underlying `Timeline` component upgrade. Paste the brief verbatim, upload the files listed below, and Claude Design returns mockups + a token diff + a CSS diff that the implementer can apply directly.

### 7.1 Where to run it

Claude Code at `claude.ai/code` in a fresh conversation, model with image attachments enabled.

### 7.2 Timeline component primer (read first)

The brief in §7.3 builds on the existing `Timeline` DS component. Anyone receiving this amendment — Claude Design, a contractor, a new engineer — should read this section first so the prop additions in Part 1 make sense.

#### What it is

The `Timeline` at [Timeline.tsx](frontend/src/components/ds/Timeline.tsx) is DeliveryCentral's shared date-axis visualization. It renders an array of `TimelineSegment` (each = `id` + `startDate` + `endDate` + `label` + optional `status` + optional `allocationPercent`) as horizontal bars on a calendar-grid axis. It is used in 14 places today: assignments, workload, audit history, RAG trend, project lifecycle, demand windows, project Gantt-style views, evidence rails, staffing-desk row drill-downs.

#### Two layout variants

- **`variant='bar'`** — each segment occupies its own visual row in the track. Used for "list of things on a timeline" cases (audit trail, lifecycle events). Bar height is fixed per `size` (`xs` / `sm` / `md` / `lg`).
- **`variant='stacked'`** — segments overlapping in time stack vertically; bar height encodes `allocationPercent`. Used for workload / capacity views where the question is "how loaded is this person right now". This is the variant the planner relies on.

#### What ships out of the box

| Feature | What you get for free |
|---|---|
| Auto date range | If `rangeStart` / `rangeEnd` are omitted, derives ± 3–12 months around today (size-aware) |
| Month grid + labels | Vertical month guides + bottom labels; auto-decimated at smaller sizes |
| Today line | Vertical accent line at today's date (`showToday`, default on) |
| Custom markers | Per-date `markers[]` rendered as colored vertical lines or flag pins |
| Overallocation detection | Stacked variant computes per-day cumulative allocation; renders a horizontal line at 100 % and shaded bands across weeks where total > 100 % |
| Smart hover card | Portal-rendered card that auto-flips to avoid viewport edges, recomputes on scroll / resize, shows span / allocation / weekly total / conflict list. Custom body via `renderHoverCard` |
| Keyboard nav | Arrow Left / Right walks between segments; focus opens hover; Enter / click commits |
| ARIA + roles | `role="group"` on track, `aria-label` per bar, `role="tooltip"` on hover card |
| Status-tone coloring | Pulls from `StatusBadge`'s tone system (`active` / `warning` / `danger` / `info` / `pending` / `neutral`); one place to change every color across the app |
| Empty state | Built-in "No assignments in range" or custom node via `emptyState` prop |

#### Why we keep using it (the benefits)

1. **One visual language for all date-ranged data.** A user who learns to read one Timeline reads them all — audit history, workload, project Gantt, demand windows share shapes, colors, and hover semantics.
2. **Cheap to wire.** Most callsites pass `segments` (and maybe `rangeStart` / `rangeEnd`) and get a usable timeline. No layout math, no hover positioning, no a11y to redo.
3. **Status-tone-driven.** Colors come from the global `StatusBadge` tone tokens. Changing the warning color once updates every Timeline in the app.
4. **Overallocation built in.** The stacked variant detects and highlights overbooking automatically — this is what makes it specifically useful for staffing as opposed to a generic Gantt library.
5. **Stateless contract.** No internal mutation: `segments` in, `onSegmentClick` out. Trivial to compose into any parent. Part 1 of this amendment extends this contract — adding optional `onSegmentChange` / `onSegmentChangeCommit` for drag-to-edit — while keeping the stateless invariant intact (scenario state in the planner owns the truth).

#### Structure at a glance

- Public API: `Timeline` component + `TimelineProps` / `TimelineSegment` / `TimelineMarker` / `TimelineHoverContext` — exported from [index.ts](frontend/src/components/ds/index.ts)
- All layout math in one `useMemo` block (~ 85 lines): computes day offsets, span normalization, stacked-block packing, conflict runs, month marks. Re-keyed only on `segments` / range / size / variant.
- Sub-components colocated in the same file: `DefaultHoverCard`, `TimelineLegend`, `TimelineHoverCard` (portal-rendered)
- Styles in [global.css](frontend/src/styles/global.css) under `.ds-timeline*` selectors
- Tests at `Timeline.test.tsx`; stories at `Timeline.stories.tsx`
- ~ 680 LOC total — single-file component, zero external runtime deps beyond React + `StatusBadge`

#### What Part 1 of this amendment changes

All additions are **opt-in via new props**; the 14 existing callsites behave exactly as today because none of them pass the new props. The four upgrades:

- **Editable bars** — drag-to-move + resize-handles when `editable` is set; emits `onSegmentChange` (live, during drag) and `onSegmentChangeCommit` (on mouseup). Snaps to week. Scenario state in the planner owns the truth; the Timeline stays stateless.
- **Swimlane grouping** — `groupBy` callback groups segments into collapsible swimlanes with an aggregate sparkline header. Without `groupBy`, the render path is unchanged.
- **Multi-row overallocation heat band** — `heatBand='group' | 'global'` renders a heat strip above each group / the track showing weekly Σ-allocation across all segments in that group, with four threshold tiers (100–119 % / 120–149 % / 150–199 % / ≥ 200 %).
- **Position lifecycle bar styling** — `lifecycleStatusOf` returns one of 8 `PositionFillStatus` values; the bar's fill / border / stripe pattern encode the lifecycle state (DRAFT dashed outline, OPEN yellow, ASSIGNED green, RELEASED 50 %-opacity grey, etc.). Falls back to existing `tone` styling when not provided.

### 7.3 Brief (paste-in verbatim)

> You are designing the visual refresh for DeliveryCentral's flagship **Staffing Desk** and **Workforce Planner ("Distribution Studio")** surfaces, plus the underlying **`Timeline` DS component** that powers both. This is an amendment to the existing lean-simplification initiative — the Staffing Desk and Distribution Studio are being kept as killer features instead of retired. They should look and feel like the place where staffing decisions get made.
>
> **Read §7.2 of the amendment document first** — it is a primer on the current `Timeline` component (what it is, the two variants, what ships out of the box, why we keep it, structural overview, and what this amendment extends). Every "Timeline" reference below assumes that context.
>
> **Surfaces to design (priority order):**
>
> 1. **Staffing Desk landing** at `/staffing-desk?view=board` — page chrome with: title bar + global filters; a **tab strip** (left-aligned, scrollable; public / private scope chips; gear icon to edit; `+` to clone) immediately below the title; a **JQL query bar** (live-editable text expression + chip-style field-suggestion popovers + inline syntax errors with caret-position anchoring); the view switcher (Board / Planner / Bench); the KPI strip; the action table.
>
> 2. **Distribution Studio grid** at `/staffing-desk?view=planner` — same chrome as #1, then the planner grid: project / person swimlanes (collapsible group headers with weekly Σ-allocation aggregate sparkline); week columns; lifecycle-styled bars; multi-row overallocation heat band painted ABOVE each group; scenario "dirty" indicator in the header; bench sidebar on the left; collapsible anomaly drawer at the bottom. Show one swimlane in **mid-drag-resize** state.
>
> 3. **Timeline component** — DS-level documentation page with every `PositionFillStatus` rendered as a bar (DRAFT dashed, OPEN yellow, PROPOSED yellow-fill, BOOKED blue, ONBOARDING info-stripe, ASSIGNED green, ON_HOLD heavy-grey-stripe, RELEASED 50%-opacity grey); drag handles on left / right edges; resize cursor states; snap-to-week visual cues; overallocation heat band with all four threshold levels (100–119 %, 120–149 %, 150–199 %, ≥ 200 %); group header with weekly aggregate sparkline.
>
> 4. **Position detail "Find candidates" panel** at `/projects/:projectId/positions/:positionId` — single-position inline candidate list (top 5), match-score visualization, "Propose" inline action. This must contrast clearly against the planner's bulk-suggest flow — same colors, different density and information hierarchy.
>
> 5. **Tab CRUD modals** — "New tab", "Rename", "Clone", "Scope toggle" (private ↔ public), "Delete confirm". Each respects the existing modal token system. Show the JQL expression preview inside New / Clone.
>
> 6. **Empty / loading / error states** for desk (no results, no permissions, RBAC denial) and planner (no positions in horizon, scenario load error, solver timeout, dual-write window banner).
>
> **For each surface, produce:**
> - (a) high-fidelity static mockup at 1440 × 900 in BOTH light and dark modes
> - (b) interaction state matrix (hover, focus, drag-in-progress, snap-preview, invalid-move, loading skeleton, error, empty)
> - (c) a token / CSS-class spec for any new colors, spacings, or radii
>
> **Non-negotiable constraints:**
> - Reuse existing DS atoms — `DataTable`, `SectionCard`, `EmptyState`, `ErrorState`, `LoadingState`, `StatusBadge`, `TipBalloon`, `ConfirmDialog`, `Sparkline`. Do not invent new primitives unless you can name what they replace and why.
> - Respect existing color tokens (`--color-status-*`, `--color-surface*`, `--color-text*`, `--color-border*`, `--color-chart-1..8`, `--color-accent`). New tokens are limited to lifecycle bar fills (`--lifecycle-bar-*`) and heat band (`--timeline-heat-100/120/150/200`); justify any additional tokens.
> - Page chrome conforms to the **List-Detail Workflow** grammar (`phase18-page-grammars.md`); planner functions as an inline Detail Surface variant.
> - Satisfy UX Operating Laws (`.claude/rules/ux-laws.md`) — especially Law 1 (≤ 3 clicks), Law 2 (no dead-end screens), Law 4 (action ≤ 200 px from data), Law 5 (filter persistence via URL — tab + JQL serialize), Law 9 (every KPI is a doorway), Law 10 (workspace continuity).
> - **Killer-feature stance:** premium, opinionated, fast. The visual hierarchy must convey "this is where staffing decisions get made," not "this is one more table among many." Use accent color sparingly but deliberately on the planner's primary action paths.
> - All actions reachable in ≤ 3 clicks.
>
> **Files to upload alongside this brief:**
> - This amendment document (`lean-simplification-staffing-desk-amendment.md`)
> - `docs/planning/claude-design/lean-simplification-initiative.md` (master plan)
> - `docs/planning/claude-design/ux-operating-system-v2.md`
> - `docs/planning/claude-design/page-grammars.md`
> - `docs/planning/claude-design/design-tokens.md`
> - `docs/planning/phase18-refactor-standards.md` (verification template)
> - `frontend/src/components/ds/Timeline.tsx` (current implementation)
> - `frontend/src/components/ds/Timeline.stories.tsx` (current stories)
> - `frontend/src/components/staffing-desk/WorkforcePlanner.tsx` (current planner — for reference, not as the target)
> - `frontend/src/routes/dashboard/DashboardPage.tsx` (gold-standard page chrome + KPI strip)
> - `frontend/src/styles/design-tokens.ts` (token source of truth)
> - `frontend/src/styles/global.css` (class source of truth)
>
> **Expected handoff contents (deliverables):**
> 1. PNG mockups (1440 × 900 light + dark) for each of the six surfaces
> 2. Interaction state matrix — one PNG per state per component
> 3. Token additions — a single JSON snippet patch for `design-tokens.ts` (lifecycle bars + heat band, plus any justified additions)
> 4. CSS additions — a single CSS snippet for `global.css` (no edits to existing classes; pure additions)
> 5. Storybook-ready Timeline props matrix — table of every new prop with default, type, and example value
> 6. A 1-page "design decisions" doc explaining: lifecycle-bar styling choices (color + pattern), heat band threshold choices, JQL query bar interaction model, tab strip ergonomics, and any deviations from the existing DS atoms (with rationale)

### 7.4 Constraints summary (one-glance)

- Existing DS atoms re-used unless explicitly replaced (with rationale)
- New tokens limited to `--lifecycle-bar-*` and `--timeline-heat-*` (others require justification)
- Conforms to **List-Detail Workflow** grammar (planner is inline Detail Surface)
- Satisfies UX Laws 1, 2, 4, 5, 9, 10
- Killer-feature feel: premium, opinionated, fast — not generic enterprise

---

## Part 8 — Sign-off criteria

Before this amendment is merged into the master plan:

- [ ] PM persona — confirms Staffing Desk + Distribution Studio belong in the killer-feature set and Position-detail's inline panel is sufficient for PMs day-to-day
- [ ] Architect persona — confirms the dual-method `SuggestFillsService` keeps one source of truth for matching and the scenario migrator handles legacy-ID drift safely
- [ ] UX persona — confirms the Timeline's four upgrades preserve backward compatibility for the existing 14 callsites and that JQL tabs satisfy UX Laws 5 (filter persistence) and 9 (every KPI is a doorway)
- [ ] Dev Lead persona — confirms S2.5 fits between S2-8 and S3 without slipping the master plan's calendar, and that the +1 week S5 extension is acceptable
- [ ] DevOps persona — confirms the legacy-planner rollback flag is in place and the CI gate (`scripts/verify-projectassignment-callsites.ts`) is wired

---

## End of amendment

Hand this file to the main developer alongside [lean-simplification-initiative.md](docs/planning/claude-design/lean-simplification-initiative.md). When ratified, fold the S2.5 block and the S5-A/B/C/D stories into `docs/planning/MASTER_TRACKER.md` and update §3.1 of the lean-simplification doc to reflect the kept Distribution Studio.