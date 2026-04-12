import { useEffect, useMemo, useState } from 'react';

import { AdminIntegrationSummary, fetchAdminIntegrations } from '@/lib/api/admin';
import {
  IntegrationSyncHistoryItem,
  M365ReconciliationReview,
  M365IntegrationStatus,
  RadiusReconciliationReview,
  RadiusIntegrationStatus,
  fetchIntegrationSyncHistory,
  fetchAdminJiraStatus,
  fetchAdminM365Reconciliation,
  fetchAdminM365Status,
  fetchAdminRadiusReconciliation,
  fetchAdminRadiusStatus,
  triggerAdminJiraSync,
  triggerAdminM365Sync,
  triggerAdminRadiusSync,
} from '@/lib/api/integrations-admin';
import { JiraIntegrationStatus } from '@/lib/api/jira-integrations';

export type IntegrationProviderKey = 'jira' | 'm365' | 'radius';

export type IntegrationStatusRecord =
  | JiraIntegrationStatus
  | M365IntegrationStatus
  | RadiusIntegrationStatus;

interface IntegrationAdminState {
  error: string | null;
  integrations: AdminIntegrationSummary[];
  isLoading: boolean;
  isSyncing: boolean;
  integrationSyncHistory: IntegrationSyncHistoryItem[];
  m365Reconciliation: M365ReconciliationReview | null;
  m365ReconciliationFilter: {
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
    query: string;
  };
  radiusReconciliation: RadiusReconciliationReview | null;
  radiusReconciliationFilter: {
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
    query: string;
  };
  refresh: () => Promise<void>;
  refreshM365Reconciliation: () => Promise<void>;
  refreshRadiusReconciliation: () => Promise<void>;
  selectedIntegration: AdminIntegrationSummary | null;
  selectedProvider: IntegrationProviderKey | null;
  selectProvider: (provider: IntegrationProviderKey) => void;
  setM365ReconciliationFilter: (
    update: Partial<{
      category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
      query: string;
    }>,
  ) => void;
  setRadiusReconciliationFilter: (
    update: Partial<{
      category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
      query: string;
    }>,
  ) => void;
  statusByProvider: Partial<Record<IntegrationProviderKey, IntegrationStatusRecord>>;
  successMessage: string | null;
  triggerSync: (provider: IntegrationProviderKey) => Promise<void>;
}

