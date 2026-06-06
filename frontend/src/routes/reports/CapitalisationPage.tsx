import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateShort } from '@/lib/format-date';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { AnalysisLayout } from '@/components/layout/AnalysisLayout';
import { SectionCard } from '@/components/common/SectionCard';
import { useAuth } from '@/app/auth-context';
import { ADMIN_ROLES, hasAnyRole } from '@/app/route-manifest';
import { exportToXlsx } from '@/lib/export';
import {
  CapitalisationProjectRow,
  CapitalisationReport,
  PeriodLock,
  createPeriodLock,
  deletePeriodLock,
  fetchCapitalisationReport,
  fetchPeriodLocks,
} from '@/lib/api/capitalisation';
import { Button, DatePicker, Pct, Table, type Column } from '@/components/ds';

type SortKey = 'projectName' | 'capexHours' | 'opexHours' | 'totalHours' | 'capexPercent';

type Period = 'this_month' | 'this_quarter' | 'this_year' | 'custom';

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const toIso = (d: Date): string => d.toISOString().slice(0, 10);

  if (period === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { from: toIso(start), to: toIso(end) };
  }

  if (period === 'this_quarter') {
    const quarter = Math.floor(now.getUTCMonth() / 3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3 + 3, 0));
    return { from: toIso(start), to: toIso(end) };
  }

  if (period === 'this_year') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
    return { from: toIso(start), to: toIso(end) };
  }

  return { from: '', to: '' };
}

function isValidPeriod(s: string | null): s is Period {
  return s === 'this_month' || s === 'this_quarter' || s === 'this_year' || s === 'custom';
}

