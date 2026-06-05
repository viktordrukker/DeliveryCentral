import { httpDelete, httpGet, httpPost } from './http-client';

export type LeaveRequestType = 'ANNUAL' | 'SICK' | 'OTHER' | 'OT_OFF' | 'PERSONAL' | 'PARENTAL' | 'BEREAVEMENT' | 'STUDY';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequestDto {
  createdAt: string;
  endDate: string;
  id: string;
  notes: string | null;
  personId: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** Track B.1 — reviewer's free-text justification on approve/reject. NULL when blank. */
  reviewComment: string | null;
  startDate: string;
  status: LeaveRequestStatus;
  type: LeaveRequestType;
}

export interface LeaveDecisionBody {
  /** Optional reviewer comment. Trimmed server-side; whitespace-only becomes NULL. Max 1000 chars. */
  reviewComment?: string;
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

export async function approveLeaveRequest(
  id: string,
  body: LeaveDecisionBody = {},
): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto, LeaveDecisionBody>(`/leave-requests/${id}/approve`, body);
}

export async function rejectLeaveRequest(
  id: string,
  body: LeaveDecisionBody = {},
): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto, LeaveDecisionBody>(`/leave-requests/${id}/reject`, body);
}

export interface LeaveBalanceDto {
  id: string;
  personId: string;
  year: number;
  leaveType: LeaveRequestType | string;
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
}

export async function fetchMyLeaveBalance(year?: number): Promise<LeaveBalanceDto[]> {
  const qs = year ? `?year=${year}` : '';
  return httpGet<LeaveBalanceDto[]>(`/leave-requests/my-balance${qs}`);
}

/**
 * LEAN-P4-missing-11 — server-side impact preview surfaced before submit.
 * Mirrors the legacy client-side preview (workingDays, balanceAfter,
 * conflicts) so consumers don't have to recompute holiday + assignment
 * overlap math in the browser.
 */
export interface LeaveImpactPreviewDto {
  workingDaysRequested: number;
  skippedHolidays: string[];
  balanceAfter: number | null;
  conflictingAssignmentIds: string[];
  conflictingTeamLeaveIds: string[];
}

export async function previewLeave(input: {
  startDate: string;
  endDate: string;
  type: LeaveRequestType;
  personId?: string;
}): Promise<LeaveImpactPreviewDto> {
  const query = new URLSearchParams();
  query.set('startDate', input.startDate);
  query.set('endDate', input.endDate);
  query.set('type', input.type);
  if (input.personId) query.set('personId', input.personId);
  return httpGet<LeaveImpactPreviewDto>(`/leave-requests/preview?${query.toString()}`);
}

/** LEAN-P4-missing-11 — cancel an own PENDING leave request via the canonical
 *  cancelByEmployee path added by LEAN-P4-missing-12 (#532). */
export async function cancelLeaveRequest(id: string): Promise<LeaveRequestDto> {
  return httpPost<LeaveRequestDto>(`/leave-requests/${id}/cancel`, {});
}
