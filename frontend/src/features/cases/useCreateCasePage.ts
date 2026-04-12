import { FormEvent, useEffect, useMemo, useState } from 'react';

import { CaseFormValues } from '@/components/cases/CaseForm';
import { fetchAssignments, AssignmentDirectoryItem } from '@/lib/api/assignments';
import { CaseRecord, createCase } from '@/lib/api/cases';
import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';

interface UseCreateCasePageState {
  assignments: AssignmentDirectoryItem[];
  createdCase: CaseRecord | null;
  error: string | null;
  errors: Partial<Record<keyof CaseFormValues, string>>;
  handleSubmit: (event: FormEvent<HTMLFormElement>, values: CaseFormValues) => Promise<CaseRecord | null>;
  isLoadingOptions: boolean;
  isSubmitting: boolean;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  successMessage: string | null;
}

export function useCreateCasePage(): UseCreateCasePageState {
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [createdCase, setCreatedCase] = useState<CaseRecord | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CaseFormValues, string>>>({});

  useEffect(() => {
    let active = true;

    setIsLoadingOptions(true);
    setError(null);

    void Promise.all([
      fetchPersonDirectory({ page: 1, pageSize: 100 }),
      fetchProjectDirectory(),
      fetchAssignments(),
    ])
      .then(([peopleResponse, projectResponse, assignmentResponse]) => {
        if (!active) {
          return;
        }

        setPeople(peopleResponse.items);
        setProjects(projectResponse.items);
        setAssignments(assignmentResponse.items);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load case options.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      assignments,
      createdCase,
      error,
      errors,
      handleSubmit: async (event: FormEvent<HTMLFormElement>, values: CaseFormValues) => {
        event.preventDefault();

        const nextErrors = validate(values);
        setErrors(nextErrors);
        setError(null);
        setSuccessMessage(null);

        if (Object.keys(nextErrors).length > 0) {
          return null;
        }

        setIsSubmitting(true);

        try {
          const created = await createCase({
            caseTypeKey: (values.caseTypeKey || 'ONBOARDING') as 'ONBOARDING',
            ownerPersonId: values.ownerPersonId,
            ...(values.relatedAssignmentId ? { relatedAssignmentId: values.relatedAssignmentId } : {}),
            ...(values.relatedProjectId ? { relatedProjectId: values.relatedProjectId } : {}),
            subjectPersonId: values.subjectPersonId,
            ...(values.summary.trim() ? { summary: values.summary.trim() } : {}),
          });

          setCreatedCase(created);
          setSuccessMessage(`Created case ${created.caseNumber}.`);
          setErrors({});
          return created;
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create case.');
          return null;
        } finally {
          setIsSubmitting(false);
        }
      },
      isLoadingOptions,
      isSubmitting,
      people,
      projects,
      successMessage,
    }),
    [
      assignments,
      createdCase,
      error,
      errors,
      isLoadingOptions,
      isSubmitting,
      people,
      projects,
      successMessage,
    ],
  );
}

function validate(values: CaseFormValues): Partial<Record<keyof CaseFormValues, string>> {
  const result: Partial<Record<keyof CaseFormValues, string>> = {};

  if (!values.subjectPersonId) {
    result.subjectPersonId = 'Subject person is required.';
  }

  if (!values.ownerPersonId) {
    result.ownerPersonId = 'Owner is required.';
  }

  return result;
}
