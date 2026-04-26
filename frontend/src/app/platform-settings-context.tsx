import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiClientConfig } from '@/lib/api/config';
import {
  type PlatformSettingsResponse,
  fetchPlatformSettings,
} from '@/lib/api/platform-settings';

function hasAuthToken(): boolean {
  try {
    return Boolean(
      window.localStorage.getItem(apiClientConfig.authTokenStorageKey) ??
        window.sessionStorage.getItem(apiClientConfig.authTokenStorageKey),
    );
  } catch {
    return false;
  }
}

interface PlatformSettingsContextValue {
  isLoading: boolean;
  reload: () => Promise<void>;
  settings: PlatformSettingsResponse | null;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue>({
  isLoading: false,
  reload: async () => undefined,
  settings: null,
});

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load(): Promise<void> {
    setIsLoading(true);
    try {
      setSettings(await fetchPlatformSettings());
    } catch {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Don't fetch admin-scoped settings before login — the endpoint requires auth,
    // and a 401 here just pollutes the console. A login-success listener triggers
    // the real fetch below.
    if (hasAuthToken()) {
      void load();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleSettingsUpdated(): void {
      void load();
    }
    function handleLogin(): void {
      void load();
    }

    window.addEventListener('platform-settings:updated', handleSettingsUpdated);
    window.addEventListener('auth:login-success', handleLogin);
    return () => {
      window.removeEventListener('platform-settings:updated', handleSettingsUpdated);
      window.removeEventListener('auth:login-success', handleLogin);
    };
  }, []);

  const value = useMemo<PlatformSettingsContextValue>(
    () => ({ isLoading, reload: load, settings }),
    [isLoading, settings],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettingsContextValue {
  return useContext(PlatformSettingsContext);
}

export function useEvidenceManagement(): {
  allowManualEntry: boolean;
  enabled: boolean;
  isLoading: boolean;
  showDiagnosticsInCoreDashboards: boolean;
} {
  const { isLoading, settings } = usePlatformSettings();
  const evidenceManagement = settings?.evidenceManagement;

  return {
    allowManualEntry: evidenceManagement?.allowManualEntry ?? true,
    enabled: evidenceManagement?.enabled ?? false,
    isLoading,
    showDiagnosticsInCoreDashboards: evidenceManagement?.showDiagnosticsInCoreDashboards ?? false,
  };
}
