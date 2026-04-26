import { httpGet, httpPatch, httpPost } from './http-client';

export type ChangeRequestStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type ChangeRequestSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectChangeRequestDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  severity: ChangeRequestSeverity;
  outOfBaseline: boolean;
  impactScope: string | null;
  impactSchedule: string | null;
  impactBudget: string | null;
  requesterPersonId: string | null;
  decidedByPersonId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeRequestRequest {
  title: string;
  description?: string;
  severity?: ChangeRequestSeverity;
  outOfBaseline?: boolean;
  impactScope?: string;
  impactSchedule?: string;
  impactBudget?: string;
}

export interface UpdateChangeRequestRequest {
  title?: string;
  description?: string;
  status?: ChangeRequestStatus;
  severity?: ChangeRequestSeverity;
  outOfBaseline?: boolean;
  impactScope?: string;
  impactSchedule?: string;
  impactBudget?: string;
}

export async function fetchChangeRequests(projectId: string, status?: ChangeRequestStatus): Promise<ProjectChangeRequestDto[]> {
  const q = status ? `?status=${status}` : '';
  return httpGet<ProjectChangeRequestDto[]>(`/projects/${projectId}/change-requests${q}`);
}

export async function createChangeRequest(projectId: string, data: CreateChangeRequestRequest): Promise<ProjectChangeRequestDto> {
  return httpPost<ProjectChangeRequestDto, CreateChangeRequestRequest>(`/projects/${projectId}/change-requests`, data);
}

export async function updateChangeRequest(projectId: string, crId: string, data: UpdateChangeRequestRequest): Promise<ProjectChangeRequestDto> {
  return httpPatch<ProjectChangeRequestDto, UpdateChangeRequestRequest>(`/projects/${projectId}/change-requests/${crId}`, data);
}

export async function approveChangeRequest(projectId: string, crId: string): Promise<ProjectChangeRequestDto> {
  return httpPost<ProjectChangeRequestDto, Record<string, never>>(`/projects/${projectId}/change-requests/${crId}/approve`, {});
}

export async function rejectChangeRequest(projectId: string, crId: string): Promise<ProjectChangeRequestDto> {
  return httpPost<ProjectChangeRequestDto, Record<string, never>>(`/projects/${projectId}/change-requests/${crId}/reject`, {});
}
