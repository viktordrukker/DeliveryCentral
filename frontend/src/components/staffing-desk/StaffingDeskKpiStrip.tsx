import { Link } from 'react-router-dom';

import type { StaffingDeskKpis, SupplyDemandMetrics } from '@/lib/api/staffing-desk';

function tc(value: number, warn: number, danger: number, higherIsBad = true): string {
  if (higherIsBad) {
    if (value >= danger) return 'var(--color-status-danger)';
    if (value >= warn) return 'var(--color-status-warning)';
    return 'var(--color-status-active)';
  }
  if (value <= danger) return 'var(--color-status-danger)';
  if (value <= warn) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

interface Props {
  kpis: StaffingDeskKpis;
  onDemandClick?: () => void;
  onSupplyClick?: () => void;
  supplyDemand: SupplyDemandMetrics;
}

export function StaffingDeskKpiStrip({ kpis, onDemandClick, onSupplyClick, supplyDemand }: Props): JSX.Element {
  const tiles = [
    {
      label: 'Supply',
      value: `${supplyDemand.totalPeople}`,
      context: `${supplyDemand.availableFte} available`,
      color: tc(supplyDemand.availableFte, 10, 5, false),
      to: '',
      onClick: onSupplyClick,
    },
    {
      label: 'Available FTE',
      value: `${supplyDemand.availableFte}`,
      context: `${supplyDemand.benchCount} on bench`,
      color: 'var(--color-status-active)',
      to: '',
      onClick: onSupplyClick,
    },
    {
      label: 'Open Demand',
      value: `${supplyDemand.headcountOpen} HC`,
      context: `${kpis.openRequests} requests`,
      color: 'var(--color-status-warning)',
      to: '',
      onClick: onDemandClick,
    },
    {
      label: 'Staffing Gap',
      value: `${supplyDemand.gapHc > 0 ? '+' : ''}${supplyDemand.gapHc}`,
      context: supplyDemand.gapHc > 0 ? 'deficit' : supplyDemand.gapHc < 0 ? 'surplus' : 'balanced',
      color: supplyDemand.gapHc > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
      to: '',
      onClick: onDemandClick,
    },
    {
      label: 'Fill Rate',
      value: `${supplyDemand.fillRatePercent}%`,
      context: `avg ${supplyDemand.avgDaysToFulfil}d to fill`,
      color: tc(supplyDemand.fillRatePercent, 80, 60, false),
      to: '/staffing-desk?kind=request&status=FULFILLED',
    },
    {
      label: 'Overallocated',
      value: `${kpis.overallocatedPeople}`,
      context: 'people >100%',
      color: kpis.overallocatedPeople > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
      to: '/staffing-desk?allocMin=101',
    },
  ];

  return (
    <div className="kpi-strip">
      {tiles.map((t) =>
        t.to ? (
          <Link key={t.label} className="kpi-strip__item" to={t.to} style={{ borderLeft: `3px solid ${t.color}` }}>
            <span className="kpi-strip__value">{t.value}</span>
            <span className="kpi-strip__label">{t.label}</span>
            <span className="kpi-strip__context">{t.context}</span>
          </Link>
        ) : t.onClick ? (
          <a key={t.label} className="kpi-strip__item" onClick={t.onClick} style={{ borderLeft: `3px solid ${t.color}`, cursor: 'pointer' }} role="button" tabIndex={0}>
            <span className="kpi-strip__value">{t.value}</span>
            <span className="kpi-strip__label">{t.label}</span>
            <span className="kpi-strip__context">{t.context}</span>
          </a>
        ) : (
          <div key={t.label} className="kpi-strip__item" style={{ borderLeft: `3px solid ${t.color}` }}>
            <span className="kpi-strip__value">{t.value}</span>
            <span className="kpi-strip__label">{t.label}</span>
            <span className="kpi-strip__context">{t.context}</span>
          </div>
        ),
      )}
    </div>
  );
}
