import { createTheme, type Theme } from '@mui/material';

import { isFeatureEnabled } from '@/lib/feature-flags';

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
  '--spacing-card--compact': '10px',
  '--spacing-section': 'clamp(8px, 1vw, 24px)',
  // Phase DS — responsive breakpoints (sm ≤640 / md 641–1024 / lg ≥1025)
  '--bp-sm': '640px',
  '--bp-md': '1024px',
  '--bp-lg': '1280px',
  // Phase DS — minimum touch target on coarse pointers (DS-1-5)
  '--touch-target-min': '44px',
  // Phase DS — focus ring width (color is theme-specific, see colorModeTokens)
  '--focus-ring-width': '2px',
};

/**
 * Phase D — DS-canvas token overlay (DeliverIT brand).
 *
 * When `dsRefresh` is on, these tokens overlay the platform defaults to
 * match the DS canvas spec (DS/handoff/tokens.ts):
 *   - Geist font family
 *   - OKLCH-grade colors (banking-grade depth, P3 gamut)
 *   - DS canvas layout dims (sidebar 236px, content padding 24px)
 *   - Additional CSS vars: border-subtle, accent-text, status-bg pairs,
 *     row-hover/selected, shadow-card-hover/inset
 *
 * Reference: DS/handoff/tokens.ts.
 */
const dsSharedTokens: TokenMap = {
  '--font-sans': '"Geist", -apple-system, "Segoe UI", system-ui, sans-serif',
  '--font-mono': '"Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  '--radius-sm': '4px',
  '--radius-md': '6px',
  '--radius-lg': '10px',
  '--radius-control': '6px',
  '--radius-card': '10px',
  '--radius-pill': '999px',
  '--sidebar-width-expanded': '236px',
  '--content-padding': '24px',
  '--card-gap': '16px',
  '--page-header-height': '52px',
  '--font-size-code': '12px',
  '--font-size-compact-sm': '11px',
  '--font-size-compact': '12px',
  '--font-size-body-sm': '13px',
  '--font-size-body': '14px',
  '--font-size-body-lg': '16px',
  '--font-size-h3': '18px',
  '--font-size-h2': '22px',
  '--font-size-h1': '28px',
  '--font-size-kpi': '32px',
  '--motion-duration-instant': '80ms',
  '--motion-duration-fast': '150ms',
  '--motion-duration-base': '200ms',
  '--motion-duration-slow': '250ms',
  '--motion-ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--motion-ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
};

