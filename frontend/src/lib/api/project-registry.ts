import { httpGet, httpPatch, httpPost } from './http-client';

export interface ProjectExternalLinkSummary {
  count: number;
  provider: string;
}

export interface ProjectDirectoryItem {
  assignmentCount: number;
  externalLinksCount: number;
  externalLinksSummary: ProjectExternalLinkSummary[];
  id: string;
  name: string;
  projectCode: string;
  status: string;
}

export interface ProjectDirectoryResponse {
  items: ProjectDirectoryItem[];
}

export interface ProjectExternalLink {
  archived: boolean;
  externalProjectKey: string;
  externalProjectName: string;
  externalUrl: string | null;
  provider: string;
  providerEnvironment: string | null;
}

export interface ProjectDetails extends ProjectDirectoryItem {
  description: string | null;
  externalLinks: ProjectExternalLink[];
  plannedEndDate: string | null;
  projectManagerDisplayName: string | null;
  projectManagerId: string | null;
  startDate: string | null;
  version?: number;
}

export interface CreateProjectRequest {
  description?: string;
  name: string;
  plannedEndDate?: string;
  projectManagerId: string;
  startDate: string;
}

export interface ProjectLifecycleRecord {
  description?: string | null;
  id: string;
  name: string;
  plannedEndDate?: string | null;
  projectCode: string;
  projectManagerId: string;
  startDate: string;
  status: string;
  version?: number;
}

export interface ProjectWorkspendBucket {
  key: string;
  mandays: number;
}

export interface ProjectClosureResponse {
  id: string;
  name: string;
  projectCode: string;
  status: string;
  version?: number;
  workspend: {
    byRole: ProjectWorkspendBucket[];
    bySkillset: ProjectWorkspendBucket[];
    totalMandays: number;
  };
}

export interface AssignProjectTeamRequest {
  actorId: string;
  allocationPercent: number;
  endDate?: string;
  expectedProjectVersion?: number;
  note?: string;
  staffingRole: string;
  startDate: string;
  teamOrgUnitId: string;
}

export interface CloseProjectOverrideRequest {
  expectedProjectVersion?: number;
  reason: string;
}

export interface AssignProjectTeamResponse {
  allocationPercent: number;
  createdAssignments: Array<{
    assignmentId: string;
    personId: string;
    personName: string;
  }>;
  createdCount: number;
  endDate?: string;
  projectId: string;
  skippedDuplicateCount: number;
  skippedDuplicates: Array<{
    personId: string;
    personName: string;
    reason: string;
  }>;
  staffingRole: string;
  startDate: string;
  teamName: string;
  teamOrgUnitId: string;
}

export interface ProjectDirectoryQuery {
  source?: string;
  status?: string;
  search?: string;
}

export async function fetchProjectDirectory(
  query: ProjectDirectoryQuery = {},
): Promise<ProjectDirectoryResponse> {
  const params = new URLSearchParams();

  if (query.source) {
    params.set('source', query.source);
  }

  if (query.status) {
    params.set('status', query.status);
  }

  if (query.search) {
    params.set('search', query.search);
  }

  const suffix = params.toString();
  return httpGet<ProjectDirectoryResponse>(
    `/projects${suffix ? `?${suffix}` : ''}`,
  );
}

export async function fetchProjectById(id: string): Promise<ProjectDetails> {
  return httpGet<ProjectDetails>(`/projects/${id}`);
}

export async function createProject(
  request: CreateProjectRequest,
): Promise<ProjectLifecycleRecord> {
  return httpPost<ProjectLifecycleRecord, CreateProjectRequest>('/projects', request);
}

export async function activateProject(id: string): Promise<ProjectLifecycleRecord> {
  return httpPost<ProjectLifecycleRecord, Record<string, never>>(
    `/projects/${id}/activate`,
    {},
  );
}

export async function closeProject(id: string): Promise<ProjectClosureResponse> {
  return httpPost<ProjectClosureResponse, Record<string, never>>(`/projects/${id}/close`, {});
}

export async function closeProjectOverride(
  id: string,
  request: CloseProjectOverrideRequest,
): Promise<ProjectClosureResponse> {
  return httpPost<ProjectClosureResponse, CloseProjectOverrideRequest>(
    `/projects/${id}/close-override`,
    request,
  );
}

export async function assignTeamToProject(
  id: string,
  request: AssignProjectTeamRequest,
): Promise<AssignProjectTeamResponse> {
  return httpPost<AssignProjectTeamResponse, AssignProjectTeamRequest>(
    `/projects/${id}/assign-team`,
    request,
  );
}

export interface UpdateProjectRequest {
  description?: string;
  name?: string;
  status?: string;
}

export async function updateProject(
  id: string,
  request: UpdateProjectRequest,
): Promise<ProjectLifecycleRecord> {
  return httpPatch<ProjectLifecycleRecord, UpdateProjectRequest>(`/projects/${id}`, request);
}
