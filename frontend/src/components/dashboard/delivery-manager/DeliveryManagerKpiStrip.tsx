import { Link } from 'react-router-dom';

import { TipBalloon } from '@/components/common/TipBalloon';

interface DeliveryManagerKpiStripProps {
  activeProjects: number;
  activeAssignments: number;
  noStaff: number;
  /** Caller wires to switch dashboard tabs; the Unstaffed tile fires this. */
  onShowPortfolioTab: () => void;
}

/**
 * 20c-15 — extracted from `DeliveryManagerDashboardPage.tsx`. Same 3 tiles,
 * same drilldown targets, same threshold colors. Caller passes the tab-
 * switch handler so the "Unstaffed" tile can pivot the page view.
 */
export function DeliveryManagerKpiStrip({
  activeProjects,
  activeAssignments,
  noStaff,
  onShowPortfolioTab,
}: DeliveryManagerKpiStripProps): JSX.Element {
  return (
    <div className="kpi-strip" aria-label="Key metrics">
      <Link
        className="kpi-strip__item"
        to="/projects?status=active"
        style={{ borderLeft: '3px solid var(--color-accent)' }}
      >
        <TipBalloon tip="Total projects with active status in your portfolio." arrow="left" />
        <span className="kpi-strip__value">{activeProjects}</span>
        <span className="kpi-strip__label">Active Projects</span>
      </Link>

      <Link
        className="kpi-strip__item"
        to="/assignments?status=active"
        style={{ borderLeft: '3px solid var(--color-chart-5)' }}
      >
        <TipBalloon tip="People currently assigned to active projects." arrow="left" />
        <span className="kpi-strip__value">{activeAssignments}</span>
        <span className="kpi-strip__label">Active Positions</span>
      </Link>

      <Link
        className="kpi-strip__item"
        to="#unstaffed-projects"
        onClick={(e) => {
          e.preventDefault();
          onShowPortfolioTab();
        }}
        style={{
          borderLeft: `3px solid ${noStaff > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}`,
        }}
      >
        <TipBalloon
          tip="Projects with no staff assigned — at risk and need immediate attention."
          arrow="left"
        />
        <span className="kpi-strip__value">{noStaff}</span>
        <span className="kpi-strip__label">Unstaffed</span>
        <span
          className="kpi-strip__context"
          style={{
            color: noStaff > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
          }}
        >
          {noStaff === 0 ? 'All staffed' : 'needs attention'}
        </span>
      </Link>
    </div>
  );
}
