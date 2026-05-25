import { CSSProperties } from 'react';

export interface HorizontalBarsRow {
  /** Stable row key. */
  id: string;
  /** Left-column label. */
  label: string;
  /** Numeric value plotted as the bar length. */
  value: number;
  /**
   * Optional fill colour for this row's bar — typically a CSS var
   * (`var(--color-status-active)` etc.). Falls back to `var(--color-accent)`.
   */
  color?: string;
}

export interface HorizontalBarsProps {
  rows: HorizontalBarsRow[];
  /**
   * Scale endpoint. The bar width is clamped to `value / max`. Defaults to 100
   * (i.e. treats the row as a percentage).
   */
  max?: number;
  /** Width of the label column in px. Default 100. */
  labelWidth?: number;
  /** Right-column rendered value text (e.g. "82%"). Defaults to integer + "%". */
  formatValue?: (value: number) => string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  testId?: string;
}

const ROW: React.CSSProperties = {
  display: 'grid',
  alignItems: 'center',
  columnGap: 8,
  fontSize: 11,
  padding: '4px 0',
};

const LABEL: React.CSSProperties = {
  color: 'var(--color-text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const TRACK: React.CSSProperties = {
  background: 'var(--color-border)',
  borderRadius: 2,
  height: 8,
  overflow: 'hidden',
  width: '100%',
};

const VALUE: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
};

/**
 * V2-A.12 — inline-SVG/CSS horizontal bar list, replaces recharts
 * `BarChart layout="vertical"` instances on the Director Dashboard
 * (Unit Utilisation, Available Pool). No external chart dependency,
 * deterministic styling via DS tokens, ARIA-labelled as a list.
 *
 * Reference: DS canvas hand-rolled SVG charts (DS/page-director.jsx).
 */
export function HorizontalBars({
  rows,
  max = 100,
  labelWidth = 100,
  formatValue,
  className,
  style,
  ariaLabel,
  testId,
}: HorizontalBarsProps): JSX.Element {
  const safeMax = max > 0 ? max : 1;
  const fmt = formatValue ?? ((v: number) => `${Math.round(v)}%`);

  return (
    <ul
      data-testid={testId}
      role="list"
      aria-label={ariaLabel}
      className={['ds-horizontal-bars', className].filter(Boolean).join(' ')}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {rows.map((row) => {
        const pct = Math.max(0, Math.min(1, row.value / safeMax));
        const color = row.color ?? 'var(--color-accent)';
        return (
          <li
            key={row.id}
            style={{ ...ROW, gridTemplateColumns: `${labelWidth}px 1fr 48px` }}
          >
            <span style={LABEL} title={row.label}>{row.label}</span>
            <div style={TRACK} role="img" aria-label={`${row.label}: ${fmt(row.value)}`}>
              <div
                style={{
                  background: color,
                  height: '100%',
                  width: `${pct * 100}%`,
                  borderRadius: 'inherit',
                  transition: 'width 240ms ease-out',
                }}
              />
            </div>
            <span style={VALUE}>{fmt(row.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
