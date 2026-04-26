import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

export type MilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';

export interface ProjectMilestoneDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  plannedDate: string;
  actualDate: string | null;
  status: MilestoneStatus;
  progressPct?: number;
  dependsOnMilestoneIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneRequest {
  name: string;
  description?: string;
  plannedDate: string;
  status?: MilestoneStatus;
}

export interface UpdateMilestoneRequest {
  name?: string;
  description?: string;
  plannedDate?: string;
  actualDate?: string;
  status?: MilestoneStatus;
  progressPct?: number;
  dependsOnMilestoneIds?: string[];
}

export async function fetchMilestones(projectId: string): Promise<ProjectMilestoneDto[]> {
  return httpGet<ProjectMilestoneDto[]>(`/projects/${projectId}/milestones`);
}

export async function createMilestone(projectId: string, data: CreateMilestoneRequest): Promise<ProjectMilestoneDto> {
  return httpPost<ProjectMilestoneDto, CreateMilestoneRequest>(`/projects/${projectId}/milestones`, data);
}

export async function updateMilestone(projectId: string, milestoneId: string, data: UpdateMilestoneRequest): Promise<ProjectMilestoneDto> {
  return httpPatch<ProjectMilestoneDto, UpdateMilestoneRequest>(`/projects/${projectId}/milestones/${milestoneId}`, data);
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
  return httpDelete(`/projects/${projectId}/milestones/${milestoneId}`);
}
