import { httpGet } from './http-client';

export interface ResourceManagerDashboardPersonSummary {
  displayName: string;
  id: string;
  primaryEmail: string | null;
}

export interface ResourceManagerSummary {
  futureAssignmentPipelineCount: number;
  managedTeamCount: number;
  pendingAssignmentApprovalCount: number;
  peopleWithoutAssignmentsCount: number;
  totalManagedPeopleCount: number;
}

export interface ResourceTeamCapacitySummary {
  activeAssignmentCount: number;
  activeProjectCount: number;
  memberCount: number;
  overallocatedPeopleCount: number;
  teamId: string;
  teamName: string;
  unassignedPeopleCount: number;
  underallocatedPeopleCount: number;
}

export interface ResourcePersonAllocationIndicator {
  displayName: string;
  indicator: string;
  personId: string;
  teamId: string;
  teamName: string;
  totalAllocationPercent: number;
}

export interface ResourceAssignmentPipelineItem {
  approvalState: string;
  assignmentId: string;
  personDisplayName: string;
  personId: string;
  projectId: string;
  projectName: string;
  startDate: string;
}

export interface ResourceTeamProjectLoad {
  activeProjectCount: number;
  projectNames: string[];
  teamId: string;
  teamName: string;
}

export interface PendingAssignmentApproval {
  assignmentId: string;
  personDisplayName: string;
  personId: string;
  projectId: string;
  projectName: string;
  requestedAt: string;
}

export interface IncomingStaffingRequest {
  allocationPercent: number;
  endDate: string;
  headcountFulfilled: number;
  headcountRequired: number;
  id: string;
  priority: string;
  projectId: string;
  role: string;
  startDate: string;
  summary: string | null;
}

export interface ResourceManagerDashboardResponse {
  allocationIndicators: ResourcePersonAllocationIndicator[];
  asOf: string;
  dataSources: string[];
  futureAssignmentPipeline: ResourceAssignmentPipelineItem[];
  incomingRequests: IncomingStaffingRequest[];
  pendingAssignmentApprovals: PendingAssignmentApproval[];
  peopleWithoutAssignments: ResourcePersonAllocationIndicator[];
  person: ResourceManagerDashboardPersonSummary;
  summary: ResourceManagerSummary;
  teamCapacitySummary: ResourceTeamCapacitySummary[];
  teamsInMultipleActiveProjects: ResourceTeamProjectLoad[];
}

export async function fetchResourceManagerDashboard(
  personId: string,
  asOf?: string,
): Promise<ResourceManagerDashboardResponse> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<ResourceManagerDashboardResponse>(
    `/dashboard/resource-manager/${personId}${suffix ? `?${suffix}` : ''}`,
  );
}
