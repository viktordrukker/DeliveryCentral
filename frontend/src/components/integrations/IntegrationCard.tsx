import { AdminIntegrationSummary } from '@/lib/api/admin';
import { IntegrationProviderKey } from '@/features/admin/useIntegrationAdmin';

import { StatusIndicator } from './StatusIndicator';

interface IntegrationCardProps {
  integration: AdminIntegrationSummary;
  isActive: boolean;
  onSelect: (provider: IntegrationProviderKey) => void;
}

export function IntegrationCard({
  integration,
  isActive,
  onSelect,
}: IntegrationCardProps): JSX.Element {
  return (
    <button
      className={`dictionary-list__item${isActive ? ' dictionary-list__item--active' : ''}`}
      onClick={() => onSelect(integration.provider as IntegrationProviderKey)}
      type="button"
    >
      <div className="dictionary-list__header">
        <span className="dictionary-list__title">{integration.provider.toUpperCase()}</span>
        <StatusIndicator status={integration.status} />
      </div>
      <p className="dictionary-list__meta">
        {integration.lastSyncSummary ?? integration.lastProjectSyncSummary ?? 'No sync summary yet.'}
      </p>
    </button>
  );
}
