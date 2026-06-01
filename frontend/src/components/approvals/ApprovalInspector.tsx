import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar, Button, Textarea } from '@/components/ds';
import { Money } from '@/components/ds';
import { Pct } from '@/components/ds/Pct';
import { VarianceBar } from '@/components/ds';
import {
  decideApproval,
  type ApprovalQueueItemDto,
  type ApprovalQueueSource,
  type SlaStage,
} from '@/lib/api/approvals-unified';

interface ApprovalInspectorProps {
  item: ApprovalQueueItemDto;
  onClose: () => void;
  /** Optional — invoked after a successful approve/reject so the parent can refetch. */
  onDecided?: (decision: 'APPROVED' | 'REJECTED') => void;
}

const SOURCE_LABEL: Record<ApprovalQueueSource, string> = {
  'position-proposal': 'Position proposal',
  budget: 'Budget request',
  activation: 'Activation',
  leave: 'Leave request',
  case: 'Case',
  'skill-review': 'Skill review',
};

const SLA_TONE: Record<SlaStage, 'active' | 'warning' | 'danger'> = {
  'on-track': 'active',
  'due-soon': 'warning',
  breached: 'danger',
};

const SLA_LABEL: Record<SlaStage, string> = {
  'on-track': 'On track',
  'due-soon': 'Due soon',
  breached: 'Breached',
};

const S_PANEL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 16,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-card)',
};
const S_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};
const S_TITLE_BLOCK: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  flex: 1,
};
const S_SOURCE_TAG: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_TITLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.25,
  color: 'var(--color-text)',
};
const S_SUBMITTER_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'var(--color-text-muted)',
};
const S_CTX_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  paddingTop: 8,
  borderTop: '1px solid var(--color-border)',
};
const S_CTX_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_CTX_VALUE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  fontVariantNumeric: 'tabular-nums',
};
const S_SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
  marginBottom: 6,
};

