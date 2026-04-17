import { httpGet } from './http-client';

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

export interface OpenStaffingRequestSummary {
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
  openRequests: OpenStaffingRequestSummary[];
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
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<ProjectManagerDashboardResponse>(
    `/dashboard/project-manager/${personId}${suffix ? `?${suffix}` : ''}`,
  );
}
