import { useCallback, useEffect, useState } from 'react';

import {
  applyMigrations,
  completeSetup,
  createAdmin,
  createDatabase,
  fetchSetupStatus,
  issueSetupToken,
  runPreflight,
  runSeed,
  saveIntegrations,
  saveMonitoring,
  sendSmtpTest,
  upsertTenant,
  type AdminInput,
  type IntegrationsInput,
  type MonitoringInput,
  type PreflightResponse,
  type SeedProfile,
  type SetupStatus,
  type SetupStepKey,
  type TenantInput,
} from '@/lib/api/setup';

const TOKEN_STORAGE_KEY = 'dc.setupToken';

export type WizardScreen =
  | 'token-prompt'
  | 'preflight'
  | 'migrations'
  | 'tenant'
  | 'admin'
  | 'integrations'
  | 'monitoring'
  | 'seed-profile'
  | 'complete';

export interface WizardState {
  status: SetupStatus | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  runId: string | null;
  screen: WizardScreen;
  preflight: PreflightResponse['result'] | null;
}

const SCREEN_ORDER: WizardScreen[] = [
  'preflight',
  'migrations',
  'tenant',
  'admin',
  'integrations',
  'monitoring',
  'seed-profile',
  'complete',
];

function nextScreenAfter(current: WizardScreen): WizardScreen {
  const i = SCREEN_ORDER.indexOf(current);
  if (i < 0 || i === SCREEN_ORDER.length - 1) return 'complete';
  return SCREEN_ORDER[i + 1] ?? 'complete';
}

function stepKeyToScreen(stepKey: SetupStepKey | null): WizardScreen {
  if (!stepKey) return 'preflight';
  if (stepKey === 'seed') return 'seed-profile';
  return stepKey as WizardScreen;
}

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface UseSetupWizardReturn {
  state: WizardState;
  setToken: (token: string) => void;
  refreshStatus: () => Promise<void>;
  preflight: () => Promise<void>;
  createDb: () => Promise<void>;
  applyPendingMigrations: (options?: { wipeFirst?: boolean }) => Promise<void>;
  saveTenant: (input: TenantInput) => Promise<void>;
  saveAdmin: (input: AdminInput) => Promise<void>;
  saveIntegrationsConfig: (input: IntegrationsInput) => Promise<void>;
  testSmtp: (recipient: string) => Promise<{ ok: boolean; detail?: string }>;
  saveMonitoringConfig: (input: MonitoringInput) => Promise<void>;
  pickSeedProfile: (profile: SeedProfile) => Promise<void>;
  finish: () => Promise<void>;
  goToScreen: (screen: WizardScreen) => void;
  reset: () => void;
}

