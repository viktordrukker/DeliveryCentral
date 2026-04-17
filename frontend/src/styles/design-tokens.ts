import { createTheme, type Theme } from '@mui/material';

export const COLOR_MODE_STORAGE_KEY = 'dc:dark-mode';
const COLOR_MODE_EVENT = 'dc:color-mode-change';

type ColorMode = 'light' | 'dark';
type TokenMap = Record<string, string>;

const sharedTokens: TokenMap = {
  '--transition-fast': '150ms ease',
  '--transition-normal': '300ms ease',
  '--font-sans': '"Segoe UI", "Helvetica Neue", sans-serif',
  '--radius-card': '14px',
  '--radius-control': '10px',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-10': '40px',
  '--header-height': '56px',
  '--sidebar-width-expanded': '240px',
  '--sidebar-width-collapsed': '56px',
  '--sidebar-width': 'var(--sidebar-width-expanded)',
  '--content-padding': '16px',
  '--card-gap': '12px',
  '--page-header-height': '48px',
  '--font-size-compact': '12px',
  '--font-size-compact-sm': '11px',
  '--font-size-body': 'clamp(12px, 0.9vw, 16px)',
  '--font-size-h1': 'clamp(18px, 1.5vw, 28px)',
  '--font-size-h2': 'clamp(16px, 1.2vw, 22px)',
  '--font-size-kpi': 'clamp(20px, 2vw, 40px)',
  '--spacing-card': 'clamp(8px, 0.8vw, 16px)',
  '--spacing-section': 'clamp(8px, 1vw, 24px)',
};

const colorModeTokens: Record<ColorMode, TokenMap> = {
  light: {
    '--color-bg': '#f3f5f8',
    '--color-surface': '#ffffff',
    '--color-surface-alt': '#f8fafc',
    '--color-border': '#d7dde5',
    '--color-border-strong': '#bcc5d0',
    '--color-text': '#1b2430',
    '--color-text-muted': '#5d6b7d',
    '--color-text-subtle': '#667483',
    '--color-accent': '#114b7a',
    '--color-accent-soft': '#dbe9f4',
    '--color-danger': '#a63f3f',
    '--color-success-bg': '#e8f5ec',
    '--color-success-border': '#b7d9c1',
    '--color-success-text': '#1d5b34',
    '--color-overlay': 'rgba(17, 31, 51, 0.35)',
    '--shadow-card': '0 12px 30px rgba(17, 31, 51, 0.06)',
    '--shadow-dropdown': '0 4px 16px rgba(17, 31, 51, 0.12)',
    '--shadow-modal': '0 20px 60px rgba(17, 31, 51, 0.18)',
    '--color-status-active': '#22c55e',
    '--color-status-pending': '#3b82f6',
    '--color-status-warning': '#f59e0b',
    '--color-status-danger': '#ef4444',
    '--color-status-info': '#06b6d4',
    '--color-status-neutral': '#94a3b8',
    '--color-util-critical': '#ef4444',
    '--color-util-over': '#f59e0b',
    '--color-util-optimal': '#22c55e',
    '--color-util-under': '#06b6d4',
    '--color-util-idle': '#94a3b8',
    '--color-chart-1': '#3b82f6',
    '--color-chart-2': '#22c55e',
    '--color-chart-3': '#f59e0b',
    '--color-chart-4': '#ef4444',
    '--color-chart-5': '#8b5cf6',
    '--color-chart-6': '#06b6d4',
    '--color-chart-7': '#ec4899',
    '--color-chart-8': '#f97316',
    '--color-threshold-healthy': '#22c55e',
    '--color-threshold-warning': '#f59e0b',
    '--color-threshold-danger': '#ef4444',
  },
  dark: {
    '--color-bg': '#0f1117',
    '--color-surface': '#1a1d27',
    '--color-surface-alt': '#1f222e',
    '--color-border': '#2d3244',
    '--color-border-strong': '#3d4158',
    '--color-text': '#e8eaf0',
    '--color-text-muted': '#9da5b4',
    '--color-text-subtle': '#6b7385',
    '--color-accent': '#4f8cdb',
    '--color-accent-soft': '#1a2d4a',
    '--color-danger': '#e05a5a',
    '--color-success-bg': '#142a1d',
    '--color-success-border': '#1e4a2c',
    '--color-success-text': '#5cb87a',
    '--color-overlay': 'rgba(0, 0, 0, 0.5)',
    '--shadow-card': '0 12px 30px rgba(0, 0, 0, 0.4)',
    '--shadow-dropdown': '0 4px 16px rgba(0, 0, 0, 0.35)',
    '--shadow-modal': '0 20px 60px rgba(0, 0, 0, 0.5)',
    '--color-status-active': '#4ade80',
    '--color-status-pending': '#60a5fa',
    '--color-status-warning': '#fbbf24',
    '--color-status-danger': '#f87171',
    '--color-status-info': '#22d3ee',
    '--color-status-neutral': '#94a3b8',
    '--color-util-critical': '#f87171',
    '--color-util-over': '#fbbf24',
    '--color-util-optimal': '#4ade80',
    '--color-util-under': '#22d3ee',
    '--color-util-idle': '#94a3b8',
    '--color-chart-1': '#60a5fa',
    '--color-chart-2': '#4ade80',
    '--color-chart-3': '#fbbf24',
    '--color-chart-4': '#f87171',
    '--color-chart-5': '#a78bfa',
    '--color-chart-6': '#22d3ee',
    '--color-chart-7': '#f472b6',
    '--color-chart-8': '#fb923c',
    '--color-threshold-healthy': '#4ade80',
    '--color-threshold-warning': '#fbbf24',
    '--color-threshold-danger': '#f87171',
  },
};

