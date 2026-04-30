import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';

import { BulkAssignmentForm } from '@/components/assignments/BulkAssignmentForm';
import { BulkAssignmentResults } from '@/components/assignments/BulkAssignmentResults';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  BulkAssignmentFormValues,
  useBulkAssignmentPage,
} from '@/features/assignments/useBulkAssignmentPage';
import { Button } from '@/components/ds';

const initialValues: BulkAssignmentFormValues = {
  actorId: '',
  allocationPercent: '',
  endDate: '',
  note: '',
  personIds: [],
  projectId: '',
  staffingRole: '',
  startDate: '',
};

export function BulkAssignmentPage(): JSX.Element {
  const { principal } = useAuth();
  const [values, setValues] = useState<BulkAssignmentFormValues>(initialValues);
  const state = useBulkAssignmentPage();

  useEffect(() => {
    if (principal?.personId && !values.actorId) {
      setValues((prev) => ({ ...prev, actorId: principal.personId! }));
    }
  }, [principal?.personId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const submitted = await state.submit(values);
    if (submitted) {
      setValues((current) => ({
        ...initialValues,
        actorId: current.actorId,
      }));
    }
  }

  function handleValueChange(field: keyof BulkAssignmentFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handlePersonToggle(personId: string): void {
    setValues((current) => ({
      ...current,
      personIds: current.personIds.includes(personId)
        ? current.personIds.filter((id) => id !== personId)
        : [...current.personIds, personId],
    }));
  }

  const canRenderForm = state.people.length > 0 && state.projects.length > 0;

  return (
    <PageContainer testId="bulk-assignment-page">
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/assignments">
            Back to assignments
          </Button>
        }
        eyebrow="Assignments"
        subtitle="Create multiple person-to-project assignments in one batch while keeping per-item results visible."
        title="Bulk Assignments"
      />

      {state.isLoadingOptions ? <LoadingState label="Loading bulk assignment options..." variant="skeleton" skeletonType="table" /> : null}
      {!state.isLoadingOptions && state.serverError && !canRenderForm ? (
        <ErrorState description={state.serverError} />
      ) : null}
      {!state.isLoadingOptions && !state.serverError && !canRenderForm ? (
        <SectionCard>
          <EmptyState
            description="People and project options are required before a batch can be submitted."
            title="Bulk assignment unavailable"
          />
        </SectionCard>
      ) : null}

      {!state.isLoadingOptions && canRenderForm ? (
        <SectionCard title="Bulk Assignment Request">
          {state.serverError ? <ErrorState description={state.serverError} /> : null}
          <BulkAssignmentForm
            errors={state.errors}
            isSubmitting={state.isSubmitting}
            onPersonToggle={handlePersonToggle}
            onSubmit={handleSubmit}
            onValueChange={handleValueChange}
            people={state.people}
            projects={state.projects}
            values={values}
          />
        </SectionCard>
      ) : null}

      {state.result ? (
        <BulkAssignmentResults
          people={state.people}
          projects={state.projects}
          result={state.result}
        />
      ) : null}
    </PageContainer>
  );
}
