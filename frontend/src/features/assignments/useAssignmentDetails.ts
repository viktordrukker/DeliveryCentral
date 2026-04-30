import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/http-client';
import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import {
  AmendAssignmentRequest,
  AssignmentDetails,
  AssignmentDecisionRequest,
  AssignmentStatusValue,
  RevokeAssignmentRequest,
  TransitionAssignmentRequest,
  amendAssignment,
  approveAssignment,
  endAssignment,
  EndAssignmentRequest,
  fetchAssignmentById,
  rejectAssignment,
  revokeAssignment,
  transitionAssignment,
} from '@/lib/api/assignments';

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
      const response = await fetchAssignmentById(targetId);
      setData(response);
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
        await approveAssignment(id, request);
        setSuccessMessage('Assignment approved successfully.');
      } else {
        await rejectAssignment(id, request);
        setSuccessMessage('Assignment rejected successfully.');
      }

      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
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
      await endAssignment(id, request);
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
      await amendAssignment(id, request);
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
      await transitionAssignment(id, target, request);
      setSuccessMessage(`Assignment moved to ${target.replace('_', ' ').toLowerCase()}.`);
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
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
      await revokeAssignment(id, request);
      setSuccessMessage('Assignment revoked.');
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      await loadAssignment(id);
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