export function CapitalisationPage(): JSX.Element {
  const { principal } = useAuth();
  const isAdmin = hasAnyRole(principal?.roles, ADMIN_ROLES);

  // UX Law 5 — filter persistence via URL search params.
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get('period');
  const period: Period = isValidPeriod(periodParam) ? periodParam : 'this_month';
  const customFrom = searchParams.get('from') ?? '';
  const customTo = searchParams.get('to') ?? '';

  const updateParam = (key: string, value: string | null): void => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const setPeriod = (p: Period): void => updateParam('period', p === 'this_month' ? null : p);
  const setCustomFrom = (v: string): void => updateParam('from', v || null);
  const setCustomTo = (v: string): void => updateParam('to', v || null);

  const [report, setReport] = useState<CapitalisationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('capexPercent');
  const [sortAsc, setSortAsc] = useState(false);

  // Period locks
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [locksLoading, setLocksLoading] = useState(false);
  const [lockFrom, setLockFrom] = useState('');
  const [lockTo, setLockTo] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockSubmitting, setLockSubmitting] = useState(false);

  const dateRange = period === 'custom'
    ? { from: customFrom, to: customTo }
    : getDateRange(period);

  // Load report
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchCapitalisationReport({ from: dateRange.from, to: dateRange.to })
      .then((result) => {
        if (active) {
          setReport(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load report.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dateRange.from, dateRange.to]);

  // Load period locks for admins
  useEffect(() => {
    if (!isAdmin) return;
    setLocksLoading(true);
    fetchPeriodLocks()
      .then((data) => {
        setLocks(data);
        setLocksLoading(false);
      })
      .catch(() => {
        setLocksLoading(false);
      });
  }, [isAdmin]);

  function handleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function getSortedRows(rows: CapitalisationProjectRow[]): CapitalisationProjectRow[] {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;

      if (typeof av === 'string') {
        return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }

      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }

  function handleExportXlsx(): void {
    if (!report) return;

    const rows = report.byProject.map((r) => ({
      Project: r.projectName,
      'CAPEX Hours': r.capexHours,
      'OPEX Hours': r.opexHours,
      'Total Hours': r.totalHours,
      'CAPEX %': r.capexPercent,
      Alert: r.alert ? 'Yes' : 'No',
    }));

    exportToXlsx(rows, 'capitalisation_report');
  }

  function handleExportPdf(): void {
    window.print();
  }

  async function handleLockPeriod(): Promise<void> {
    if (!lockFrom || !lockTo) {
      setLockError('Both from and to dates are required.');
      return;
    }

    setLockError(null);
    setLockSubmitting(true);

    try {
      const lock = await createPeriodLock(lockFrom, lockTo);
      setLocks((prev) => [lock, ...prev]);
      setLockFrom('');
      setLockTo('');
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Failed to lock period.');
    } finally {
      setLockSubmitting(false);
    }
  }

  async function handleUnlock(id: string): Promise<void> {
    try {
      await deletePeriodLock(id);
      setLocks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Failed to unlock period.');
    }
  }

  const sortedRows = report ? getSortedRows(report.byProject) : [];

  const stackedBarData = sortedRows.map((r) => ({
    name: r.projectName.length > 15 ? r.projectName.slice(0, 15) + '…' : r.projectName,
    capex: r.capexHours,
    opex: r.opexHours,
  }));

  return (
    <AnalysisLayout
      viewport
      eyebrow="Reports"
      title="Capitalisation Report"
      subtitle="CAPEX/OPEX capitalisation breakdown for approved timesheets"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportXlsx} type="button">
            Export XLSX
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} type="button">
            Export PDF
          </Button>
        </div>
      }
      filters={
        <>
          <label className="field">
            <span className="field__label">Period</span>
            <select
              className="field__control"
              id="period-select"
              onChange={(e) => setPeriod(e.target.value as Period)}
              value={period}
            >
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {period === 'custom' ? (
            <>
              <label className="field">
                <span className="field__label">From</span>
                <DatePicker
                  id="custom-from"
                  onValueChange={(value) => setCustomFrom(value)}
                  value={customFrom}
                />
              </label>
              <label className="field">
                <span className="field__label">To</span>
                <DatePicker
                  id="custom-to"
                  onValueChange={(value) => setCustomTo(value)}
                  value={customTo}
                />
              </label>
            </>
          ) : null}

          {dateRange.from && dateRange.to ? (
            <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
              {dateRange.from} — {dateRange.to}
            </span>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <LoadingState variant="skeleton" skeletonType="chart" />
      ) : error ? (
        <ErrorState description={error} />
      ) : report ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Capitalisation summary">
            <div
              className="kpi-strip__item"
              style={{ borderLeft: '3px solid var(--color-chart-1)' }}
              data-testid="kpi-capex"
            >
              <span className="kpi-strip__value">{report.totals.capexHours.toFixed(1)}h</span>
              <span className="kpi-strip__label">CAPEX Hours</span>
            </div>
            <div
              className="kpi-strip__item"
              style={{ borderLeft: '3px solid var(--color-chart-4)' }}
              data-testid="kpi-opex"
            >
              <span className="kpi-strip__value">{report.totals.opexHours.toFixed(1)}h</span>
              <span className="kpi-strip__label">OPEX Hours</span>
            </div>
            <div
              className="kpi-strip__item"
              style={{ borderLeft: '3px solid var(--color-status-active)' }}
              data-testid="kpi-total"
            >
              <span className="kpi-strip__value">{report.totals.totalHours.toFixed(1)}h</span>
              <span className="kpi-strip__label">Total Hours</span>
            </div>
            <div
              className="kpi-strip__item"
              style={{ borderLeft: '3px solid var(--color-status-info)' }}
              data-testid="kpi-capex-pct"
            >
              <span className="kpi-strip__value"><Pct value={report.totals.capexPercent} /></span>
              <span className="kpi-strip__label">CAPEX %</span>
            </div>
            <div
              className="kpi-strip__item"
              style={{
                borderLeft: `3px solid ${
                  report.byProject.some((r) => r.alert)
                    ? 'var(--color-status-warning)'
                    : 'var(--color-status-active)'
                }`,
              }}
              data-testid="kpi-alerts"
            >
              <span className="kpi-strip__value">
                {report.byProject.filter((r) => r.alert).length}
              </span>
              <span className="kpi-strip__label">Deviation Alerts</span>
            </div>
          </div>

          {/* CAPEX/OPEX Breakdown Table (8-2-02) */}
          <SectionCard title="CAPEX / OPEX Breakdown by Project">
            <Table
              variant="compact"
              columns={(() => {
                const sortHeader = (key: SortKey, label: string): JSX.Element => (
                  <span onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                    {label}{sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </span>
                );
                return [
                  { key: 'projectName', title: sortHeader('projectName', 'Project'), getValue: (r) => r.projectName, render: (r) => r.projectName },
                  { key: 'capexHours', title: sortHeader('capexHours', 'CAPEX Hours'), getValue: (r) => r.capexHours, render: (r) => r.capexHours.toFixed(1) },
                  { key: 'opexHours', title: sortHeader('opexHours', 'OPEX Hours'), getValue: (r) => r.opexHours, render: (r) => r.opexHours.toFixed(1) },
                  { key: 'totalHours', title: sortHeader('totalHours', 'Total Hours'), getValue: (r) => r.totalHours, render: (r) => r.totalHours.toFixed(1) },
                  { key: 'capexPercent', title: sortHeader('capexPercent', 'CAPEX %'), getValue: (r) => r.capexPercent, render: (r) => <Pct value={r.capexPercent} /> },
                  { key: 'alert', title: 'Alert', render: (r) => (
                    r.alert ? (
                      <span
                        style={{
                          background: 'var(--color-danger-bg)',
                          border: '1px solid var(--color-status-danger)',
                          borderRadius: 4,
                          color: 'var(--color-status-danger)',
                          fontSize: 12,
                          padding: '2px 6px',
                        }}
                        title={`Deviation: ${((r.deviation ?? 0) * 100).toFixed(1)}%`}
                      >
                        ⚠ Deviation
                      </span>
                    ) : null
                  ) },
                ] as Column<CapitalisationProjectRow>[];
              })()}
              rows={sortedRows}
              getRowKey={(r) => r.projectId}
              footer={
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', padding: 'var(--space-2) var(--space-3)', fontWeight: 600, background: 'var(--color-surface-alt)' }}>
                  <span>Totals</span>
                  <span>{report.totals.capexHours.toFixed(1)}</span>
                  <span>{report.totals.opexHours.toFixed(1)}</span>
                  <span>{report.totals.totalHours.toFixed(1)}</span>
                  <span><Pct value={report.totals.capexPercent} /></span>
                  <span />
                </div>
              }
            />
          </SectionCard>

          {/* Stacked bar chart (8-2-03) */}
          <SectionCard title="CAPEX vs OPEX Hours by Project">
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={stackedBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="capex" fill="var(--color-chart-1)" name="CAPEX" stackId="a" />
                <Bar dataKey="opex" fill="var(--color-border)" name="OPEX" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Period trend line (8-2-04) */}
          {report.periodTrend.length > 0 ? (
            <SectionCard title="CAPEX % Trend by Month">
              <ResponsiveContainer height={250} width="100%">
                <LineChart data={report.periodTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'CAPEX %']} />
                  <Line
                    dataKey="capexPercent"
                    dot
                    name="CAPEX %"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {/* Period lock UI (8-2-05) — admin only */}
      {isAdmin ? (
        <SectionCard title="Period Locks">
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <label className="field">
              <span className="field__label">Lock From</span>
              <DatePicker
                id="lock-from"
                onValueChange={(value) => setLockFrom(value)}
                value={lockFrom}
              />
            </label>
            <label className="field">
              <span className="field__label">Lock To</span>
              <DatePicker
                id="lock-to"
                onValueChange={(value) => setLockTo(value)}
                value={lockTo}
              />
            </label>
            <Button variant="primary" disabled={lockSubmitting} onClick={() => void handleLockPeriod()} type="button">
              Lock Period
            </Button>
          </div>

          {lockError ? <p className="text-red-600 text-sm mb-3">{lockError}</p> : null}

          {locksLoading ? (
            <LoadingState variant="skeleton" skeletonType="chart" />
          ) : locks.length === 0 ? (
            <p className="text-sm text-gray-500">No locked periods.</p>
          ) : (
            <Table
              variant="compact"
              columns={[
                { key: 'from', title: 'From', getValue: (l) => l.periodFrom, render: (l) => l.periodFrom },
                { key: 'to', title: 'To', getValue: (l) => l.periodTo, render: (l) => l.periodTo },
                { key: 'by', title: 'Locked By', getValue: (l) => l.lockedByDisplayName ?? '', render: (l) => l.lockedByDisplayName ?? 'Unknown actor' },
                { key: 'at', title: 'Locked At', getValue: (l) => l.lockedAt, render: (l) => formatDateShort(l.lockedAt) },
                { key: 'actions', title: 'Actions', render: (l) => (
                  <Button variant="danger" size="sm" onClick={() => void handleUnlock(l.id)} type="button">
                    Unlock
                  </Button>
                ) },
              ] as Column<PeriodLock>[]}
              rows={locks}
              getRowKey={(l) => l.id}
            />
          )}
        </SectionCard>
      ) : null}

      {/* Print styles */}
      <style>{`
        @media print {
          .btn { display: none !important; }
          nav { display: none !important; }
          aside { display: none !important; }
          .sidebar { display: none !important; }
        }
      `}</style>
    </AnalysisLayout>
  );
}
