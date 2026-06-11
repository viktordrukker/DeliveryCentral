import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { hasAnyRole, POSITION_DECIDE_ROLES } from '@/app/route-manifest';
import { Avatar, Button, Textarea } from '@/components/ds';
import { Money } from '@/components/ds';
import { Pct } from '@/components/ds/Pct';
import { VarianceBar } from '@/components/ds';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  decideApproval,
  type ApprovalQueueItemDto,
  type ApprovalQueueSource,
  type SlaStage,
} from '@/lib/api/approvals-unified';
import { BudgetApprovalInspector } from './BudgetApprovalInspector';

// SoT PR 11 — Escalate button stays HIDDEN per the source-of-truth rule:
// no generic POST /api/approvals/:id/escalate endpoint exists, so a visible
// CTA would violate UX Law 2 (no dead-end screens). Operators escalate via
// the source-specific page reached through the "Open source ↗" link.

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
  timesheet: 'Timesheet',
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
const S_KBD: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 20,
  height: 20,
  padding: '0 5px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-strong)',
  borderBottomWidth: 2,
  borderRadius: 4,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  flexShrink: 0,
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
 * SoT PR 11 — one-screen-approval inspector per `DS/page-approvals.jsx:39-138`.
 *
 * Sources `'budget'` delegate to {@link BudgetApprovalInspector} which renders
 * the full DS canvas — 4 key-figure tiles (Baseline / Actuals YTD / EAC /
 * Variance), VarianceBar breakdown rows, Sparkline forecast, required comment
 * textarea, and A/R kbd hints. All other sources render the generic layout
 * below (project / current / requested / variance tiles + optional leave or
 * reason blocks), keeping the same comment/footer pattern.
 */
