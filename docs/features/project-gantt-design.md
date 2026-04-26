# Project Gantt View — V2 Design Spec

## Context

V1 of the Milestones tab (shipped with Project Radiator v1) renders a **simple
horizontal-bar Gantt** of milestones: one row per milestone, a planned-date diamond,
an optional actual-date circle, status-coloured. It covers the core PM need of
"show me my dates on a timeline" but lacks the interactivity of a modern planning
tool.

This document specifies **V2 of the Gantt view**, modelled on the reference
experience at <https://www.onlinegantt.com/#/gantt>. It is the basis for a future
PR and is out of scope for Radiator v1.

## Goals

1. Usable by PMs for **actual planning** — not just status display.
2. Handle **500+ tasks/milestones** per project without layout collapse.
3. **Dependencies** (finish-to-start, etc.) rendered as connector lines.
4. **Critical path** highlighted visually (bolded outline, distinctive colour).
5. **Drag-to-resize** bars to reschedule.
6. **Drag-to-move** bars between time slots.
7. **Baseline vs actual** bars shown in parallel (ghost bar behind actual).
8. **Roll-up bars** per phase: a phase row shows the enclosing span of its child
   tasks, auto-computed.
9. **Zoom** levels: week / month / quarter / year. Persistent in URL.
10. **Milestone diamonds** distinct from tasks (pointed shape at a single date).

## Non-goals (defer to V3)

- Resource histograms under the Gantt
- S-curve cost forecasting overlay
- What-if scheduling simulations
- Multi-project Gantt (portfolio swimlanes)

## UX Reference

`https://www.onlinegantt.com/#/gantt` provides the baseline interactions to match:

- **Left pane:** hierarchical task list with `>` expand/collapse, drag to reorder,
  inline edit of name / assignee / duration.
- **Right pane:** timeline with week/month ruler, scrollable horizontally, bars
  aligned to rows.
- **Bar styles:**
  - Task: solid coloured rectangle, rounded corners.
  - Milestone: black diamond pointing up/down.
  - Summary/phase: thicker black bar with tail arrows at each end.
  - Critical path: thick bold stroke in red-accent colour.
  - Progress fill: darker inner rectangle filling from left, width = `% complete`.
- **Dependencies:** thin grey S-curve lines from predecessor end to successor
  start. Arrowhead at successor end. Hover highlights both endpoints.
- **Drag affordances:**
  - Grab left edge to move start date.
  - Grab right edge to resize duration.
  - Grab centre to move whole bar.
  - Drop a bar on another's edge to create a dependency.

## Data Model Additions

New fields on `ProjectMilestone` (or split into a new `ProjectTask` entity):

```prisma
model ProjectTask {
  id                 String      @id @default(uuid()) @db.Uuid
  projectId          String      @db.Uuid
  parentTaskId       String?     @db.Uuid       // null = top-level
  name               String
  description        String?
  startDate          DateTime    @db.Date
  endDate            DateTime    @db.Date
  baselineStartDate  DateTime?   @db.Date
  baselineEndDate    DateTime?   @db.Date
  percentComplete    Decimal     @db.Decimal(5,2) @default(0)  // 0..100
  isMilestone        Boolean     @default(false)
  isCriticalPath     Boolean     @default(false)
  assigneePersonId   String?     @db.Uuid
  orderIndex         Int                                        // for manual drag-reorder
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  project            Project     @relation(fields: [projectId], references: [id])
  parent             ProjectTask? @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  children           ProjectTask[] @relation("TaskHierarchy")
  predecessors       ProjectTaskDependency[] @relation("DependencySuccessor")
  successors         ProjectTaskDependency[] @relation("DependencyPredecessor")

  @@index([projectId, startDate])
  @@index([projectId, parentTaskId])
}

enum DependencyType {
  FS   // finish-to-start (most common)
  SS   // start-to-start
  FF   // finish-to-finish
  SF   // start-to-finish
}

model ProjectTaskDependency {
  id                String         @id @default(uuid()) @db.Uuid
  predecessorTaskId String         @db.Uuid
  successorTaskId   String         @db.Uuid
  type              DependencyType @default(FS)
  lagDays           Int            @default(0)
  predecessor       ProjectTask    @relation("DependencyPredecessor", fields: [predecessorTaskId], references: [id])
  successor         ProjectTask    @relation("DependencySuccessor", fields: [successorTaskId], references: [id])
  @@unique([predecessorTaskId, successorTaskId])
}
```

