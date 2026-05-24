import { httpGet } from './http-client';

/** Issue 264 — unified approval queue. */
export type ApprovalQueueSource =
  | 'position-proposal'
  | 'budget'
  | 'activation'
  | 'leave'
  | 'case'
  | 'skill-review';

export type SlaStage = 'on-track' | 'due-soon' | 'breached';

export interface ApprovalQueuePersonSummaryDto {
  personId: string;
  displayName: string;
}

export interface ApprovalQueueItemDto {
  id: string;
  source: ApprovalQueueSource;
  title: string;
  submittedBy: ApprovalQueuePersonSummaryDto | null;
  submittedAt: string;
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  slaStage: SlaStage | null;
  ageHours: number;
  href: string;
  meta: Record<string, unknown>;
}

export interface ApprovalQueueResponseDto {
  items: ApprovalQueueItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchUnifiedApprovals(
  params: { sources?: ApprovalQueueSource[]; page?: number; pageSize?: number } = {},
): Promise<ApprovalQueueResponseDto> {
  const qs = new URLSearchParams();
  if (params.sources && params.sources.length > 0) qs.set('source', params.sources.join(','));
  if (params.page != null) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
  const suffix = qs.toString();
  return httpGet<ApprovalQueueResponseDto>(`/approvals/unified${suffix ? `?${suffix}` : ''}`);
}
