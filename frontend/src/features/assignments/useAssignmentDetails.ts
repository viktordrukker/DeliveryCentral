import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/http-client';
import {
  AmendAssignmentRequest,
  AssignmentDetails,
  AssignmentDecisionRequest,
  RevokeAssignmentRequest,
  amendAssignment,
  approveAssignment,
  endAssignment,
  EndAssignmentRequest,
  fetchAssignmentById,
  rejectAssignment,
  revokeAssignment,
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
      await loadAssignment(id);
      return true;
    } catch (amendError) {
      setError(amendError instanceof Error ? amendError.message : 'Amendment failed.');
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
      await loadAssignment(id);
      return true;
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Revoke failed.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
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
    successMessage,
  };
}