## Critical-Path Computation

Run a **forward + backward pass** (CPM algorithm) on task save:

1. **Forward pass:** for each task, compute `earlyStart` = max(`earlyFinish` of
   predecessors) and `earlyFinish` = `earlyStart + duration`.
2. **Backward pass** from project end: compute `lateFinish` = min(`lateStart` of
   successors) and `lateStart` = `lateFinish − duration`.
3. **Float** = `lateStart − earlyStart`.
4. Task is on critical path when `float = 0`.

Store the computed `isCriticalPath` flag on the task row. Recompute on any
dependency or duration change. Use it to drive the existing
`criticalPathHealth` scorer on the Radiator (instead of the
`Project.criticalPathFloatDays` manual field).

## Component Architecture

```
frontend/src/components/gantt/
├── GanttChart.tsx                  # Orchestrator — virtualized 500-row list
├── GanttTaskList.tsx               # Left pane: hierarchical rows with edit
├── GanttTimeline.tsx               # Right pane: time axis + bars + dependencies
├── GanttBar.tsx                    # One task bar (draggable, resizable)
├── GanttMilestone.tsx              # Diamond shape for milestones
├── GanttDependencyLine.tsx         # SVG connector with arrowhead
├── GanttTimeRuler.tsx              # Week/month/quarter headers
├── GanttZoomControl.tsx            # Zoom level selector (w/m/q/y)
└── useGanttLayout.ts               # Layout math: date → x, row → y
```

### Recommended Library

**Do not build from scratch.** Use `gantt-schedule-timeline-calendar`
(GSTC, AGPL/commercial) if licensing allows, or roll a thin custom implementation
on top of `dnd-kit` (already a project dependency) + SVG. Avoid `react-gantt`
packages — most are unmaintained.

If building custom, budget **~120 engineer hours** for V2. The payoff is
significant once V3 (resource histograms) and V4 (portfolio) layer on top.

## Interactions

### Drag-resize end date
1. User grabs the right edge of a bar.
2. Ghost bar follows mouse, snapping to day/week boundaries based on zoom.
3. On drop: `PATCH /projects/:id/tasks/:taskId` with new `endDate`.
4. Backend re-runs CPM. Response includes updated critical-path flags.
5. Any task whose `isCriticalPath` changed re-renders with new outline.

### Create dependency
1. User drags from right edge of predecessor to left edge of successor.
2. Guide line renders during drag.
3. On drop: `POST /projects/:id/task-dependencies` with `{ type: 'FS', ... }`.
4. If this creates a cycle, the backend rejects with 400 + descriptive error.

### Keyboard navigation
- `Tab` iterates task rows (up/down through list).
- `Enter` opens inline edit of selected row's name.
- `Arrow Left/Right` moves bar ± 1 day.
- `Shift+Arrow` resizes bar.
- `Delete` removes dependency when a dependency line is focused.

## Accessibility

- Each task bar has `role="button"`, `aria-label="Task: {name} from {start} to {end}, {pct}% complete"`.
- Dependency lines are `role="img"` with `aria-label="Dependency: {predecessor} → {successor}"`.
- Drag actions are announced via `aria-live` region ("Task moved to March 15").
- Screen-reader-only text list of tasks + dates provided as an alternative to the
  visual Gantt.

## Performance

- **Virtualize** the task list with `react-window` — only render visible rows.
- **Canvas fallback:** if >500 tasks, render bars to canvas instead of SVG
  (dramatically faster, loses per-bar DOM events — acceptable for that scale).
- **Debounced** auto-save on drag operations (200ms settle time).
- **Memoize** CPM computation per task-graph-hash.

## Migration Path

- V1 (current): `ProjectMilestone` table, simple SVG bars, read-only planning.
- V2: Introduce `ProjectTask` + `ProjectTaskDependency` tables. Provide a
  one-time "Convert milestones to tasks" migration tool in the UI. Keep
  `ProjectMilestone` for backwards-compat but deprecate it on the Radiator
  scorer — `milestoneAdherence` reads from `ProjectTask` where `isMilestone=true`.
- V3: Add resource histograms, S-curve overlays.
- V4: Portfolio-level Gantt (swimlane per project).
