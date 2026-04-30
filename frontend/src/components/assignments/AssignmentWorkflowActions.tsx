import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { AssignmentStatusValue } from '@/lib/api/assignments';
import { Button } from '@/components/ds';
import {
  type AssignmentTransitionRule,
  availableTransitions,
} from '@/lib/assignment-transitions';

export interface AssignmentWorkflowActionsProps {
  currentStatus: string;
  isSubmitting: boolean;
  onTransition: (target: AssignmentStatusValue, options: { reason?: string }) => Promise<void>;
  userRoles: readonly string[];
  /** When true, BOOKED forward transitions are hidden until the director records approval. */
  requiresDirectorApproval?: boolean;
}

type DialogState = {
  open: boolean;
  rule?: AssignmentTransitionRule;
};

function toneToButtonVariant(tone: AssignmentTransitionRule['tone']): 'primary' | 'secondary' | 'danger' {
  switch (tone) {
    case 'primary':
      return 'primary';
    case 'danger':
      return 'danger';
    case 'warning':
      return 'secondary';
    case 'secondary':
    default:
      return 'secondary';
  }
}

function humanTarget(target: AssignmentStatusValue): string {
  return target.replace('_', ' ').toLowerCase();
}

export function AssignmentWorkflowActions({
  currentStatus,
  isSubmitting,
  onTransition,
  userRoles,
  requiresDirectorApproval = false,
}: AssignmentWorkflowActionsProps): JSX.Element | null {
  const rules = useMemo(
    () => availableTransitions(currentStatus, userRoles, { requiresDirectorApproval }),
    [currentStatus, userRoles, requiresDirectorApproval],
  );
  const [dialog, setDialog] = useState<DialogState>({ open: false });

  if (rules.length === 0) {
    return null;
  }

  function openDialog(rule: AssignmentTransitionRule): void {
    setDialog({ open: true, rule });
  }

  function closeDialog(): void {
    setDialog({ open: false });
  }

  const activeRule = dialog.rule;

  return (
    <div className="workflow-panel" data-testid="assignment-workflow-actions">
      {activeRule ? (
        <ConfirmDialog
          confirmLabel={activeRule.label}
          message={
            activeRule.requiresReason
              ? `A reason is required to transition to ${humanTarget(activeRule.to)}.`
              : `Confirm transition to ${humanTarget(activeRule.to)}?`
          }
          onCancel={closeDialog}
          onConfirm={(reason?: string) => {
            closeDialog();
            void onTransition(activeRule.to, { reason });
          }}
          open={dialog.open}
          requireReason={activeRule.requiresReason ?? false}
          title={activeRule.label}
        />
      ) : null}

      <div className="workflow-panel__actions" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {rules.map((rule) => (
          <Button
            variant={toneToButtonVariant(rule.tone)}
            data-testid={`transition-${rule.to.toLowerCase()}`}
            disabled={isSubmitting}
            key={rule.to}
            onClick={() => openDialog(rule)}
            type="button"
          >
            {isSubmitting ? 'Submitting...' : rule.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