function getTokenMap(mode: ColorMode): TokenMap {
  return { ...sharedTokens, ...colorModeTokens[mode] };
}

export function readStoredColorModePreference(): ColorMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

export function resolveColorMode(prefersDark: boolean): ColorMode {
  return readStoredColorModePreference() ?? (prefersDark ? 'dark' : 'light');
}

export function applyDesignTokens(mode: ColorMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const tokens = getTokenMap(mode);
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-theme', mode);
}

export function setColorModePreference(mode: ColorMode | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (mode) {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } else {
    window.localStorage.removeItem(COLOR_MODE_STORAGE_KEY);
  }

  const mediaPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  applyDesignTokens(mode ?? (mediaPrefersDark ? 'dark' : 'light'));
  window.dispatchEvent(new CustomEvent(COLOR_MODE_EVENT, { detail: mode }));
}

export function subscribeToColorModeChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent): void => {
    if (event.key === COLOR_MODE_STORAGE_KEY) {
      onChange();
    }
  };
  const handleCustom = (): void => onChange();

  window.addEventListener('storage', handleStorage);
  window.addEventListener(COLOR_MODE_EVENT, handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(COLOR_MODE_EVENT, handleCustom);
  };
}

export function buildMuiTheme(mode: ColorMode): Theme {
  const tokens = colorModeTokens[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: tokens['--color-accent'], light: tokens['--color-accent-soft'] },
      error: { main: tokens['--color-danger'] },
      background: { default: tokens['--color-bg'], paper: tokens['--color-surface'] },
      text: { primary: tokens['--color-text'], secondary: tokens['--color-text-muted'] },
      divider: tokens['--color-border'],
    },
    typography: {
      fontFamily: sharedTokens['--font-sans'],
    },
    shape: { borderRadius: Number.parseInt(sharedTokens['--radius-control'], 10) },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: Number.parseInt(sharedTokens['--radius-card'], 10),
            boxShadow: tokens['--shadow-card'],
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
    },
  });
}

export function bootstrapDesignTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  applyDesignTokens(resolveColorMode(prefersDark));
}
