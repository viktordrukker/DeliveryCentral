import { FormEvent, useEffect, useState } from 'react';

import { ProjectLifecycleFormValues } from '@/components/projects/ProjectLifecycleForm';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import {
  ProjectLifecycleRecord,
  createProject,
} from '@/lib/api/project-registry';

interface SelectOption {
  label: string;
  value: string;
}

interface ProjectLifecycleAdminState {
  createdProject: ProjectLifecycleRecord | null;
  error: string | null;
  errors: Partial<Record<keyof ProjectLifecycleFormValues, string>>;
  handleChange: (field: keyof ProjectLifecycleFormValues, value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  successMessage: string | null;
  values: ProjectLifecycleFormValues;
}

const initialValues: ProjectLifecycleFormValues = {
  description: '',
  name: '',
  plannedEndDate: '',
  projectManagerId: '',
  startDate: '',
};

export function useProjectLifecycleAdmin(): ProjectLifecycleAdminState {
  const [values, setValues] = useState(initialValues);
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<ProjectLifecycleRecord | null>(null);
  const [errors, setErrors] =
    useState<Partial<Record<keyof ProjectLifecycleFormValues, string>>>({});

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    void fetchPersonDirectory({ page: 1, pageSize: 100 })
      .then((response) => {
        if (!active) {
          return;
        }

        setManagerOptions(
          response.items
            .map((person) => ({
              label: person.displayName,
              value: person.id,
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : 'Failed to load project managers.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createProject({
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        name: values.name.trim(),
        ...(values.plannedEndDate ? { plannedEndDate: toIsoDate(values.plannedEndDate) } : {}),
        projectManagerId: values.projectManagerId,
        startDate: toIsoDate(values.startDate),
      });

      setCreatedProject(created);
      setSuccessMessage(`Created project ${created.name} in ${created.status}.`);
      setValues(initialValues);
      setErrors({});
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create project.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    createdProject,
    error,
    errors,
    handleChange: (field, value) => {
      setValues((current) => ({
        ...current,
        [field]: value,
      }));
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
      setSuccessMessage(null);
    },
    handleSubmit,
    isLoading,
    isSubmitting,
    managerOptions,
    successMessage,
    values,
  };
}

function validate(
  values: ProjectLifecycleFormValues,
): Partial<Record<keyof ProjectLifecycleFormValues, string>> {
  const result: Partial<Record<keyof ProjectLifecycleFormValues, string>> = {};

  if (!values.name.trim()) {
    result.name = 'Project name is required.';
  }

  if (!values.projectManagerId) {
    result.projectManagerId = 'Project manager is required.';
  }

  if (!values.startDate) {
    result.startDate = 'Start date is required.';
  }

  if (values.plannedEndDate && values.startDate && values.plannedEndDate < values.startDate) {
    result.plannedEndDate = 'Planned end date cannot be earlier than start date.';
  }

  return result;
}

function toIsoDate(value: string): string {
  return `${value}T00:00:00.000Z`;
}
