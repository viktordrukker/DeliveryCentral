import { Link } from 'react-router-dom';

import { Sparkline } from '@/components/charts/Sparkline';

interface WorkloadCardProps {
  alertSeverity?: 'warning' | 'danger';
  alertThreshold?: number;
  /** Force compact single-row layout: hides sparkline, value + label on same line */
  compact?: boolean;
  href?: string;
  label: string;
  supportingText?: string;
  /** Percentage change vs prior period — positive = up, negative = down, 0 = flat */
  trendChange?: number;
  /** 12-week historical values for the mini sparkline */
  trendData?: number[];
  value: string;
  variant?: 'default' | 'warning' | 'danger';
}

function TrendIndicator({ change }: { change: number }): JSX.Element {
  if (change > 0) {
    return (
      <span style={{ color: 'var(--color-status-active)', fontSize: '11px', marginLeft: '4px' }} title={`+${change}% vs prior period`}>
        ↑ +{change}%
      </span>
    );
  }
  if (change < 0) {
    return (
      <span style={{ color: 'var(--color-status-danger)', fontSize: '11px', marginLeft: '4px' }} title={`${change}% vs prior period`}>
        ↓ {change}%
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginLeft: '4px' }} title="No change vs prior period">
      → 0%
    </span>
  );
}

export function WorkloadCard({
  alertSeverity = 'warning',
  alertThreshold,
  compact = false,
  href,
  label,
  supportingText,
  trendChange,
  trendData,
  value,
  variant = 'default',
}: WorkloadCardProps): JSX.Element {
  // Auto-compute variant from alertThreshold if provided
  const numericValue = parseFloat(value);
  const effectiveVariant =
    alertThreshold !== undefined && !isNaN(numericValue) && numericValue > alertThreshold
      ? alertSeverity
      : variant;

  const variantStyle: React.CSSProperties =
    effectiveVariant === 'danger'
      ? { borderColor: 'var(--color-status-danger)', borderLeftWidth: '4px', borderStyle: 'solid' }
      : effectiveVariant === 'warning'
        ? { borderColor: 'var(--color-status-warning)', borderLeftWidth: '4px', borderStyle: 'solid' }
        : {};

  const showAlert =
    alertThreshold !== undefined && !isNaN(numericValue) && numericValue > alertThreshold;

  const valueStyle: React.CSSProperties =
    effectiveVariant === 'danger'
      ? { color: 'var(--color-status-danger)' }
      : effectiveVariant === 'warning'
        ? { color: 'var(--color-status-warning)' }
        : {};

  const inner = compact ? (
    <div className="monitoring-card--compact-row">
      <span
        className="monitoring-card__value monitoring-card__value--compact"
        style={valueStyle}
      >
        {value}
      </span>
      <span className="metric-card__label" style={{ marginLeft: '8px' }}>
        {label}
        {showAlert ? (
          <span
            aria-label="alert"
            style={{ marginLeft: '4px', fontSize: '12px' }}
            title={`Value exceeds threshold of ${alertThreshold}`}
          >
            ⚠
          </span>
        ) : null}
      </span>
    </div>
  ) : (
    <>
      <span className="metric-card__label">
        {label}
        {showAlert ? (
          <span
            aria-label="alert"
            style={{ marginLeft: '4px', fontSize: '12px' }}
            title={`Value exceeds threshold of ${alertThreshold}`}
          >
            ⚠
          </span>
        ) : null}
      </span>
      <div style={{ alignItems: 'flex-end', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
        <div>
          <div className="monitoring-card__value" style={valueStyle}>
            {value}
          </div>
          {trendChange !== undefined ? <TrendIndicator change={trendChange} /> : null}
        </div>
        {trendData && trendData.length > 1 ? (
          <Sparkline data={trendData} height={32} width={64} />
        ) : null}
      </div>
      {supportingText ? <p className="monitoring-card__summary">{supportingText}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        className="monitoring-card"
        style={{ ...variantStyle, cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}
        to={href}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="monitoring-card" style={variantStyle}>
      {inner}
    </div>
  );
}
