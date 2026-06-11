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

/**
 * PR-10 (Wave 4) — enriched `meta` payload for `source = 'position-proposal'`
 * items. Carries everything the approvals inspector needs to decide a
 * PROPOSED → BOOKED transition on one screen (UX Law 7): candidate identity,
 * allocation, engagement dates, owning project, and who proposed the fill.
 */
export interface PositionProposalQueueMetaDto {
  projectId: string;
  projectPublicId: string | null;
  projectName: string;
  candidatePersonId: string | null;
  candidateDisplayName: string | null;
  allocationPercent: number | null;
  /** ISO date (yyyy-mm-dd) — position engagement window. */
  startDate: string;
  endDate: string;
  proposedByDisplayName: string | null;
}

export interface ApprovalQueueItemDto {
  id: string;
  /**
   * W1-12 — opaque tenant-scoped publicId of the target aggregate when the
   * source aggregate carries one (ProjectPosition, LeaveRequest, CaseRecord,
   * TimesheetWeek), or of the related parent aggregate when the source itself
   * has none yet (Project publicId for budget/activation, Skill publicId for
   * skill-review). `null` when no publicId is available. FE callers prefer
   * this over the raw `id` when composing detail-page URLs.
   */
  targetPublicId: string | null;
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
