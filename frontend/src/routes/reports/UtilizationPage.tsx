import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartWrapper } from '@/components/common/ChartWrapper';
import { ErrorState } from '@/components/common/ErrorState';
import { AnalysisLayout } from '@/components/layout/AnalysisLayout';
import { SectionCard } from '@/components/common/SectionCard';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { LoadingState } from '@/components/common/LoadingState';
import { useSortableTable } from '@/hooks/useSortableTable';
import { exportToXlsx } from '@/lib/export';
import { UtilizationPersonRow, UtilizationReport, fetchUtilizationReport } from '@/lib/api/utilization';
import { Button, DatePicker, Pct, Table, type Column } from '@/components/ds';

type UtilizationColumn = 'personName' | 'availableHours' | 'assignedHours' | 'actualHours' | 'utilizationPercent';

function monthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function utilizationColor(pct: number): string {
  if (pct <= 50) return 'var(--color-status-active-light)';
  if (pct <= 80) return 'var(--color-status-active)';
  if (pct <= 100) return 'var(--color-status-warning)';
  if (pct <= 120) return 'var(--color-status-warning-dark)';
  return 'var(--color-status-danger)';
}

function UtilizationBar({ pct }: { pct: number }): JSX.Element {
  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
      <div
        style={{
          background: 'var(--color-border)',
          borderRadius: '4px',
          height: '8px',
          width: '80px',
        }}
      >
        <div
          style={{
            background: utilizationColor(pct),
            borderRadius: '4px',
            height: '8px',
            width: `${Math.min(pct, 100)}%`,
          }}
        />
      </div>
      <span style={{ color: utilizationColor(pct), fontSize: '0.875rem', fontWeight: 600 }}>
        <Pct value={pct} fractionDigits={0} />
      </span>
    </div>
  );
}

