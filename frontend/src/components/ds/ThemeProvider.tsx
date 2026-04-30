/**
 * ThemeProvider — React surface for the design-tokens infrastructure.
 *
 * The imperative API in `frontend/src/styles/design-tokens.ts` already handles
 * tokens, MUI theme assembly, and localStorage persistence. This component:
 *  - exposes `light` / `dark` / `system` as a user-visible preference
 *  - resolves `system` against `prefers-color-scheme`
 *  - renders the MUI ThemeProvider with the active theme
 *  - cross-tab and in-app sync via the existing custom-event subscription
 *
 * Storage contract:
 *   localStorage[COLOR_MODE_STORAGE_KEY] absent     → preference is 'system'
 *   localStorage[COLOR_MODE_STORAGE_KEY] === 'light' → preference is 'light'
 *   localStorage[COLOR_MODE_STORAGE_KEY] === 'dark'  → preference is 'dark'
 */
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider as MuiThemeProvider, useMediaQuery } from '@mui/material';

import {
  applyDesignTokens,
  buildMuiTheme,
  readStoredColorModePreference,
  setColorModePreference,
  subscribeToColorModeChanges,
} from '@/styles/design-tokens';

type ColorMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemePreferenceValue {
  /** Active resolved color mode after applying preference + system fallback. */
  mode: ColorMode;
  /** User-visible preference. `'system'` follows `prefers-color-scheme`. */
  preference: ThemePreference;
  /** Update the user preference. Persists to localStorage. */
  setPreference: (next: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function readPreference(): ThemePreference {
  return readStoredColorModePreference() ?? 'system';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const [version, setVersion] = useState(0);

  const mode: ColorMode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    applyDesignTokens(mode);
  }, [mode]);

  useEffect(
    () =>
      subscribeToColorModeChanges(() => {
        setPreferenceState(readPreference());
        setVersion((value) => value + 1);
      }),
    [],
  );

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setColorModePreference(next === 'system' ? null : next);
  }, []);

  const muiTheme = useMemo(() => buildMuiTheme(mode), [mode, version]);

  const contextValue = useMemo<ThemePreferenceValue>(
    () => ({ mode, preference, setPreference }),
    [mode, preference, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within <ThemeProvider>');
  }
  return ctx;
}
