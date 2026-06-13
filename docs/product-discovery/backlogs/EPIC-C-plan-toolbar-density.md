# EPIC C — Planning Toolbar + Workspace Density (decomposition)

**Status:** design spec delivered; code redesign in progress (design-led, multi-tick). Priority P1, effort L. **Branch:** `feat/epic-c-plan-toolbar`. **Analysis + Claude Design prompt:** `../E7-planning-gantt-density.md`.

## Why this is design-led (not a code-first epic)
The two problems are UX/layout, not missing capability:
1. **Scattered planning controls.** The project Plan surface spreads create-actions across 3 zones: the ProjectDetailPage **header** (Add milestone / Add change request / Manage positions / Create Position) + inside `MilestonesTab` (+New Milestone, the Timeline/Gantt `SectionCard`) + `RisksIssuesTab` (+New Risk). No single, predictable control home (violates UX Law 4 action-data adjacency).
2. **Workspace density.** Staffing Desk / People Directory / Bench / Cases waste large amounts of vertical/horizontal space ("non-utilized space").

Per the user's stated preference, design-led work is routed to **Claude Design** — the ready-to-paste prompt is in `E7-planning-gantt-density.md` (Claude Design prompt section). This loop delivers the **spec + structural decomposition**; pixel-level layout is implemented from the design output.

## JTBD
> When I plan/run a project, I want one obvious place to add milestones, risks, change requests and positions — and to see the schedule (Gantt) up front — instead of hunting across the header and three stacked sections.

## User stories
1. As a PM, I see **one PlanToolbar** with all create-actions (Add milestone, Add risk, Add change request, Manage/Create position) at the top of the Plan tab.
2. As a PM, the **Gantt/Timeline** is the headline of the Plan tab when there's a schedule to show.
3. As any role, the Staffing Desk / People / Bench / Cases surfaces use their space efficiently (denser tables, fewer empty regions, list-detail where it helps).

## Atomic items (code)
| # | Item | Layer | Status |
|---|------|-------|--------|
| C1 | `PlanToolbar` — single toolbar above the Plan sections; relocate the header-driven create signals (milestoneAddSignal / changeRequestAddSignal) + Manage/Create position + New Risk into it. ProjectDetailPage header keeps only project-level actions. | FE | ⏳ design-gated |
| C2 | Promote Gantt/Timeline to the headline section of the Plan tab when milestones exist (keep collapsed-when-empty). | FE | ⏳ |
| C3 | Density pass — Staffing Desk (reclaim board whitespace). | FE | ⏳ design-gated |
| C4 | Density pass — People Directory / Bench / Cases (list-detail + denser tables). | FE | ⏳ design-gated |

## Design / UX
The canonical design spec (zones, toolbar grammar, density targets, list-detail patterns) is the **Claude Design prompt** in `E7-planning-gantt-density.md`. C1/C2 are structural and can land in-loop; C3/C4 want the Claude Design layout output first to avoid churn.

## Acceptance criteria
- One PlanToolbar hosts all Plan create-actions; no duplicate/ambiguous create buttons across header + sections.
- Gantt is the Plan headline when a schedule exists.
- Density passes verified against the Claude Design output; `tsc` + tests + ds-conformance clean.

## Inventory validation
Plan-tab create actions already exist in `action-inventory.json` (Add milestone / New Risk / Manage positions / Create Position) — this epic **relocates/consolidates** them (no new actions), so the ledger entry is a UX-grouping change, not a coverage gap.

## Note
EPIC C is the natural hand-off point to Claude Design for the layout. The loop continues structural C1/C2 and then proceeds to **EPIC D** (the integration keystone — fully code-implementable) so momentum isn't blocked on a design round-trip.
