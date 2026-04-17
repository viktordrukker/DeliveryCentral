import { StatusBadge } from '@/components/common/StatusBadge';
import type { ProjectExternalLink } from '@/lib/api/project-registry';

interface ExternalLinksPanelProps {
  links: ProjectExternalLink[];
}

const PROVIDER_ICONS: Record<string, string> = {
  JIRA: '\u{1F4CB}',
  CONFLUENCE: '\u{1F4D6}',
  GITHUB: '\u{1F4BB}',
  AZURE_DEVOPS: '\u2601\uFE0F',
  BITBUCKET: '\u{1F4E6}',
};

export function ExternalLinksPanel({ links }: ExternalLinksPanelProps): JSX.Element {
  if (links.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No external system links configured for this project.
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 'var(--space-3)',
    }}>
      {links.map((link) => (
        <div
          key={`${link.provider}-${link.externalProjectKey}`}
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card, 8px)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 18 }}>{PROVIDER_ICONS[link.provider] ?? '\u{1F517}'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{link.provider}</span>
            </div>
            <StatusBadge
              status={link.archived ? 'archived' : 'active'}
              label={link.archived ? 'Archived' : 'Active'}
              variant="chip"
            />
          </div>

          {/* Project name */}
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
            {link.externalProjectName}
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-muted)' }}>
            <span>Key: {link.externalProjectKey}</span>
            {link.providerEnvironment ? <span>Env: {link.providerEnvironment}</span> : null}
          </div>

          {/* Action */}
          {link.externalUrl ? (
            <a
              href={link.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="button button--secondary button--sm"
              style={{ alignSelf: 'flex-start', marginTop: 'auto', fontSize: 11 }}
            >
              Open in {link.provider}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
