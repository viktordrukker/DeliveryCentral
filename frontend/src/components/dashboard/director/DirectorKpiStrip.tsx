import { Link } from 'react-router-dom';

import { TipBalloon } from '@/components/common/TipBalloon';
import { Pct } from '@/components/ds/Pct';
import { SparklineDs, type SparklineTone } from '@/components/ds';

function tc(val: number, warn: number, danger: number, higherIsBad = true): string {
  if (higherIsBad) {
    if (val >= danger) return 'var(--color-status-danger)';
    if (val >= warn) return 'var(--color-status-warning)';
    return 'var(--color-status-active)';
  }
  if (val <= danger) return 'var(--color-status-danger)';
  if (val <= warn) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

function utilTone(val: number): SparklineTone {
  if (val <= 40) return 'danger';
  if (val <= 60) return 'warning';
  return 'active';
}

interface DirectorSlaSummary {
  slaBreaches24h: number;
  timeToFillMedianDays: number | null;
  timeToFillSeries: number[];
}

interface DirectorKpiStripProps {
  /** Active project count (drives "Active projects" tile). */
  projectCount: number;
  /** Amber + red project count (drives "At-risk projects" tile). */
  atRiskCount: number;
  /** Signed budget variance vs. plan, in percent. Negative = over budget. */
  budgetVariancePct: number;
  /** Org utilisation, in percent (0-100). */
  utilisationPct: number;
  /** Weekly utilisation series for the sparkline. */
  utilSeries: number[];
  /** Open positions (totalOpenGaps from portfolio summary). */
  openPositions: number;
  /** SLA summary, kept for the "Time to Fill" sparkline tone but no longer
   * rendered as its own KPI tile (DS canvas only allows 5 tiles). */
  slaSummary: DirectorSlaSummary | null;
}

/**
 * DS canvas-conformant 5-tile KPI strip for the Director dashboard.
 *
 * Tiles (in order): Active projects · At-risk projects · Budget variance ·
 * Utilisation · Open positions. Each tile is a `<Link>` (UX Law 9).
 *
 * Reference: DS/page-director.jsx section 3.
 */
export function DirectorKpiStrip({
  atRiskCount,
  budgetVariancePct,
  openPositions,
  projectCount,
  slaSummary,
  utilSeries,
  utilisationPct,
}: DirectorKpiStripProps): JSX.Element {
  return (
    <div aria-label="Portfolio health" className="kpi-strip">
      <Link
        className="kpi-strip__item"
        data-jtbd="How many active projects do we have?"
        style={{ borderLeft: '3px solid var(--color-accent)' }}
        to="/projects?status=ACTIVE"
      >
        <TipBalloon arrow="left" tip="Total active projects across the portfolio." />
        <span className="kpi-strip__value">{projectCount}</span>
        <span className="kpi-strip__label">Active projects</span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="Which projects are at risk?"
        style={{ borderLeft: `3px solid ${tc(atRiskCount, 1, 3)}` }}
        to="/projects?rag=AMBER,RED"
      >
        <TipBalloon arrow="left" tip="Projects whose latest RAG is amber or red." />
        <span className="kpi-strip__value">{atRiskCount}</span>
        <span className="kpi-strip__label">At-risk projects</span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="What's our portfolio budget variance?"
        style={{
          borderLeft: `3px solid ${budgetVariancePct < -2
            ? 'var(--color-status-danger)'
            : budgetVariancePct < 0
              ? 'var(--color-status-warning)'
              : 'var(--color-status-active)'}`,
        }}
        to="/projects?budgetStatus=over"
      >
        <TipBalloon
          arrow="left"
          tip="Portfolio-wide budget variance vs plan. Negative = over budget."
        />
        <span className="kpi-strip__value">
          <Pct sign value={budgetVariancePct} />
        </span>
        <span className="kpi-strip__label">Budget variance · portfolio</span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="What's our org-wide utilisation?"
        style={{ borderLeft: `3px solid ${tc(utilisationPct, 60, 40, false)}` }}
        to="/people"
      >
        <TipBalloon
          arrow="left"
          tip="Percentage of active people currently assigned to at least one project."
        />
        <span className="kpi-strip__value"><Pct value={utilisationPct} /></span>
        <span className="kpi-strip__label">Utilisation</span>
        {utilSeries.length > 0 ? (
          <SparklineDs
            data={utilSeries}
            height={20}
            tone={utilTone(utilisationPct)}
            width={60}
          />
        ) : null}
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="How many positions still need filling?"
        style={{ borderLeft: `3px solid ${tc(openPositions, 3, 8)}` }}
        to="/projects?hasOpenGaps=true"
      >
        <TipBalloon
          arrow="left"
          tip="Open positions across all project role plans. Click to filter projects with open gaps."
        />
        <span className="kpi-strip__value">{openPositions}</span>
        <span className="kpi-strip__label">Open positions</span>
        {slaSummary && slaSummary.timeToFillSeries.some((v) => v > 0) ? (
          <SparklineDs
            data={slaSummary.timeToFillSeries}
            height={20}
            tone="info"
            width={60}
          />
        ) : null}
      </Link>
    </div>
  );
}
