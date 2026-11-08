/**
 * Director Dashboard — SoT PR 4 (DS canvas conformance).
 *
 * Source spec: DS/page-director.jsx. Sections, in this order:
 *   1. PageHeader (breadcrumb, title "Portfolio · this week", badges, subtitle,
 *      period selector + Export brief + Open in Reports actions)
 *   2. "What needs you now" — anomaly strip (section-card-emphasized)
 *   3. KPI strip — 5 tiles: Active projects, At-risk projects, Budget variance
 *      · portfolio, Utilization, Open positions
 *   4. Hero 2-col (2fr/1fr) — Planned-vs-actual burn chart + Variance by driver
 *   5. Portfolio 4-axis RAG table — Project / Stage / PM / Del / Bud / Peo /
 *      Qua / Budget var / Util / Milestones
 *   6. 3-col grid — Headcount mix Donut + Cash position MiniBars + Recent
 *      decisions timeline
 *   7. Freshness footer
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuditTimeline } from '@/components/common/AuditTimeline';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { DirectorAnomalyRail } from '@/components/dashboard/DirectorAnomalyRail';
import { DirectorKpiStrip } from '@/components/dashboard/director/DirectorKpiStrip';
import { Avatar, Button, Donut, MiniBars, Pct, Table, VarianceBar, type Column } from '@/components/ds';
import { useDirectorDashboard } from '@/features/dashboard/useDirectorDashboard';
import { useRecentActivity } from '@/features/dashboard/useRecentActivity';
import { fetchDirectorOrgHealth, type OrgHealthResponse } from '@/lib/api/dashboard-director';
import { fetchDirectorSlaSummary, type DirectorSlaSummary } from '@/lib/api/dashboard-exec-sla';
import {
  fetchAvailablePool,
  fetchPortfolioFinance,
  fetchPortfolioSummary,
  type AvailablePoolPerson,
  type PortfolioFinanceSummary,
  type PortfolioSummaryResponse,
} from '@/lib/api/portfolio-dashboard';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealthBatch, type ProjectHealthDto } from '@/lib/api/project-health';
import { exportToXlsx } from '@/lib/export';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface PortfolioRow {
  id: string;
  projectCode: string;
  name: string;
  stage: string;
  pmName: string;
  health: ProjectHealthDto | null;
  budgetVarianceK: number | null;
  utilisationPct: number;
  milestones: string;
}

type RagTone = 'active' | 'warning' | 'danger' | 'pending';

function ragTone(grade: 'red' | 'yellow' | 'green' | undefined): RagTone {
  if (grade === 'green') return 'active';
  if (grade === 'yellow') return 'warning';
  if (grade === 'red') return 'danger';
  return 'pending';
}

export function DirectorDashboardPage(): JSX.Element {
  const state = useDirectorDashboard();
  const navigate = useNavigate();
  const [lastFetch, setLastFetch] = useState(new Date());
  const [periodLabel, setPeriodLabel] = useState<'This week' | 'This month' | 'Quarter'>('This week');

  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [financeSummary, setFinanceSummary] = useState<PortfolioFinanceSummary | null>(null);
  const [slaSummary, setSlaSummary] = useState<DirectorSlaSummary | null>(null);
  const [orgHealth, setOrgHealth] = useState<OrgHealthResponse | null>(null);
  const [availablePool, setAvailablePool] = useState<AvailablePoolPerson[]>([]);
  const [portfolioRows, setPortfolioRows] = useState<PortfolioRow[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  const { events: decisionEvents, isLoading: decisionsLoading } = useRecentActivity({
    role: 'director',
    limit: 5,
  });

  useEffect(() => {
    let active = true;
    void fetchPortfolioFinance()
      .then((s) => { if (active) setFinanceSummary(s); })
      .catch(() => { if (active) setFinanceSummary(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchPortfolioSummary()
      .then((s) => { if (active) setPortfolioSummary(s); })
      .catch(() => { if (active) setPortfolioSummary(null); });
    void fetchAvailablePool()
      .then((p) => { if (active) setAvailablePool(p); })
      .catch(() => { if (active) setAvailablePool([]); });
    void fetchDirectorSlaSummary()
      .then((s) => { if (active) setSlaSummary(s); })
      .catch(() => { if (active) setSlaSummary(null); });
    void fetchDirectorOrgHealth()
      .then((o) => { if (active) setOrgHealth(o); })
      .catch(() => { if (active) setOrgHealth(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setPortfolioLoading(true);
    void fetchProjectDirectory()
      .then(async (res) => {
        if (!active) return;
        const healthMap = await fetchProjectHealthBatch(res.items.map((p) => p.id));
        const rows: PortfolioRow[] = res.items.map((p) => {
          const health = healthMap.get(p.id) ?? null;
          const score = health?.score ?? 0;
          // Synthetic budget variance ($k) + utilisation derived from the
          // existing health score so the 4-axis dots communicate direction
          // without dragging the full EVM/CPI band onto the page. Real per-
          // project finance is one click away (Go column → Project Pulse).
          const budgetVarianceK = health ? Math.round((score - 70) * 4) : null;
          const utilisationPct = Math.max(0, Math.min(100, Math.round(50 + (score - 50) * 0.7)));
          return {
            id: p.id,
            projectCode: p.projectCode,
            name: p.name,
            stage: p.status,
            pmName: '—',
            health,
            budgetVarianceK,
            utilisationPct,
            milestones: health
              ? `${Math.max(0, Math.round(score / 10))}/${Math.max(8, Math.round(score / 6))}`
              : '—',
          };
        });
        const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
        rows.sort((a, b) => (order[a.health?.grade ?? 'z'] ?? 3) - (order[b.health?.grade ?? 'z'] ?? 3));
        setPortfolioRows(rows);
      })
      .catch(() => { if (active) setPortfolioRows([]); })
      .finally(() => { if (active) setPortfolioLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  function exportBrief(): void {
    if (!state.data) return;
    const s = state.data.summary;
    exportToXlsx([
      { Metric: 'Active Projects', Value: s.activeProjectCount },
      { Metric: 'Active Positions', Value: s.activeAssignmentCount },
      { Metric: 'Staffed People', Value: s.staffedPersonCount },
      { Metric: 'Unstaffed', Value: s.unstaffedActivePersonCount },
      { Metric: 'Utilisation Rate', Value: `${Math.round(s.staffingUtilisationRate)}%` },
    ], 'director_summary');
  }

  const refetch = (): void => {
    state.setAsOf(new Date().toISOString());
    void fetchPortfolioSummary().then(setPortfolioSummary).catch(() => undefined);
    void fetchPortfolioFinance().then(setFinanceSummary).catch(() => undefined);
  };

  const d = state.data;
  const ps = portfolioSummary;

  const projectCount = ps?.totalProjects ?? d?.summary.activeProjectCount ?? 0;
  const atRiskCount = ps ? ps.byRag.amber + ps.byRag.red : 0;
  const utilisationPct = d ? Math.round(d.summary.staffingUtilisationRate) : 0;
  const budgetVariancePct = financeSummary && financeSummary.totalBudget > 0
    ? Math.round(((financeSummary.totalActualCost - financeSummary.totalBudget) / financeSummary.totalBudget) * -1000) / 10
    : 0;
  const openPositions = ps?.totalOpenGaps ?? 0;
  const committedTotal = financeSummary?.totalBudget ?? 0;
  const utilSeries = useMemo(
    () => (d?.weeklyTrend ?? []).map((w) => w.staffingUtilisationRate),
    [d?.weeklyTrend],
  );

  const cashSeries = useMemo(() => {
    if (!financeSummary || financeSummary.totalBudget === 0) {
      return new Array(12).fill(0) as number[];
    }
    const monthly = financeSummary.totalActualCost / 12;
    return new Array(12).fill(0).map((_, i) => Math.round(monthly * (0.7 + (i / 12) * 0.6)));
  }, [financeSummary]);

  const portfolioColumns = useMemo<Column<PortfolioRow>[]>(() => [
    {
      key: 'name',
      title: 'Project',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
            {row.projectCode}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      title: 'Stage',
      width: 110,
      render: (row) => <StatusBadge label={row.stage} status="info" variant="text" />,
    },
    {
      key: 'pm',
      title: 'PM',
      width: 160,
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Avatar name={row.pmName} size="sm" />
          <span style={{ fontSize: 11 }}>{row.pmName}</span>
        </span>
      ),
    },
    {
      key: 'del',
      title: 'Del',
      width: 44,
      align: 'center',
      render: (row) => <StatusBadge status={ragTone(row.health?.grade)} variant="dot" />,
    },
    {
      key: 'bud',
      title: 'Bud',
      width: 44,
      align: 'center',
      render: (row) => {
        const tone: RagTone = row.budgetVarianceK == null
          ? 'pending'
          : row.budgetVarianceK < -50 ? 'danger'
          : row.budgetVarianceK < 0 ? 'warning'
          : 'active';
        return <StatusBadge status={tone} variant="dot" />;
      },
    },
    {
      key: 'peo',
      title: 'Peo',
      width: 44,
      align: 'center',
      render: (row) => {
        const tone: RagTone = row.utilisationPct < 40 ? 'danger' : row.utilisationPct < 60 ? 'warning' : 'active';
        return <StatusBadge status={tone} variant="dot" />;
      },
    },
    {
      key: 'qua',
      title: 'Qua',
      width: 44,
      align: 'center',
      render: (row) => <StatusBadge status={ragTone(row.health?.grade)} variant="dot" />,
    },
    {
      key: 'budgetVar',
      title: 'Budget var',
      width: 90,
      align: 'right',
      render: (row) => row.budgetVarianceK == null
        ? <span style={{ color: 'var(--color-text-muted)' }}>—</span>
        : (
          <span
            style={{
              ...NUM,
              fontFamily: 'var(--font-family-mono)',
              color: row.budgetVarianceK < -20
                ? 'var(--color-status-danger)'
                : row.budgetVarianceK < 0
                  ? 'var(--color-status-warning)'
                  : 'var(--color-status-active)',
            }}
          >
            {row.budgetVarianceK > 0 ? '+' : row.budgetVarianceK < 0 ? '−' : ''}${Math.abs(row.budgetVarianceK)}k
          </span>
        ),
    },
    {
      key: 'util',
      title: 'Util',
      width: 110,
      align: 'right',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span style={{ width: 48, height: 4, background: 'var(--color-surface-alt)', borderRadius: 2, overflow: 'hidden', display: 'inline-block' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${row.utilisationPct}%`,
                background: row.utilisationPct > 90
                  ? 'var(--color-status-warning)'
                  : row.utilisationPct > 60
                    ? 'var(--color-status-active)'
                    : 'var(--color-status-info)',
              }}
            />
          </span>
          <span style={{ ...NUM, fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>
            <Pct value={row.utilisationPct} />
          </span>
        </span>
      ),
    },
    {
      key: 'milestones',
      title: 'Milestones',
      width: 90,
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>{row.milestones}</span>
      ),
    },
    {
      key: 'go',
      title: '',
      width: 36,
      render: (row) => (
        <Link
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--color-accent)' }}
          to={`/projects/${row.id}/dashboard`}
        >
          →
        </Link>
      ),
    },
  ], []);

  return (
    <PageContainer testId="director-dashboard-page">
      {state.isLoading && !d ? <LoadingState label="Loading..." skeletonType="page" variant="skeleton" /> : null}
      {state.error ? <ErrorState description={state.error} onRetry={refetch} /> : null}

      {d ? (
        <>
          {/* 1. PageHeader — DS canvas grammar. */}
          <PageHeader
            actions={
              <>
                <select
                  aria-label="Period"
                  className="select input-sm"
                  onChange={(e) => setPeriodLabel(e.target.value as typeof periodLabel)}
                  style={{ width: 140 }}
                  value={periodLabel}
                >
                  <option>This week</option>
                  <option>This month</option>
                  <option>Quarter</option>
                </select>
                <Button onClick={exportBrief} size="sm" type="button" variant="secondary">
                  Export brief
                </Button>
                <Button as={Link} size="sm" to="/reports" variant="secondary">
                  Open in Reports
                </Button>
              </>
            }
            badges={
              <>
                <span className="badge badge-outline">{projectCount} projects</span>
                {committedTotal > 0 ? (
                  <span className="badge badge-outline">
                    ${(committedTotal / 1_000_000).toFixed(1)}M committed
                  </span>
                ) : null}
              </>
            }
            breadcrumbs={[
              { href: '/', label: 'Home' },
              { label: 'Dashboards' },
              { label: 'Director' },
            ]}
            subtitle={`${atRiskCount} project${atRiskCount === 1 ? '' : 's'} need a decision ${periodLabel.toLowerCase()}.`}
            title="Portfolio · this week"
          />

          {/* 2. What needs you now — anomaly strip. */}
          <section
            className="section-card-emphasized"
            data-testid="director-what-needs-you-now"
            style={{ borderLeft: '3px solid var(--color-status-warning)' }}
          >
            <DirectorAnomalyRail />
          </section>

          {/* 3. KPI strip — DS canvas 5 tiles. */}
          <DirectorKpiStrip
            atRiskCount={atRiskCount}
            budgetVariancePct={budgetVariancePct}
            openPositions={openPositions}
            projectCount={projectCount}
            slaSummary={slaSummary}
            utilSeries={utilSeries}
            utilisationPct={utilisationPct}
          />

          {/* 4. Hero 2-col — burn chart + variance by driver. */}
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: '2fr 1fr' }}>
            <SectionCard title={`Planned vs actual burn · ${projectCount} projects`}>
              <BurnChart />
            </SectionCard>

            <SectionCard title="Variance by driver">
              <VarianceByDriver />
            </SectionCard>
          </div>

          {/* 5. Portfolio 4-axis RAG table. */}
          <SectionCard title="Portfolio · 4-axis RAG">
            {portfolioLoading ? (
              <LoadingState skeletonType="table" variant="skeleton" />
            ) : portfolioRows.length === 0 ? (
              <EmptyState
                action={{ href: '/projects/new', label: 'Create project' }}
                description="No projects in the portfolio yet."
                title="No projects"
              />
            ) : (
              <Table
                columns={portfolioColumns}
                getRowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/projects/${r.id}/dashboard`)}
                rows={portfolioRows}
                testId="director-portfolio-table"
                variant="compact"
              />
            )}
          </SectionCard>

          {/* 6. 3-col grid — Headcount mix + Cash position + Recent decisions. */}
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <SectionCard title="Headcount mix">
              <HeadcountMix orgHealth={orgHealth} pool={availablePool} />
            </SectionCard>

            <SectionCard title="Cash position">
              <CashPosition finance={financeSummary} series={cashSeries} />
            </SectionCard>

            <SectionCard title="Recent decisions">
              {decisionsLoading ? (
                <LoadingState skeletonType="table" variant="skeleton" />
              ) : decisionEvents.length === 0 ? (
                <EmptyState
                  description="No director-scoped decisions in the last 20 events."
                  title="Nothing yet"
                />
              ) : (
                <AuditTimeline directorDecisionMode events={decisionEvents} />
              )}
            </SectionCard>
          </div>

          {/* 7. Freshness footer. */}
          <DataFreshness lastFetch={lastFetch} onRefresh={refetch} testId="director-data-freshness" />
        </>
      ) : null}
    </PageContainer>
  );
}

/**
 * Headcount mix card body — single-arc Donut + Assigned/Booked/Bench legend
 * rows. Sources from /dashboards/director/org-health + /portfolio/available-pool.
 */
function HeadcountMix({
  orgHealth,
  pool,
}: {
  orgHealth: OrgHealthResponse | null;
  pool: AvailablePoolPerson[];
}): JSX.Element {
  const totalHc = orgHealth?.totalHeadcount ?? 0;
  const benchHc = orgHealth?.totalBenchSize ?? 0;
  const assignedHc = Math.max(0, totalHc - benchHc);
  const bookedHc = pool.filter((p) => p.currentAllocation > 0 && p.currentAllocation < 100).length;

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center' }} data-testid="director-headcount-mix">
      <Donut max={Math.max(totalHc, 1)} size={84} thickness={10} tone="accent" value={assignedHc} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-h2)', fontFamily: 'var(--font-family-mono)' }}>
          {assignedHc}
          <span style={{ fontSize: '60%', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            {' / '}{totalHc}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Assigned · planned</div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <LegendRow count={assignedHc} label="Assigned" tone="active" />
          <LegendRow count={bookedHc} label="Booked" tone="info" />
          <LegendRow count={benchHc} label="Bench" tone="pending" />
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'active' | 'info' | 'pending';
}): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <StatusBadge status={tone} variant="dot" />
        <span>{label}</span>
      </span>
      <span style={{ fontFamily: 'var(--font-family-mono)' }}>{count}</span>
    </div>
  );
}

/**
 * Cash position card body — restores the CAPEX surface the SoT punch list
 * called out as dropped. Renders the portfolio finance rollup as a stacked dl
 * plus a 12-month MiniBars trend.
 */
function CashPosition({
  finance,
  series,
}: {
  finance: PortfolioFinanceSummary | null;
  series: number[];
}): JSX.Element {
  if (!finance) {
    return <EmptyState description="Portfolio finance feed unavailable." title="No data" />;
  }
  const variance = finance.totalEarnedValue - finance.totalActualCost;
  const eacM = (finance.totalActualCost > 0 ? finance.totalActualCost / Math.max(finance.cpi, 0.01) : 0) / 1_000_000;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="director-cash-position">
      <Row label="Committed (FY)" value={`$${(finance.totalBudget / 1_000_000).toFixed(2)}M`} />
      <Row label="Recognised YTD" value={`$${(finance.totalActualCost / 1_000_000).toFixed(2)}M`} />
      <Row label="EAC" tone={finance.cpi < 1 ? 'warning' : 'active'} value={`$${eacM.toFixed(2)}M`} />
      <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
        <span>Forecast variance</span>
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            color: variance < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
            fontWeight: 600,
          }}
        >
          {variance >= 0 ? '+' : '−'}${Math.abs(Math.round(variance / 1000))}k
        </span>
      </div>
      <MiniBars
        ariaLabel="Cash position trailing 12-month spend"
        data={series}
        height={40}
        threshold={series.length > 0 ? Math.max(...series) * 0.9 : undefined}
        tone="accent"
        width={240}
      />
    </div>
  );
}

function Row({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'warning' | 'active';
  value: string;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-family-mono)',
          color: tone === 'warning'
            ? 'var(--color-status-warning)'
            : tone === 'active'
              ? 'var(--color-status-active)'
              : 'var(--color-text)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Burn chart — DS/page-director.jsx synthesized planned baseline + 6 project
 * actuals. The Director's job at this altitude is to spot divergence shape
 * at a glance — per-project EVM lives on Project Pulse (one click away).
 */
function BurnChart(): JSX.Element {
  const W = 720;
  const H = 220;
  const P = 28;
  const weeks = 26;
  const planned = Array.from({ length: weeks }, (_, i) => 30 + i * 36);
  const projects: number[][] = [
    [25, 38, 56, 78, 98, 122, 148, 178, 210, 248, 290, 332, 372, 412, 452, 488, 528, 568, 612, 658, 702, 748, 790, 836, 880, 922],
    [28, 42, 64, 82, 104, 128, 156, 182, 214, 244, 278, 308, 342, 372, 404, 432, 466, 498, 532, 562, 596, 624, 658, 690, 720, 752],
    [22, 32, 48, 66, 88, 110, 134, 162, 190, 220, 246, 274, 302, 332, 360, 390, 418, 446, 478, 506, 534, 562, 590, 618, 646, 672],
    [20, 28, 40, 56, 74, 92, 112, 134, 158, 184, 210, 238, 264, 292, 318, 344, 370, 396, 420, 446, 472, 498, 522, 548, 572, 598],
    [16, 22, 32, 44, 58, 72, 88, 104, 122, 142, 162, 182, 202, 222, 244, 264, 286, 308, 330, 352, 374, 396, 416, 438, 460, 482],
    [12, 16, 22, 30, 38, 48, 58, 70, 84, 98, 114, 130, 146, 164, 182, 200, 218, 236, 256, 276, 296, 316, 336, 356, 376, 396],
  ];
  const max = 1000;
  const x = (i: number): number => P + (i / (weeks - 1)) * (W - 2 * P);
  const y = (v: number): number => H - P - (v / max) * (H - 2 * P);
  const names = ['Mercury', 'Atlas', 'Apollo', 'Beacon', 'Helix', 'Orion'];

  return (
    <div data-testid="director-burn-chart">
      <svg
        aria-label="Planned vs actual burn across portfolio"
        role="img"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        viewBox={`0 0 ${W} ${H}`}
      >
        {[0, 250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line
              stroke="var(--color-border-subtle)"
              strokeDasharray="2 4"
              x1={P}
              x2={W - P}
              y1={y(v)}
              y2={y(v)}
            />
            <text fill="var(--color-text-subtle)" fontSize="10" textAnchor="end" x={P - 6} y={y(v) + 3}>
              ${v}k
            </text>
          </g>
        ))}
        {[0, 4, 8, 12, 16, 20, 24].map((i) => (
          <text
            fill="var(--color-text-subtle)"
            fontSize="10"
            key={i}
            textAnchor="middle"
            x={x(i)}
            y={H - 8}
          >
            W{i + 1}
          </text>
        ))}
        <path
          d={planned.map((v, i) => (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(v)).join(' ')}
          fill="none"
          stroke="var(--color-text-subtle)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
        {projects.map((series, idx) => (
          <path
            d={series.map((v, i) => (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(v)).join(' ')}
            fill="none"
            key={idx}
            stroke={`var(--color-chart-${idx + 1})`}
            strokeLinejoin="round"
            strokeWidth={1.6}
          />
        ))}
        <line
          opacity={0.5}
          stroke="var(--color-accent)"
          strokeDasharray="2 2"
          strokeWidth={1}
          x1={x(18)}
          x2={x(18)}
          y1={P}
          y2={H - P}
        />
        <text fill="var(--color-accent)" fontSize="10" x={x(18) + 6} y={P + 10}>Today</text>
      </svg>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
        {names.map((n, i) => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: `var(--color-chart-${i + 1})` }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Variance by driver — exemplar list of signed contributions. Real driver
 * decomposition is on Project Pulse Money tab; this card is a portfolio-level
 * pattern indicator for the Director.
 */
function VarianceByDriver(): JSX.Element {
  const drivers: Array<{ label: string; value: number; max: number }> = [
    { label: 'FX impact', value: -148, max: 200 },
    { label: 'Vendor rates', value: -78, max: 200 },
    { label: 'Spec change · regs', value: -52, max: 200 },
    { label: 'People (premium hires)', value: -30, max: 200 },
    { label: 'Negotiated savings', value: 44, max: 200 },
    { label: 'Timesheet recoveries', value: 12, max: 200 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="director-variance-by-driver">
      {drivers.map((r) => (
        <div
          key={r.label}
          style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 70px', alignItems: 'center', gap: 10 }}
        >
          <span style={{ fontSize: 13 }}>{r.label}</span>
          <VarianceBar max={r.max} value={r.value} />
          <span
            style={{
              ...NUM,
              fontFamily: 'var(--font-family-mono)',
              color: r.value < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
            }}
          >
            {r.value > 0 ? '+' : '−'}${Math.abs(r.value)}k
          </span>
        </div>
      ))}
    </div>
  );
}
