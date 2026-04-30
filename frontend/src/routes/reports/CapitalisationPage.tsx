import { useEffect, useState } from 'react';
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
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Button, DatePicker, Table, type Column } from '@/components/ds';

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

export function CapitalisationPage(): JSX.Element {
  const { principal } = useAuth();
  const isAdmin = hasAnyRole(principal?.roles, ADMIN_ROLES);

  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

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
    <PageContainer viewport>
      <PageHeader
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
        subtitle="CAPEX/OPEX capitalisation breakdown for approved timesheets"
        title="Capitalisation Report"
      />

      {/* Period selector */}
      <SectionCard title="Period">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="form-label" htmlFor="period-select">
              Period
            </label>
            <select
              className="form-control"
              id="period-select"
              onChange={(e) => setPeriod(e.target.value as Period)}
              value={period}
            >
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {period === 'custom' ? (
            <>
              <div>
                <label className="form-label" htmlFor="custom-from">
                  From
                </label>
                <DatePicker
 className="form-control"
 id="custom-from"
 onValueChange={(value) => setCustomFrom(value)} value={customFrom}
 />
              </div>
              <div>
                <label className="form-label" htmlFor="custom-to">
                  To
                </label>
                <DatePicker
 className="form-control"
 id="custom-to"
 onValueChange={(value) => setCustomTo(value)} value={customTo}
 />
              </div>
            </>
          ) : null}

          {dateRange.from && dateRange.to ? (
            <p className="text-sm text-gray-500">
              {dateRange.from} — {dateRange.to}
            </p>
          ) : null}
        </div>
      </SectionCard>

      {isLoading ? (
        <LoadingState variant="skeleton" skeletonType="chart" />
      ) : error ? (
        <ErrorState description={error} />
      ) : report ? (
        <>
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
                  { key: 'capexPercent', title: sortHeader('capexPercent', 'CAPEX %'), getValue: (r) => r.capexPercent, render: (r) => `${r.capexPercent.toFixed(1)}%` },
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
                  <span>{report.totals.capexPercent.toFixed(1)}%</span>
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
                <Bar dataKey="capex" fill="#6366f1" name="CAPEX" stackId="a" />
                <Bar dataKey="opex" fill="#e2e8f0" name="OPEX" stackId="a" />
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
                    stroke="#6366f1"
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
            <div>
              <label className="form-label" htmlFor="lock-from">
                Lock From
              </label>
              <DatePicker
 className="form-control"
 id="lock-from"
 onValueChange={(value) => setLockFrom(value)} value={lockFrom}
 />
            </div>
            <div>
              <label className="form-label" htmlFor="lock-to">
                Lock To
              </label>
              <DatePicker
 className="form-control"
 id="lock-to"
 onValueChange={(value) => setLockTo(value)} value={lockTo}
 />
            </div>
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
                { key: 'by', title: 'Locked By', getValue: (l) => l.lockedBy, render: (l) => l.lockedBy },
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
    </PageContainer>
  );
}