export function UtilizationPage(): JSX.Element {
  // UX Law 5 — filter persistence via URL search params.
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get('from') ?? monthAgo();
  const to = searchParams.get('to') ?? today();

  const updateParam = (key: string, value: string): void => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const setFrom = (v: string): void => updateParam('from', v);
  const setTo = (v: string): void => updateParam('to', v);

  const [report, setReport] = useState<UtilizationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchUtilizationReport({ from, to })
      .then((data) => setReport(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load utilization report. Check date range.'))
      .finally(() => setIsLoading(false));
  }, [from, to]);

  const baseData = report?.byPerson ?? [];
  const { sortedData: sorted, getSortIndicator, getThProps } = useSortableTable<UtilizationPersonRow, UtilizationColumn>(
    baseData,
    (item, col) => item[col],
  );

  function handleExport(): void {
    exportToXlsx(
      sorted.map((row) => ({
        'Actual Hours': row.actualHours,
        'Assigned Hours': row.assignedHours,
        'Available Hours': row.availableHours,
        Person: row.personName,
        'Utilization %': row.utilizationPercent,
      })),
      'utilization_report',
    );
  }

  const chartData = sorted.slice(0, 30).map((row) => ({
    name: row.personName.length > 16 ? `${row.personName.slice(0, 14)}…` : row.personName,
    pct: row.utilizationPercent,
  }));

  // KPI rollups — only meaningful when we have data.
  const totalPeople = baseData.length;
  const avgUtilization = totalPeople > 0
    ? Math.round(baseData.reduce((s, r) => s + r.utilizationPercent, 0) / totalPeople)
    : 0;
  const overAllocated = baseData.filter((r) => r.utilizationPercent > 100).length;
  const underUtilized = baseData.filter((r) => r.utilizationPercent < 50).length;

  return (
    <AnalysisLayout
      viewport
      eyebrow="Analytics"
      title="Utilization Report"
      subtitle="Available hours vs assigned hours vs actual timesheet hours per person."
      actions={
        sorted.length > 0 ? (
          <Button variant="secondary" onClick={handleExport} type="button">
            Export XLSX
          </Button>
        ) : undefined
      }
      filters={
        <>
          <label className="field">
            <span className="field__label">From</span>
            <DatePicker onValueChange={(value) => setFrom(value)} value={from} />
          </label>
          <label className="field">
            <span className="field__label">To</span>
            <DatePicker onValueChange={(value) => setTo(value)} value={to} />
          </label>
        </>
      }
    >
      {!isLoading && !error && totalPeople > 0 ? (
        <div className="kpi-strip" aria-label="Utilization summary">
          <div
            className="kpi-strip__item"
            style={{ borderLeft: '3px solid var(--color-status-info)' }}
            data-testid="kpi-people"
          >
            <span className="kpi-strip__value">{totalPeople}</span>
            <span className="kpi-strip__label">People</span>
          </div>
          <div
            className="kpi-strip__item"
            style={{ borderLeft: `3px solid ${avgUtilization > 100 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
            data-testid="kpi-avg-utilization"
          >
            <span className="kpi-strip__value"><Pct value={avgUtilization} fractionDigits={0} /></span>
            <span className="kpi-strip__label">Avg Utilization</span>
          </div>
          <div
            className="kpi-strip__item"
            style={{ borderLeft: `3px solid ${overAllocated > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}
            data-testid="kpi-over-allocated"
          >
            <span className="kpi-strip__value">{overAllocated}</span>
            <span className="kpi-strip__label">Over-allocated</span>
          </div>
          <div
            className="kpi-strip__item"
            style={{ borderLeft: `3px solid ${underUtilized > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
            data-testid="kpi-under-utilized"
          >
            <span className="kpi-strip__value">{underUtilized}</span>
            <span className="kpi-strip__label">Under-utilized</span>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && chartData.length > 0 ? (
        <SectionCard title="Utilization by Person — Overview">
          <ChartWrapper ariaLabel="Utilization bar chart — percentage per person">
            <ResponsiveContainer height={Math.max(200, chartData.length * 28)} width="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis domain={[0, 140]} type="number" unit="%" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(v) => [`${String(v)}%`, 'Utilization']} />
                <Bar dataKey="pct" name="Utilization %">
                  {chartData.map((entry) => (
                    <Cell fill={utilizationColor(entry.pct)} key={entry.name} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
          <div style={{ display: 'flex', fontSize: '11px', gap: '12px', marginTop: '8px' }}>
            {[
              { color: 'var(--color-status-active-light)', label: '0–50% Underutilized' },
              { color: 'var(--color-status-active)', label: '51–80% Healthy' },
              { color: 'var(--color-status-warning)', label: '81–100% Full' },
              { color: 'var(--color-status-warning-dark)', label: '101–120% Warning' },
              { color: 'var(--color-status-danger)', label: '121%+ Critical' },
            ].map((item) => (
              <span key={item.label} style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                <span style={{ background: item.color, borderRadius: '2px', display: 'inline-block', height: '10px', width: '10px' }} />
                {item.label}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <ViewportTable>
        {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {error ? <ErrorState description={error} /> : null}
        {!isLoading && !error && sorted.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No active assignments found for the selected period.
          </p>
        ) : null}
        {!isLoading && !error && sorted.length > 0 ? (() => {
          const sortHeader = (key: UtilizationColumn, label: string): JSX.Element => (
            <span {...getThProps(key)}>
              {label} <span className="sort-indicator">{getSortIndicator(key)}</span>
            </span>
          );
          return (
            <Table
              variant="compact"
              columns={[
                { key: 'personName', title: sortHeader('personName', 'Person'), getValue: (r) => r.personName, render: (r) => r.personName },
                { key: 'availableHours', title: sortHeader('availableHours', 'Available Hrs'), getValue: (r) => r.availableHours, render: (r) => r.availableHours },
                { key: 'assignedHours', title: sortHeader('assignedHours', 'Assigned Hrs'), getValue: (r) => r.assignedHours, render: (r) => r.assignedHours },
                { key: 'actualHours', title: sortHeader('actualHours', 'Actual Hrs'), getValue: (r) => r.actualHours, render: (r) => r.actualHours },
                { key: 'utilization', title: sortHeader('utilizationPercent', 'Utilization'), getValue: (r) => r.utilizationPercent, render: (r) => <UtilizationBar pct={r.utilizationPercent} /> },
              ] as Column<UtilizationPersonRow>[]}
              rows={sorted}
              getRowKey={(r) => r.personId}
            />
          );
        })() : null}
      </ViewportTable>
    </AnalysisLayout>
  );
}
