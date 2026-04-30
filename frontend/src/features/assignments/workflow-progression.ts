import { type WorkflowStage } from '@/components/ds';
import { type AssignmentStatusValue } from '@/lib/api/assignments';

export interface NextStep {
  /** One-line headline shown on the Next Step card. */
  title: string;
  /** Plain-text rationale; what the action does and why it's needed. */
  body: string;
  /** Who has the ball — role label ("Resource Manager") or person displayName when known. */
  who: string;
  /** Optional CTA label. When undefined, the card shows the next step but no in-page action. */
  ctaLabel?: string;
  /** Stable name keyed off by the page so it can render the matching modal/drawer. */
  ctaKey?:
    | 'directorApprove'
    | 'scheduleOnboarding'
    | 'finalize'
    | 'resolveOnHold'
    | 'escalate';
}

// Assignment is born at BOOKED via the StaffingRequest pick flow. The earlier
// stages (DRAFT/CREATED/PROPOSED/IN_REVIEW) only appear on legacy rows; the
// inconsistency banner explains those.
const STAGE_ORDER: AssignmentStatusValue[] = [
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'COMPLETED',
];

const STAGE_LABEL: Record<AssignmentStatusValue, string> = {
  DRAFT: 'Draft',
  CREATED: 'Created',
  PROPOSED: 'Proposed',
  IN_REVIEW: 'In review',
  REJECTED: 'Rejected',
  BOOKED: 'Booked',
  ONBOARDING: 'Onboarding',
  ASSIGNED: 'Assigned',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Computes the workflow stages for a given assignment status, marking the
 * current stage and decorating any non-happy-path terminals (REJECTED /
 * CANCELLED / COMPLETED / ON_HOLD).
 */
export function buildWorkflowStages(status: AssignmentStatusValue): WorkflowStage[] {
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return STAGE_ORDER.map((stage) => ({
      key: stage,
      label: STAGE_LABEL[stage],
      status: 'blocked' as const,
    }));
  }

  if (status === 'COMPLETED') {
    return STAGE_ORDER.map((stage) => ({
      key: stage,
      label: STAGE_LABEL[stage],
      status: 'done' as const,
    }));
  }

  if (status === 'ON_HOLD') {
    return STAGE_ORDER.map((stage) => {
      const idx = STAGE_ORDER.indexOf(stage);
      if (idx <= STAGE_ORDER.indexOf('BOOKED')) {
        return { key: stage, label: STAGE_LABEL[stage], status: 'done' as const };
      }
      if (stage === 'ASSIGNED') {
        return { key: stage, label: STAGE_LABEL[stage], status: 'blocked' as const };
      }
      return { key: stage, label: STAGE_LABEL[stage], status: 'upcoming' as const };
    });
  }

  const currentIdx = STAGE_ORDER.indexOf(status);
  if (currentIdx === -1) {
    // Legacy pre-BOOKED status — banner explains; render canonical chain with no current.
    return STAGE_ORDER.map((stage) => ({
      key: stage,
      label: STAGE_LABEL[stage],
      status: 'upcoming' as const,
    }));
  }

  return STAGE_ORDER.map((stage, idx) => ({
    key: stage,
    label: STAGE_LABEL[stage],
    status:
      idx < currentIdx ? ('done' as const) : idx === currentIdx ? ('current' as const) : ('upcoming' as const),
  }));
}

interface NextStepInputs {
  status: AssignmentStatusValue;
  requiresDirectorApproval: boolean;
}

/**
 * Maps the current state to the next required step + the role/person that
 * needs to act. Pure function — UI consumers turn the `ctaKey` into the
 * matching modal trigger.
 */
export function buildNextStep(inputs: NextStepInputs): NextStep {
  const { status, requiresDirectorApproval } = inputs;

  // If director sign-off is still pending, surface the approve CTA regardless
  // of which forward state the assignment is currently in — otherwise rows
  // that slipped past BOOKED have no in-page route to the action.
  if (
    requiresDirectorApproval &&
    (status === 'BOOKED' ||
      status === 'ONBOARDING' ||
      status === 'ASSIGNED' ||
      status === 'ON_HOLD')
  ) {
    return {
      title: 'Director approval required',
      body: 'This assignment crossed the configured threshold (allocation or duration). A Director needs to sign off before the staffing record is fully approved.',
      who: 'Director',
      ctaLabel: 'Record Director approval',
      ctaKey: 'directorApprove',
    };
  }

  switch (status) {
    case 'DRAFT':
    case 'CREATED':
    case 'PROPOSED':
    case 'IN_REVIEW':
      return {
        title: 'Legacy workflow assignment',
        body: 'Pre-slate stages no longer apply in the new model. New work should start from a Staffing Request — see the banner above.',
        who: '—',
      };
    case 'BOOKED':
      // requiresDirectorApproval=true is handled by the early return above.
      return {
        title: 'Schedule onboarding',
        body: 'The candidate is booked. Capture the onboarding date so paperwork starts and the assignment progresses.',
        who: 'Project / Delivery Manager',
        ctaLabel: 'Schedule onboarding…',
        ctaKey: 'scheduleOnboarding',
      };
    case 'ONBOARDING':
      return {
        title: 'Finalize once paperwork is complete',
        body: 'Onboarding is in flight. Mark the assignment as fully ASSIGNED once paperwork is closed and the candidate has started.',
        who: 'Resource Manager',
        ctaLabel: 'Mark assigned',
        ctaKey: 'finalize',
      };
    case 'ASSIGNED':
      return {
        title: 'Active — no action required',
        body: 'The assignment is in flight. If something goes wrong (performance, time mismatch, scope drift), escalate it to a case.',
        who: 'Project Manager',
        ctaLabel: 'Escalate to a case…',
        ctaKey: 'escalate',
      };
    case 'ON_HOLD':
      return {
        title: 'Resolve the hold',
        body: 'The assignment is paused. Resolve the underlying issue (case, leave, scope change) and release back to ASSIGNED.',
        who: 'Project Manager / HR',
        ctaLabel: 'Release back to assigned',
        ctaKey: 'resolveOnHold',
      };
    case 'REJECTED':
      return {
        title: 'Rejected',
        body: 'This assignment was rejected. To restart staffing, open a new Staffing Request.',
        who: '—',
      };
    case 'COMPLETED':
      return {
        title: 'Completed',
        body: 'The assignment has finished. Nothing further is required.',
        who: '—',
      };
    case 'CANCELLED':
      return {
        title: 'Cancelled',
        body: 'The assignment was cancelled. The history below records the reason.',
        who: '—',
      };
    default:
      return { title: 'Unknown state', body: 'Status is not part of the canonical workflow.', who: '—' };
  }
}
