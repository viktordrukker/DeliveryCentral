import { useEffect, useMemo, useState } from 'react';

import {
  CreateAssignmentOverrideRequest,
  CreateAssignmentRequest,
  ProjectAssignmentResponse,
  createAssignment,
  createAssignmentOverride,
} from '@/lib/api/assignments';
import { ApiError } from '@/lib/api/http-client';
import { PersonDirectoryItem, fetchPersonDirectory } from '@/lib/api/person-directory';
import { ProjectDirectoryItem, fetchProjectDirectory } from '@/lib/api/project-registry';

export interface CreateAssignmentFormValues {
  actorId: string;
  allocationPercent: string;
  customRole: string;
  endDate: string;
  note: string;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
}

export interface CreateAssignmentFormErrors {
  actorId?: string;
  allocationPercent?: string;
  customRole?: string;
  endDate?: string;
  personId?: string;
  projectId?: string;
  staffingRole?: string;
  startDate?: string;
}

interface SubmitOptions {
  draft?: boolean;
  personValidated?: boolean;
}

interface CreateAssignmentPageState {
  clearOverridePrompt: () => void;
  errors: CreateAssignmentFormErrors;
  isLoadingOptions: boolean;
  isSubmittingOverride: boolean;
  isSubmitting: boolean;
  overrideCandidate?: CreateAssignmentOverrideRequest;
  overrideSuccess?: ProjectAssignmentResponse;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  selectedPerson: PersonDirectoryItem | null;
  selectedProject: ProjectDirectoryItem | null;
  serverError?: string;
  success?: ProjectAssignmentResponse;
  submit: (values: CreateAssignmentFormValues, options?: SubmitOptions) => Promise<ProjectAssignmentResponse | null>;
  submitOverride: (reason: string) => Promise<ProjectAssignmentResponse | null>;
}

function resolveStaffingRole(values: CreateAssignmentFormValues): string {
  if (values.staffingRole === '__custom__') return values.customRole.trim();
  return values.staffingRole.trim();
}

function validate(values: CreateAssignmentFormValues): CreateAssignmentFormErrors {
  const errors: CreateAssignmentFormErrors = {};

  if (!values.actorId) {
    errors.actorId = 'Requester is required.';
  }

  if (!values.personId) {
    errors.personId = 'Person is required.';
  }

  if (!values.projectId) {
    errors.projectId = 'Project is required.';
  }

  if (!values.staffingRole) {
    errors.staffingRole = 'Staffing role is required.';
  } else if (values.staffingRole === '__custom__' && !values.customRole.trim()) {
    errors.customRole = 'Custom role is required.';
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

export function useCreateAssignmentPage(personId?: string, projectId?: string): CreateAssignmentPageState {
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [errors, setErrors] = useState<CreateAssignmentFormErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [success, setSuccess] = useState<ProjectAssignmentResponse>();
  const [overrideSuccess, setOverrideSuccess] = useState<ProjectAssignmentResponse>();
  const [overrideCandidate, setOverrideCandidate] = useState<CreateAssignmentOverrideRequest>();
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const selectedPerson = useMemo(
    () => (personId ? people.find((p) => p.id === personId) ?? null : null),
    [people, personId],
  );

  const selectedProject = useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) ?? null : null),
    [projects, projectId],
  );

  useEffect(() => {
    let active = true;

    setIsLoadingOptions(true);
    setServerError(undefined);

    void Promise.all([
      fetchPersonDirectory({ page: 1, pageSize: 200 }),
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
          error instanceof Error ? error.message : 'Failed to load assignment form options.',
        );
        setIsLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = useMemo(
    () => async (values: CreateAssignmentFormValues, options?: SubmitOptions): Promise<ProjectAssignmentResponse | null> => {
      const nextErrors = validate(values);
      setErrors(nextErrors);
      setServerError(undefined);
      setSuccess(undefined);
      setOverrideSuccess(undefined);

      if (Object.keys(nextErrors).length > 0) {
        return null;
      }

      setIsSubmitting(true);

      const effectiveRole = resolveStaffingRole(values);

      try {
        const request: CreateAssignmentRequest = {
          actorId: values.actorId,
          allocationPercent: Number(values.allocationPercent),
          personId: values.personId,
          projectId: values.projectId,
          staffingRole: effectiveRole,
          startDate: values.startDate,
          ...(values.endDate ? { endDate: values.endDate } : {}),
          ...(values.note.trim() ? { note: values.note.trim() } : {}),
          ...(options?.draft ? { draft: true } : {}),
          ...(options?.personValidated ? { personValidated: true } : {}),
        };

        const response = await createAssignment(request);
        setSuccess(response);
        setOverrideCandidate(undefined);
        setErrors({});
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create assignment.';
        setServerError(message);

        if (
          (error instanceof ApiError && error.status === 409) ||
          message === 'Overlapping assignment for the same person and project already exists.'
        ) {
          setOverrideCandidate({
            allocationPercent: Number(values.allocationPercent),
            ...(values.endDate ? { endDate: values.endDate } : {}),
            ...(values.note.trim() ? { note: values.note.trim() } : {}),
            personId: values.personId,
            projectId: values.projectId,
            reason: '',
            staffingRole: effectiveRole,
            startDate: values.startDate,
          });
        } else {
          setOverrideCandidate(undefined);
        }

        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const submitOverride = useMemo(
    () => async (reason: string): Promise<ProjectAssignmentResponse | null> => {
      if (!overrideCandidate) {
        setServerError('No override-ready assignment request is available.');
        return null;
      }

      setIsSubmittingOverride(true);
      setServerError(undefined);
      setSuccess(undefined);
      setOverrideSuccess(undefined);

      try {
        const response = await createAssignmentOverride({
          ...overrideCandidate,
          reason: reason.trim(),
        });

        setOverrideSuccess(response);
        setSuccess(response);
        setOverrideCandidate(undefined);
        return response;
      } catch (error) {
        setServerError(error instanceof Error ? error.message : 'Failed to apply assignment override.');
        return null;
      } finally {
        setIsSubmittingOverride(false);
      }
    },
    [overrideCandidate],
  );

  return {
    clearOverridePrompt: () => setOverrideCandidate(undefined),
    errors,
    isLoadingOptions,
    isSubmittingOverride,
    isSubmitting,
    overrideCandidate,
    overrideSuccess,
    people,
    projects,
    selectedPerson,
    selectedProject,
    serverError,
    submit,
    submitOverride,
    success,
  };
}
