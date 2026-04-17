import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  type PlatformSettingsResponse,
  fetchPlatformSettings,
} from '@/lib/api/platform-settings';

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
    void load();
  }, []);

  useEffect(() => {
    function handleSettingsUpdated(): void {
      void load();
    }

    window.addEventListener('platform-settings:updated', handleSettingsUpdated);
    return () => window.removeEventListener('platform-settings:updated', handleSettingsUpdated);
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
