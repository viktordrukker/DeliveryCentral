import { httpGet } from './http-client';

export interface DeliveryManagerDashboardSummary {
  totalActiveProjects: number;
  totalActiveAssignments: number;
  projectsWithNoStaff: number;
  projectsWithTimeVariance: number;
  projectsMissingApprovedTimeCount: number;
}

export interface DeliveryManagerTimeAlignment {
  matchedCount: number;
  plannedWithoutApprovedTimeCount: number;
  approvedTimeWithoutAssignmentCount: number;
  approvedTimeAfterAssignmentEndCount: number;
}

export interface ProjectHealthItem {
  projectId: string;
  projectCode: string;
  name: string;
  status: string;
  staffingCount: number;
  approvedHours: number;
  anomalyFlags: string[];
}

export interface ProjectMissingApprovedTimeItem {
  projectId: string;
  projectCode: string;
  name: string;
  lastApprovedTimeDate: string | null;
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
  approvedEntryCount: number;
  projectCount: number;
}

export interface DeliveryManagerDashboardResponse {
  asOf: string;
  burnRateTrend: BurnRateTrendPoint[];
  dataSources: string[];
  projectsMissingApprovedTime: ProjectMissingApprovedTimeItem[];
  openRequestsByProject: OpenRequestsByProjectItem[];
  portfolioHealth: ProjectHealthItem[];
  timeAlignment: DeliveryManagerTimeAlignment;
  staffingGaps: StaffingGapItem[];
  summary: DeliveryManagerDashboardSummary;
}

export interface ScorecardHistoryPoint {
  weekStart: string;
  staffingPct: number;
  timePct: number;
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
