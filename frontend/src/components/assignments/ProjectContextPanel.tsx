import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { humanizeEnum } from '@/lib/labels';

interface ProjectContextPanelProps {
  project: ProjectDirectoryItem | null;
}

export function ProjectContextPanel({ project }: ProjectContextPanelProps): JSX.Element | null {
  if (!project) return null;

  return (
    <SectionCard title="Project Context">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</span>
        <StatusBadge status={project.status} />
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-1) var(--space-3)', fontSize: 12, margin: 0 }}>
        <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Project Code</dt>
        <dd style={{ margin: 0, fontFamily: 'monospace' }}>{project.projectCode}</dd>

        <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Client</dt>
        <dd style={{ margin: 0 }}>{project.clientName ?? 'Internal'}</dd>

        {project.engagementModel ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Engagement</dt>
            <dd style={{ margin: 0 }}>{humanizeEnum(project.engagementModel)}</dd>
          </>
        ) : null}

        {project.priority ? (
          <>
            <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Priority</dt>
            <dd style={{ margin: 0 }}><StatusBadge status={project.priority} /></dd>
          </>
        ) : null}

        <dt style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Team Size</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{project.assignmentCount} assigned</dd>
      </dl>
    </SectionCard>
  );
}
