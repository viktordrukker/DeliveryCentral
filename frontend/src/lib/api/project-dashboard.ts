import { httpGet } from './http-client';

export interface ProjectDashboardAssignment {
  allocationPercent: number;
  id: string;
  personDisplayName: string;
  personId: string;
  staffingRole: string;
  status: string;
  validFrom: string;
  validTo: string | null;
}

export interface EvidenceByWeek {
  totalHours: number;
  weekStarting: string;
}

export interface AllocationByPerson {
  allocationPercent: number;
  displayName: string;
  personId: string;
}

export interface ProjectDashboardStaffingSummary {
  activeAssignmentCount: number;
  totalAssignments: number;
  totalEvidenceHoursLast30d: number;
}

export interface ProjectDashboardResponse {
  allocationByPerson: AllocationByPerson[];
  asOf: string;
  assignments: ProjectDashboardAssignment[];
  evidenceByWeek: EvidenceByWeek[];
  project: {
    description: string | null;
    endsOn: string | null;
    id: string;
    name: string;
    projectCode: string;
    projectManagerId: string | null;
    startsOn: string | null;
    status: string;
  };
  staffingSummary: ProjectDashboardStaffingSummary;
}

export async function fetchProjectDashboard(
  projectId: string,
  asOf?: string,
): Promise<ProjectDashboardResponse> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<ProjectDashboardResponse>(
    `/projects/${projectId}/dashboard${suffix ? `?${suffix}` : ''}`,
  );
}
