import { fetchDashboardEndpoint } from './dashboard-fetch';

export interface ProjectManagerDashboardPersonSummary {
  displayName: string;
  id: string;
  primaryEmail: string | null;
}

export interface ManagedProjectDashboardItem {
  approvedHours: number;
  id: string;
  name: string;
  plannedEndDate: string | null;
  plannedStartDate: string | null;
  projectCode: string;
  staffingCount: number;
  status: string;
}

export interface ProjectDashboardAttentionItem {
  detail: string;
  projectCode: string;
  projectId: string;
  projectName: string;
  reason: string;
}

export interface RecentlyChangedAssignmentItem {
  assignmentId: string;
  changeType: string;
  changedAt: string;
  personDisplayName: string;
  personId: string;
  projectId: string;
  projectName: string;
}

// SoT PR 14 — position-based DTO. Each row is one `ProjectPosition` whose
// `fillStatus` is OPEN or PROPOSED (the lean canonical for unfilled demand).
export interface OpenPositionSummary {
  headcountFulfilled: number;
  headcountRequired: number;
  id: string;
  priority: string;
  projectId: string;
  role: string;
  startDate: string;
}

export interface ProjectManagerDashboardResponse {
  asOf: string;
  attentionProjects: ProjectDashboardAttentionItem[];
  dataSources: string[];
  managedProjects: ManagedProjectDashboardItem[];
  openRequestCount: number;
  openRequests: OpenPositionSummary[];
  person: ProjectManagerDashboardPersonSummary;
  projectsWithTimeVariance: ProjectDashboardAttentionItem[];
  projectsWithStaffingGaps: ProjectDashboardAttentionItem[];
  recentlyChangedAssignments: RecentlyChangedAssignmentItem[];
  staffingSummary: {
    activeAssignmentCount: number;
    managedProjectCount: number;
    projectsWithTimeVarianceCount: number;
    projectsWithStaffingGapsCount: number;
  };
}

export async function fetchProjectManagerDashboard(
  personId: string,
  asOf?: string,
): Promise<ProjectManagerDashboardResponse> {
  return fetchDashboardEndpoint<ProjectManagerDashboardResponse>(
    `/dashboard/project-manager/${personId}`,
    { asOf },
  );
}
