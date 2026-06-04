import { Link } from 'react-router-dom';

import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Button } from '@/components/ds';
import type { CaseRecord } from '@/lib/api/cases';
import { formatDateShort } from '@/lib/format-date';

interface CaseInspectorProps {
  row: CaseRecord;
  onClose: () => void;
  /**
   * SCOPED-MIN-2 — prev/next stepper across the visible cases page,
   * mirroring PersonDirectoryInspector so the row-click pattern reads
   * uniformly across V2 Operational Queue + List-Detail surfaces.
   */
  position?: { index: number; total: number; onPrev?: () => void; onNext?: () => void };
}

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
const S_IDENTITY: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flex: 1,
};
const S_META_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
  paddingTop: 8,
  borderTop: '1px solid var(--color-border)',
};
const S_META_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_META_VALUE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
};

/**
 * SCOPED-MIN-2 — Operational Queue grammar for /cases. Right-pane
 * inspector rendered when a row in the queue is selected, so triagers
 * can read SLA + ownership + participants without leaving the queue
 * (UX Law 3: no context loss after row-click).
 */
function statusTone(status: string): StatusTone {
  switch (status) {
    case 'OPEN':
      return 'pending';
    case 'IN_PROGRESS':
      return 'info';
    case 'APPROVED':
    case 'COMPLETED':
      return 'active';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    case 'ARCHIVED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function CaseInspector({ row, onClose, position }: CaseInspectorProps): JSX.Element {
  const subtitleParts = [row.caseTypeDisplayName, `Opened ${formatDateShort(row.openedAt)}`];

  return (
    <aside style={S_PANEL} aria-label="Case inspector" data-testid="case-inspector">
      <div style={S_HEADER}>
        <div style={S_IDENTITY}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{row.caseNumber}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {subtitleParts.join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {position ? (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
              data-testid="case-inspector-stepper"
            >
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onPrev}
                onClick={position.onPrev}
                aria-label="Previous case"
              >
                {'‹'}
              </Button>
              <span
                className="compact muted"
                style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center' }}
              >
                {position.index + 1} / {position.total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onNext}
                onClick={position.onNext}
                aria-label="Next case"
              >
                {'›'}
              </Button>
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            type="button"
            aria-label="Close inspector"
          >
            {'×'}
          </Button>
        </div>
      </div>

      <div style={S_META_ROW}>
        <div>
          <div style={S_META_LABEL}>Status</div>
          <div style={S_META_VALUE}>
            <StatusBadge
              tone={statusTone(row.status)}
              label={row.status}
              variant="chip"
              size="small"
            />
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Participants</div>
          <div style={{ ...S_META_VALUE, fontVariantNumeric: 'tabular-nums' }}>
            {row.participants.length + 2}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Subject</div>
          <div style={S_META_VALUE} title={row.subjectPersonId}>
            {row.subjectPersonName ?? row.subjectPersonId}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Owner</div>
          <div style={S_META_VALUE} title={row.ownerPersonId}>
            {row.ownerPersonName ?? row.ownerPersonId}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={S_META_LABEL}>Summary</div>
          <div style={{ ...S_META_VALUE, fontWeight: 400, fontSize: 12 }}>
            {row.summary ?? (
              <span style={{ color: 'var(--color-text-muted)' }}>No summary</span>
            )}
          </div>
        </div>
        {row.closedAt ? (
          <div>
            <div style={S_META_LABEL}>Closed</div>
            <div style={{ ...S_META_VALUE, fontVariantNumeric: 'tabular-nums' }}>
              {formatDateShort(row.closedAt)}
            </div>
          </div>
        ) : null}
        {row.cancelReason ? (
          <div style={{ gridColumn: '1 / -1' }} data-testid="case-inspector-cancel-reason">
            <div style={S_META_LABEL}>Cancel reason</div>
            <div style={{ ...S_META_VALUE, fontWeight: 400, fontSize: 12 }}>{row.cancelReason}</div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button as={Link} variant="primary" size="sm" to={`/cases/${row.id}`}>
          Open case
        </Button>
      </div>
    </aside>
  );
}
