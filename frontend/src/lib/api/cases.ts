import { httpGet, httpPost } from './http-client';

export interface CaseParticipant {
  personId: string;
  role: string;
}

export interface CaseRecord {
  cancelReason?: string;
  caseNumber: string;
  caseTypeDisplayName: string;
  caseTypeKey: string;
  closedAt?: string;
  id: string;
  openedAt: string;
  ownerPersonId: string;
  ownerPersonName?: string;
  participants: CaseParticipant[];
  relatedAssignmentId?: string;
  relatedProjectId?: string;
  status: string;
  subjectPersonId: string;
  subjectPersonName?: string;
  summary?: string;
}

export interface CasesResponse {
  items: CaseRecord[];
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface CasesQuery {
  caseTypeKey?: string;
  ownerPersonId?: string;
  subjectPersonId?: string;
}

export interface CaseComment {
  authorPersonId: string;
  body: string;
  createdAt: string;
  id: string;
}

export interface CreateCaseRequest {
  caseTypeKey: 'OFFBOARDING' | 'ONBOARDING' | 'PERFORMANCE' | 'TRANSFER';
  ownerPersonId: string;
  participants?: CaseParticipant[];
  relatedAssignmentId?: string;
  relatedProjectId?: string;
  subjectPersonId: string;
  summary?: string;
}

export async function fetchCases(query: CasesQuery = {}): Promise<CasesResponse> {
  const params = new URLSearchParams();

  if (query.caseTypeKey) {
    params.set('caseTypeKey', query.caseTypeKey);
  }

  if (query.ownerPersonId) {
    params.set('ownerPersonId', query.ownerPersonId);
  }

  if (query.subjectPersonId) {
    params.set('subjectPersonId', query.subjectPersonId);
  }

  const suffix = params.toString();
  return httpGet<CasesResponse>(`/cases${suffix ? `?${suffix}` : ''}`);
}

export async function fetchCaseById(id: string): Promise<CaseRecord> {
  return httpGet<CaseRecord>(`/cases/${id}`);
}

export async function createCase(request: CreateCaseRequest): Promise<CaseRecord> {
  return httpPost<CaseRecord, CreateCaseRequest>('/cases', request);
}

export interface CaseStep {
  assignedToPersonId: string | null;
  completedAt: string | null;
  displayName: string;
  dueAt: string | null;
  id: string;
  status: string;
  stepKey: string;
}

export async function fetchCaseSteps(caseId: string): Promise<CaseStep[]> {
  return httpGet<CaseStep[]>(`/cases/${caseId}/steps`);
}

export async function completeCaseStep(caseId: string, stepKey: string): Promise<CaseStep> {
  return httpPost<CaseStep, Record<string, never>>(`/cases/${caseId}/steps/${stepKey}/complete`, {});
}

export async function closeCaseRecord(caseId: string): Promise<CaseRecord> {
  return httpPost<CaseRecord, Record<string, never>>(`/cases/${caseId}/close`, {});
}

export async function cancelCaseRecord(caseId: string, reason: string): Promise<CaseRecord> {
  return httpPost<CaseRecord, { reason: string }>(`/cases/${caseId}/cancel`, { reason });
}

export async function archiveCaseRecord(caseId: string): Promise<CaseRecord> {
  return httpPost<CaseRecord, Record<string, never>>(`/cases/${caseId}/archive`, {});
}

export async function fetchCaseComments(caseId: string): Promise<CaseComment[]> {
  return httpGet<CaseComment[]>(`/cases/${caseId}/comments`);
}

export async function addCaseComment(caseId: string, authorPersonId: string, body: string): Promise<CaseComment> {
  return httpPost<CaseComment, { authorPersonId: string; body: string }>(`/cases/${caseId}/comments`, { authorPersonId, body });
}

export interface CaseSlaStatus {
  caseId: string;
  deadline: string;
  escalationTier: 0 | 1 | 2;
  hoursOverdue: number;
  hoursRemaining: number;
  isOverdue: boolean;
}

export async function fetchCaseSlaStatus(caseId: string): Promise<CaseSlaStatus> {
  return httpGet<CaseSlaStatus>(`/cases/${caseId}/sla`);
}

export async function addCaseStep(caseId: string, displayName: string): Promise<CaseStep> {
  return httpPost<CaseStep, { displayName: string }>(`/cases/${caseId}/steps`, { displayName });
}

export async function removeCaseStep(caseId: string, stepKey: string): Promise<void> {
  await httpPost<{ success: boolean }, Record<string, never>>(`/cases/${caseId}/steps/${stepKey}/remove`, {});
}