const dsColorTokens: Record<ColorMode, TokenMap> = {
  light: {
    '--color-bg': 'oklch(0.985 0.004 250)',
    '--color-surface': '#ffffff',
    '--color-surface-alt': 'oklch(0.975 0.005 250)',
    '--color-surface-raised': '#ffffff',
    '--color-border': 'oklch(0.91 0.006 250)',
    '--color-border-strong': 'oklch(0.83 0.008 250)',
    '--color-border-subtle': 'oklch(0.945 0.005 250)',
    '--color-overlay': 'rgba(15, 23, 42, 0.42)',
    '--color-text': 'oklch(0.20 0.018 252)',
    '--color-text-muted': 'oklch(0.46 0.012 252)',
    '--color-text-subtle': 'oklch(0.58 0.010 252)',
    '--color-text-inverse': 'oklch(1 0 0)',
    '--color-accent': 'oklch(0.40 0.13 254)',
    '--color-accent-hover': 'oklch(0.34 0.13 254)',
    '--color-accent-active': 'oklch(0.30 0.13 254)',
    '--color-accent-soft': 'oklch(0.95 0.03 254)',
    '--color-accent-text': 'oklch(0.36 0.13 254)',
    '--focus-ring-color': 'oklch(0.55 0.15 254 / 0.45)',
    '--color-status-active': 'oklch(0.55 0.16 145)',
    '--color-status-warning': 'oklch(0.62 0.14 65)',
    '--color-status-danger': 'oklch(0.55 0.18 25)',
    '--color-status-critical': 'oklch(0.35 0.16 22)',
    '--color-status-info': 'oklch(0.55 0.13 215)',
    '--color-status-pending': 'oklch(0.55 0.02 252)',
    '--color-status-active-bg': 'oklch(0.945 0.05 145)',
    '--color-status-warning-bg': 'oklch(0.955 0.05 75)',
    '--color-status-danger-bg': 'oklch(0.94 0.05 25)',
    '--color-status-critical-bg': 'oklch(0.92 0.06 22)',
    '--color-status-info-bg': 'oklch(0.95 0.04 210)',
    '--color-status-pending-bg': 'oklch(0.945 0.012 250)',
    '--color-row-hover': 'oklch(0.97 0.008 254)',
    '--color-row-selected': 'oklch(0.945 0.024 254)',
    '--shadow-card': '0 1px 0 rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.04)',
    '--shadow-card-hover': '0 2px 0 rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.06)',
    '--shadow-dropdown': '0 4px 16px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)',
    '--shadow-modal': '0 24px 56px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)',
    '--shadow-inset': 'inset 0 1px 0 rgba(15,23,42,0.04)',
    '--color-chart-1': 'oklch(0.45 0.14 254)',
    '--color-chart-2': 'oklch(0.52 0.13 175)',
    '--color-chart-3': 'oklch(0.55 0.16 60)',
    '--color-chart-4': 'oklch(0.50 0.18 28)',
    '--color-chart-5': 'oklch(0.50 0.15 305)',
    '--color-chart-6': 'oklch(0.58 0.12 220)',
    '--color-chart-7': 'oklch(0.55 0.13 145)',
    '--color-chart-8': 'oklch(0.50 0.12 350)',
  },
  dark: {
    '--color-bg': 'oklch(0.16 0.012 252)',
    '--color-surface': 'oklch(0.205 0.014 252)',
    '--color-surface-alt': 'oklch(0.235 0.014 252)',
    '--color-surface-raised': 'oklch(0.235 0.014 252)',
    '--color-border': 'oklch(0.30 0.012 252)',
    '--color-border-strong': 'oklch(0.38 0.014 252)',
    '--color-border-subtle': 'oklch(0.255 0.012 252)',
    '--color-overlay': 'rgba(0, 0, 0, 0.62)',
    '--color-text': 'oklch(0.94 0.008 252)',
    '--color-text-muted': 'oklch(0.72 0.012 252)',
    '--color-text-subtle': 'oklch(0.58 0.012 252)',
    '--color-text-inverse': 'oklch(0.15 0.012 252)',
    '--color-accent': 'oklch(0.70 0.14 254)',
    '--color-accent-hover': 'oklch(0.76 0.14 254)',
    '--color-accent-active': 'oklch(0.82 0.14 254)',
    '--color-accent-soft': 'oklch(0.30 0.07 254)',
    '--color-accent-text': 'oklch(0.78 0.14 254)',
    '--focus-ring-color': 'oklch(0.72 0.15 254 / 0.55)',
    '--color-status-active': 'oklch(0.75 0.16 145)',
    '--color-status-warning': 'oklch(0.80 0.14 75)',
    '--color-status-danger': 'oklch(0.72 0.18 25)',
    '--color-status-critical': 'oklch(0.65 0.18 22)',
    '--color-status-info': 'oklch(0.75 0.13 210)',
    '--color-status-pending': 'oklch(0.70 0.02 252)',
    '--color-status-active-bg': 'oklch(0.28 0.06 150)',
    '--color-status-warning-bg': 'oklch(0.30 0.07 75)',
    '--color-status-danger-bg': 'oklch(0.30 0.08 25)',
    '--color-status-critical-bg': 'oklch(0.26 0.09 22)',
    '--color-status-info-bg': 'oklch(0.30 0.07 210)',
    '--color-status-pending-bg': 'oklch(0.28 0.012 250)',
    '--color-row-hover': 'oklch(0.245 0.014 252)',
    '--color-row-selected': 'oklch(0.27 0.04 254)',
    '--shadow-card': '0 1px 0 rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)',
    '--shadow-card-hover': '0 6px 18px rgba(0,0,0,0.45)',
    '--shadow-dropdown': '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
    '--shadow-modal': '0 30px 60px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.04)',
    '--shadow-inset': 'inset 0 1px 0 rgba(255,255,255,0.04)',
    '--color-chart-1': 'oklch(0.72 0.14 254)',
    '--color-chart-2': 'oklch(0.72 0.13 175)',
    '--color-chart-3': 'oklch(0.74 0.15 60)',
    '--color-chart-4': 'oklch(0.70 0.16 28)',
    '--color-chart-5': 'oklch(0.72 0.14 305)',
    '--color-chart-6': 'oklch(0.74 0.11 220)',
    '--color-chart-7': 'oklch(0.74 0.13 145)',
    '--color-chart-8': 'oklch(0.70 0.13 350)',
  },
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
    '--color-status-critical': '#7B0A0A',
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
    '--focus-ring-color': 'rgba(17, 75, 122, 0.45)',
    // Lifecycle bars (Timeline colorMode='lifecycle'). Encode position-fill
    // state visually — bars read at any width. Additive: existing consumers
    // pass `tone` and never hit these vars.
    '--lifecycle-draft-stroke': '#bcc5d0',
    '--lifecycle-open-fill': 'transparent',
    '--lifecycle-open-stroke': '#b8730a',
    '--lifecycle-proposed-fill': '#fbf1dd',
    '--lifecycle-proposed-stroke': '#b8730a',
    '--lifecycle-booked-fill': '#114b7a',
    '--lifecycle-onboarding-fill': '#e0f3f7',
    '--lifecycle-onboarding-stroke': '#0a7490',
    '--lifecycle-assigned-fill': '#1f8a4d',
    '--lifecycle-hold-fill': '#cfd5dd',
    '--lifecycle-hold-stroke': '#5f6b7a',
    '--lifecycle-released-fill': '#cfd5dd',
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
    '--color-status-critical': '#8B1A1A',
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
    '--focus-ring-color': 'rgba(96, 165, 250, 0.55)',
    // Lifecycle bars — dark mode. Fills tuned for dark surfaces; strokes brighter.
    '--lifecycle-draft-stroke': '#3d4158',
    '--lifecycle-open-fill': 'transparent',
    '--lifecycle-open-stroke': '#fbbf24',
    '--lifecycle-proposed-fill': '#3a2f1a',
    '--lifecycle-proposed-stroke': '#fbbf24',
    '--lifecycle-booked-fill': '#4f8cdb',
    '--lifecycle-onboarding-fill': '#1a2d36',
    '--lifecycle-onboarding-stroke': '#22d3ee',
    '--lifecycle-assigned-fill': '#4ade80',
    '--lifecycle-hold-fill': '#3d4158',
    '--lifecycle-hold-stroke': '#94a3b8',
    '--lifecycle-released-fill': '#2d3244',
  },
};

function getTokenMap(mode: ColorMode): TokenMap {
  const base = { ...sharedTokens, ...colorModeTokens[mode] };
  // Phase D — DS-canvas brand overlay when `dsRefresh` is enabled.
  // We DO NOT mutate the platform palette in legacy mode so prod renders
  // unchanged until C0 flips the flag default ON.
  if (isFeatureEnabled('dsRefresh')) {
    return { ...base, ...dsSharedTokens, ...dsColorTokens[mode] };
  }
  return base;
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
  // Phase D — toggle the `ds-refresh` class on the root so the new CSS
  // class set in global.css (`.ds-refresh .kpi`, `.ds-refresh .quad`, etc.)
  // activates only when the flag is on.
  if (isFeatureEnabled('dsRefresh')) {
    root.classList.add('ds-refresh');
  } else {
    root.classList.remove('ds-refresh');
  }
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
