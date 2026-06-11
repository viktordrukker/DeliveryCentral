import { useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PersonSelect } from '@/components/common/PersonSelect';
import {
  hasAnyRole,
  POSITION_DECIDE_ROLES,
  POSITION_PROPOSE_ROLES,
  POSITION_RELEASE_ROLES,
} from '@/app/route-manifest';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import type { StaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';
import { positionRef, toLeanFillStatus } from '@/features/staffing-desk/staffing-desk.types';
import { Button, Modal } from '@/components/ds';

const BTN: React.CSSProperties = { fontSize: 10, padding: '2px 8px' };

// Lean states where someone is actively engaged on the position — the End
// action (→ RELEASED with reason) applies.
const ACTIVE_FILL_STATES: ReadonlySet<string> = new Set([
  'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD',
]);

type DialogKind = 'reject' | 'end' | 'release' | 'cancel';

const DIALOG_COPY: Record<DialogKind, { title: string; message: string }> = {
  reject: {
    title: 'Reject Candidate',
    message: 'The candidate is rejected and the position returns to the open queue. Provide a reason.',
  },
  end: {
    title: 'End Position',
    message: 'The person rolls off and the position is released. Provide a reason.',
  },
  release: {
    title: 'Release Candidate',
    message: 'The proposed candidate is released and the position returns to the open queue. Provide a reason.',
  },
  cancel: {
    title: 'Cancel Position',
    message: 'This position will be released as cancelled. This cannot be undone. Provide a reason.',
  },
};

interface Props {
  actions: StaffingDeskActions;
  row: StaffingDeskRow;
}

/**
 * PR-13 — inline actions aligned with the lean fill state machine.
 * Row statuses are normalized to the lean vocabulary via `toLeanFillStatus`
 * and every action emits the canonical position reference (`positionRef`),
 * never the legacy assignment/request row id.
 */
export function StaffingDeskInlineActions({ actions, row }: Props): JSX.Element | null {
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposePersonId, setProposePersonId] = useState('');

  const canPropose = hasAnyRole(roles, POSITION_PROPOSE_ROLES);
  const canDecide = hasAnyRole(roles, POSITION_DECIDE_ROLES);
  const canRelease = hasAnyRole(roles, POSITION_RELEASE_ROLES);

  const lean = toLeanFillStatus(row.status);
  const ref = positionRef(row);

  function handleConfirm(reason?: string): void {
    const r = reason ?? '';
    switch (dialog) {
      case 'reject':
        void actions.rejectAssignment(ref, r);
        break;
      case 'end':
        void actions.endAssignment(ref, r);
        break;
      case 'release':
        void actions.releaseRequest(ref, r);
        break;
      case 'cancel':
        void actions.cancelRequest(ref, r);
        break;
    }
    setDialog(null);
  }

  function closePropose(): void {
    setProposeOpen(false);
    setProposePersonId('');
  }

  function handlePropose(): void {
    if (!proposePersonId) return;
    void actions.reviewRequest(ref, proposePersonId);
    closePropose();
  }

  const showApprove = row.kind === 'assignment' && lean === 'PROPOSED' && canDecide;
  const showEnd = row.kind === 'assignment' && ACTIVE_FILL_STATES.has(lean) && canRelease;
  const showPropose = row.kind === 'request' && lean === 'OPEN' && canPropose;
  const showRelease = row.kind === 'request' && lean === 'PROPOSED' && canDecide;
  const showCancel = row.kind === 'request' && lean !== 'RELEASED' && canRelease;

  if (!showApprove && !showEnd && !showPropose && !showRelease && !showCancel) return null;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {showApprove && (
        <>
          <Button variant="primary" size="sm" onClick={() => void actions.approveAssignment(ref)} type="button" style={BTN}>
            Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDialog('reject')} type="button" style={BTN}>
            Reject
          </Button>
        </>
      )}
      {showEnd && (
        <Button variant="secondary" size="sm" onClick={() => setDialog('end')} type="button" style={BTN}>
          End
        </Button>
      )}
      {showPropose && (
        <Button variant="primary" size="sm" onClick={() => setProposeOpen(true)} type="button" style={BTN}>
          Propose
        </Button>
      )}
      {showRelease && (
        <Button variant="secondary" size="sm" onClick={() => setDialog('release')} type="button" style={BTN}>
          Release
        </Button>
      )}
      {showCancel && (
        <Button variant="secondary" size="sm" onClick={() => setDialog('cancel')} type="button" style={{ ...BTN, color: 'var(--color-status-danger)' }}>
          Cancel
        </Button>
      )}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog ? DIALOG_COPY[dialog].title : ''}
        message={dialog ? DIALOG_COPY[dialog].message : ''}
        requireReason
        onCancel={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <Modal
        open={proposeOpen}
        onClose={closePropose}
        title="Propose Candidate"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closePropose} type="button">
              Cancel
            </Button>
            <Button variant="primary" disabled={!proposePersonId} onClick={handlePropose} type="button">
              Confirm Proposal
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0 }}>
          Proposing moves &ldquo;{row.role}&rdquo; on {row.projectName} to PROPOSED for the selected candidate.
        </p>
        <PersonSelect label="Candidate" value={proposePersonId} onChange={setProposePersonId} required />
      </Modal>
    </div>
  );
}
