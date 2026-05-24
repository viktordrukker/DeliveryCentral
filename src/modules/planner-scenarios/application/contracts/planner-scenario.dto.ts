/**
 * FE-#266 — Distribution Studio planner-scenario shapes.
 *
 * Backed by the existing `PlannerScenario` Prisma model. The `state`
 * JSON column holds the proposed assignments + any baseline pointer the
 * UI wants to thread through.
 */

export interface PlannerScenarioProposedAssignmentDto {
  positionId: string;
  personId: string;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

export interface PlannerScenarioStateDto {
  proposedAssignments: PlannerScenarioProposedAssignmentDto[];
  baselineSnapshotId?: string | null;
}

export interface PlannerScenarioSummaryDto {
  assignments: number;
  hires: number;
  releases: number;
  extensions: number;
  anomalies: number;
}

export interface PlannerScenarioDto {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  state: PlannerScenarioStateDto;
  summary: PlannerScenarioSummaryDto;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlannerScenarioRequestDto {
  name: string;
  description?: string | null;
  state?: PlannerScenarioStateDto;
}

export interface UpdatePlannerScenarioRequestDto {
  name?: string;
  description?: string | null;
  state?: PlannerScenarioStateDto;
}
