import { FormEvent, useEffect, useState } from 'react';

import { useTitleBarActions } from '@/app/title-bar-context';
import { CreateWorkEvidenceForm, CreateWorkEvidenceFormErrors, CreateWorkEvidenceFormValues } from '@/components/work-evidence/CreateWorkEvidenceForm';
import { exportToXlsx } from '@/lib/export';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipTrigger } from '@/components/common/TipBalloon';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { WorkEvidenceTable } from '@/components/work-evidence/WorkEvidenceTable';
import { useFilterParams } from '@/hooks/useFilterParams';
import { createWorkEvidence } from '@/lib/api/work-evidence';
import { useWorkEvidencePage } from '@/features/work-evidence/useWorkEvidencePage';

function makeInitialCreateValues(): CreateWorkEvidenceFormValues {
  const now = new Date();
  const localIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:00`;
  return {
    effortHours: '',
    personId: '',
    projectId: '',
    recordedAt: localIso,
    sourceRecordKey: '',
    sourceType: 'MANUAL',
    summary: '',
  };
}

export function WorkEvidencePage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const [filters, setFilters] = useFilterParams({ dateFrom: '', dateTo: '', person: '', project: '', source: '' });
  const [createValues, setCreateValues] = useState<CreateWorkEvidenceFormValues>(makeInitialCreateValues);
  const [createErrors, setCreateErrors] = useState<CreateWorkEvidenceFormErrors>({});
  const [createServerError, setCreateServerError] = useState<string>();
  const [createSuccess, setCreateSuccess] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = useWorkEvidencePage({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    person: filters.person,
    project: filters.project,
    source: filters.source,
  });

  useEffect(() => {
    setActions(
      <>
        {state.visibleItems.length > 0 ? (
          <button
            className="button button--secondary"
            disabled={state.isLoading}
            onClick={() => {
              exportToXlsx(
                state.visibleItems.map((e) => ({
                  'Effort Hours': e.effortHours,
                  'Recorded At': e.recordedAt,
                  'Source Type': e.sourceType,
                  Summary: e.summary ?? '',
                })),
                'work-evidence',
              );
            }}
            type="button"
          >
            Export XLSX
          </button>
        ) : null}
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.visibleItems, state.isLoading]);

  function handleCreateChange(field: keyof CreateWorkEvidenceFormValues, value: string): void {
    setCreateValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateCreateForm(values: CreateWorkEvidenceFormValues): CreateWorkEvidenceFormErrors {
    const errors: CreateWorkEvidenceFormErrors = {};

    if (!values.sourceType.trim()) {
      errors.sourceType = 'Source type is required.';
    }

    if (!values.sourceRecordKey.trim()) {
      errors.sourceRecordKey = 'Source record key is required.';
    }

    if (!values.recordedAt) {
      errors.recordedAt = 'Recorded at is required.';
    }

    const effort = Number(values.effortHours);
    if (!values.effortHours.trim()) {
      errors.effortHours = 'Effort hours are required.';
    } else if (Number.isNaN(effort) || effort <= 0) {
      errors.effortHours = 'Effort hours must be greater than zero.';
    }

    return errors;
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validateCreateForm(createValues);
    setCreateErrors(nextErrors);
    setCreateServerError(undefined);
    setCreateSuccess(undefined);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createWorkEvidence({
        effortHours: Number(createValues.effortHours),
        ...(createValues.personId ? { personId: createValues.personId } : {}),
        ...(createValues.projectId ? { projectId: createValues.projectId } : {}),
        recordedAt: new Date(createValues.recordedAt).toISOString(),
        sourceRecordKey: createValues.sourceRecordKey.trim(),
        sourceType: createValues.sourceType.trim(),
        ...(createValues.summary.trim() ? { summary: createValues.summary.trim() } : {}),
      });
      setCreateSuccess('Work evidence recorded.');
      setCreateValues(makeInitialCreateValues());
      state.reload();
    } catch (error) {
      setCreateServerError(
        error instanceof Error ? error.message : 'Failed to record work evidence.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer testId="work-evidence-page">
      <SectionCard title="Record Manual Work Evidence">
        {createServerError ? <ErrorState description={createServerError} /> : null}
        {createSuccess ? (
          <div className="success-banner" data-testid="work-evidence-success" role="status">
            {createSuccess}
          </div>
        ) : null}
        <CreateWorkEvidenceForm
          errors={createErrors}
          isSubmitting={isSubmitting}
          onChange={handleCreateChange}
          onSubmit={handleCreateSubmit}
          people={state.people}
          projects={state.projects}
          values={createValues}
        />
      </SectionCard>

      <FilterBar>
        <label className="field">
          <span className="field__label">Person</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ person: event.target.value })}
            placeholder="Filter by person name"
            type="search"
            value={filters.person}
          />
        </label>
        <label className="field">
          <span className="field__label">Project</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ project: event.target.value })}
            placeholder="Filter by project name"
            type="search"
            value={filters.project}
          />
        </label>
        <label className="field">
          <span className="field__label">Source</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ source: event.target.value })}
            placeholder="Example: JIRA or MANUAL"
            type="search"
            value={filters.source}
          />
        </label>
        <label className="field">
          <span className="field__label">Date From</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ dateFrom: event.target.value })}
            type="date"
            value={filters.dateFrom}
          />
        </label>
        <label className="field">
          <span className="field__label">Date To</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ dateTo: event.target.value })}
            type="date"
            value={filters.dateTo}
          />
        </label>
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <LoadingState label="Loading work evidence..." variant="skeleton" skeletonType="table" /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          <>
            {state.data && state.data.items.length > 0 ? (
              <div className="results-meta">
                <span>
                  Showing {state.visibleItems.length} of {state.data.items.length} evidence records
                </span>
              </div>
            ) : null}

            {state.visibleItems.length === 0 ? (
              <EmptyState
                action={{ href: '/work-evidence', label: 'Log Evidence' }}
                description="Observed work is enabled, but no evidence matched the current filters."
                title="No evidence logged"
              />
            ) : (
              <WorkEvidenceTable items={state.visibleItems} onUpdated={state.reload} />
            )}
          </>
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}