export function useIntegrationAdmin(): IntegrationAdminState {
  const [integrations, setIntegrations] = useState<AdminIntegrationSummary[]>([]);
  const [statusByProvider, setStatusByProvider] = useState<
    Partial<Record<IntegrationProviderKey, IntegrationStatusRecord>>
  >({});
  const [integrationSyncHistory, setIntegrationSyncHistory] = useState<IntegrationSyncHistoryItem[]>(
    [],
  );
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProviderKey | null>(null);
  const [m365Reconciliation, setM365Reconciliation] = useState<M365ReconciliationReview | null>(
    null,
  );
  const [radiusReconciliation, setRadiusReconciliation] =
    useState<RadiusReconciliationReview | null>(null);
  const [m365ReconciliationFilter, setM365ReconciliationFilterState] = useState<{
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
    query: string;
  }>({
    category: 'ALL',
    query: '',
  });
  const [radiusReconciliationFilter, setRadiusReconciliationFilterState] = useState<{
    category: 'ALL' | 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
    query: string;
  }>({
    category: 'ALL',
    query: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedIntegration = useMemo(
    () =>
      selectedProvider
        ? integrations.find((integration) => integration.provider === selectedProvider) ?? null
        : null,
    [integrations, selectedProvider],
  );

  async function load(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const adminIntegrations = await fetchAdminIntegrations();
      const providerKeys = adminIntegrations.integrations.map(
        (item) => item.provider,
      ) as IntegrationProviderKey[];

      const providerStatuses = await Promise.all(
        providerKeys.map(async (provider) => {
          switch (provider) {
            case 'jira':
              return [provider, await fetchAdminJiraStatus()] as const;
            case 'm365':
              return [provider, await fetchAdminM365Status()] as const;
            case 'radius':
              return [provider, await fetchAdminRadiusStatus()] as const;
          }
        }),
      );

      setIntegrations(adminIntegrations.integrations);
      setStatusByProvider(Object.fromEntries(providerStatuses));
      setSelectedProvider((current) => current ?? providerKeys[0] ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load integrations.');
      setIntegrations([]);
      setStatusByProvider({});
      setSelectedProvider(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedProvider !== 'm365') {
      return;
    }

    void loadM365Reconciliation();
  }, [selectedProvider, m365ReconciliationFilter.category, m365ReconciliationFilter.query]);

  useEffect(() => {
    if (selectedProvider !== 'radius') {
      return;
    }

    void loadRadiusReconciliation();
  }, [selectedProvider, radiusReconciliationFilter.category, radiusReconciliationFilter.query]);

  useEffect(() => {
    if (!selectedProvider) {
      setIntegrationSyncHistory([]);
      return;
    }

    void loadIntegrationSyncHistory(selectedProvider);
  }, [selectedProvider]);

  async function loadM365Reconciliation(): Promise<void> {
    try {
      const review = await fetchAdminM365Reconciliation({
        category:
          m365ReconciliationFilter.category === 'ALL'
            ? undefined
            : m365ReconciliationFilter.category,
        query: m365ReconciliationFilter.query,
      });
      setM365Reconciliation(review);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Failed to load M365 reconciliation review.',
      );
      setM365Reconciliation(null);
    }
  }

  async function loadRadiusReconciliation(): Promise<void> {
    try {
      const review = await fetchAdminRadiusReconciliation({
        category:
          radiusReconciliationFilter.category === 'ALL'
            ? undefined
            : radiusReconciliationFilter.category,
        query: radiusReconciliationFilter.query,
      });
      setRadiusReconciliation(review);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Failed to load RADIUS reconciliation review.',
      );
      setRadiusReconciliation(null);
    }
  }

  async function loadIntegrationSyncHistory(provider: IntegrationProviderKey): Promise<void> {
    try {
      const history = await fetchIntegrationSyncHistory({
        limit: 10,
        provider,
      });
      setIntegrationSyncHistory(history);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load integration sync history.');
      setIntegrationSyncHistory([]);
    }
  }

  async function triggerSync(provider: IntegrationProviderKey): Promise<void> {
    setIsSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      switch (provider) {
        case 'jira': {
          const result = await triggerAdminJiraSync();
          setSuccessMessage(
            `Jira sync completed. Created ${result.projectsCreated}, updated ${result.projectsUpdated}.`,
          );
          break;
        }
        case 'm365': {
          const result = await triggerAdminM365Sync();
          setSuccessMessage(
            `M365 sync completed. Created ${result.employeesCreated}, linked ${result.employeesLinked}.`,
          );
          break;
        }
        case 'radius': {
          const result = await triggerAdminRadiusSync();
          setSuccessMessage(
            `RADIUS sync completed. Imported ${result.accountsImported}, linked ${result.accountsLinked}.`,
          );
          break;
        }
      }

      await load();
      await loadIntegrationSyncHistory(provider);
      if (provider === 'm365') {
        await loadM365Reconciliation();
      }
      if (provider === 'radius') {
        await loadRadiusReconciliation();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to trigger integration sync.');
    } finally {
      setIsSyncing(false);
    }
  }

  return {
    error,
    integrations,
    isLoading,
    isSyncing,
    integrationSyncHistory,
    m365Reconciliation,
    m365ReconciliationFilter,
    radiusReconciliation,
    radiusReconciliationFilter,
    refresh: load,
    refreshM365Reconciliation: loadM365Reconciliation,
    refreshRadiusReconciliation: loadRadiusReconciliation,
    selectedIntegration,
    selectedProvider,
    selectProvider: setSelectedProvider,
    setM365ReconciliationFilter: (update) =>
      setM365ReconciliationFilterState((current) => ({
        category: update.category ?? current.category,
        query: update.query ?? current.query,
      })),
    setRadiusReconciliationFilter: (update) =>
      setRadiusReconciliationFilterState((current) => ({
        category: update.category ?? current.category,
        query: update.query ?? current.query,
      })),
    statusByProvider,
    successMessage,
    triggerSync,
  };
}
