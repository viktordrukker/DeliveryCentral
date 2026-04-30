import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  type PortfolioRadiatorEntry,
  fetchPortfolioRadiator,
} from '@/lib/api/portfolio-radiator';
import type { RadiatorBand } from '@/lib/api/project-radiator';
import { Button, DataView, type Column } from '@/components/ds';

function bandTone(band: RadiatorBand): 'active' | 'warning' | 'danger' | 'neutral' {
  if (band === 'GREEN') return 'active';
  if (band === 'AMBER') return 'warning';
  if (band === 'RED' || band === 'CRITICAL') return 'danger';
  return 'neutral';
}

function bandColor(band: RadiatorBand): string {
  if (band === 'GREEN') return 'var(--color-status-active)';
  if (band === 'AMBER') return 'var(--color-status-warning)';
  if (band === 'RED') return 'var(--color-status-danger)';
  if (band === 'CRITICAL') return 'var(--color-status-critical)';
  return 'var(--color-status-neutral)';
}

function bandLabel(band: RadiatorBand): string {
  return band.charAt(0) + band.slice(1).toLowerCase();
}

type SortKey = 'name' | 'score' | 'scope' | 'schedule' | 'budget' | 'people';
type SortDir = 'asc' | 'desc';

export function PortfolioRadiatorPage(): JSX.Element {
  const [rows, setRows] = useState<PortfolioRadiatorEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchPortfolioRadiator()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load portfolio radiator.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const kpis = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { avg: 0, critical: 0, green: 0, total: 0 };
    }
    const total = rows.length;
    const avg = Math.round(rows.reduce((acc, r) => acc + r.overallScore, 0) / total);
    const green = rows.filter((r) => r.overallBand === 'GREEN').length;
    const critical = rows.filter((r) => r.overallBand === 'CRITICAL').length;
    return {
      avg,
      critical: Math.round((critical / total) * 100),
      green: Math.round((green / total) * 100),
      total,
    };
  }, [rows]);

  const sorted = useMemo(() => {
    if (!rows) return [] as PortfolioRadiatorEntry[];
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return mult * a.projectName.localeCompare(b.projectName);
        case 'score':
          return mult * (a.overallScore - b.overallScore);
        case 'scope':
          return mult * ((a.quadrantScores.scope ?? -1) - (b.quadrantScores.scope ?? -1));
        case 'schedule':
          return mult * ((a.quadrantScores.schedule ?? -1) - (b.quadrantScores.schedule ?? -1));
        case 'budget':
          return mult * ((a.quadrantScores.budget ?? -1) - (b.quadrantScores.budget ?? -1));
        case 'people':
          return mult * ((a.quadrantScores.people ?? -1) - (b.quadrantScores.people ?? -1));
        default:
          return 0;
      }
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const columns: Column<PortfolioRadiatorEntry>[] = [
    {
      key: 'project',
      render: (r) => (
        <div style={{ borderLeft: `3px solid ${bandColor(r.overallBand)}`, paddingLeft: 'var(--space-2)' }}>
          <Link style={{ color: 'var(--color-accent)', fontWeight: 500 }} to={`/projects/${r.projectId}?tab=radiator`}>
            {r.projectName}
          </Link>
        </div>
      ),
      title: <Button variant="link" size="sm" onClick={() => toggleSort('name')}>Project{sortIndicator('name')}</Button>,
    },
    {
      key: 'code',
      render: (r) => <span style={{ color: 'var(--color-text-muted)' }}>{r.projectCode}</span>,
      title: 'Code',
      width: 100,
    },
    {
      align: 'right',
      key: 'score',
      render: (r) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.overallScore}</span>
      ),
      title: <Button variant="link" size="sm" onClick={() => toggleSort('score')}>Overall{sortIndicator('score')}</Button>,
      width: 80,
    },
    {
      key: 'band',
      render: (r) => <StatusBadge label={bandLabel(r.overallBand)} tone={bandTone(r.overallBand)} variant="chip" />,
      title: 'Band',
      width: 100,
    },
    {
      align: 'right',
      key: 'scope',
      render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.quadrantScores.scope ?? '—'}</span>,
      title: <Button variant="link" size="sm" onClick={() => toggleSort('scope')}>Scope{sortIndicator('scope')}</Button>,
      width: 80,
    },
    {
      align: 'right',
      key: 'schedule',
      render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.quadrantScores.schedule ?? '—'}</span>,
      title: <Button variant="link" size="sm" onClick={() => toggleSort('schedule')}>Schedule{sortIndicator('schedule')}</Button>,
      width: 90,
    },
    {
      align: 'right',
      key: 'budget',
      render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.quadrantScores.budget ?? '—'}</span>,
      title: <Button variant="link" size="sm" onClick={() => toggleSort('budget')}>Budget{sortIndicator('budget')}</Button>,
      width: 80,
    },
    {
      align: 'right',
      key: 'people',
      render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.quadrantScores.people ?? '—'}</span>,
      title: <Button variant="link" size="sm" onClick={() => toggleSort('people')}>People{sortIndicator('people')}</Button>,
      width: 80,
    },
  ];

  return (
    <PageContainer testId="portfolio-radiator-page">
      <PageHeader
        eyebrow="Dashboards"
        subtitle="Project radiator scores across the portfolio."
        title="Portfolio Radiator"
      />

      {/* KPI strip */}
      <div aria-label="Portfolio KPIs" className="kpi-strip">
        <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-accent)' }}>
          <span className="kpi-strip__value">{kpis.total}</span>
          <span className="kpi-strip__label">Total projects</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${kpis.avg >= 76 ? 'var(--color-status-active)' : kpis.avg >= 51 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
          <span className="kpi-strip__value">{kpis.avg}</span>
          <span className="kpi-strip__label">Avg score</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
          <span className="kpi-strip__value">{kpis.green}%</span>
          <span className="kpi-strip__label">% Green</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-critical)' }}>
          <span className="kpi-strip__value">{kpis.critical}%</span>
          <span className="kpi-strip__label">% Critical</span>
        </div>
      </div>

      {loading ? <LoadingState label="Loading portfolio…" skeletonType="table" variant="skeleton" /> : null}
      {error ? <ErrorState description={error} /> : null}

      {rows && rows.length === 0 && !loading ? (
        <SectionCard>
          <EmptyState description="No projects have radiator snapshots yet." title="Empty portfolio" />
        </SectionCard>
      ) : null}

      {rows && rows.length > 0 ? (
        <SectionCard title="Projects">
          <DataView columns={columns} rows={sorted} getRowKey={(r) => r.projectId} variant="compact" pageSizeOptions={[1000]} />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
