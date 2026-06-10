# DeliveryCentral — Existing Design Tokens (reference input for Claude Design)

_Source: `frontend/src/styles/design-tokens.ts` (the in-app SSOT). Converted to markdown for Claude Design upload. Use this to understand the current visual language; the new DS should regenerate these from scratch but stay compatible with the same usage shape (CSS custom properties + a TS object that drives the MUI theme)._

## How the tokens are consumed

- Mounted at runtime as CSS custom properties on `document.documentElement.style` (via `applyDesignTokens(mode)`).
- Same token set drives a parallel MUI theme via `buildMuiTheme(mode)`.
- Color mode (`light` | `dark`) is selected at boot from (1) `localStorage["dc:dark-mode"]`, falling back to (2) `prefers-color-scheme: dark` media query.
- Mode changes broadcast over the `dc:color-mode-change` custom event so subscribers can re-render.

## Shared tokens (theme-agnostic)

### Motion

| Token | Value |
|---|---|
| `--transition-fast` | `150ms ease` |
| `--transition-normal` | `300ms ease` |

### Typography

| Token | Value |
|---|---|
| `--font-sans` | `"Segoe UI", "Helvetica Neue", sans-serif` |
| `--font-size-compact` | `12px` |
| `--font-size-compact-sm` | `11px` |
| `--font-size-body` | `clamp(12px, 0.9vw, 16px)` |
| `--font-size-h1` | `clamp(18px, 1.5vw, 28px)` |
| `--font-size-h2` | `clamp(16px, 1.2vw, 22px)` |
| `--font-size-kpi` | `clamp(20px, 2vw, 40px)` |

### Radius

| Token | Value |
|---|---|
| `--radius-card` | `14px` |
| `--radius-control` | `10px` |

### Spacing scale (4px grid, 10 steps)

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--spacing-card` | `clamp(8px, 0.8vw, 16px)` |
| `--spacing-card--compact` | `10px` |
| `--spacing-section` | `clamp(8px, 1vw, 24px)` |

### Layout

| Token | Value |
|---|---|
| `--header-height` | `56px` |
| `--page-header-height` | `48px` |
| `--sidebar-width-expanded` | `240px` |
| `--sidebar-width-collapsed` | `56px` |
| `--sidebar-width` | `var(--sidebar-width-expanded)` |
| `--content-padding` | `16px` |
| `--card-gap` | `12px` |

### Breakpoints

| Token | Value |
|---|---|
| `--bp-sm` | `640px` (≤ sm = mobile) |
| `--bp-md` | `1024px` (sm-md = tablet) |
| `--bp-lg` | `1280px` (≥ lg = desktop) |

### Accessibility

| Token | Value |
|---|---|
| `--touch-target-min` | `44px` (enforced below `md` breakpoint / on coarse pointer) |
| `--focus-ring-width` | `2px` |

## Color mode tokens (light + dark, semantically aligned)

Every color token below has a value in BOTH `light` and `dark` modes. The new DS should preserve this dual-mode discipline.

### Surfaces

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#f3f5f8` | `#0f1117` |
| `--color-surface` | `#ffffff` | `#1a1d27` |
| `--color-surface-alt` | `#f8fafc` | `#1f222e` |
| `--color-border` | `#d7dde5` | `#2d3244` |
| `--color-border-strong` | `#bcc5d0` | `#3d4158` |
| `--color-overlay` | `rgba(17, 31, 51, 0.35)` | `rgba(0, 0, 0, 0.5)` |

### Text

| Token | Light | Dark |
|---|---|---|
| `--color-text` | `#1b2430` | `#e8eaf0` |
| `--color-text-muted` | `#5d6b7d` | `#9da5b4` |
| `--color-text-subtle` | `#667483` | `#6b7385` |

### Brand accent

| Token | Light | Dark |
|---|---|---|
| `--color-accent` | `#114b7a` (deep blue) | `#4f8cdb` (lifted blue) |
| `--color-accent-soft` | `#dbe9f4` | `#1a2d4a` |
| `--focus-ring-color` | `rgba(17, 75, 122, 0.45)` | `rgba(96, 165, 250, 0.55)` |

### Status semantics (fixed across the app — must stay aligned in new DS)

| Token | Light | Dark | Semantic |
|---|---|---|---|
| `--color-status-active` | `#22c55e` | `#4ade80` | Healthy / green |
| `--color-status-pending` | `#3b82f6` | `#60a5fa` | Pending / blue |
| `--color-status-warning` | `#f59e0b` | `#fbbf24` | Warning / amber |
| `--color-status-danger` | `#ef4444` | `#f87171` | Danger / red |
| `--color-status-critical` | `#7B0A0A` | `#8B1A1A` | Critical / dark red |
| `--color-status-info` | `#06b6d4` | `#22d3ee` | Info / cyan |
| `--color-status-neutral` | `#94a3b8` | `#94a3b8` | Pending / grey |

