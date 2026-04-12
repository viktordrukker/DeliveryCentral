import { httpGet, httpPost } from './http-client';

export type ExceptionCategory =
  | 'ASSIGNMENT_WITHOUT_EVIDENCE'
  | 'M365_RECONCILIATION_ANOMALY'
  | 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS'
  | 'RADIUS_RECONCILIATION_ANOMALY'
  | 'STALE_ASSIGNMENT_APPROVAL'
  | 'WORK_EVIDENCE_AFTER_ASSIGNMENT_END'
  | 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT';

export type ExceptionStatus = 'OPEN' | 'RESOLVED' | 'SUPPRESSED';

export interface ExceptionQueueItem {
  assignmentId?: string;
  category: ExceptionCategory;
  details?: Record<string, unknown>;
  id: string;
  observedAt: string;
  personDisplayName?: string;
  personId?: string;
  projectId?: string;
  projectName?: string;
  provider?: 'm365' | 'radius';
  sourceContext: 'assignment' | 'integration' | 'project' | 'work_evidence';
  status: ExceptionStatus;
  summary: string;
  targetEntityId: string;
  targetEntityType: string;
  workEvidenceId?: string;
}

export interface ExceptionResolutionResponse {
  exceptionId: string;
  resolution: string;
  resolvedAt: string;
  resolvedBy: string;
  status: 'RESOLVED' | 'SUPPRESSED';
}

export interface ExceptionQueueResponse {
  asOf: string;
  items: ExceptionQueueItem[];
  summary: {
    byCategory: Partial<Record<ExceptionCategory, number>>;
    open: number;
    total: number;
  };
}

export type ExceptionStatusFilter = '' | 'OPEN' | 'RESOLVED' | 'SUPPRESSED';

export async function resolveException(
  id: string,
  resolution: string,
  resolvedBy: string,
): Promise<ExceptionResolutionResponse> {
  return httpPost<ExceptionResolutionResponse, { resolution: string; resolvedBy: string }>(
    `/exceptions/${id}/resolve`,
    { resolution, resolvedBy },
  );
}

export async function suppressException(
  id: string,
  reason: string,
  suppressedBy: string,
): Promise<ExceptionResolutionResponse> {
  return httpPost<ExceptionResolutionResponse, { reason: string; suppressedBy: string }>(
    `/exceptions/${id}/suppress`,
    { reason, suppressedBy },
  );
}

export async function fetchExceptions(params?: {
  asOf?: string;
  category?: ExceptionCategory;
  limit?: number;
  provider?: 'm365' | 'radius';
  status?: ExceptionStatusFilter;
  targetEntityId?: string;
  targetEntityType?: string;
}): Promise<ExceptionQueueResponse> {
  const search = new URLSearchParams();
  if (params?.asOf) {
    search.set('asOf', params.asOf);
  }
  if (params?.category) {
    search.set('category', params.category);
  }
  if (typeof params?.limit === 'number') {
    search.set('limit', String(params.limit));
  }
  if (params?.provider) {
    search.set('provider', params.provider);
  }
  if (params?.status && params.status.length > 0) {
    search.set('status', params.status);
  }
  if (params?.targetEntityId?.trim()) {
    search.set('targetEntityId', params.targetEntityId.trim());
  }
  if (params?.targetEntityType?.trim()) {
    search.set('targetEntityType', params.targetEntityType.trim());
  }

  return httpGet<ExceptionQueueResponse>(
    `/exceptions${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}

export async function fetchExceptionById(id: string, params?: {
  asOf?: string;
}): Promise<ExceptionQueueItem> {
  const search = new URLSearchParams();
  if (params?.asOf) {
    search.set('asOf', params.asOf);
  }

  return httpGet<ExceptionQueueItem>(
    `/exceptions/${id}${search.size > 0 ? `?${search.toString()}` : ''}`,
  );
}

