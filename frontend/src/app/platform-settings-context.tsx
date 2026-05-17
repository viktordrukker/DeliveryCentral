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

// CC-11 — PlatformSettingsProvider ↔ AuthProvider event contract.
//
// PlatformSettingsProvider listens for two window events. AuthProvider
// is the producer of `auth:login-success`. There is no direct React
// context coupling between the two providers — they communicate
// exclusively via the global event bus + a localStorage probe (see
// `hasAuthToken()` below).
//
// Events consumed:
//   - `auth:login-success` — fired by `AuthProvider.login()` /
//     `AuthProvider.refresh()` when the session becomes valid. Triggers
//     `load()` to fetch admin-scoped settings (which require auth).
//   - `platform-settings:updated` — fired by `/admin/platform-settings`
//     after a successful save. Triggers `load()` to repopulate the
//     in-memory context so dependent pages see the new values without
//     a hard refresh.
//
// Why event-bus + not React context coupling:
//   1. PlatformSettingsProvider sits inside the router shell, while
//      AuthProvider sits outside it (it must survive the router
//      remount during logout/login). A context coupling would require
//      hoisting PlatformSettingsProvider above the router — see CC-10
//      defer note in the tracker.
//   2. The provider also needs to react to admin-side settings updates
//      that don't involve a login event; a generic event bus covers
//      both cases without growing the AuthContext surface.
//
// Memory anchor: see `feedback-ci-green-before-merge.md` Phase CC-11.
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
