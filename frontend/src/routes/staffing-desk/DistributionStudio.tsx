/**
 * SoT PR 7 — DistributionStudio DS conformance.
 *
 * The DS canvas (`DS/page-staffing-desk.jsx` — DistributionStudio export)
 * defines the Planner view as a single page with:
 *
 *   JqlBar → 240px Bench sidebar + PlannerGrid (PlannerRuler weeks +
 *   grouped lanes with heat band) → Anomaly drawer
 *
 * This file used to be a separate scenarios-only surface that sat below
 * the WorkforcePlanner shell. That triple stack (WorkforcePlanner +
 * PlannerScenarioPanel + scenarios DistributionStudio) is collapsed into
 * a single canonical Planner component per SoT PR 7. Scenario CRUD
 * remains available via the `PlannerScenariosMenu` toolbar inside
 * WorkforcePlanner — no separate panel.
 *
 * Reference: `/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md`
 * §7 PR 7 + §9.1 Distribution Studio acceptance.
 */
import { WorkforcePlanner } from '@/components/staffing-desk/WorkforcePlanner';

interface DistributionStudioProps {
  poolId?: string;
  orgUnitId?: string;
}

export function DistributionStudio({ poolId, orgUnitId }: DistributionStudioProps): JSX.Element {
  return (
    <div data-testid="distribution-studio">
      <WorkforcePlanner poolId={poolId} orgUnitId={orgUnitId} />
    </div>
  );
}
