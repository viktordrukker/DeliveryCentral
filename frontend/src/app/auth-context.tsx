import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { apiClientConfig } from '@/lib/api/config';
import { httpGet, httpPost } from '@/lib/api/http-client';

const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes

function scheduleExpiryWarning(token: string, warningTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>): void {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    if (!payload.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const msUntilWarning = msUntilExpiry - WARNING_BEFORE_MS;
    if (msUntilWarning <= 0) return;
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('auth:session-expiring-soon'));
    }, msUntilWarning);
  } catch {
    // ignore invalid token
  }
}

export type AuthSource = 'local' | 'ldap' | 'azure_ad';

export interface AuthPrincipal {
  userId: string;
  personId?: string;
  email: string;
  displayName: string;
  roles: string[];
  source: AuthSource;
  twoFactorEnabled: boolean;
  requires2FASetup: boolean;
}

export type LoginOutcome =
  | { status: 'success' }
  | { status: 'requires_2fa'; tempToken: string }
  | { status: 'error'; message: string };

export interface AuthContextValue {
  principal: AuthPrincipal | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeTwoFactor: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storeToken(token: string): void {
  try {
    window.localStorage.setItem(apiClientConfig.authTokenStorageKey, token);
  } catch {
    // ignore
  }
}

function clearToken(): void {
  try {
    window.localStorage.removeItem(apiClientConfig.authTokenStorageKey);
    window.sessionStorage.removeItem(apiClientConfig.authTokenStorageKey);
  } catch {
    // ignore
  }
}

async function fetchMe(): Promise<AuthPrincipal | null> {
  try {
    return await httpGet<AuthPrincipal>('/auth/me');
  } catch {
    return null;
  }
}

async function attemptRefresh(): Promise<string | null> {
  try {
    const result = await httpPost<{ accessToken: string } | undefined, Record<string, never>>(
      '/auth/refresh',
      {},
    );
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [principal, setPrincipal] = useState<AuthPrincipal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);
  const initComplete = useRef(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    void (async () => {
      const existingToken =
        localStorage.getItem(apiClientConfig.authTokenStorageKey) ??
        sessionStorage.getItem(apiClientConfig.authTokenStorageKey);

      // With no access token on hand there's nothing for /auth/me to validate —
      // skip it to avoid a guaranteed 401 in the browser console. Still attempt
      // /auth/refresh since an HttpOnly refresh cookie may still be valid.
      let me = existingToken ? await fetchMe() : null;

      if (!me) {
        const newToken = await attemptRefresh();
        if (newToken) {
          storeToken(newToken);
          scheduleExpiryWarning(newToken, warningTimerRef);
          me = await fetchMe();
          if (me) window.dispatchEvent(new Event('auth:login-success'));
        }
      } else if (existingToken) {
        scheduleExpiryWarning(existingToken, warningTimerRef);
      }

      setPrincipal(me);
      initComplete.current = true;
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handler = (): void => {
      // Ignore session-expired events that fire before the initial auth chain
      // completes — they come from API calls made concurrently with the
      // token-refresh cycle and would cause a premature redirect to /login.
      if (!initComplete.current) return;
      clearToken();
      setPrincipal(null);
    };

    window.addEventListener('auth:session-expired', handler);

    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  // Cross-tab logout detection: if another tab removes the auth token from
  // localStorage (logout, session expiry), reflect that state change in this tab.
  useEffect(() => {
    const storageHandler = (event: StorageEvent): void => {
      if (event.key !== apiClientConfig.authTokenStorageKey) return;
      if (!initComplete.current) return;
      // newValue is null when the key is removed (logout in another tab)
      if (event.newValue === null && principal !== null) {
        setPrincipal(null);
      }
    };

    window.addEventListener('storage', storageHandler);

    return () => window.removeEventListener('storage', storageHandler);
  }, [principal]);

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    try {
      const result = await httpPost<
        { accessToken: string } | { requires2FA: true; tempToken: string },
        { email: string; password: string }
      >('/auth/login', { email, password });

      if ('requires2FA' in result) {
        return { status: 'requires_2fa', tempToken: result.tempToken };
      }

      storeToken(result.accessToken);
      scheduleExpiryWarning(result.accessToken, warningTimerRef);
      const me = await fetchMe();
      setPrincipal(me);
      window.dispatchEvent(new Event('auth:login-success'));

      return { status: 'success' };
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const message =
        raw === 'Failed to fetch' || raw === 'NetworkError when attempting to fetch resource.'
          ? 'Unable to reach the server. Check your connection or try again later.'
          : raw || 'Login failed.';

      return { status: 'error', message };
    }
  }, []);

  const completeTwoFactor = useCallback(
    async (tempToken: string, code: string): Promise<void> => {
      const result = await httpPost<{ accessToken: string }, { tempToken: string; code: string }>(
        '/auth/2fa/login',
        { tempToken, code },
      );

      storeToken(result.accessToken);
      const me = await fetchMe();
      setPrincipal(me);
      window.dispatchEvent(new Event('auth:login-success'));
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    try {
      await httpPost('/auth/logout', {});
    } catch {
      // ignore
    }

    clearToken();
    setPrincipal(null);
  }, []);

  const value: AuthContextValue = {
    principal,
    isAuthenticated: principal !== null,
    isLoading,
    login,
    completeTwoFactor,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the auth context. When impersonation is active (admin "View as" feature),
 * the returned principal is overlaid with the impersonated user's identity so all
 * downstream consumers (dashboards, role guards, hooks) see the impersonated view.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  // Read impersonation state reactively via ImpersonationContext.
  // This import is deferred to avoid circular deps — the context is always
  // available because ImpersonationProvider wraps the entire app shell.
  const impersonationCtx = useContext(ImpersonationReactContext);

  if (impersonationCtx?.impersonation && ctx.principal) {
    const imp = impersonationCtx.impersonation;
    return {
      ...ctx,
      principal: {
        ...ctx.principal,
        personId: imp.personId,
        displayName: imp.displayName,
        roles: imp.roles,
      },
    };
  }

  return ctx;
}

// Re-export the raw ImpersonationContext so useAuth can read it without a circular import.
// The actual context object is created in impersonation-context.tsx and provided here
// via a shared React context reference.
import { ImpersonationReactContext } from './impersonation-context';
