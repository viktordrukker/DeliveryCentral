export type RadiatorBand = 'CRITICAL' | 'RED' | 'AMBER' | 'GREEN';

export interface SubDimensionScore {
  key: string;
  autoScore: number | null;
  overrideScore: number | null;
  effectiveScore: number | null;
  reason: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
  explanation: string;
}

export interface QuadrantScore {
  key: 'scope' | 'schedule' | 'budget' | 'people';
  score: number | null;
  band: RadiatorBand | null;
  subs: SubDimensionScore[];
}

export interface RadiatorSnapshotDto {
  snapshotId: string | null;
  projectId: string;
  weekStarting: string;
  overallScore: number;
  overallBand: RadiatorBand;
  quadrants: QuadrantScore[];
  narrative: string | null;
  accomplishments: string | null;
  nextSteps: string | null;
  riskSummary: string | null;
  recordedByPersonId: string | null;
  createdAt: string | null;
}

export interface RadiatorHistoryEntry {
  weekStarting: string;
  overallScore: number;
  overallBand: RadiatorBand;
}

export interface PortfolioRadiatorEntry {
  projectId: string;
  projectName: string;
  projectCode: string;
  overallScore: number;
  overallBand: RadiatorBand;
  quadrantScores: {
    scope: number | null;
    schedule: number | null;
    budget: number | null;
    people: number | null;
  };
}

export interface ThresholdConfigDto {
  subDimensionKey: string;
  thresholdScore4: number;
  thresholdScore3: number;
  thresholdScore2: number;
  thresholdScore1: number;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  isDefault: boolean;
}

export interface ProjectMilestoneDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  plannedDate: string;
  actualDate: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';
  progressPct?: number;
  dependsOnMilestoneIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectChangeRequestDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  outOfBaseline: boolean;
  impactScope: string | null;
  impactSchedule: string | null;
  impactBudget: string | null;
  requesterPersonId: string | null;
  decidedByPersonId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
