import { httpGet, httpPatch, httpPost } from './http-client';

export interface WorkEvidenceItem {
  activityDate: string;
  details?: Record<string, unknown>;
  effortHours: number;
  id: string;
  personId?: string;
  projectId?: string;
  recordedAt: string;
  sourceRecordKey: string;
  sourceType: string;
  summary?: string;
  trace?: Record<string, unknown>;
}

export interface WorkEvidenceResponse {
  items: WorkEvidenceItem[];
}

export interface WorkEvidenceQuery {
  dateFrom?: string;
  dateTo?: string;
  personId?: string;
  projectId?: string;
  sourceType?: string;
}

export interface CreateWorkEvidenceRequest {
  details?: Record<string, unknown>;
  effortHours: number;
  personId?: string;
  projectId?: string;
  recordedAt: string;
  sourceRecordKey: string;
  sourceType: string;
  summary?: string;
  trace?: Record<string, unknown>;
}

export async function fetchWorkEvidence(
  query: WorkEvidenceQuery = {},
): Promise<WorkEvidenceResponse> {
  const params = new URLSearchParams();

  if (query.personId) {
    params.set('personId', query.personId);
  }

  if (query.projectId) {
    params.set('projectId', query.projectId);
  }

  if (query.sourceType) {
    params.set('sourceType', query.sourceType);
  }

  if (query.dateFrom) {
    params.set('dateFrom', query.dateFrom);
  }

  if (query.dateTo) {
    params.set('dateTo', query.dateTo);
  }

  const suffix = params.toString();

  return httpGet<WorkEvidenceResponse>(`/work-evidence${suffix ? `?${suffix}` : ''}`);
}

export async function createWorkEvidence(
  request: CreateWorkEvidenceRequest,
): Promise<WorkEvidenceItem> {
  return httpPost<WorkEvidenceItem, CreateWorkEvidenceRequest>('/work-evidence', request);
}

export interface UpdateWorkEvidenceRequest {
  effortHours?: number;
  occurredOn?: string;
  sourceRecordKey?: string;
  summary?: string;
}

export async function updateWorkEvidence(
  id: string,
  request: UpdateWorkEvidenceRequest,
): Promise<WorkEvidenceItem> {
  return httpPatch<WorkEvidenceItem, UpdateWorkEvidenceRequest>(`/work-evidence/${id}`, request);
}
