import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@mui/material';

import {
  applyDesignTokens,
  buildMuiTheme,
  resolveColorMode,
  subscribeToColorModeChanges,
} from '@/styles/design-tokens';

export const appTheme = buildMuiTheme('light');

export function useAppTheme() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [themeVersion, setThemeVersion] = useState(0);
  const mode = resolveColorMode(prefersDark);

  useEffect(() => {
    applyDesignTokens(mode);
  }, [mode]);

  useEffect(() => subscribeToColorModeChanges(() => setThemeVersion((value) => value + 1)), []);

  return useMemo(() => buildMuiTheme(mode), [mode, themeVersion]);
}
