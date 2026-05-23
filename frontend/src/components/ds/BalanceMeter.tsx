import { CSSProperties, KeyboardEvent } from 'react';

export type BalanceMeterSize = 'xs' | 'sm' | 'md';
export type BalanceSegmentKind = 'used' | 'pending' | 'remaining' | 'overdrawn';

export interface BalanceMeterBreakdownEntry {
  label: string;
  used: number;
  entitlement: number;
  color?: string;
}

export interface BalanceMeterProps {
  /** Total budget — e.g. 25 (days). */
  entitlement: number;
  /** Already taken / spent. */
  used: number;
  /** Awaiting approval. */
  pending?: number;
  /** Earned-but-not-yet-available (rendered muted in legend). */
  accrual?: number;
  /** Optional per-type breakdown lines underneath the meter. */
  breakdown?: BalanceMeterBreakdownEntry[];
  /** Display unit ('d' | 'h' | '$' | etc.). Default 'd'. */
  unit?: string;
  size?: BalanceMeterSize;
  showLegend?: boolean;
  /** When provided, segments become keyboard- and click-activatable. */
  onSegmentClick?: (segment: BalanceSegmentKind) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

const SIZE_TOKENS: Record<
  BalanceMeterSize,
  { trackH: number; fontSize: number; gap: number; headlineDelta: number }
> = {
  xs: { trackH: 6, fontSize: 10, gap: 8, headlineDelta: 10 },
  sm: { trackH: 10, fontSize: 11, gap: 10, headlineDelta: 12 },
  md: { trackH: 14, fontSize: 13, gap: 14, headlineDelta: 14 },
};

function formatValue(n: number, unit: string): string {
  return `${(+n).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
}

/**
 * Horizontal segmented meter — entitlement / used / pending / remaining /
 * overdrawn. Composes the leave-balance card, budget-utilisation card, and
 * any "spent vs. cap" widget.
 *
 * A11y model:
 *   • Container has role="img" + a fully-formed aria-label so a screen reader
 *     reads the whole state in one pass.
 *   • Each segment renders as a `<button>` when `onSegmentClick` is supplied,
 *     inheriting native Space/Enter activation and tab focus. When no click
 *     handler is provided, segments are inert `<div>`s with no focus.
 *
 * Tokens: existing `--color-accent`, `--color-status-warning`,
 *   `--color-status-active`, `--color-status-danger`, `--color-surface-alt`,
 *   `--color-border-subtle`, `--color-text*`. No new tokens.
 */
export function BalanceMeter({
  entitlement,
  used,
  pending = 0,
  accrual = 0,
  breakdown,
  unit = 'd',
  size = 'md',
  showLegend = true,
  onSegmentClick,
  ariaLabel = 'Balance',
  className,
  style,
  testId,
}: BalanceMeterProps): JSX.Element {
  const sz = SIZE_TOKENS[size];
  const ent = Math.max(0, entitlement);
  const u = Math.max(0, used);
  const p = Math.max(0, pending);
  const remaining = Math.max(0, ent - u - p);
  const overdrawn = Math.max(0, u + p - ent);
  // Meter scale: entitlement, unless overdrawn pushes the visible scale wider.
  const scale = Math.max(ent, u + p);
  const pct = (n: number): number => (scale > 0 ? (n / scale) * 100 : 0);

  const interactive = !!onSegmentClick;

  const fmt = (n: number): string => formatValue(n, unit);
  const ariaSummary =
    `${ariaLabel}: ${fmt(remaining)} remaining of ${fmt(ent)}, ${fmt(u)} used` +
    (p > 0 ? `, ${fmt(p)} pending` : '') +
    (overdrawn > 0 ? `, ${fmt(overdrawn)} overdrawn` : '');

  const segmentBase: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    border: 0,
    margin: 0,
    padding: 0,
    cursor: interactive ? 'pointer' : 'default',
  };

  const onSegmentKey = (kind: BalanceSegmentKind) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSegmentClick?.(kind);
    }
  };

  const renderSegment = (
    kind: BalanceSegmentKind,
    label: string,
    style: CSSProperties,
    title: string,
  ): JSX.Element =>
    interactive ? (
      <button
        type="button"
        aria-label={label}
        data-segment={kind}
        onClick={() => onSegmentClick?.(kind)}
        onKeyDown={onSegmentKey(kind)}
        style={style}
        title={title}
      />
    ) : (
      <div data-segment={kind} style={style} title={title} aria-hidden="true" />
    );

  return (
    <div
      className={['ds-balance-meter', className].filter(Boolean).join(' ')}
      data-testid={testId}
      role="img"
      aria-label={ariaSummary}
      style={{
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        fontSize: sz.fontSize,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: sz.fontSize + sz.headlineDelta,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: overdrawn > 0 ? 'var(--color-status-danger)' : 'var(--color-text)',
          }}
        >
          {fmt(remaining)}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: sz.fontSize - 1 }}>
          remaining of{' '}
          <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{fmt(ent)}</span>
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: sz.trackH,
          background: 'var(--color-surface-alt)',
          borderRadius: sz.trackH / 2,
          overflow: 'hidden',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Used */}
        {renderSegment(
          'used',
          `Used ${fmt(u)}`,
          { ...segmentBase, left: 0, width: pct(u) + '%', background: 'var(--color-accent)' },
          `Used: ${fmt(u)}`,
        )}
        {/* Pending (striped) */}
        {renderSegment(
          'pending',
          `Pending ${fmt(p)}`,
          {
            ...segmentBase,
            left: pct(u) + '%',
            width: pct(p) + '%',
            background:
              'repeating-linear-gradient(135deg, var(--color-status-warning) 0 4px, color-mix(in oklab, var(--color-status-warning) 60%, white) 4px 8px)',
          },
          `Pending: ${fmt(p)}`,
        )}
        {/* Overdrawn (striped, after entitlement) */}
        {overdrawn > 0 &&
          renderSegment(
            'overdrawn',
            `Overdrawn ${fmt(overdrawn)}`,
            {
              ...segmentBase,
              left: pct(ent) + '%',
              width: pct(overdrawn) + '%',
              background:
                'repeating-linear-gradient(135deg, var(--color-status-danger) 0 3px, color-mix(in oklab, var(--color-status-danger) 60%, white) 3px 6px)',
            },
            `Overdrawn: ${fmt(overdrawn)}`,
          )}
        {/* 100% marker when scale exceeds entitlement (overdrawn case) */}
        {ent > 0 && scale > ent && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: pct(ent) + '%',
              top: -2,
              bottom: -2,
              width: 1,
              background: 'var(--color-text-subtle)',
            }}
          />
        )}
      </div>

      {showLegend && (
        <div
          style={{
            display: 'flex',
            gap: sz.gap,
            marginTop: 8,
            flexWrap: 'wrap',
            fontSize: sz.fontSize - 1,
            color: 'var(--color-text-muted)',
          }}
        >
          <LegendItem swatch="var(--color-accent)" label="Used" value={fmt(u)} />
          <LegendItem
            swatch="repeating-linear-gradient(135deg, var(--color-status-warning) 0 3px, color-mix(in oklab, var(--color-status-warning) 60%, white) 3px 6px)"
            label="Pending"
            value={fmt(p)}
          />
          <LegendItem swatch="var(--color-status-active)" label="Remaining" value={fmt(remaining)} />
          {accrual > 0 && (
            <LegendItem
              swatch="var(--color-surface-alt)"
              swatchBorder="1px solid var(--color-border)"
              label="Accruing"
              value={fmt(accrual)}
            />
          )}
          {overdrawn > 0 && (
            <LegendItem
              swatch="var(--color-status-danger)"
              label="Overdrawn"
              value={fmt(overdrawn)}
              danger
            />
          )}
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <div
          style={{
            marginTop: 14,
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-text-subtle)',
              marginBottom: 4,
            }}
          >
            By type
          </div>
          {breakdown.map((b, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 8, alignItems: 'center' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>{b.label}</span>
              <div
                style={{
                  position: 'relative',
                  height: 4,
                  background: 'var(--color-surface-alt)',
                  borderRadius: 2,
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: ((b.used || 0) / (b.entitlement || 1)) * 100 + '%',
                    background: b.color ?? 'var(--color-accent)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-text)',
                  fontSize: sz.fontSize - 1,
                }}
              >
                {b.used || 0} / {b.entitlement || 0}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LegendItemProps {
  swatch: string;
  swatchBorder?: string;
  label: string;
  value: string;
  danger?: boolean;
}

function LegendItem({ swatch, swatchBorder, label, value, danger }: LegendItemProps): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: danger ? 'var(--color-status-danger)' : undefined }}>
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: swatch,
          border: swatchBorder,
          display: 'inline-block',
        }}
      />
      {label}{' '}
      <span
        style={{
          color: danger ? 'var(--color-status-danger)' : 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: danger ? 600 : undefined,
        }}
      >
        {value}
      </span>
    </span>
  );
}
