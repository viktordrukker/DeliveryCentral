import { createTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

const lightPalette = {
  primary: { main: '#114b7a', light: '#dbe9f4' },
  error: { main: '#a63f3f' },
  background: { default: '#f3f5f8', paper: '#ffffff' },
  text: { primary: '#1b2430', secondary: '#5d6b7d' },
  divider: '#d7dde5',
};

const darkPalette = {
  primary: { main: '#4f8cdb', light: '#1a2d4a' },
  error: { main: '#e05a5a' },
  background: { default: '#0f1117', paper: '#1a1d27' },
  text: { primary: '#e8eaf0', secondary: '#9da5b4' },
  divider: '#2d3244',
};

function buildTheme(mode: 'light' | 'dark') {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  return createTheme({
    palette: { mode, ...palette },
    typography: {
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // Let our global.css handle body colors via CSS variables
            color: 'var(--color-text)',
            backgroundColor: 'transparent',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: mode === 'dark'
              ? '0 12px 30px rgba(0, 0, 0, 0.4)'
              : '0 12px 30px rgba(17, 31, 51, 0.06)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
    },
  });
}

export const appTheme = buildTheme('light');

export function useAppTheme() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return useMemo(() => buildTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);
}
