import { Link } from 'react-router-dom';

import { TipBalloon } from '@/components/common/TipBalloon';
import { Pct } from '@/components/ds/Pct';
import { SparklineDs, type SparklineTone } from '@/components/ds';
import type { PortfolioSummaryResponse } from '@/lib/api/portfolio-dashboard';

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

function tone(val: number, warn: number, danger: number, higherIsBad = true): SparklineTone {
  if (higherIsBad) {
    if (val >= danger) return 'danger';
    if (val >= warn) return 'warning';
    return 'active';
  }
  if (val <= danger) return 'danger';
  if (val <= warn) return 'warning';
  return 'active';
}

interface DirectorSummary {
  activeProjectCount: number;
  staffingUtilisationRate: number;
  unstaffedActivePersonCount: number;
}

interface DirectorWeeklyTrendPoint {
  staffingUtilisationRate: number;
}

interface DirectorSlaSummary {
  slaBreaches24h: number;
  timeToFillMedianDays: number | null;
  timeToFillSeries: number[];
}

interface DirectorKpiStripProps {
  summary: DirectorSummary;
  weeklyTrend: ReadonlyArray<DirectorWeeklyTrendPoint>;
  portfolioSummary: PortfolioSummaryResponse | null;
  slaSummary: DirectorSlaSummary | null;
}

/**
 * 20c-15 — extracted from `DirectorDashboardPage.tsx` (was 9 inline `<Link>`
 * tiles bloating the main render). Same KPIs, same `data-jtbd` attributes,
 * same threshold colors — just moved to a dedicated file so the page render
 * + this strip can evolve independently.
 *
 * UX laws preserved: every tile is a `<Link>` drilldown (Law 9), every tile
 * declares its `data-jtbd` question, threshold-driven left-border color via
 * `tc(value, warn, danger)`.
 */
export function DirectorKpiStrip({
  summary,
  weeklyTrend,
  portfolioSummary,
  slaSummary,
}: DirectorKpiStripProps): JSX.Element {
  return (
    <div className="kpi-strip" aria-label="Portfolio health">
      <Link
        className="kpi-strip__item"
        data-jtbd="How many active projects do we have?"
        to="/projects"
        style={{ borderLeft: '3px solid var(--color-accent)' }}
      >
        <TipBalloon tip="Total active projects across the organization." arrow="left" />
        <span className="kpi-strip__value">{summary.activeProjectCount}</span>
        <span className="kpi-strip__label">Active Projects</span>
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="What's our org-wide utilisation?"
        to="/people"
        style={{
          borderLeft: `3px solid ${tc(Math.round(summary.staffingUtilisationRate), 60, 40, false)}`,
        }}
      >
        <TipBalloon
          tip="Percentage of active people currently assigned to at least one project."
          arrow="left"
        />
        <span className="kpi-strip__value"><Pct value={Math.round(summary.staffingUtilisationRate)} /></span>
        <span className="kpi-strip__label">Utilisation</span>
        <SparklineDs
          data={weeklyTrend.map((w) => w.staffingUtilisationRate)}
          height={20}
          width={60}
          tone={tone(Math.round(summary.staffingUtilisationRate), 60, 40, false)}
        />
      </Link>

      <Link
        className="kpi-strip__item"
        data-jtbd="How many people are on the bench?"
        to="/people?filter=unassigned"
        style={{ borderLeft: `3px solid ${tc(summary.unstaffedActivePersonCount, 3, 8)}` }}
      >
        <TipBalloon tip="Active people with no current assignment (bench)." arrow="left" />
        <span className="kpi-strip__value">{summary.unstaffedActivePersonCount}</span>
        <span className="kpi-strip__label">On Bench</span>
      </Link>

      {portfolioSummary ? (
        <>
          <Link
            className="kpi-strip__item"
            data-jtbd="How many roles still need filling?"
            to="/projects?hasOpenGaps=true"
            style={{ borderLeft: `3px solid ${tc(portfolioSummary.totalOpenGaps, 3, 8)}` }}
          >
            <TipBalloon tip="Total unfilled positions across all project role plans. Click to filter projects with open gaps." arrow="left" />
            <span className="kpi-strip__value">{portfolioSummary.totalOpenGaps}</span>
            <span className="kpi-strip__label">Open Gaps</span>
          </Link>

          <Link
            className="kpi-strip__item"
            data-jtbd="How well-staffed are projects overall?"
            to="/projects?status=ACTIVE"
            style={{
              borderLeft: `3px solid ${tc(portfolioSummary.overallFillRate, 60, 40, false)}`,
            }}
          >
            <TipBalloon
              tip="Organization-wide staffing fill rate across all projects with role plans. Click to view all active projects."
              arrow="left"
            />
            <span className="kpi-strip__value"><Pct value={portfolioSummary.overallFillRate} /></span>
            <span className="kpi-strip__label">Fill Rate</span>
          </Link>

          <Link
            className="kpi-strip__item"
            data-jtbd="What's the green / amber / red split across the portfolio?"
            to="/projects?status=ACTIVE"
            style={{ borderLeft: '3px solid var(--color-chart-5)' }}
          >
            <TipBalloon
              tip="Portfolio health split. Click to view all active projects with RAG signals."
              arrow="left"
            />
            <span className="kpi-strip__value">
              <span style={{ color: 'var(--color-status-active)' }}>{portfolioSummary.byRag.green}</span>
              {' / '}
              <span style={{ color: 'var(--color-status-warning)' }}>{portfolioSummary.byRag.amber}</span>
              {' / '}
              <span style={{ color: 'var(--color-status-danger)' }}>{portfolioSummary.byRag.red}</span>
            </span>
            <span className="kpi-strip__label">G / A / R</span>
          </Link>
        </>
      ) : null}

      {slaSummary ? (
        <>
          <Link
            className="kpi-strip__item"
            data-jtbd="What's at risk?"
            to="/staffing-desk?filter=sla"
            style={{
              borderLeft: `3px solid ${slaSummary.slaBreaches24h > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}`,
            }}
          >
            <TipBalloon
              tip="Assignments whose SLA due-date is within ±24h and have not yet been marked breached. Red when any are pending."
              arrow="left"
            />
            <span className="kpi-strip__value">{slaSummary.slaBreaches24h}</span>
            <span className="kpi-strip__label">24h SLA Breach</span>
          </Link>

          <Link
            className="kpi-strip__item"
            data-jtbd="How fast are we filling roles?"
            to="/staffing-requests?status=FULFILLED"
            style={{ borderLeft: '3px solid var(--color-chart-2)' }}
          >
            <TipBalloon
              tip="Rolling 4-week median time-to-fill (days) per filled position. Sparkline shows per-week trend."
              arrow="left"
            />
            <span className="kpi-strip__value">
              {slaSummary.timeToFillMedianDays !== null
                ? `${Math.round(slaSummary.timeToFillMedianDays)}d`
                : '—'}
            </span>
            <span className="kpi-strip__label">Time to Fill (4w)</span>
            {slaSummary.timeToFillSeries.some((v) => v > 0) ? (
              <SparklineDs
                data={slaSummary.timeToFillSeries}
                height={20}
                width={60}
                tone="info"
              />
            ) : null}
          </Link>
        </>
      ) : null}
    </div>
  );
}
