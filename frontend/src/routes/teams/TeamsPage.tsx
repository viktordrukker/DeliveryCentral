import { FormEvent, useState } from 'react';

import { TeamDetails } from '@/components/teams/TeamDetails';
import { TeamList } from '@/components/teams/TeamList';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  TeamFormValues,
  initialTeamFormValues,
  useTeamManagement,
} from '@/features/teams/useTeamManagement';

export function TeamsPage(): JSX.Element {
  const [values, setValues] = useState<TeamFormValues>(initialTeamFormValues);
  const state = useTeamManagement();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const created = await state.createTeam(values);
    if (created) {
      setValues(initialTeamFormValues);
    }
  }

  function handleChange(field: keyof TeamFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <PageContainer testId="teams-page">
      <PageHeader
        eyebrow="Teams"
        subtitle="Manage operational teams as distinct resource groups. Teams are not org units, even when they are optionally linked for reporting context."
        title="Teams"
      />

      {state.isLoading ? <LoadingState label="Loading teams..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? (
        <div className="success-banner" role="status">
          {state.successMessage}
        </div>
      ) : null}

      {!state.isLoading && !state.error ? (
        <div className="dictionary-admin-grid">
          <div className="dictionary-editor">
            <SectionCard title="Teams">
              {state.teams.length === 0 ? (
                <EmptyState
                  description="No teams are available yet."
                  title="No teams"
                />
              ) : (
                <TeamList
                  items={state.teams}
                  onSelect={state.selectTeam}
                  selectedId={state.selectedTeamId}
                />
              )}
            </SectionCard>

            <SectionCard title="Create Team">
              <form className="dictionary-entry-form" onSubmit={handleSubmit}>
                <div className="entity-form__grid">
                  <label className="field">
                    <span className="field__label">Team Name</span>
                    <input
                      className="field__control"
                      onChange={(event) => handleChange('name', event.target.value)}
                      placeholder="Example: Quality Engineering Squad"
                      type="text"
                      value={values.name}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Team Code</span>
                    <input
                      className="field__control"
                      onChange={(event) => handleChange('code', event.target.value)}
                      placeholder="TEAM-QA"
                      type="text"
                      value={values.code}
                    />
                  </label>
                  <label className="field field--full">
                    <span className="field__label">Description</span>
                    <textarea
                      className="field__control field__control--textarea"
                      onChange={(event) => handleChange('description', event.target.value)}
                      placeholder="Optional team description"
                      value={values.description}
                    />
                  </label>
                </div>
                <div className="entity-form__actions">
                  <button className="button" disabled={state.isSubmitting} type="submit">
                    {state.isSubmitting ? 'Creating...' : 'Create team'}
                  </button>
                </div>
              </form>
            </SectionCard>
          </div>

          <TeamDetails
            isSubmitting={state.isSubmitting}
            members={state.members}
            onAddMember={(personId) => state.updateMember(personId, 'add')}
            onRemoveMember={(personId) => state.updateMember(personId, 'remove')}
            people={state.people}
            team={state.selectedTeam}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
