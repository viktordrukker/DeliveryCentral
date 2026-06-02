/**
 * FE-#264 — unified approval queue item.
 *
 * Superset of the per-source approval shapes. SLA fields come from
 * issue #257; v1 leaves them as null until that lands.
 */

export type ApprovalQueueSource =
  | 'position-proposal'
  | 'budget'
  | 'activation'
  | 'leave'
  | 'case'
  | 'skill-review'
  | 'timesheet';

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
