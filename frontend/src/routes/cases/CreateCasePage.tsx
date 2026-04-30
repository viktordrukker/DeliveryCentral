import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { CaseForm, CaseFormValues } from '@/components/cases/CaseForm';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useCreateCasePage } from '@/features/cases/useCreateCasePage';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Button } from '@/components/ds';

const initialValues: CaseFormValues = {
  caseTypeKey: 'ONBOARDING',
  ownerPersonId: '',
  relatedAssignmentId: '',
  relatedProjectId: '',
  subjectPersonId: '',
  summary: '',
};

export function CreateCasePage(): JSX.Element {
  const navigate = useNavigate();
  const [values, setValues] = useState<CaseFormValues>(initialValues);
  const state = useCreateCasePage();
  // FE-03: caseTypeKey defaults to ONBOARDING and is excluded from the dirty
  // check; only fields the user has actually filled in count.
  const isDirty =
    !state.createdCase &&
    (values.ownerPersonId !== '' ||
      values.relatedAssignmentId !== '' ||
      values.relatedProjectId !== '' ||
      values.subjectPersonId !== '' ||
      values.summary.trim() !== '');
  useUnsavedChangesWarning(isDirty);

  const canRenderForm = useMemo(() => state.people.length > 0, [state.people.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    const created = await state.handleSubmit(event, values);

    if (created) {
      navigate(`/cases/${created.id}`);
    }
  }

  function handleChange(field: keyof CaseFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <PageContainer testId="create-case-page">
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/cases">
            Back to cases
          </Button>
        }
        eyebrow="Cases"
        subtitle="Open a real operational case with explicit people and optional staffing context."
        title="Create Case"
      />

      {state.isLoadingOptions ? <LoadingState label="Loading case form options..." variant="skeleton" skeletonType="detail" /> : null}
      {!state.isLoadingOptions && state.error && !canRenderForm ? (
        <ErrorState description={state.error} />
      ) : null}
      {!state.isLoadingOptions && !state.error && !canRenderForm ? (
        <SectionCard>
          <EmptyState
            description="People must be available before a case can be opened."
            title="Case form unavailable"
          />
        </SectionCard>
      ) : null}

      {!state.isLoadingOptions && canRenderForm ? (
        <>
          {state.successMessage ? (
            <div className="success-banner" role="status">
              {state.successMessage}
            </div>
          ) : null}

          <div className="dashboard-main-grid">
            <SectionCard title="Case Intake">
              {state.error ? <ErrorState description={state.error} /> : null}
              <CaseForm
                assignments={state.assignments}
                errors={state.errors}
                isSubmitting={state.isSubmitting}
                onChange={handleChange}
                onSubmit={handleSubmit}
                people={state.people}
                projects={state.projects}
                values={values}
              />
            </SectionCard>

            <SectionCard title="Latest Created Case">
              {state.createdCase ? (
                <dl className="details-list">
                  <div>
                    <dt>Case Number</dt>
                    <dd>{state.createdCase.caseNumber}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{state.createdCase.status}</dd>
                  </div>
                  <div>
                    <dt>Next Step</dt>
                    <dd>
                      <Button as={Link} variant="secondary" to={`/cases/${state.createdCase.id}`}>
                        Open case detail
                      </Button>
                    </dd>
                  </div>
                </dl>
              ) : (
                <EmptyState
                  description="Create a case to review its details and linked context."
                  title="No case created yet"
                />
              )}
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
