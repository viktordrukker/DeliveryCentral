import { useEffect, useMemo, useState } from 'react';

import type {
  BulkAssignmentEntryRequest,
  BulkAssignmentResponse,
} from '@/lib/api/assignments';
import { PersonDirectoryItem, fetchPersonDirectory } from '@/lib/api/person-directory';
import { ProjectDirectoryItem, fetchProjectDirectory } from '@/lib/api/project-registry';
import {
  createProjectPosition,
  transitionProjectPositionFill,
} from '@/lib/api/project-positions';
import { mapPositionToAssignmentResponse } from '@/features/lean-migration/position-to-assignment-mapper';

export interface BulkAssignmentFormValues {
  actorId: string;
  allocationPercent: string;
  endDate: string;
  note: string;
  personIds: string[];
  projectId: string;
  staffingRole: string;
  startDate: string;
}

export interface BulkAssignmentFormErrors {
  actorId?: string;
  allocationPercent?: string;
  endDate?: string;
  personIds?: string;
  projectId?: string;
  staffingRole?: string;
  startDate?: string;
}

interface BulkAssignmentPageState {
  errors: BulkAssignmentFormErrors;
  isLoadingOptions: boolean;
  isSubmitting: boolean;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  result?: BulkAssignmentResponse;
  serverError?: string;
  submit: (values: BulkAssignmentFormValues) => Promise<boolean>;
}

function validate(values: BulkAssignmentFormValues): BulkAssignmentFormErrors {
  const errors: BulkAssignmentFormErrors = {};

  if (!values.actorId) {
    errors.actorId = 'Requester is required.';
  }

  if (!values.projectId) {
    errors.projectId = 'Project is required.';
  }

  if (!values.staffingRole.trim()) {
    errors.staffingRole = 'Staffing role is required.';
  }

  if (values.personIds.length === 0) {
    errors.personIds = 'Select at least one employee.';
  }

  const allocation = Number(values.allocationPercent);
  if (!values.allocationPercent.trim()) {
    errors.allocationPercent = 'Allocation percent is required.';
  } else if (Number.isNaN(allocation) || allocation <= 0 || allocation > 100) {
    errors.allocationPercent = 'Allocation percent must be greater than 0 and no more than 100.';
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'End date must be on or after the start date.';
  }

  return errors;
}

export function useBulkAssignmentPage(): BulkAssignmentPageState {
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [errors, setErrors] = useState<BulkAssignmentFormErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [result, setResult] = useState<BulkAssignmentResponse>();

  useEffect(() => {
    let active = true;

    setIsLoadingOptions(true);
    setServerError(undefined);

    void Promise.all([
      fetchPersonDirectory({ page: 1, pageSize: 100 }),
      fetchProjectDirectory(),
    ])
      .then(([peopleResponse, projectsResponse]) => {
        if (!active) {
          return;
        }

        setPeople(peopleResponse.items);
        setProjects(projectsResponse.items);
        setIsLoadingOptions(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setServerError(
          error instanceof Error ? error.message : 'Failed to load bulk assignment options.',
        );
        setIsLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = useMemo(
    () => async (values: BulkAssignmentFormValues): Promise<boolean> => {
      const nextErrors = validate(values);
      setErrors(nextErrors);
      setServerError(undefined);
      setResult(undefined);

      if (Object.keys(nextErrors).length > 0) {
        return false;
      }

      setIsSubmitting(true);

      // LEAN-P2-2: the lean API has no bulk endpoint; instead, each entry
      // runs the two-step (createProjectPosition + transition to BOOKED)
      // flow individually. Failures are aggregated into the legacy
      // BulkAssignmentResponse envelope so consumers don't change.
      const allocation = Number(values.allocationPercent);
      const role = values.staffingRole.trim();
      const entryTemplate: BulkAssignmentEntryRequest = {
        allocationPercent: allocation,
        ...(values.endDate ? { endDate: values.endDate } : {}),
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
        personId: '',
        projectId: values.projectId,
        staffingRole: role,
        startDate: values.startDate,
      };
      const entries: BulkAssignmentEntryRequest[] = values.personIds.map((personId) => ({
        ...entryTemplate,
        personId,
      }));

      try {
        const results = await Promise.all(
          entries.map(async (entry, index) => {
            try {
              const position = await createProjectPosition({
                projectId: entry.projectId,
                role: entry.staffingRole,
                requiredAllocationPercent: entry.allocationPercent,
                startDate: entry.startDate,
                endDate: entry.endDate || entry.startDate,
                summary: entry.note,
                requestedByPersonId: values.actorId || undefined,
                openImmediately: true,
              });
              const filled = await transitionProjectPositionFill(position.id, {
                toStatus: 'BOOKED',
                personId: entry.personId,
                allocationPercent: entry.allocationPercent,
                validFrom: entry.startDate,
                ...(entry.endDate ? { validTo: entry.endDate } : {}),
              });
              return {
                kind: 'ok' as const,
                index,
                assignment: mapPositionToAssignmentResponse(filled),
              };
            } catch (err) {
              return {
                kind: 'err' as const,
                index,
                entry,
                message: err instanceof Error ? err.message : 'Create failed.',
              };
            }
          }),
        );

        const createdItems = results
          .filter((r): r is Extract<typeof r, { kind: 'ok' }> => r.kind === 'ok')
          .map((r) => ({ index: r.index, assignment: r.assignment }));
        const failedItems = results
          .filter((r): r is Extract<typeof r, { kind: 'err' }> => r.kind === 'err')
          .map((r) => ({
            code: 'CREATE_FAILED',
            index: r.index,
            message: r.message,
            personId: r.entry.personId,
            projectId: r.entry.projectId,
            staffingRole: r.entry.staffingRole,
          }));

        const response: BulkAssignmentResponse = {
          createdCount: createdItems.length,
          createdItems,
          failedCount: failedItems.length,
          failedItems,
          message:
            failedItems.length === 0
              ? `Created ${createdItems.length} assignment(s).`
              : `Created ${createdItems.length} of ${entries.length} assignment(s); ${failedItems.length} failed.`,
          strategy: 'PARTIAL_SUCCESS',
          totalCount: entries.length,
        };
        setErrors({});
        setResult(response);
        return true;
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : 'Failed to submit bulk assignment batch.',
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    errors,
    isLoadingOptions,
    isSubmitting,
    people,
    projects,
    result,
    serverError,
    submit,
  };
}
