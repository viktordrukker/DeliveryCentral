// DeliverIT — tokens.ts (handoff equivalent of tokens.css)
// Mirrors the design-tokens.ts shape the platform consumes today:
//   • applyDesignTokens(mode) — mounts these as CSS custom properties on :root
//   • buildMuiTheme(mode)     — maps the same values into a MUI theme
// Drop into  frontend/src/styles/design-tokens.ts.

export type ColorMode = 'light' | 'dark';

export interface DeliverITTokens {
  motion: typeof MOTION;
  type:   typeof TYPE;
  radius: typeof RADIUS;
  space:  typeof SPACE;
  layout: typeof LAYOUT;
  breakpoints: typeof BREAKPOINTS;
  a11y:   typeof A11Y;
  color:  Record<ColorMode, ColorPalette>;
  shadow: Record<ColorMode, Shadows>;
  chart:  Record<ColorMode, [string, string, string, string, string, string, string, string]>;
}

// ─────────────────────────────────────────────────────────────
// Shared (theme-agnostic)
// ─────────────────────────────────────────────────────────────

export const MOTION = {
  durationInstant: '80ms',
  durationFast:    '150ms',
  durationBase:    '200ms',
  durationSlow:    '250ms',
  easeOut:    'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut:  'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const TYPE = {
  fontSans:    '"Geist", -apple-system, "Segoe UI", system-ui, sans-serif',
  fontMono:    '"Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  fontDisplay: '"Geist", -apple-system, "Segoe UI", system-ui, sans-serif',
  size: {
    code:       '12px',
    compactSm:  '11px',
    compact:    '12px',
    bodySm:     '13px',
    body:       '14px',
    bodyLg:     '16px',
    h3:         '18px',
    h2:         '22px',
    h1:         '28px',
    kpi:        '32px',
    display:    'clamp(28px, 2.4vw, 44px)',
  },
  line: { tight: 1.15, snug: 1.30, normal: 1.45, loose: 1.60 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  letter: { tight: '-0.011em', loose: '0.04em' },
} as const;

export const SPACE = {
  // 4px grid · 10 steps
  s0: '0px', s1: '4px', s2: '8px',  s3: '12px', s4: '16px',
  s5: '20px',s6: '24px',s7: '32px', s8: '40px', s9: '56px', s10: '80px',
} as const;

export const RADIUS = {
  sm: '4px', md: '6px', lg: '10px',
  control: '6px', card: '10px', pill: '999px',
} as const;

export const LAYOUT = {
  headerHeight:           '56px',
  pageHeaderHeight:       '52px',
  sidebarWidthExpanded:   '236px',
  sidebarWidthCollapsed:  '56px',
  contentPadding:         '24px',
  cardGap:                '16px',
} as const;

export const BREAKPOINTS = {
  sm: 640, md: 1024, lg: 1280, xl: 1536,
} as const;

export const A11Y = {
  touchTargetMin:  '44px',
  focusRingWidth:  '2px',
  focusRingOffset: '2px',
} as const;

// ─────────────────────────────────────────────────────────────
// Per-mode colors
// ─────────────────────────────────────────────────────────────

interface StatusGroup { active: string; warning: string; danger: string; critical: string; pending: string; info: string; }
interface ColorPalette {
  bg: string; surface: string; surfaceAlt: string; surfaceRaised: string;
  border: string; borderStrong: string; borderSubtle: string;
  overlay: string;
  text: string; textMuted: string; textSubtle: string; textInverse: string;
  accent: string; accentHover: string; accentActive: string; accentSoft: string; accentText: string;
  focusRing: string;
  status:      StatusGroup;
  statusBg:    StatusGroup;
  utilization: { critical: string; over: string; optimal: string; under: string; idle: string };
  danger: string;
  rowHover: string;
  rowSelected: string;
}
interface Shadows { card: string; cardHover: string; dropdown: string; modal: string; inset: string; }

// LIGHT
const LIGHT: ColorPalette = {
  bg:             'oklch(0.985 0.004 250)',
  surface:        '#ffffff',
  surfaceAlt:     'oklch(0.975 0.005 250)',
  surfaceRaised:  '#ffffff',
  border:         'oklch(0.91 0.006 250)',
  borderStrong:   'oklch(0.83 0.008 250)',
  borderSubtle:   'oklch(0.945 0.005 250)',
  overlay:        'rgba(15, 23, 42, 0.42)',

  text:           'oklch(0.20 0.018 252)',
  textMuted:      'oklch(0.46 0.012 252)',
  textSubtle:     'oklch(0.58 0.010 252)',
  textInverse:    '#ffffff',

  accent:         'oklch(0.40 0.13 254)',
  accentHover:    'oklch(0.34 0.13 254)',
  accentActive:   'oklch(0.30 0.13 254)',
  accentSoft:     'oklch(0.95 0.03 254)',
  accentText:     'oklch(0.36 0.13 254)',
  focusRing:      'oklch(0.55 0.15 254 / 0.45)',

  status: {
    active:   '#1f8a4d', warning:  '#b8730a', danger:   '#c8332b',
    critical: '#7b0a0a', pending:  '#5f6b7a', info:     '#0a7490',
  },
  statusBg: {
    active:   '#e6f4ec', warning:  '#fbf1dd', danger:   '#fbe9e7',
    critical: '#f5d8d8', pending:  '#eef1f5', info:     '#e0f3f7',
  },
  utilization: {
    critical: '#c8332b', over: '#b8730a', optimal: '#1f8a4d',
    under: '#0a7490', idle: '#94a3b8',
  },
  danger: '#a63f3f',
  rowHover:    'oklch(0.97 0.008 254)',
  rowSelected: 'oklch(0.945 0.024 254)',
};

// DARK
const DARK: ColorPalette = {
  bg:             'oklch(0.16 0.012 252)',
  surface:        'oklch(0.205 0.014 252)',
  surfaceAlt:     'oklch(0.235 0.014 252)',
  surfaceRaised:  'oklch(0.235 0.014 252)',
  border:         'oklch(0.30 0.012 252)',
  borderStrong:   'oklch(0.38 0.014 252)',
  borderSubtle:   'oklch(0.255 0.012 252)',
  overlay:        'rgba(0, 0, 0, 0.62)',

  text:           'oklch(0.94 0.008 252)',
  textMuted:      'oklch(0.72 0.012 252)',
  textSubtle:     'oklch(0.58 0.012 252)',
  textInverse:    'oklch(0.15 0.012 252)',

  accent:         'oklch(0.70 0.14 254)',
  accentHover:    'oklch(0.76 0.14 254)',
  accentActive:   'oklch(0.82 0.14 254)',
  accentSoft:     'oklch(0.30 0.07 254)',
  accentText:     'oklch(0.78 0.14 254)',
  focusRing:      'oklch(0.72 0.15 254 / 0.55)',

  status: {
    active:   '#4ade80', warning:  '#fbbf24', danger:   '#f87171',
    critical: '#ef5a5a', pending:  '#94a3b8', info:     '#22d3ee',
  },
  statusBg: {
    active:   'oklch(0.28 0.06 150)', warning:  'oklch(0.30 0.07 75)',
    danger:   'oklch(0.30 0.08 25)',  critical: 'oklch(0.26 0.09 22)',
    pending:  'oklch(0.28 0.012 250)', info:    'oklch(0.30 0.07 210)',
  },
  utilization: {
    critical: '#f87171', over: '#fbbf24', optimal: '#4ade80',
    under: '#22d3ee', idle: '#94a3b8',
  },
  danger: '#e05a5a',
  rowHover:    'oklch(0.245 0.014 252)',
  rowSelected: 'oklch(0.27 0.04 254)',
};

const SHADOW_LIGHT: Shadows = {
  card:      '0 1px 0 rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.04)',
  cardHover: '0 2px 0 rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.06)',
  dropdown:  '0 4px 16px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)',
  modal:     '0 24px 56px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)',
  inset:     'inset 0 1px 0 rgba(15,23,42,0.04)',
};

const SHADOW_DARK: Shadows = {
  card:      '0 1px 0 rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)',
  cardHover: '0 6px 18px rgba(0,0,0,0.45)',
  dropdown:  '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
  modal:     '0 30px 60px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.04)',
  inset:     'inset 0 1px 0 rgba(255,255,255,0.04)',
};

const CHART_LIGHT = [
  'oklch(0.45 0.14 254)', 'oklch(0.52 0.13 175)', 'oklch(0.55 0.16 60)',
  'oklch(0.50 0.18 28)',  'oklch(0.50 0.15 305)', 'oklch(0.58 0.12 220)',
  'oklch(0.55 0.13 145)', 'oklch(0.50 0.12 350)',
] as const;
const CHART_DARK = [
  'oklch(0.72 0.14 254)', 'oklch(0.72 0.13 175)', 'oklch(0.74 0.15 60)',
  'oklch(0.70 0.16 28)',  'oklch(0.72 0.14 305)', 'oklch(0.74 0.11 220)',
  'oklch(0.74 0.13 145)', 'oklch(0.70 0.13 350)',
] as const;

// ─────────────────────────────────────────────────────────────
// Public token object
// ─────────────────────────────────────────────────────────────

export const tokens: DeliverITTokens = {
  motion: MOTION,
  type:   TYPE,
  radius: RADIUS,
  space:  SPACE,
  layout: LAYOUT,
  breakpoints: BREAKPOINTS,
  a11y:   A11Y,
  color:  { light: LIGHT, dark: DARK },
  shadow: { light: SHADOW_LIGHT, dark: SHADOW_DARK },
  chart:  { light: CHART_LIGHT as unknown as DeliverITTokens['chart']['light'],
            dark:  CHART_DARK  as unknown as DeliverITTokens['chart']['dark'] },
};

// ─────────────────────────────────────────────────────────────
// applyDesignTokens — paint custom properties on documentElement
// (kept compatible with the existing function name + signature)
// ─────────────────────────────────────────────────────────────

export function applyDesignTokens(mode: ColorMode = 'light'): void {
  const r  = document.documentElement;
  const c  = tokens.color[mode];
  const sh = tokens.shadow[mode];
  const ch = tokens.chart[mode];
  const set = (k: string, v: string) => r.style.setProperty(k, v);

  set('--color-bg', c.bg);
  set('--color-surface', c.surface);
  set('--color-surface-alt', c.surfaceAlt);
  set('--color-surface-raised', c.surfaceRaised);
  set('--color-border', c.border);
  set('--color-border-strong', c.borderStrong);
  set('--color-border-subtle', c.borderSubtle);
  set('--color-overlay', c.overlay);

  set('--color-text', c.text);
  set('--color-text-muted', c.textMuted);
  set('--color-text-subtle', c.textSubtle);
  set('--color-text-inverse', c.textInverse);

  set('--color-accent', c.accent);
  set('--color-accent-hover', c.accentHover);
  set('--color-accent-active', c.accentActive);
  set('--color-accent-soft', c.accentSoft);
  set('--color-accent-text', c.accentText);
  set('--focus-ring-color', c.focusRing);

  set('--color-status-active',    c.status.active);
  set('--color-status-warning',   c.status.warning);
  set('--color-status-danger',    c.status.danger);
  set('--color-status-critical',  c.status.critical);
  set('--color-status-pending',   c.status.pending);
  set('--color-status-info',      c.status.info);
  set('--color-status-active-bg',    c.statusBg.active);
  set('--color-status-warning-bg',   c.statusBg.warning);
  set('--color-status-danger-bg',    c.statusBg.danger);
  set('--color-status-critical-bg',  c.statusBg.critical);
  set('--color-status-pending-bg',   c.statusBg.pending);
  set('--color-status-info-bg',      c.statusBg.info);

  set('--color-util-critical', c.utilization.critical);
  set('--color-util-over',     c.utilization.over);
  set('--color-util-optimal',  c.utilization.optimal);
  set('--color-util-under',    c.utilization.under);
  set('--color-util-idle',     c.utilization.idle);

  set('--color-danger', c.danger);
  set('--color-row-hover', c.rowHover);
  set('--color-row-selected', c.rowSelected);

  for (let i = 0; i < 8; i++) set(`--color-chart-${i+1}`, ch[i]);

  set('--shadow-card', sh.card);
  set('--shadow-card-hover', sh.cardHover);
  set('--shadow-dropdown', sh.dropdown);
  set('--shadow-modal', sh.modal);
  set('--shadow-inset', sh.inset);

  r.setAttribute('data-color-mode', mode);
  window.dispatchEvent(new CustomEvent('dc:color-mode-change', { detail: { mode } }));
}

// ─────────────────────────────────────────────────────────────
// buildMuiTheme — drop-in for the existing MUI theme builder
// ─────────────────────────────────────────────────────────────

export function buildMuiTheme(mode: ColorMode = 'light'): Record<string, unknown> {
  const c = tokens.color[mode];
  const sh = tokens.shadow[mode];
  return {
    palette: {
      mode,
      primary:   { main: c.accent, light: c.accentSoft, dark: c.accentActive, contrastText: c.textInverse },
      error:     { main: c.danger },
      warning:   { main: c.status.warning },
      success:   { main: c.status.active },
      info:      { main: c.status.info },
      background:{ default: c.bg, paper: c.surface },
      text:      { primary: c.text, secondary: c.textMuted, disabled: c.textSubtle },
      divider:   c.border,
      action: {
        hover: c.rowHover, selected: c.rowSelected,
        disabledBackground: c.surfaceAlt, disabled: c.textSubtle,
      },
    },
    typography: {
      fontFamily: tokens.type.fontSans,
      h1: { fontSize: tokens.type.size.h1, fontWeight: tokens.type.weight.semibold, letterSpacing: tokens.type.letter.tight, lineHeight: tokens.type.line.tight },
      h2: { fontSize: tokens.type.size.h2, fontWeight: tokens.type.weight.semibold, letterSpacing: tokens.type.letter.tight, lineHeight: tokens.type.line.tight },
      h3: { fontSize: tokens.type.size.h3, fontWeight: tokens.type.weight.semibold, lineHeight: tokens.type.line.snug },
      body1:  { fontSize: tokens.type.size.body,    lineHeight: tokens.type.line.normal },
      body2:  { fontSize: tokens.type.size.bodySm,  lineHeight: tokens.type.line.normal },
      caption:{ fontSize: tokens.type.size.compact, lineHeight: tokens.type.line.normal },
      button: { fontWeight: tokens.type.weight.medium, textTransform: 'none', letterSpacing: 0 },
    },
    shape: { borderRadius: 6 }, // matches --radius-control
    components: {
      MuiCard: { styleOverrides: { root: { borderRadius: 10, boxShadow: sh.card, border: `1px solid ${c.border}` } } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTooltip:{ styleOverrides: { tooltip: { fontSize: tokens.type.size.compact, fontFamily: tokens.type.fontSans } } },
      MuiTableCell: { styleOverrides: { root: { fontVariantNumeric: 'tabular-nums lining-nums' } } },
    },
  };
}