function ageLabel(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function readNumber(meta: Record<string, unknown>, key: string): number | null {
  const value = meta[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

/**
 * V2-A.5 — one-screen-approval inspector per `DS/page-approvals.jsx:39-138`.
 *
 * Renders the per-row approval detail to satisfy UX Law 7 (all context needed
 * to approve or reject visible alongside the action buttons). Source-specific
 * meta fields are surfaced opportunistically: when known keys are present they
 * render with the matching DS atom (Money for currency, Pct for ratios,
 * VarianceBar for over/under deltas), otherwise the inspector falls back to a
 * generic key/value list.
 *
 * Approve/Reject/Escalate buttons in v1 toast a placeholder + invite the user
 * to deep-link into the source page for the canonical action. Wiring the
 * source-specific action endpoints is V2-A.5-followup.
 */
export function ApprovalInspector({ item, onClose, onDecided }: ApprovalInspectorProps): JSX.Element {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | 'escalate' | null>(null);

  // Known meta fields that drive richer rendering when present.
  const requestedAmount = readNumber(item.meta, 'requestedAmount') ?? readNumber(item.meta, 'amount');
  const currentAmount = readNumber(item.meta, 'currentAmount') ?? readNumber(item.meta, 'baselineAmount');
  const currency = readString(item.meta, 'currency') ?? 'USD';
  const variancePercent = readNumber(item.meta, 'variancePercent') ?? readNumber(item.meta, 'deltaPercent');
  const projectCode = readString(item.meta, 'projectCode');
  const projectName = readString(item.meta, 'projectName');
  const reason = readString(item.meta, 'reason') ?? readString(item.meta, 'justification');

  // V2-A.17 — leave-source specific meta. When the row is a leave request,
  // surface leave type / date range / business-day count / balance remaining
  // so the user can decide without leaving the approvals surface (folds the
  // time-management LeaveDecisionDrawer view into Approvals per reconciliation
  // §5). All keys are best-effort — backends are encouraged to populate them
  // for leave items but the inspector tolerates absence.
  const isLeave = item.source === 'leave';
  const leaveType = isLeave ? readString(item.meta, 'leaveType') : null;
  const leaveStart = isLeave ? readString(item.meta, 'leaveStartDate') ?? readString(item.meta, 'startDate') : null;
  const leaveEnd = isLeave ? readString(item.meta, 'leaveEndDate') ?? readString(item.meta, 'endDate') : null;
  const leaveBusinessDays = isLeave ? readNumber(item.meta, 'businessDays') ?? readNumber(item.meta, 'totalDays') : null;
  const leaveBalanceRemaining = isLeave ? readNumber(item.meta, 'balanceRemaining') ?? readNumber(item.meta, 'remainingDays') : null;
  const hasLeaveDetail = leaveType || leaveStart || leaveEnd || leaveBusinessDays != null || leaveBalanceRemaining != null;

  const showVariance = currentAmount != null && requestedAmount != null && currentAmount > 0;
  const computedVariancePct = showVariance
    ? Math.round(((requestedAmount - currentAmount) / currentAmount) * 100)
    : null;
  const effectiveVariancePct = variancePercent ?? computedVariancePct;

  async function handleAction(kind: 'approve' | 'reject' | 'escalate'): Promise<void> {
    setSubmitting(kind);
    if (kind === 'escalate') {
      // TODO V2-§4-PR2 — escalate routes through a dedicated endpoint (out of
      // scope for the decision PR). Keep the action discoverable so the
      // operator knows it exists.
      toast.info('Escalation is not yet wired — open the source page to escalate manually.', {
        description: `Open ${SOURCE_LABEL[item.source]} to escalate.`,
      });
      setSubmitting(null);
      return;
    }
    const decision = kind === 'approve' ? 'APPROVE' : 'REJECT';
    const trimmedComment = comment.trim() === '' ? undefined : comment.trim();
    try {
      const result = await decideApproval(item.id, item.source, decision, {
        comment: trimmedComment,
        // For sources that demand a reason on reject (budget / activation /
        // case) the BE returns 400 if missing — we pass the decision note
        // through as the reason so the operator can supply it inline.
        reason: decision === 'REJECT' ? trimmedComment : undefined,
      });
      toast.success(
        decision === 'APPROVE'
          ? `${SOURCE_LABEL[item.source]} approved.`
          : `${SOURCE_LABEL[item.source]} rejected.`,
      );
      onDecided?.(result.decision);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Could not ${kind} approval`, { description: message });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <aside style={S_PANEL} aria-label="Approval inspector" data-testid="approval-inspector">
      <div style={S_HEADER}>
        <div style={S_TITLE_BLOCK}>
          <span style={S_SOURCE_TAG}>{SOURCE_LABEL[item.source]}</span>
          <span style={S_TITLE}>{item.title}</span>
          <div style={S_SUBMITTER_ROW}>
            {item.submittedBy ? (
              <>
                <Avatar name={item.submittedBy.displayName} size="xs" />
                <span>{item.submittedBy.displayName}</span>
              </>
            ) : (
              <span>unknown submitter</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{ageLabel(item.ageHours)}</span>
            {item.slaStage ? (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={`badge badge-${SLA_TONE[item.slaStage]}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <span className="dot" />
                  {SLA_LABEL[item.slaStage]}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} type="button" aria-label="Close inspector">×</Button>
      </div>

      {/* 4-tile context strip */}
      <div style={S_CTX_GRID}>
        {projectCode || projectName ? (
          <div>
            <div style={S_CTX_LABEL}>Project</div>
            <div style={S_CTX_VALUE}>
              {projectCode ? <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>{projectCode}</span> : null}
              {projectName ?? '—'}
            </div>
          </div>
        ) : null}
        {currentAmount != null ? (
          <div>
            <div style={S_CTX_LABEL}>Current</div>
            <div style={S_CTX_VALUE}><Money value={currentAmount} currency={currency} /></div>
          </div>
        ) : null}
        {requestedAmount != null ? (
          <div>
            <div style={S_CTX_LABEL}>Requested</div>
            <div style={S_CTX_VALUE}><Money value={requestedAmount} currency={currency} /></div>
          </div>
        ) : null}
        {effectiveVariancePct != null ? (
          <div>
            <div style={S_CTX_LABEL}>Variance</div>
            <div style={S_CTX_VALUE}>
              <Pct value={effectiveVariancePct} sign tone="auto" fractionDigits={0} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Variance visualization */}
      {effectiveVariancePct != null ? (
        <div>
          <div style={S_SECTION_LABEL}>Variance vs current</div>
          <VarianceBar
            value={effectiveVariancePct}
            max={Math.max(50, Math.abs(effectiveVariancePct) * 1.5)}
            width={280}
            height={14}
            ariaLabel={`Variance ${effectiveVariancePct}%`}
          />
        </div>
      ) : null}

      {/* V2-A.17 — leave-specific detail block. Surfaces the LeaveDecisionDrawer
          context (type, date range, business-day count, balance impact)
          inline so the manager can decide on a leave request without the
          separate /time-management trip. */}
      {hasLeaveDetail ? (
        <div data-testid="approval-inspector-leave-detail">
          <div style={S_SECTION_LABEL}>Leave detail</div>
          <div style={S_CTX_GRID}>
            {leaveType ? (
              <div>
                <div style={S_CTX_LABEL}>Type</div>
                <div style={S_CTX_VALUE}>{leaveType}</div>
              </div>
            ) : null}
            {leaveStart || leaveEnd ? (
              <div>
                <div style={S_CTX_LABEL}>Dates</div>
                <div style={S_CTX_VALUE}>
                  {leaveStart ?? '—'}{leaveEnd && leaveEnd !== leaveStart ? ` → ${leaveEnd}` : ''}
                </div>
              </div>
            ) : null}
            {leaveBusinessDays != null ? (
              <div>
                <div style={S_CTX_LABEL}>Business days</div>
                <div style={S_CTX_VALUE}>{leaveBusinessDays}</div>
              </div>
            ) : null}
            {leaveBalanceRemaining != null ? (
              <div>
                <div style={S_CTX_LABEL}>Balance after</div>
                <div
                  style={{
                    ...S_CTX_VALUE,
                    color: leaveBalanceRemaining < 0 ? 'var(--color-status-danger)' : 'var(--color-text)',
                  }}
                >
                  {leaveBalanceRemaining}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Reason / justification */}
      {reason ? (
        <div>
          <div style={S_SECTION_LABEL}>Submitter rationale</div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{reason}</div>
        </div>
      ) : null}

      {/* Comment field */}
      <div>
        <div style={S_SECTION_LABEL}>Decision note (optional)</div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add context for the submitter (visible in the audit trail)…"
          rows={3}
        />
      </div>

      {/* 3-button footer */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button as={Link} variant="secondary" size="sm" to={item.href} aria-label="Open source page">
          Open source ↗
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          loading={submitting === 'escalate'}
          disabled={submitting !== null}
          onClick={() => handleAction('escalate')}
        >
          Escalate
        </Button>
        <Button
          variant="danger"
          size="sm"
          type="button"
          loading={submitting === 'reject'}
          disabled={submitting !== null}
          onClick={() => handleAction('reject')}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          loading={submitting === 'approve'}
          disabled={submitting !== null}
          onClick={() => handleAction('approve')}
        >
          Approve
        </Button>
      </div>
    </aside>
  );
}
