import { httpGet, httpPost } from './http-client';

export type RagRating = 'GREEN' | 'AMBER' | 'RED';

export interface RagSnapshotDto {
  id: string;
  projectId: string;
  weekStarting: string;
  staffingRag: RagRating;
  scheduleRag: RagRating;
  budgetRag: RagRating;
  clientRag: RagRating | null;
  scopeRag: RagRating | null;
  businessRag: RagRating | null;
  overallRag: RagRating;
  autoComputedOverall: RagRating | null;
  isOverridden: boolean;
  overrideReason: string | null;
  narrative: string | null;
  accomplishments: string | null;
  nextSteps: string | null;
  dimensionDetails: DimensionDetailsJson | null;
  riskSummary: string | null;
  recordedByPersonId: string;
}

export interface ComputedRag {
  staffingRag: RagRating;
  staffingExplanation: string;
  scheduleRag: RagRating;
  scheduleExplanation: string;
  budgetRag: RagRating;
  budgetExplanation: string;
  overallRag: RagRating;
}

export interface SubCriterionValue {
  rating: number;
  note?: string;
  auto?: boolean;
}

export interface DimensionDetailsJson {
  scope?: {
    staffingFill?: SubCriterionValue;
    requirementsStability?: SubCriterionValue;
    scopeCreep?: SubCriterionValue;
    deliverableAcceptance?: SubCriterionValue;
    changeRequestVolume?: SubCriterionValue;
  };
  schedule?: {
    milestoneAdherence?: SubCriterionValue;
    velocity?: SubCriterionValue;
    timelineDeviation?: SubCriterionValue;
    criticalPathHealth?: SubCriterionValue;
  };
  budget?: {
    spendRate?: SubCriterionValue;
    forecastAccuracy?: SubCriterionValue;
    capexCompliance?: SubCriterionValue;
    costVariance?: SubCriterionValue;
  };
  business?: {
    clientSatisfaction?: SubCriterionValue;
    stakeholderEngagement?: SubCriterionValue;
    businessValueDelivery?: SubCriterionValue;
    strategicAlignment?: SubCriterionValue;
    teamMood?: SubCriterionValue;
  };
}

export interface EnhancedComputedRag extends ComputedRag {
  scopeRag: RagRating;
  scopeExplanation: string;
  businessRag: RagRating;
  businessExplanation: string;
  dimensionHints: DimensionDetailsJson;
}

export interface StaffingAlert {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  actionLink?: string;
}

export interface CreateRagSnapshotRequest {
  scheduleRag: RagRating;
  budgetRag: RagRating;
  clientRag?: RagRating;
  scopeRag?: RagRating;
  businessRag?: RagRating;
  overallRag?: RagRating;
  overrideReason?: string;
  narrative?: string;
  accomplishments?: string;
  nextSteps?: string;
  dimensionDetails?: DimensionDetailsJson;
  riskSummary?: string;
}

export async function fetchComputedRag(projectId: string): Promise<ComputedRag> {
  return httpGet<ComputedRag>(`/projects/${projectId}/rag-computed`);
}

export async function fetchEnhancedComputedRag(projectId: string): Promise<EnhancedComputedRag> {
  return httpGet<EnhancedComputedRag>(`/projects/${projectId}/rag-enhanced`);
}

export async function fetchStaffingAlerts(projectId: string): Promise<StaffingAlert[]> {
  return httpGet<StaffingAlert[]>(`/projects/${projectId}/staffing-alerts`);
}

export async function createRagSnapshot(projectId: string, data: CreateRagSnapshotRequest): Promise<RagSnapshotDto> {
  return httpPost<RagSnapshotDto, CreateRagSnapshotRequest>(`/projects/${projectId}/rag-snapshots`, data);
}

export async function fetchLatestRagSnapshot(projectId: string): Promise<RagSnapshotDto | null> {
  return httpGet<RagSnapshotDto | null>(`/projects/${projectId}/rag-snapshots/latest`);
}

export async function fetchRagHistory(projectId: string, weeks = 12): Promise<RagSnapshotDto[]> {
  return httpGet<RagSnapshotDto[]>(`/projects/${projectId}/rag-snapshots?weeks=${weeks}`);
}
