import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/http-client';
import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import type {
  AmendAssignmentRequest,
  AssignmentDetails,
  AssignmentDecisionRequest,
  AssignmentStatusValue,
  EndAssignmentRequest,
  RevokeAssignmentRequest,
  TransitionAssignmentRequest,
} from '@/lib/api/assignments';
import {
  getProjectPositionById,
  transitionProjectPositionFill,
  type PositionFillStatus,
} from '@/lib/api/project-positions';
import {
  mapAssignmentStatusToFillStatus,
  mapPositionToDetails,
} from '@/features/lean-migration/position-to-assignment-mapper';
import { showUndoToast } from '@/lib/undo-toast';

interface AssignmentDetailsState {
  data?: AssignmentDetails;
  error?: string;
  isLoading: boolean;
  isSubmitting: boolean;
  notFound: boolean;
  runAmendAssignment: (request: AmendAssignmentRequest) => Promise<boolean>;
  runDecision: (
    decision: 'approve' | 'reject',
    request: AssignmentDecisionRequest,
  ) => Promise<boolean>;
  runEndAssignment: (request: EndAssignmentRequest) => Promise<boolean>;
  runRevokeAssignment: (request: RevokeAssignmentRequest) => Promise<boolean>;
  runTransition: (
    target: AssignmentStatusValue,
    request?: TransitionAssignmentRequest,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  successMessage?: string;
}

export function useAssignmentDetails(id: string | undefined): AssignmentDetailsState {
  const [data, setData] = useState<AssignmentDetails>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();

  async function loadAssignment(targetId: string): Promise<void> {
    setIsLoading(true);
    setError(undefined);
    setNotFound(false);

    try {
      // LEAN-P2-2: read from /project-positions and flatten back to
      // AssignmentDetails shape. Detail-only fields default until LEAN-P2-1
      // enriches the BE DTO (approvals + history arrays).
      const position = await getProjectPositionById(targetId);
      setData(mapPositionToDetails(position));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setNotFound(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load assignment details.');
      }
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    void loadAssignment(id);
  }, [id]);

  async function runDecision(
    decision: 'approve' | 'reject',
    request: AssignmentDecisionRequest,
  ): Promise<boolean> {
    if (!id) {
      setError('Assignment not found.');
      return false;
    }

    setIsSubmitting(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      if (decision === 'approve') {
        await transitionProjectPositionFill(id, {
          toStatus: 'BOOKED',
          reason: request.comment ?? request.reason,
        });
        setSuccessMessage('Assignment approved successfully.');
        window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
        await loadAssignment(id);
      } else {
        await transitionProjectPositionFill(id, {
          toStatus: 'RELEASED',
          reason: request.reason ?? request.comment,
        });
        setSuccessMessage('Assignment rejected successfully.');
        window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
        await loadAssignment(id);
        // LEAN-P2-2: undo is unsupported on the lean transition handler.
        // showUndoToast is invoked with `undefined` so the toast falls back
        // to a non-undoable success message — the operator can re-transition
        // manually if needed.
        showUndoToast({
          undoActionId: undefined,
          successMessage: 'Assignment cancelled.',
          onUndone: async () => {
            window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
            await loadAssignment(id);
          },
        });
      }
      return true;
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Assignment action failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runEndAssignment(request: EndAssignmentRequest): Promise<boolean> {
    if (!id) {
      setError('Assignment not found.');
      return false;
    }

    setIsSubmitting(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      // Legacy `endDate` body field (back-dated completion) is forwarded
      // into the canonical reason so the audit trail captures the operator's
      // intent. The lean handler treats validTo as "now".
      const reason = request.endDate
        ? `${request.reason ?? 'completed'} (endDate=${request.endDate})`
        : request.reason;
      await transitionProjectPositionFill(id, { toStatus: 'RELEASED', reason });
      setSuccessMessage('Assignment ended successfully.');
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
      return true;
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Assignment action failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runAmendAssignment(request: AmendAssignmentRequest): Promise<boolean> {
    if (!id) {
      setError('Assignment not found.');
      return false;
    }

    setIsSubmitting(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      // LEAN-P2: legacy PATCH /assignments/:id is not exposed by the lean
      // controller. Allocation/validTo amendments are recorded as a no-op
      // transition that re-asserts the current fill state with the new
      // bounds + a reason audit row. The lean handler treats
      // `allocationPercent` + `validTo` as patch fields in the audit ledger.
      const data = await getProjectPositionById(id);
      await transitionProjectPositionFill(id, {
        toStatus: data.fillStatus,
        ...(request.allocationPercent !== undefined ? { allocationPercent: request.allocationPercent } : {}),
        ...(request.validTo ? { validTo: request.validTo } : {}),
        reason:
          request.notes ??
          (request.staffingRole ? `Role updated to ${request.staffingRole}` : 'Amendment recorded.'),
      });
      setSuccessMessage('Assignment amended successfully.');
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
      return true;
    } catch (amendError) {
      setError(amendError instanceof Error ? amendError.message : 'Amendment failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runTransition(
    target: AssignmentStatusValue,
    request: TransitionAssignmentRequest = {},
  ): Promise<boolean> {
    if (!id) {
      setError('Assignment not found.');
      return false;
    }

    setIsSubmitting(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      const fillTarget: PositionFillStatus = mapAssignmentStatusToFillStatus(target);
      await transitionProjectPositionFill(id, {
        toStatus: fillTarget,
        reason: request.reason,
        caseId: request.caseId,
      });
      setSuccessMessage(`Assignment moved to ${target.replace('_', ' ').toLowerCase()}.`);
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
      if (target === 'CANCELLED') {
        showUndoToast({
          undoActionId: undefined,
          successMessage: 'Assignment cancelled.',
          onUndone: async () => {
            window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
            await loadAssignment(id);
          },
        });
      }
      return true;
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'Transition failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runRevokeAssignment(request: RevokeAssignmentRequest): Promise<boolean> {
    if (!id) {
      setError('Assignment not found.');
      return false;
    }

    setIsSubmitting(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      await transitionProjectPositionFill(id, {
        toStatus: 'RELEASED',
        reason: request.reason,
      });
      setSuccessMessage('Assignment revoked.');
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
      showUndoToast({
        undoActionId: undefined,
        successMessage: 'Assignment revoked.',
        onUndone: async () => {
          window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
          await loadAssignment(id);
        },
      });
      return true;
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Revoke failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refresh(): Promise<void> {
    if (!id) return;
    await loadAssignment(id);
  }

  return {
    data,
    error,
    isLoading,
    isSubmitting,
    notFound,
    runAmendAssignment,
    runDecision,
    runEndAssignment,
    runRevokeAssignment,
    runTransition,
    refresh,
    successMessage,
  };
}
