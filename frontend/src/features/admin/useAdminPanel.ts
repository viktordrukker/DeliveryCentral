import { useEffect, useState } from 'react';

import {
  AdminConfigResponse,
  AdminIntegrationsResponse,
  AdminNotificationsResponse,
  AdminSettingsResponse,
  fetchAdminConfig,
  fetchAdminIntegrations,
  fetchAdminNotifications,
  fetchAdminSettings,
} from '@/lib/api/admin';

export interface AdminPanelData {
  config: AdminConfigResponse;
  integrations: AdminIntegrationsResponse;
  notifications: AdminNotificationsResponse;
  settings: AdminSettingsResponse;
}

interface UseAdminPanelState {
  data: AdminPanelData | null;
  error: string | null;
  isLoading: boolean;
}

export function useAdminPanel(): UseAdminPanelState {
  const [data, setData] = useState<AdminPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([
      fetchAdminConfig(),
      fetchAdminSettings(),
      fetchAdminIntegrations(),
      fetchAdminNotifications(),
    ])
      .then(([config, settings, integrations, notifications]) => {
        if (!isMounted) {
          return;
        }

        setData({
          config,
          integrations,
          notifications,
          settings,
        });
      })
      .catch((reason: Error) => {
        if (!isMounted) {
          return;
        }

        setData(null);
        setError(reason.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
  };
}