export function useSetupWizard(): UseSetupWizardReturn {
  const [state, setState] = useState<WizardState>(() => ({
    status: null,
    loading: true,
    error: null,
    token: readStoredToken(),
    runId: null,
    screen: readStoredToken() ? 'preflight' : 'token-prompt',
    preflight: null,
  }));

  const refreshStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const status = await fetchSetupStatus();
      setState((s) => ({
        ...s,
        loading: false,
        status,
        runId: status.runId ?? s.runId,
        screen: s.token ? stepKeyToScreen(status.nextStep) : 'token-prompt',
      }));
      if (!status.required) {
        // Setup is already complete — kick the user out of /setup.
        try {
          window.location.replace('/login');
        } catch {
          // ignore in non-browser env
        }
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    if (!readStoredToken()) {
      // Trigger token issuance so it lands in container logs the moment
      // the operator hits the page (only fires when no active token).
      void issueSetupToken().catch(() => {
        /* swallowed — wizard will show error on first call */
      });
    }
  }, [refreshStatus]);

  const setToken = useCallback((token: string) => {
    writeStoredToken(token);
    setState((s) => ({ ...s, token, screen: 'preflight', error: null }));
  }, []);

  const requireToken = (s: WizardState): string => {
    if (!s.token) throw new Error('Setup token missing — paste the token from the install logs.');
    return s.token;
  };
  const requireRun = (s: WizardState): string => {
    if (!s.runId) throw new Error('No active wizard run yet — re-run preflight.');
    return s.runId;
  };

  const wrap = useCallback(
    async <T,>(fn: (s: WizardState) => Promise<T>): Promise<T> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fn(state);
        setState((s) => ({ ...s, loading: false }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Backend invalidates the in-memory token on every restart and
        // expires it after 24h. When the wizard hits a 401, fall back to
        // the token-prompt screen so the operator can paste a fresh token
        // (no DevTools workaround needed).
        const status = (err as { status?: number }).status;
        const looksLikeBadToken =
          status === 401 ||
          /setup token/i.test(message) ||
          /unauthor/i.test(message);
        if (looksLikeBadToken) {
          writeStoredToken(null);
          setState((s) => ({
            ...s,
            loading: false,
            token: null,
            screen: 'token-prompt',
            error: 'Setup token rejected — paste a fresh token from `docker logs <backend> | grep SETUP_TOKEN`.',
          }));
          throw err;
        }
        setState((s) => ({ ...s, loading: false, error: message }));
        throw err;
      }
    },
    [state],
  );

  const preflight = useCallback(async () => {
    await wrap(async (s) => {
      const token = requireToken(s);
      const res = await runPreflight(token, s.runId ?? undefined);
      setState((prev) => ({
        ...prev,
        runId: res.runId,
        preflight: res.result,
      }));
    });
  }, [wrap]);

  const createDb = useCallback(async () => {
    await wrap(async (s) => {
      await createDatabase(requireToken(s), requireRun(s));
      // After CREATE DATABASE, run preflight again so the branch flips
      // from EMPTY_POSTGRES to MIGRATIONS_OK / EMPTY_DB.
      const res = await runPreflight(s.token!, s.runId!);
      setState((prev) => ({ ...prev, preflight: res.result }));
    });
  }, [wrap]);

  const applyPendingMigrations = useCallback(
    async (options?: { wipeFirst?: boolean }) => {
      await wrap(async (s) => {
        await applyMigrations(requireToken(s), requireRun(s), options);
        const res = await runPreflight(s.token!, s.runId!);
        setState((prev) => ({
          ...prev,
          preflight: res.result,
          screen: nextScreenAfter('migrations'),
        }));
      });
    },
    [wrap],
  );

  const saveTenant = useCallback(
    async (input: TenantInput) => {
      await wrap(async (s) => {
        await upsertTenant(requireToken(s), requireRun(s), input);
        setState((prev) => ({ ...prev, screen: nextScreenAfter('tenant') }));
      });
    },
    [wrap],
  );

  const saveAdmin = useCallback(
    async (input: AdminInput) => {
      await wrap(async (s) => {
        await createAdmin(requireToken(s), requireRun(s), input);
        setState((prev) => ({ ...prev, screen: nextScreenAfter('admin') }));
      });
    },
    [wrap],
  );

  const saveIntegrationsConfig = useCallback(
    async (input: IntegrationsInput) => {
      await wrap(async (s) => {
        await saveIntegrations(requireToken(s), requireRun(s), input);
        setState((prev) => ({ ...prev, screen: nextScreenAfter('integrations') }));
      });
    },
    [wrap],
  );

  const testSmtp = useCallback(
    async (recipient: string) => {
      return wrap(async (s) => {
        return sendSmtpTest(requireToken(s), requireRun(s), recipient);
      });
    },
    [wrap],
  );

  const saveMonitoringConfig = useCallback(
    async (input: MonitoringInput) => {
      await wrap(async (s) => {
        await saveMonitoring(requireToken(s), requireRun(s), input);
        setState((prev) => ({ ...prev, screen: nextScreenAfter('monitoring') }));
      });
    },
    [wrap],
  );

  const pickSeedProfile = useCallback(
    async (profile: SeedProfile) => {
      await wrap(async (s) => {
        await runSeed(requireToken(s), requireRun(s), profile);
        setState((prev) => ({ ...prev, screen: 'complete' }));
      });
    },
    [wrap],
  );

  const finish = useCallback(async () => {
    await wrap(async (s) => {
      await completeSetup(requireToken(s), requireRun(s));
      writeStoredToken(null);
      setState((prev) => ({ ...prev, token: null }));
      window.location.replace('/login');
    });
  }, [wrap]);

  const goToScreen = useCallback((screen: WizardScreen) => {
    setState((s) => ({ ...s, screen, error: null }));
  }, []);

  const reset = useCallback(() => {
    writeStoredToken(null);
    setState({
      status: null,
      loading: false,
      error: null,
      token: null,
      runId: null,
      screen: 'token-prompt',
      preflight: null,
    });
  }, []);

  return {
    state,
    setToken,
    refreshStatus,
    preflight,
    createDb,
    applyPendingMigrations,
    saveTenant,
    saveAdmin,
    saveIntegrationsConfig,
    testSmtp,
    saveMonitoringConfig,
    pickSeedProfile,
    finish,
    goToScreen,
    reset,
  };
}
