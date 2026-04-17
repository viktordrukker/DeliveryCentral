import { httpGet, httpPatch, httpPost } from './http-client';

export interface AssignmentPartySummary {
  displayName: string;
  id: string;
}

export interface AssignmentDirectoryItem {
  allocationPercent: number;
  approvalState: string;
  endDate: string | null;
  id: string;
  person: AssignmentPartySummary;
  project: AssignmentPartySummary;
  staffingRole: string;
  startDate: string;
}

export interface AssignmentDirectoryResponse {
  items: AssignmentDirectoryItem[];
  totalCount: number;
}

export interface AssignmentDirectoryQuery {
  from?: string;
  page?: number;
  pageSize?: number;
  personId?: string;
  projectId?: string;
  status?: string;
  to?: string;
}

export interface CreateAssignmentRequest {
  actorId: string;
  allocationPercent: number;
  allowOverlapOverride?: boolean;
  draft?: boolean;
  endDate?: string;
  note?: string;
  overrideReason?: string;
  personId: string;
  personValidated?: boolean;
  projectId: string;
  staffingRole: string;
  startDate: string;
}

export interface AssignmentDecisionRequest {
  actorId?: string;
  comment?: string;
  reason?: string;
}

export interface EndAssignmentRequest {
  actorId?: string;
  endDate: string;
  reason?: string;
}

export interface ProjectAssignmentResponse {
  allocationPercent: number;
  endDate?: string;
  id: string;
  note?: string;
  personId: string;
  projectId: string;
  requestedAt: string;
  staffingRole: string;
  startDate: string;
  status: string;
  version?: number;
}

export interface CreateAssignmentOverrideRequest {
  allocationPercent: number;
  endDate?: string;
  note?: string;
  personId: string;
  projectId: string;
  reason: string;
  staffingRole: string;
  startDate: string;
}

export interface BulkAssignmentEntryRequest {
  allocationPercent: number;
  endDate?: string;
  note?: string;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
}

export interface BulkAssignmentRequest {
  actorId: string;
  entries: BulkAssignmentEntryRequest[];
}

export interface BulkAssignmentCreatedItem {
  assignment: ProjectAssignmentResponse;
  index: number;
}

export interface BulkAssignmentFailedItem {
  code: string;
  index: number;
  message: string;
  personId: string;
  projectId: string;
  staffingRole: string;
}

export interface BulkAssignmentResponse {
  createdCount: number;
  createdItems: BulkAssignmentCreatedItem[];
  failedCount: number;
  failedItems: BulkAssignmentFailedItem[];
  message: string;
  strategy: string;
  totalCount: number;
}

export interface AssignmentApprovalItem {
  decidedByPersonId?: string;
  decisionAt?: string;
  decision: string;
  decisionReason?: string;
  id: string;
  sequenceNumber: number;
}

export interface AssignmentDetails extends AssignmentDirectoryItem {
  approvals: AssignmentApprovalItem[];
  canApprove: boolean;
  canEnd: boolean;
  canReject: boolean;
  history: AssignmentHistoryItem[];
  note?: string;
  requestedAt: string;
  requestedByPersonId?: string;
}

export interface AssignmentHistoryItem {
  changeReason?: string;
  changeType: string;
  changedByPersonId?: string;
  id: string;
  newSnapshot?: Record<string, unknown>;
  occurredAt: string;
  previousSnapshot?: Record<string, unknown>;
}

export async function fetchAssignments(
  query: AssignmentDirectoryQuery = {},
): Promise<AssignmentDirectoryResponse> {
  const params = new URLSearchParams();

  if (query.personId) {
    params.set('personId', query.personId);
  }

  if (query.projectId) {
    params.set('projectId', query.projectId);
  }

  if (query.status) {
    params.set('status', query.status);
  }

  if (query.from) {
    params.set('from', query.from);
  }

  if (query.to) {
    params.set('to', query.to);
  }

  if (query.page !== undefined) {
    params.set('page', String(query.page));
  }

  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }

  const suffix = params.toString();

  return httpGet<AssignmentDirectoryResponse>(
    `/assignments${suffix ? `?${suffix}` : ''}`,
  );
}

export async function fetchAssignmentById(id: string): Promise<AssignmentDetails> {
  return httpGet<AssignmentDetails>(`/assignments/${id}`);
}

export async function createAssignment(
  request: CreateAssignmentRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, CreateAssignmentRequest>('/assignments', request);
}

export async function createAssignmentOverride(
  request: CreateAssignmentOverrideRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, CreateAssignmentOverrideRequest>(
    '/assignments/override',
    request,
  );
}

export async function bulkCreateAssignments(
  request: BulkAssignmentRequest,
): Promise<BulkAssignmentResponse> {
  return httpPost<BulkAssignmentResponse, BulkAssignmentRequest>('/assignments/bulk', request);
}

export async function approveAssignment(
  id: string,
  request: AssignmentDecisionRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, AssignmentDecisionRequest>(
    `/assignments/${id}/approve`,
    request,
  );
}

export async function rejectAssignment(
  id: string,
  request: AssignmentDecisionRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, AssignmentDecisionRequest>(
    `/assignments/${id}/reject`,
    request,
  );
}

export async function endAssignment(
  id: string,
  request: EndAssignmentRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, EndAssignmentRequest>(
    `/assignments/${id}/end`,
    request,
  );
}

export interface AmendAssignmentRequest {
  allocationPercent?: number;
  notes?: string;
  staffingRole?: string;
  validTo?: string;
}

export interface RevokeAssignmentRequest {
  reason?: string;
}

export async function amendAssignment(
  id: string,
  request: AmendAssignmentRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPatch<ProjectAssignmentResponse, AmendAssignmentRequest>(
    `/assignments/${id}`,
    request,
  );
}

export async function revokeAssignment(
  id: string,
  request: RevokeAssignmentRequest,
): Promise<ProjectAssignmentResponse> {
  return httpPost<ProjectAssignmentResponse, RevokeAssignmentRequest>(
    `/assignments/${id}/revoke`,
    request,
  );
}
