import { httpGet } from './http-client';

export interface BusinessAuditRecord {
  actionType: string;
  actorId?: string | null;
  actorDisplayName?: string | null;
  changeSummary?: string | null;
  correlationId?: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  targetEntityId?: string | null;
  targetEntityType: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface BusinessAuditResponse {
  items: BusinessAuditRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface BusinessAuditQuery {
  actionType?: string;
  actorId?: string;
  from?: string;
  page?: number;
  pageSize?: number;
  targetEntityId?: string;
  targetEntityType?: string;
  to?: string;
}

export async function fetchBusinessAudit(
  query: BusinessAuditQuery = {},
): Promise<BusinessAuditResponse> {
  const params = new URLSearchParams();

  if (query.actorId) {
    params.set('actorId', query.actorId);
  }

  if (query.actionType) {
    params.set('actionType', query.actionType);
  }

  if (query.targetEntityType) {
    params.set('targetEntityType', query.targetEntityType);
  }

  if (query.targetEntityId) {
    params.set('targetEntityId', query.targetEntityId);
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
  return httpGet<BusinessAuditResponse>(`/audit/business${suffix ? `?${suffix}` : ''}`);
}
