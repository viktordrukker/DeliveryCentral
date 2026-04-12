import { useEffect, useState } from 'react';

import {
  fetchJiraIntegrationStatus,
  JiraIntegrationStatus,
  JiraProjectSyncResponse,
  triggerJiraProjectSync,
} from '@/lib/api/jira-integrations';

interface JiraIntegrationStatusState {
  data?: JiraIntegrationStatus;
  error?: string;
  isLoading: boolean;
  isSyncing: boolean;
  successMessage?: string;
  syncProjects: () => Promise<void>;
}

export function useJiraIntegrationStatus(): JiraIntegrationStatusState {
  const [data, setData] = useState<JiraIntegrationStatus>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();

  async function loadStatus(): Promise<void> {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetchJiraIntegrationStatus();
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Jira integration status.');
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function syncProjects(): Promise<void> {
    setIsSyncing(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      const result: JiraProjectSyncResponse = await triggerJiraProjectSync();
      setSuccessMessage(`Project sync completed. Created ${result.projectsCreated}, updated ${result.projectsUpdated}.`);
      const refreshed = await fetchJiraIntegrationStatus();
      setData(refreshed);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Jira project sync failed.');
    } finally {
      setIsSyncing(false);
    }
  }

  return {
    data,
    error,
    isLoading,
    isSyncing,
    successMessage,
    syncProjects,
  };
}
