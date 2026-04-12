import { httpGet } from './http-client';

export interface DashboardProjectSummary {
  id: string;
  name: string;
  projectCode: string;
}

export interface DashboardPersonSummary {
  displayName: string;
  id: string;
}

export interface WorkloadDashboardSummary {
  peopleWithNoActiveAssignments: DashboardPersonSummary[];
  peopleWithNoActiveAssignmentsCount: number;
  projectsWithEvidenceButNoApprovedAssignment: DashboardProjectSummary[];
  projectsWithEvidenceButNoApprovedAssignmentCount: number;
  projectsWithNoStaff: DashboardProjectSummary[];
  projectsWithNoStaffCount: number;
  totalActiveAssignments: number;
  totalActiveProjects: number;
  unassignedActivePeopleCount: number;
}

export async function fetchWorkloadDashboardSummary(
  asOf?: string,
): Promise<WorkloadDashboardSummary> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const query = params.toString();
  return httpGet<WorkloadDashboardSummary>(
    `/dashboard/workload/summary${query ? `?${query}` : ''}`,
  );
}

export interface WorkloadTrendPoint {
  week: string;
  activeAssignments: number;
}

export async function fetchWorkloadTrend(
  weeks = 12,
): Promise<WorkloadTrendPoint[]> {
  return httpGet<WorkloadTrendPoint[]>(
    `/dashboard/workload/trend?weeks=${weeks}`,
  );
}