### Utilization (heatmap — used in Workforce planner today)

| Token | Light | Dark |
|---|---|---|
| `--color-util-critical` | `#ef4444` | `#f87171` |
| `--color-util-over` | `#f59e0b` | `#fbbf24` |
| `--color-util-optimal` | `#22c55e` | `#4ade80` |
| `--color-util-under` | `#06b6d4` | `#22d3ee` |
| `--color-util-idle` | `#94a3b8` | `#94a3b8` |

### Danger (button + form error)

| Token | Light | Dark |
|---|---|---|
| `--color-danger` | `#a63f3f` | `#e05a5a` |

### Success banner

| Token | Light | Dark |
|---|---|---|
| `--color-success-bg` | `#e8f5ec` | `#142a1d` |
| `--color-success-border` | `#b7d9c1` | `#1e4a2c` |
| `--color-success-text` | `#1d5b34` | `#5cb87a` |

### Charts (8-tone, used sequentially for multi-series)

| Token | Light | Dark |
|---|---|---|
| `--color-chart-1` | `#3b82f6` (blue) | `#60a5fa` |
| `--color-chart-2` | `#22c55e` (green) | `#4ade80` |
| `--color-chart-3` | `#f59e0b` (amber) | `#fbbf24` |
| `--color-chart-4` | `#ef4444` (red) | `#f87171` |
| `--color-chart-5` | `#8b5cf6` (violet) | `#a78bfa` |
| `--color-chart-6` | `#06b6d4` (cyan) | `#22d3ee` |
| `--color-chart-7` | `#ec4899` (pink) | `#f472b6` |
| `--color-chart-8` | `#f97316` (orange) | `#fb923c` |

### Thresholds (RAG dashboards)

| Token | Light | Dark |
|---|---|---|
| `--color-threshold-healthy` | `#22c55e` | `#4ade80` |
| `--color-threshold-warning` | `#f59e0b` | `#fbbf24` |
| `--color-threshold-danger` | `#ef4444` | `#f87171` |

### Shadows (depth layers)

| Token | Light | Dark |
|---|---|---|
| `--shadow-card` | `0 12px 30px rgba(17, 31, 51, 0.06)` | `0 12px 30px rgba(0, 0, 0, 0.4)` |
| `--shadow-dropdown` | `0 4px 16px rgba(17, 31, 51, 0.12)` | `0 4px 16px rgba(0, 0, 0, 0.35)` |
| `--shadow-modal` | `0 20px 60px rgba(17, 31, 51, 0.18)` | `0 20px 60px rgba(0, 0, 0, 0.5)` |

## Color-blind accessibility mode

A `[data-colour-blind="true"]` attribute on `<html>` swaps the RAG palette globally:

| Default | Color-blind |
|---|---|
| `green` (active / threshold-healthy) | `purple` |
| `amber` (warning / threshold-warning) | `orange` |
| `red` (danger / threshold-danger) | `blue` |

The new DS should keep this mechanism — same data attribute, same swap.

## MUI theme bridge

The `buildMuiTheme(mode)` function maps the tokens above into a MUI theme:

| MUI slot | Token |
|---|---|
| `palette.primary.main` | `--color-accent` |
| `palette.primary.light` | `--color-accent-soft` |
| `palette.error.main` | `--color-danger` |
| `palette.background.default` | `--color-bg` |
| `palette.background.paper` | `--color-surface` |
| `palette.text.primary` | `--color-text` |
| `palette.text.secondary` | `--color-text-muted` |
| `palette.divider` | `--color-border` |
| `typography.fontFamily` | `--font-sans` |
| `shape.borderRadius` | `--radius-control` (10) |

Component overrides today:
- `MuiCard.styleOverrides.root.borderRadius` = `--radius-card` (14)
- `MuiCard.styleOverrides.root.boxShadow` = `--shadow-card`
- `MuiButton.defaultProps.disableElevation` = `true`

## Summary

- **~95 CSS custom properties** total (45 shared + 25 light + 25 dark).
- **Dual-mode discipline** — every color token has a light + dark value with semantic alignment.
- **Status semantics are fixed** — green/amber/red/dark-red/cyan/grey have meanings that the new DS must preserve.
- **8-tone chart palette** — used sequentially for multi-series, with light + dark variants.
- **4px spacing grid** — 10-step scale (`space-1`..`space-10`).
- **Responsive breakpoints** — `sm` 640 / `md` 1024 / `lg` 1280.
- **Accessibility-first** — `--touch-target-min: 44px`, `--focus-ring-width: 2px`, color-blind swap mechanism.

The new DS should be a **fresh visual language** that keeps these usage shapes (CSS custom properties + TS theme object + dual mode + status semantics) but is free to redesign the actual color/typography/spacing values.
