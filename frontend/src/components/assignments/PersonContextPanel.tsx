import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkloadTimeline, type PlannedAssignment } from '@/components/staffing-desk/WorkloadTimeline';
import { PersonDirectoryItem } from '@/lib/api/person-directory';

interface PersonContextPanelProps {
  person: PersonDirectoryItem | null;
  planned?: PlannedAssignment;
}

export function PersonContextPanel({ person, planned }: PersonContextPanelProps): JSX.Element | null {
  if (!person) return null;

  return (
    <SectionCard title="Person Context">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{person.displayName}</span>
        <StatusBadge status={person.lifecycleStatus} />
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-1) var(--space-3)', fontSize: 12, margin: 0 }}>
        {person.grade ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Grade</dt>
            <dd style={{ margin: 0 }}>{person.grade}</dd>
          </>
        ) : null}
        {person.role ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Role</dt>
            <dd style={{ margin: 0 }}>{person.role}</dd>
          </>
        ) : null}
        {person.currentOrgUnit ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Org Unit</dt>
            <dd style={{ margin: 0 }}>{person.currentOrgUnit.name}</dd>
          </>
        ) : null}
        {person.currentLineManager ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Line Manager</dt>
            <dd style={{ margin: 0 }}>{person.currentLineManager.displayName}</dd>
          </>
        ) : null}
        {person.resourcePools.length > 0 ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Resource Pools</dt>
            <dd style={{ margin: 0 }}>{person.resourcePools.map((rp) => rp.name).join(', ')}</dd>
          </>
        ) : null}
        <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Assignments</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{person.currentAssignmentCount} active</dd>
      </dl>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <WorkloadTimeline
          personId={person.id}
          personStatus={person.lifecycleStatus}
          personTerminatedAt={person.terminatedAt}
          planned={planned}
        />
      </div>
    </SectionCard>
  );
}
