import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { exportToXlsx } from '@/lib/export';
import { TimeReportData, fetchTimeReport } from '@/lib/api/timesheets';

type Period = 'this_week' | 'this_month' | 'this_quarter' | 'custom';

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const toIso = (d: Date): string => d.toISOString().slice(0, 10);

  if (period === 'this_week') {
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() + diff);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { from: toIso(start), to: toIso(end) };
  }

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

  // custom — return empty to let caller supply values
  return { from: '', to: '' };
}

const CAPEX_COLORS = ['#6366f1', '#e2e8f0'];

export function TimeReportPage(): JSX.Element {
  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [personId, setPersonId] = useState('');

  const [data, setData] = useState<TimeReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = period === 'custom'
    ? { from: customFrom, to: customTo }
    : getDateRange(period);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchTimeReport({
      from: dateRange.from || undefined,
      to: dateRange.to || undefined,
      projectId: projectId || undefined,
      personId: personId || undefined,
    })
      .then((result) => {
        if (active) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load time report.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dateRange.from, dateRange.to, projectId, personId]);

  function handleExport(): void {
    if (!data) return;

    const rows: Record<string, unknown>[] = [];

    data.byProject.forEach((r) => {
      rows.push({ dimension: 'Project', name: r.name, hours: r.hours });
    });
    data.byPerson.forEach((r) => {
      rows.push({ dimension: 'Person', name: r.name, hours: r.hours });
    });
    data.byDay.forEach((r) => {
      rows.push({ dimension: 'Day', name: r.date, hours: r.hours });
    });
    rows.push({ dimension: 'CAPEX', name: 'CAPEX', hours: data.capexHours });
    rows.push({ dimension: 'OPEX', name: 'OPEX', hours: data.opexHours });

    exportToXlsx(rows, 'time_report');
  }

  return (
    <PageContainer testId="time-report-page">
      <PageHeader
        eyebrow="Reports"
        title="Time Report"
        subtitle="Aggregated approved timesheet data."
      />

      {/* Filter Bar */}
      <div className="filter-bar">
        <label className="field">
          <span className="field__label">Period</span>
          <select
            className="field__control"
            onChange={(e) => setPeriod(e.target.value as Period)}
            value={period}
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        {period === 'custom' && (
          <>
            <label className="field">
              <span className="field__label">From</span>
              <input
                className="field__control"
                onChange={(e) => setCustomFrom(e.target.value)}
                type="date"
                value={customFrom}
              />
            </label>
            <label className="field">
              <span className="field__label">To</span>
              <input
                className="field__control"
                onChange={(e) => setCustomTo(e.target.value)}
                type="date"
                value={customTo}
              />
            </label>
          </>
        )}

        <label className="field">
          <span className="field__label">Project</span>
          <input
            className="field__control"
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Filter by project"
            type="text"
            value={projectId}
          />
        </label>

        <label className="field">
          <span className="field__label">Person</span>
          <input
            className="field__control"
            onChange={(e) => setPersonId(e.target.value)}
            placeholder="Filter by person"
            type="text"
            value={personId}
          />
        </label>

        <button
          className="button button--secondary"
          onClick={handleExport}
          type="button"
        >
          Export XLSX
        </button>
      </div>

      {isLoading && <LoadingState label="Loading time report..." />}
      {error && <ErrorState description={error} />}

      {data && !isLoading && (
        <>
          {/* Summary Tiles */}
          <div className="metric-row">
            <div className="metric-card">
              <div className="metric-card__value">{data.capexHours.toFixed(1)}h</div>
              <div className="metric-card__label">CAPEX Hours</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__value">{data.opexHours.toFixed(1)}h</div>
              <div className="metric-card__label">OPEX Hours</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__value">
                {(data.capexHours + data.opexHours).toFixed(1)}h
              </div>
              <div className="metric-card__label">Total Approved Hours</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Hours by Project */}
            <SectionCard title="Hours by Project">
              {data.byProject.length === 0 ? (
                <p className="empty-state">No data</p>
              ) : (
                <ResponsiveContainer height={300} width="100%">
                  <BarChart data={data.byProject} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip formatter={(v) => [`${String(v)}h`, 'Hours']} />
                    <Bar dataKey="hours" fill="#6366f1" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* Hours by Person */}
            <SectionCard title="Hours by Person">
              {data.byPerson.length === 0 ? (
                <p className="empty-state">No data</p>
              ) : (
                <ResponsiveContainer height={300} width="100%">
                  <BarChart data={data.byPerson} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip formatter={(v) => [`${String(v)}h`, 'Hours']} />
                    <Bar dataKey="hours" fill="#10b981" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          <div className="charts-row">
            {/* Daily Hours Trend */}
            <SectionCard title="Daily Hours Trend">
              {data.byDay.length === 0 ? (
                <p className="empty-state">No data</p>
              ) : (
                <ResponsiveContainer height={300} width="100%">
                  <LineChart data={data.byDay}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(v) => [`${String(v)}h`, 'Hours']} />
                    <Line
                      dataKey="hours"
                      dot={false}
                      name="Hours"
                      stroke="#6366f1"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* CAPEX vs OPEX Pie */}
            <SectionCard title="CAPEX vs OPEX">
              {data.capexHours === 0 && data.opexHours === 0 ? (
                <p className="empty-state">No data</p>
              ) : (
                <ResponsiveContainer height={300} width="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'CAPEX', value: data.capexHours },
                        { name: 'OPEX', value: data.opexHours },
                      ]}
                      cx="50%"
                      cy="50%"
                      dataKey="value"
                      innerRadius={60}
                      label
                      outerRadius={100}
                    >
                      {CAPEX_COLORS.map((color, i) => (
                        <Cell fill={color} key={i} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${String(v)}h`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageContainer>
  );
}
