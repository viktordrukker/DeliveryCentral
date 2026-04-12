import { useMemo, useState } from 'react';

import { apiClientConfig } from '@/lib/api/config';

interface UseStoredApiTokenState {
  clearToken: () => void;
  hasToken: boolean;
  saveToken: (nextToken: string) => void;
  token: string;
}

export function useStoredApiToken(): UseStoredApiTokenState {
  const storageKey = apiClientConfig.authTokenStorageKey;
  const [token, setToken] = useState(() => readStoredToken(storageKey));

  return useMemo(
    () => ({
      clearToken: () => {
        writeStoredToken(storageKey, '');
        setToken('');
      },
      hasToken: token.trim().length > 0,
      saveToken: (nextToken: string) => {
        writeStoredToken(storageKey, nextToken);
        setToken(nextToken.trim());
      },
      token,
    }),
    [storageKey, token],
  );
}

function readStoredToken(storageKey: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return (
      window.localStorage.getItem(storageKey) ??
      window.sessionStorage.getItem(storageKey) ??
      ''
    );
  } catch {
    return '';
  }
}

function writeStoredToken(storageKey: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, trimmed);
  } catch {
    // Ignore browser storage failures and keep the UI functional.
  }
}
