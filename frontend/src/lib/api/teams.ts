import { httpGet, httpPost } from './http-client';

export interface TeamSummary {
  code: string;
  description: string | null;
  id: string;
  memberCount: number;
  name: string;
  orgUnit: {
    code: string;
    id: string;
    name: string;
  } | null;
}

export interface TeamMember {
  currentAssignmentCount: number;
  currentOrgUnitName: string | null;
  displayName: string;
  id: string;
  primaryEmail: string | null;
}

export interface TeamListResponse {
  items: TeamSummary[];
}

export interface TeamMembersResponse {
  items: TeamMember[];
}

export interface TeamDashboardProject {
  id: string;
  name: string;
}

export interface TeamDashboardSpreadMember {
  activeProjectCount: number;
  displayName: string;
  id: string;
}

export interface TeamDashboardCrossProjectSpread {
  maxProjectsPerMember: number;
  membersOnMultipleProjects: TeamDashboardSpreadMember[];
  membersOnMultipleProjectsCount: number;
}

export interface TeamDashboardAnomalySummary {
  assignmentWithoutEvidenceCount: number;
  evidenceAfterAssignmentEndCount: number;
  evidenceWithoutAssignmentCount: number;
  openExceptionCount: number;
  projectClosureConflictCount: number;
  staleApprovalCount: number;
}

export interface TeamDashboardResponse {
  activeAssignmentsCount: number;
  anomalySummary: TeamDashboardAnomalySummary;
  crossProjectSpread: TeamDashboardCrossProjectSpread;
  peopleWithEvidenceAlignmentGaps: TeamMember[];
  peopleWithNoAssignments: TeamMember[];
  projectCount: number;
  projectsInvolved: TeamDashboardProject[];
  team: TeamSummary;
  teamMemberCount: number;
}

export interface CreateTeamRequest {
  code: string;
  description?: string;
  name: string;
  orgUnitId?: string;
}

export interface UpdateTeamMemberRequest {
  action: 'add' | 'remove';
  personId: string;
}

export async function fetchTeams(): Promise<TeamListResponse> {
  return httpGet<TeamListResponse>('/teams');
}

export async function fetchTeamById(id: string): Promise<TeamSummary> {
  return httpGet<TeamSummary>(`/teams/${id}`);
}

export async function fetchTeamMembers(id: string): Promise<TeamMembersResponse> {
  return httpGet<TeamMembersResponse>(`/teams/${id}/members`);
}

export async function fetchTeamDashboard(id: string): Promise<TeamDashboardResponse> {
  return httpGet<TeamDashboardResponse>(`/teams/${id}/dashboard`);
}

export async function createTeam(request: CreateTeamRequest): Promise<TeamSummary> {
  return httpPost<TeamSummary, CreateTeamRequest>('/teams', request);
}

export async function updateTeamMember(
  id: string,
  request: UpdateTeamMemberRequest,
): Promise<TeamMembersResponse> {
  return httpPost<TeamMembersResponse, UpdateTeamMemberRequest>(
    `/teams/${id}/members`,
    request,
  );
}
