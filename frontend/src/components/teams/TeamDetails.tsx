import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { TeamMember, TeamSummary } from '@/lib/api/teams';
import { MemberSelector } from './MemberSelector';

interface TeamDetailsProps {
  isSubmitting: boolean;
  members: TeamMember[];
  onAddMember: (personId: string) => Promise<void>;
  onRemoveMember: (personId: string) => Promise<void>;
  people: PersonDirectoryItem[];
  team: TeamSummary | null;
}

export function TeamDetails({
  isSubmitting,
  members,
  onAddMember,
  onRemoveMember,
  people,
  team,
}: TeamDetailsProps): JSX.Element {
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);

  if (!team) {
    return (
      <SectionCard>
        <EmptyState
          description="Select a team to manage its members."
          title="No team selected"
        />
      </SectionCard>
    );
  }

  const memberToRemove = members.find((m) => m.id === confirmRemoveMemberId);

  return (
    <div className="dictionary-editor">
      <ConfirmDialog
        confirmLabel="Remove"
        message={memberToRemove ? `Remove ${memberToRemove.displayName} from this team?` : ''}
        onCancel={() => setConfirmRemoveMemberId(null)}
        onConfirm={() => {
          const id = confirmRemoveMemberId;
          setConfirmRemoveMemberId(null);
          if (id) void onRemoveMember(id);
        }}
        open={confirmRemoveMemberId !== null}
        title="Remove Team Member"
      />
      <SectionCard title={team.name}>
        <div className="section-card__actions-row section-card__actions-row--start">
          <Link className="button button--secondary" to={`/teams/${team.id}/dashboard`}>
            Open team dashboard
          </Link>
        </div>
        <div className="details-summary-grid">
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Code</span>
            <strong>{team.code}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Members</span>
            <strong>{team.memberCount}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Linked Org Unit</span>
            <strong>{team.orgUnit?.name ?? 'Not linked'}</strong>
          </div>
          <div className="section-card metadata-detail__stat">
            <span className="metric-card__label">Description</span>
            <strong>{team.description ?? 'No description'}</strong>
          </div>
        </div>
      </SectionCard>

      <div className="details-grid">
        <SectionCard title="Members">
          {members.length === 0 ? (
            <EmptyState
              description="This team does not have any active members yet."
              title="No members"
            />
          ) : (
            <div className="member-selector">
              {members.map((member) => (
                <div className="member-selector__item" key={member.id}>
                  <div>
                    <div className="dictionary-list__title">{member.displayName}</div>
                    <div className="dictionary-list__meta">
                      {member.currentOrgUnitName ?? 'No org unit'} |{' '}
                      {member.primaryEmail ?? 'No email'}
                    </div>
                  </div>
                  <button
                    className="button button--secondary"
                    disabled={isSubmitting}
                    onClick={() => setConfirmRemoveMemberId(member.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Add Members">
          <p className="dictionary-editor__copy">
            Teams are operational resource groups. They are managed independently from org unit
            structure, even if a team is optionally linked to an org unit for visibility.
          </p>
          <MemberSelector
            isSubmitting={isSubmitting}
            members={members}
            onAdd={onAddMember}
            people={people}
          />
        </SectionCard>
      </div>
    </div>
  );
}