export function ApprovalInspector({ item, onClose, onDecided }: ApprovalInspectorProps): JSX.Element {
  const { principal } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);

  // Known meta fields that drive richer rendering when present.
  const requestedAmount = readNumber(item.meta, 'requestedAmount') ?? readNumber(item.meta, 'amount');
  const currentAmount = readNumber(item.meta, 'currentAmount') ?? readNumber(item.meta, 'baselineAmount');
  const currency = readString(item.meta, 'currency') ?? 'USD';
  const variancePercent = readNumber(item.meta, 'variancePercent') ?? readNumber(item.meta, 'deltaPercent');
  const projectCode = readString(item.meta, 'projectCode');
  const projectName = readString(item.meta, 'projectName');
  const reason = readString(item.meta, 'reason') ?? readString(item.meta, 'justification');

  // V2-A.17 — leave-source meta fields surfaced inline so HR/managers decide
  // without leaving Approvals.
  const isLeave = item.source === 'leave';
  const leaveType = isLeave ? readString(item.meta, 'leaveType') : null;
  const leaveStart = isLeave ? readString(item.meta, 'leaveStartDate') ?? readString(item.meta, 'startDate') : null;
  const leaveEnd = isLeave ? readString(item.meta, 'leaveEndDate') ?? readString(item.meta, 'endDate') : null;
  const leaveBusinessDays = isLeave ? readNumber(item.meta, 'businessDays') ?? readNumber(item.meta, 'totalDays') : null;
  const leaveBalanceRemaining = isLeave ? readNumber(item.meta, 'balanceRemaining') ?? readNumber(item.meta, 'remainingDays') : null;
  const hasLeaveDetail = leaveType || leaveStart || leaveEnd || leaveBusinessDays != null || leaveBalanceRemaining != null;

  // PR-10 — position-proposal meta surfaced inline so the decision happens on
  // one screen (UX Law 7): candidate identity, allocation, engagement dates,
  // and who proposed the fill. Project name renders via the shared Project tile.
  const isPositionProposal = item.source === 'position-proposal';
  const candidateName = isPositionProposal ? readString(item.meta, 'candidateDisplayName') : null;
  const positionAllocation = isPositionProposal ? readNumber(item.meta, 'allocationPercent') : null;
  const positionStart = isPositionProposal ? readString(item.meta, 'startDate') : null;
  const positionEnd = isPositionProposal ? readString(item.meta, 'endDate') : null;
  const proposedBy = isPositionProposal ? readString(item.meta, 'proposedByDisplayName') : null;
  const hasPositionDetail =
    candidateName || positionAllocation != null || positionStart || positionEnd || proposedBy;

  // PR-10 — only POSITION_DECIDE_ROLES can drive PROPOSED → BOOKED / OPEN; for
  // everyone else (e.g. HR who sees the unified queue) the decision buttons
  // would 403, so hide them and show a quiet view-only hint instead.
  const canDecide =
    !isPositionProposal || hasAnyRole(principal?.roles, POSITION_DECIDE_ROLES);

  const showVariance = currentAmount != null && requestedAmount != null && currentAmount > 0;
  const computedVariancePct = showVariance
    ? Math.round(((requestedAmount - currentAmount) / currentAmount) * 100)
    : null;
  const effectiveVariancePct = variancePercent ?? computedVariancePct;

  async function handleAction(kind: 'approve' | 'reject'): Promise<void> {
    setSubmitting(kind);
    const decision = kind === 'approve' ? 'APPROVE' : 'REJECT';
    const trimmedComment = comment.trim() === '' ? undefined : comment.trim();
    try {
      const result = await decideApproval(item.id, item.source, decision, {
        comment: trimmedComment,
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

  // SoT PR 11 — budget approvals get the full DS canvas inspector. Other
  // sources share the same wrapper so the keyboard model + footer + comment
  // pattern stay identical across sources.
  const isBudget = item.source === 'budget';

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
                <StatusBadge
                  tone={SLA_TONE[item.slaStage]}
                  label={SLA_LABEL[item.slaStage]}
                  variant="chip"
                />
              </>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} type="button" aria-label="Close inspector">×</Button>
      </div>

      {isBudget ? (
        <BudgetApprovalInspector
          meta={item.meta}
          currency={currency}
          fallback={{
            projectCode,
            projectName,
            currentAmount,
            requestedAmount,
            variancePercent: effectiveVariancePct,
          }}
        />
      ) : (
        <>
          {/* 4-tile context strip for non-budget sources */}
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

          {hasPositionDetail ? (
            <div data-testid="approval-inspector-position-detail">
              <div style={S_SECTION_LABEL}>Proposed fill</div>
              <div style={S_CTX_GRID}>
                {candidateName ? (
                  <div>
                    <div style={S_CTX_LABEL}>Candidate</div>
                    <div style={S_CTX_VALUE}>{candidateName}</div>
                  </div>
                ) : null}
                {positionAllocation != null ? (
                  <div>
                    <div style={S_CTX_LABEL}>Allocation</div>
                    <div style={S_CTX_VALUE}>
                      <Pct value={positionAllocation} fractionDigits={0} />
                    </div>
                  </div>
                ) : null}
                {positionStart || positionEnd ? (
                  <div>
                    <div style={S_CTX_LABEL}>Dates</div>
                    <div style={S_CTX_VALUE}>
                      {positionStart ?? '—'}{positionEnd && positionEnd !== positionStart ? ` → ${positionEnd}` : ''}
                    </div>
                  </div>
                ) : null}
                {proposedBy ? (
                  <div>
                    <div style={S_CTX_LABEL}>Proposed by</div>
                    <div style={S_CTX_VALUE}>{proposedBy}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {reason ? (
            <div>
              <div style={S_SECTION_LABEL}>Submitter rationale</div>
              <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{reason}</div>
            </div>
          ) : null}
        </>
      )}

      {/* Comment field — DS canvas marks this required. Empty submissions are
          still accepted by the backend; the label communicates intent. Hidden
          for view-only roles since there is no decision to comment on. */}
      {canDecide ? (
        <div>
          <div style={S_SECTION_LABEL}>
            Decision comment <span style={{ color: 'var(--color-text-subtle)' }}>(required)</span>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add context for the submitter (visible in the audit trail)…"
            rows={3}
          />
        </div>
      ) : null}

      {/* Footer — Open source ↗ deep-link + Reject + Approve + A/R kbd hints.
          Escalate stays hidden because no generic /api/approvals/:id/escalate
          endpoint exists (UX Law 2 — no dead-end CTAs). */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
        data-testid="approval-inspector-footer"
      >
        {canDecide ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginRight: 'auto',
              color: 'var(--color-text-muted)',
              fontSize: 11,
            }}
            data-testid="approval-inspector-kbd-hints"
          >
            <span style={S_KBD}>A</span>
            <span>Approve</span>
            <span aria-hidden="true">·</span>
            <span style={S_KBD}>R</span>
            <span>Reject</span>
          </span>
        ) : (
          // PR-10 — quiet hint instead of decision buttons whose request would
          // 403 (PROPOSED → BOOKED is gated to POSITION_DECIDE_ROLES).
          <span
            style={{
              marginRight: 'auto',
              color: 'var(--color-text-muted)',
              fontSize: 11,
            }}
            data-testid="approval-inspector-viewonly-hint"
          >
            View only — position proposals are decided by a PM, DM, Director, or Admin.
          </span>
        )}
        <Button as={Link} variant="secondary" size="sm" to={item.href} aria-label="Open source page">
          Open source ↗
        </Button>
        {canDecide ? (
          <>
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
          </>
        ) : null}
      </div>
    </aside>
  );
}

