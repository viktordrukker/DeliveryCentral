import { httpGet } from './http-client';

export interface DeliveryManagerDashboardSummary {
  totalActiveProjects: number;
  totalActiveAssignments: number;
  projectsWithNoStaff: number;
  projectsWithEvidenceAnomalies: number;
  inactiveEvidenceProjectCount: number;
}

export interface DeliveryManagerReconciliation {
  matchedCount: number;
  assignedButNoEvidenceCount: number;
  evidenceWithoutAssignmentCount: number;
}

export interface ProjectHealthItem {
  projectId: string;
  projectCode: string;
  name: string;
  status: string;
  staffingCount: number;
  evidenceCount: number;
  anomalyFlags: string[];
}

export interface InactiveEvidenceProjectItem {
  projectId: string;
  projectCode: string;
  name: string;
  lastEvidenceDate: string | null;
  activeAssignmentCount: number;
}

export interface StaffingGapItem {
  assignmentId: string;
  daysUntilEnd: number;
  endDate: string;
  personId: string;
  projectCode: string;
  projectId: string;
  projectName: string;
}

export interface OpenRequestsByProjectItem {
  openRequestCount: number;
  projectCode: string;
  projectId: string;
  projectName: string;
  totalHeadcountFulfilled: number;
  totalHeadcountRequired: number;
}

export interface BurnRateTrendPoint {
  week: string;
  evidenceCount: number;
  projectCount: number;
}

export interface DeliveryManagerDashboardResponse {
  asOf: string;
  burnRateTrend: BurnRateTrendPoint[];
  dataSources: string[];
  inactiveEvidenceProjects: InactiveEvidenceProjectItem[];
  openRequestsByProject: OpenRequestsByProjectItem[];
  portfolioHealth: ProjectHealthItem[];
  reconciliation: DeliveryManagerReconciliation;
  staffingGaps: StaffingGapItem[];
  summary: DeliveryManagerDashboardSummary;
}

export interface ScorecardHistoryPoint {
  weekStart: string;
  staffingPct: number;
  evidencePct: number;
  timelinePct: number;
}

export interface ProjectScorecardHistoryItem {
  projectId: string;
  projectName: string;
  history: ScorecardHistoryPoint[];
}

export async function fetchScorecardHistory(options?: {
  asOf?: string;
  projectId?: string;
  weeks?: number;
}): Promise<ProjectScorecardHistoryItem[]> {
  const params = new URLSearchParams();
  if (options?.asOf) params.set('asOf', options.asOf);
  if (options?.projectId) params.set('projectId', options.projectId);
  if (options?.weeks) params.set('weeks', String(options.weeks));
  const suffix = params.toString();
  return httpGet<ProjectScorecardHistoryItem[]>(
    `/dashboard/delivery/scorecard-history${suffix ? `?${suffix}` : ''}`,
  );
}

export async function fetchDeliveryManagerDashboard(
  asOf?: string,
): Promise<DeliveryManagerDashboardResponse> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<DeliveryManagerDashboardResponse>(
    `/dashboard/delivery-manager${suffix ? `?${suffix}` : ''}`,
  );
}
