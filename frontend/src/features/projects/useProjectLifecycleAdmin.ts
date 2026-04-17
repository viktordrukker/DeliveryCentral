import { FormEvent, useEffect, useState } from 'react';

import { ProjectLifecycleFormValues } from '@/components/projects/ProjectLifecycleForm';
import { fetchClients } from '@/lib/api/clients';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import {
  EngagementModel,
  ProjectLifecycleRecord,
  ProjectPriority,
  createProject,
} from '@/lib/api/project-registry';

interface SelectOption {
  label: string;
  value: string;
}

interface ProjectLifecycleAdminState {
  clientOptions: SelectOption[];
  createdProject: ProjectLifecycleRecord | null;
  error: string | null;
  errors: Partial<Record<keyof ProjectLifecycleFormValues, string>>;
  handleChange: (field: keyof ProjectLifecycleFormValues, value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  step: number;
  setStep: (step: number) => void;
  successMessage: string | null;
  values: ProjectLifecycleFormValues;
}

const initialValues: ProjectLifecycleFormValues = {
  clientId: '',
  deliveryManagerId: '',
  description: '',
  domain: '',
  engagementModel: '',
  name: '',
  plannedEndDate: '',
  priority: 'MEDIUM',
  projectManagerId: '',
  projectType: '',
  startDate: '',
  tags: '',
  techStack: '',
};

export function useProjectLifecycleAdmin(): ProjectLifecycleAdminState {
  const [values, setValues] = useState(initialValues);
  const [step, setStep] = useState(0);
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([]);
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
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

    Promise.all([
      fetchPersonDirectory({ page: 1, pageSize: 200 }),
      fetchClients().catch(() => [] as Array<{ id: string; name: string }>),
    ])
      .then(([personResponse, clientsResponse]) => {
        if (!active) return;

        setManagerOptions(
          personResponse.items
            .map((p) => ({ label: p.displayName, value: p.id }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );

        const clients = Array.isArray(clientsResponse) ? clientsResponse : [];
        setClientOptions(
          clients.map((c) => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Failed to load form data.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      // Jump to the first step with an error
      if (nextErrors.name || nextErrors.projectManagerId || nextErrors.startDate || nextErrors.plannedEndDate) {
        setStep(0);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createProject({
        ...(values.clientId ? { clientId: values.clientId } : {}),
        ...(values.deliveryManagerId ? { deliveryManagerId: values.deliveryManagerId } : {}),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        ...(values.domain ? { domain: values.domain } : {}),
        ...(values.engagementModel ? { engagementModel: values.engagementModel as EngagementModel } : {}),
        name: values.name.trim(),
        ...(values.plannedEndDate ? { plannedEndDate: toIsoDate(values.plannedEndDate) } : {}),
        ...(values.priority ? { priority: values.priority as ProjectPriority } : {}),
        projectManagerId: values.projectManagerId,
        ...(values.projectType.trim() ? { projectType: values.projectType.trim() } : {}),
        startDate: toIsoDate(values.startDate),
        ...(values.tags.trim() ? { tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
        ...(values.techStack.trim() ? { techStack: values.techStack.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
      });

      setCreatedProject(created);
      setSuccessMessage(`Created project ${created.name} in ${created.status}.`);
      setValues(initialValues);
      setErrors({});
      setStep(0);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    clientOptions,
    createdProject,
    error,
    errors,
    handleChange: (field, value) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      setSuccessMessage(null);
    },
    handleSubmit,
    isLoading,
    isSubmitting,
    managerOptions,
    step,
    setStep,
    successMessage,
    values,
  };
}

function validate(
  values: ProjectLifecycleFormValues,
): Partial<Record<keyof ProjectLifecycleFormValues, string>> {
  const result: Partial<Record<keyof ProjectLifecycleFormValues, string>> = {};

  if (!values.name.trim()) result.name = 'Project name is required.';
  if (!values.projectManagerId) result.projectManagerId = 'Project manager is required.';
  if (!values.startDate) result.startDate = 'Start date is required.';
  if (values.plannedEndDate && values.startDate && values.plannedEndDate < values.startDate) {
    result.plannedEndDate = 'Planned end date cannot be earlier than start date.';
  }

  return result;
}

function toIsoDate(value: string): string {
  return `${value}T00:00:00.000Z`;
}
