/**
 * Sprint 3 / S3-1 + FE-#259 — Project Pulse aggregator snapshot.
 *
 * Distinct from the legacy `PulseSummaryDto` (mood surveys + activity stream).
 * Single-screen "what is the state of this project right now" payload that
 * powers the redesigned Project Pulse tab.
 *
 * Backward-compat: original S3-1 fields (overallScore / overallBand /
 * quadrants[] / positions{} aggregate / nextMilestone singleton /
 * topRisks[] / nextDecision singleton) are preserved AND the FE-requested
 * FE-#259 shape (rag / risks / decisions / milestones aggregate /
 * recentActivity / staffingSummary / externalLinks / positionsList) is
 * served in parallel from the same endpoint. No consumers of the original
 * shape exist outside tests; both shapes co-render so the FE migration is
 * a drop-in without a flag flip.
 */

import type { RadiatorBand } from './radiator.dto';

// ─── Original S3-1 shape (kept stable) ──────────────────────────────────────

export type ProjectPulseDecisionKind =
  | 'budget_approval'
  | 'activation_approval'
  | 'change_request'
  | 'open_position';

export interface ProjectPulseQuadrantDto {
  key: 'scope' | 'schedule' | 'budget' | 'people';
  score: number | null;
  band: RadiatorBand | null;
}

export interface ProjectPulsePositionsDto {
  open: number;
  proposed: number;
  active: number;
  totalNonReleased: number;
}

export interface ProjectPulseBudgetDto {
  fiscalYear: number | null;
  bac: number | null;
  actualCost: number | null;
  earnedValue: number | null;
  plannedToDate: number | null;
  eac: number | null;
  variancePct: number | null;
}

export interface ProjectPulseNextMilestoneDto {
  id: string;
  name: string;
  plannedDate: string;
  status: string;
  progressPct: number;
}

export interface ProjectPulseRiskDto {
  id: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  score: number;
  status: string;
  ownerPersonId: string | null;
}

export interface ProjectPulseNextDecisionDto {
  kind: ProjectPulseDecisionKind;
  id: string;
  summary: string;
  pendingSince: string;
}

// ─── FE-#259 additive shape ─────────────────────────────────────────────────

export interface ProjectPulseRagDto {
  score: number;
  band: RadiatorBand;
  quadrants: ProjectPulseQuadrantDto[];
}

/** One row per non-terminal ProjectPosition on the project. */
export interface ProjectPulsePositionSummaryDto {
  id: string;
  role: string;
  fillStatus: string;
  activePersonId: string | null;
  allocationPercent: number | null;
  startDate: string;
  endDate: string;
}

export interface ProjectPulseMilestonesAggDto {
  total: number;
  completed: number;
  ratio: number;
  nextGateDate: string | null;
}

export interface ProjectPulseDecisionDto extends ProjectPulseNextDecisionDto {
  /** Severity hint for the UI's decision card. */
  severity: 'info' | 'warning' | 'danger';
}

export interface ProjectPulseActivityEventDto {
  id: string;
  at: string;
  actorPersonId: string | null;
  kind: string;
  summary: string;
}

export interface ProjectPulseStaffingSummaryDto {
  /** Sum of allocationPercent across active fills on this project. */
  totalActiveAllocationPercent: number;
  /** Distinct count of people with active fills on this project. */
  distinctActivePersons: number;
  /** OPEN + PROPOSED positions. */
  openOrProposed: number;
  /** RELEASED in the last 28d. */
  releasedLast28d: number;
}

export type ProjectPulseExternalLinkKind =
  | 'jira'
  | 'confluence'
  | 'teams'
  | 'gantt'
  | 'other';

export interface ProjectPulseExternalLinkDto {
  kind: ProjectPulseExternalLinkKind;
  title: string;
  href: string;
  meta: Record<string, unknown>;
}

// ─── Top-level payload ──────────────────────────────────────────────────────

export interface ProjectPulseSnapshotDto {
  projectId: string;
  generatedAt: string;

  // Original S3-1 fields (unchanged; tests rely on these).
  overallScore: number;
  overallBand: RadiatorBand;
  quadrants: ProjectPulseQuadrantDto[];
  positions: ProjectPulsePositionsDto;
  budget: ProjectPulseBudgetDto;
  nextMilestone: ProjectPulseNextMilestoneDto | null;
  topRisks: ProjectPulseRiskDto[];
  nextDecision: ProjectPulseNextDecisionDto | null;

  // FE-#259 additive fields.
  rag: ProjectPulseRagDto;
  positionsList: ProjectPulsePositionSummaryDto[];
  risks: ProjectPulseRiskDto[];
  decisions: ProjectPulseDecisionDto[];
  milestones: ProjectPulseMilestonesAggDto;
  recentActivity: ProjectPulseActivityEventDto[];
  staffingSummary: ProjectPulseStaffingSummaryDto;
  externalLinks: ProjectPulseExternalLinkDto[];
}
