import { Link } from 'react-router-dom';

import { TipBalloon } from '@/components/common/TipBalloon';
import { Pct } from '@/components/ds/Pct';
import { SparklineDs, type SparklineTone } from '@/components/ds';

interface RmKpiStripProps {
  utilPct: number;
  utilSpark: number[];
  managedTeamCount: number;
  totalPeople: number;
  allocatedPeople: number;
  idlePeople: number;
  overallocatedCount: number;
}

function utilTone(pct: number): string {
  if (pct >= 85) return 'var(--color-status-active)';
  if (pct >= 65) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

function utilSparkTone(pct: number): SparklineTone {
  if (pct >= 85) return 'active';
  if (pct >= 65) return 'warning';
  return 'danger';
}

function idleTone(idle: number): string {
  if (idle === 0) return 'var(--color-status-danger)';
  if (idle > 5) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

export function RmKpiStrip({
  utilPct,
  utilSpark,
  managedTeamCount,
  totalPeople,
  allocatedPeople,
  idlePeople,
  overallocatedCount,
}: RmKpiStripProps): JSX.Element {
  return (
    <div className="kpi-strip" aria-label="Key metrics">
      <Link
        className="kpi-strip__item"
        data-jtbd="How is my pool utilised this week?"
        to="/workload"
        style={{ borderLeft: `3px solid ${utilTone(utilPct)}` }}
      >
        <TipBalloon
          tip="Ratio of assigned people to total headcount. Target is 80%. Green = healthy, amber = watch, red = low."
          arrow="left"
        />
        <span className="kpi-strip__value"><Pct value={utilPct} /></span>
        <span className="kpi-strip__label">Utilization</span>
        <div className="kpi-strip__progress">
          <div
            className="kpi-strip__progress-fill"
            style={{ width: `${Math.min(utilPct, 100)}%`, background: utilTone(utilPct) }}
          />
        </div>
        {utilSpark.length > 3 && (
          <div className="kpi-strip__sparkline">
            <SparklineDs data={utilSpark} height={24} width={72} tone={utilSparkTone(utilPct)} />
          </div>
        )}
      </Link>

      <Link className="kpi-strip__item" data-jtbd="How many teams do I run?" to="/teams" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <TipBalloon tip="Teams you manage directly. Click to view the full teams list." arrow="left" />
        <span className="kpi-strip__value">{managedTeamCount}</span>
        <span className="kpi-strip__label">Managed Teams</span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="How many people do I oversee?"
        to="/people"
        style={{ borderLeft: '3px solid var(--color-chart-5)' }}
      >
        <TipBalloon tip="Total headcount across all teams you manage." arrow="left" />
        <span className="kpi-strip__value">{totalPeople}</span>
        <span className="kpi-strip__label">Managed People</span>
        <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
          {allocatedPeople} assigned · {idlePeople} idle
        </span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="Who is idle right now?"
        to="/people?filter=idle"
        style={{ borderLeft: `3px solid ${idleTone(idlePeople)}` }}
      >
        <TipBalloon
          tip="People with no active assignment. High counts indicate underutilized capacity. Zero means no spare capacity."
          arrow="left"
        />
        <span className="kpi-strip__value">{idlePeople}</span>
        <span className="kpi-strip__label">Idle Resources</span>
        <span
          className="kpi-strip__context"
          style={{ color: idlePeople === 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}
        >
          {idlePeople === 0 ? 'No spare capacity' : 'available to assign'}
        </span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="Who is overallocated and needs rebalancing?"
        to="/assignments"
        style={{
          borderLeft: `3px solid ${
            overallocatedCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'
          }`,
        }}
      >
        <TipBalloon tip="People allocated above 100%. Red means immediate rebalancing is needed." arrow="left" />
        <span className="kpi-strip__value">{overallocatedCount}</span>
        <span className="kpi-strip__label">Overallocated</span>
        <span
          className="kpi-strip__context"
          style={{
            color: overallocatedCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
          }}
        >
          {overallocatedCount === 0 ? 'All clear' : 'needs rebalancing'}
        </span>
      </Link>
    </div>
  );
}
