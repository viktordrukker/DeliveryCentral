/**
 * Sprint 3 / S3-1 — Project Pulse (lean PM Decision Dashboard) snapshot.
 *
 * Distinct from the legacy `PulseSummaryDto` (mood surveys + activity stream).
 * This DTO is the single-screen "what is the state of this project right now"
 * read for any role. UI lands when DS regen completes; this PR is BE only.
 */

import type { RadiatorBand } from './radiator.dto';

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
  /** Lean staffing aggregate count of OPEN positions on the project. */
  open: number;
  /** Lean staffing aggregate count of PROPOSED positions on the project. */
  proposed: number;
  /** Active fills (BOOKED + ONBOARDING + ASSIGNED). */
  active: number;
  /** All non-terminal positions on the project (everything except RELEASED). */
  totalNonReleased: number;
}

export interface ProjectPulseBudgetDto {
  fiscalYear: number | null;
  bac: number | null;
  actualCost: number | null;
  earnedValue: number | null;
  plannedToDate: number | null;
  eac: number | null;
  /** (AC − PTD) / PTD, signed; null when PTD is missing or zero. */
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
  /** Source row id (UUID). Internal use; UI surfaces a publicId if it routes. */
  id: string;
  /** Free-text summary of what needs deciding. */
  summary: string;
  /** When the decision was first proposed/requested. ISO-8601. */
  pendingSince: string;
}

export interface ProjectPulseSnapshotDto {
  projectId: string;
  generatedAt: string;
  overallScore: number;
  overallBand: RadiatorBand;
  quadrants: ProjectPulseQuadrantDto[];
  positions: ProjectPulsePositionsDto;
  budget: ProjectPulseBudgetDto;
  nextMilestone: ProjectPulseNextMilestoneDto | null;
  topRisks: ProjectPulseRiskDto[];
  nextDecision: ProjectPulseNextDecisionDto | null;
}
