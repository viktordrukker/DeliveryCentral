import { httpGet, httpPost } from './http-client';

export type LeaveRequestType = 'ANNUAL' | 'SICK' | 'OTHER';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequestDto {
  createdAt: string;
  endDate: string;
  id: string;
  notes: string | null;
  personId: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  startDate: string;
  status: LeaveRequestStatus;
  type: LeaveRequestType;
}

export interface CreateLeaveRequestBody {
  endDate: string;
  notes?: string;
  startDate: string;
  type: LeaveRequestType;
}

export async function createLeaveRequest(body: CreateLeaveRequestBody): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto, CreateLeaveRequestBody>('/leave-requests', body);
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequestDto[]> {
  return httpGet<LeaveRequestDto[]>('/leave-requests/my');
}

export async function fetchLeaveRequests(params?: {
  personId?: string;
  status?: LeaveRequestStatus;
}): Promise<LeaveRequestDto[]> {
  const query = new URLSearchParams();
  if (params?.personId) query.set('personId', params.personId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return httpGet<LeaveRequestDto[]>(`/leave-requests${qs ? `?${qs}` : ''}`);
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto, Record<string, never>>(`/leave-requests/${id}/approve`, {});
}

export async function rejectLeaveRequest(id: string): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto, Record<string, never>>(`/leave-requests/${id}/reject`, {});
}
