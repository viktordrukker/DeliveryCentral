import { httpGet } from './http-client';

/**
 * LEAN-P4c-2 — unified candidate queue across all OPEN/PROPOSED positions.
 *
 * Backend: `GET /api/staffing/candidates/queue?page&pageSize`
 * Sort order is server-controlled (oldest proposedAt first).
 */

export interface UnifiedCandidateQueueRow {
  candidateId: string;
  candidatePersonId: string;
  candidateName: string;
  positionId: string;
  positionPublicId: string | null;
  projectId: string;
  projectName: string;
  role: string;
  decision: string;
  decidedAt: string | null;
  proposedAt: string;
  timeInQueueHours: number;
  rank: number;
}

export interface UnifiedCandidateQueueResponse {
  rows: UnifiedCandidateQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchUnifiedCandidateQueue(params?: {
  page?: number;
  pageSize?: number;
}): Promise<UnifiedCandidateQueueResponse> {
  const p = new URLSearchParams();
  if (params?.page !== undefined) p.set('page', String(params.page));
  if (params?.pageSize !== undefined) p.set('pageSize', String(params.pageSize));
  const qs = p.toString();
  return httpGet<UnifiedCandidateQueueResponse>(
    `/staffing/candidates/queue${qs ? `?${qs}` : ''}`,
  );
}
