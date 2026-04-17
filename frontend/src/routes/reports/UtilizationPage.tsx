import { useEffect, useState } from 'react';
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
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { LoadingState } from '@/components/common/LoadingState';
import { useSortableTable } from '@/hooks/useSortableTable';
import { exportToXlsx } from '@/lib/export';
import { UtilizationPersonRow, UtilizationReport, fetchUtilizationReport } from '@/lib/api/utilization';

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
          background: '#e2e8f0',
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
        {pct}%
      </span>
    </div>
  );
}

export function UtilizationPage(): JSX.Element {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<UtilizationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchUtilizationReport({ from, to })
      .then((data) => setReport(data))
      .catch(() => setError('Failed to load utilization report. Check date range.'))
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

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          sorted.length > 0 ? (
            <button className="button button--secondary" onClick={handleExport} type="button">
              Export XLSX
            </button>
          ) : undefined
        }
        eyebrow="Analytics"
        subtitle="Available hours vs assigned hours vs actual timesheet hours per person."
        title="Utilization Report"
      />

      <div className="filter-bar">
        <label className="field">
          <span className="field__label">From</span>
          <input
            className="field__control"
            onChange={(e) => setFrom(e.target.value)}
            type="date"
            value={from}
          />
        </label>
        <label className="field">
          <span className="field__label">To</span>
          <input
            className="field__control"
            onChange={(e) => setTo(e.target.value)}
            type="date"
            value={to}
          />
        </label>
      </div>

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
        {!isLoading && !error && sorted.length > 0 ? (
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th {...getThProps('personName')}>
                    Person <span className="sort-indicator">{getSortIndicator('personName')}</span>
                  </th>
                  <th {...getThProps('availableHours')}>
                    Available Hrs <span className="sort-indicator">{getSortIndicator('availableHours')}</span>
                  </th>
                  <th {...getThProps('assignedHours')}>
                    Assigned Hrs <span className="sort-indicator">{getSortIndicator('assignedHours')}</span>
                  </th>
                  <th {...getThProps('actualHours')}>
                    Actual Hrs <span className="sort-indicator">{getSortIndicator('actualHours')}</span>
                  </th>
                  <th {...getThProps('utilizationPercent')}>
                    Utilization <span className="sort-indicator">{getSortIndicator('utilizationPercent')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row: UtilizationPersonRow) => (
                  <tr key={row.personId}>
                    <td>{row.personName}</td>
                    <td>{row.availableHours}</td>
                    <td>{row.assignedHours}</td>
                    <td>{row.actualHours}</td>
                    <td>
                      <UtilizationBar pct={row.utilizationPercent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}
