import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

// LEAN-P4-missing-13 — admin client for LeavePolicy CRUD.

export type LeaveType =
  | 'ANNUAL'
  | 'SICK'
  | 'PARENTAL'
  | 'COMPASSIONATE'
  | 'UNPAID'
  | 'OTHER'
  | 'OT_OFF'
  | 'PERSONAL'
  | 'BEREAVEMENT'
  | 'STUDY';

export interface LeavePolicy {
  id: string;
  publicId: string | null;
  name: string;
  leaveType: LeaveType;
  accrualPerYear: number;
  maxCarryOver: number;
  approvalChain: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

export interface CreateLeavePolicyRequest {
  name: string;
  leaveType: LeaveType;
  accrualPerYear: number;
  maxCarryOver: number;
  approvalChain: string[];
  active?: boolean;
}

export interface UpdateLeavePolicyRequest {
  name?: string;
  leaveType?: LeaveType;
  accrualPerYear?: number;
  maxCarryOver?: number;
  approvalChain?: string[];
  active?: boolean;
}

export async function listLeavePolicies(): Promise<LeavePolicy[]> {
  return httpGet<LeavePolicy[]>('/admin/leave-policies');
}

export async function fetchLeavePolicy(id: string): Promise<LeavePolicy> {
  return httpGet<LeavePolicy>(`/admin/leave-policies/${id}`);
}

export async function createLeavePolicy(data: CreateLeavePolicyRequest): Promise<LeavePolicy> {
  return httpPost<LeavePolicy, CreateLeavePolicyRequest>('/admin/leave-policies', data);
}

export async function updateLeavePolicy(
  id: string,
  data: UpdateLeavePolicyRequest,
): Promise<LeavePolicy> {
  return httpPatch<LeavePolicy, UpdateLeavePolicyRequest>(`/admin/leave-policies/${id}`, data);
}

export async function deactivateLeavePolicy(id: string): Promise<LeavePolicy> {
  return httpDelete<LeavePolicy>(`/admin/leave-policies/${id}`);
}
