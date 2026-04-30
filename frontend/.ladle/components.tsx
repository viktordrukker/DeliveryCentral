/**
 * Ladle global wrapper — applies the design-token CSS so every story renders
 * with the same backdrop the app does. Mirrors the imports in `main.tsx`.
 */
import type { GlobalProvider } from '@ladle/react';
import { useEffect } from 'react';

import '../src/styles/global.css';
import '../src/components/ds/ds.css';
import { applyDesignTokens } from '../src/styles/design-tokens';

export const Provider: GlobalProvider = ({ children, globalState }) => {
  // Ladle's theme addon writes the chosen mode to globalState.theme.
  // Map it onto the imperative token API so light/dark stories switch
  // without remounting.
  useEffect(() => {
    const mode = globalState.theme === 'dark' ? 'dark' : 'light';
    applyDesignTokens(mode);
  }, [globalState.theme]);

  return <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>{children}</div>;
};
