import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { fetchTeams } from '@/lib/api/teams';
import { fetchWorkloadPlanning, fetchCapacityForecast, WorkloadPlanningPerson, WorkloadPlanningResponse, WorkloadPlanningAssignment, CapacityForecastWeek } from '@/lib/api/workload';
import { httpPatch } from '@/lib/api/http-client';

interface WhatIfAssignment {
  id: string;
  personId: string;
  projectName: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
}

function isDateInWeek(weekStart: string, date: string | null | undefined): boolean {
  if (!date) return false;
  return date >= weekStart && date < addDays(weekStart, 7);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function assignmentOverlapsWeek(
  assignment: { validFrom: string; validTo: string | null },
  weekStart: string,
): boolean {
  const weekEnd = addDays(weekStart, 7);
  const start = assignment.validFrom;
  const end = assignment.validTo ?? '9999-12-31';
  return start < weekEnd && end > weekStart;
}

function getTotalAllocationForWeek(
  assignments: WorkloadPlanningAssignment[],
  weekStart: string,
  whatIfAssignments: WhatIfAssignment[],
  personId: string,
): number {
  const real = assignments
    .filter((a) => assignmentOverlapsWeek(a, weekStart))
    .reduce((sum, a) => sum + a.allocationPercent, 0);

  const hypothetical = whatIfAssignments
    .filter((a) => a.personId === personId && assignmentOverlapsWeek(a, weekStart))
    .reduce((sum, a) => sum + a.allocationPercent, 0);

  return real + hypothetical;
}

function getCellBackground(total: number): string {
  if (total === 0) return '#f9fafb';
  if (total > 100) return '#fca5a5';
  if (total >= 80) return '#86efac';
  if (total >= 50) return '#93c5fd';
  return '#bfdbfe';
}

function getCellTextColor(total: number): string {
  if (total === 0) return '#9ca3af';
  if (total > 100) return '#991b1b';
  if (total >= 80) return '#14532d';
  return '#1e40af';
}

function AssignmentBlock({
  assignment,
  onExtend,
  onShorten,
}: {
  assignment: WorkloadPlanningAssignment;
  onExtend: (id: string) => void;
  onShorten: (id: string) => void;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        background: '#dbeafe',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '0.7rem',
        marginBottom: '2px',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
      title={`${assignment.projectName}: ${assignment.allocationPercent}% (${assignment.validFrom} – ${assignment.validTo ?? 'open-ended'})`}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
        {assignment.projectName.length > 8 ? `${assignment.projectName.slice(0, 6)}…` : assignment.projectName}
      </span>
      <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{assignment.allocationPercent}%</span>
      <button
        onClick={() => onShorten(assignment.id)}
        style={{
          background: 'none',
          border: '1px solid #93c5fd',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '0.65rem',
          lineHeight: 1,
          padding: '0 2px',
          color: '#1d4ed8',
        }}
        title="Shorten by 1 week"
        type="button"
      >
        ◀
      </button>
      <button
        onClick={() => onExtend(assignment.id)}
        style={{
          background: 'none',
          border: '1px solid #93c5fd',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '0.65rem',
          lineHeight: 1,
          padding: '0 2px',
          color: '#1d4ed8',
        }}
        title="Extend by 1 week"
        type="button"
      >
        ▶
      </button>
    </div>
  );
}

interface Team {
  id: string;
  name: string;
}

export function WorkloadPlanningPage(): JSX.Element {
  const [planning, setPlanning] = useState<WorkloadPlanningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [poolId, setPoolId] = useState('');

  const [forecast, setForecast] = useState<CapacityForecastWeek[]>([]);
  const [atRiskSelected, setAtRiskSelected] = useState<CapacityForecastWeek | null>(null);

  // What-if mode
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfAssignments, setWhatIfAssignments] = useState<WhatIfAssignment[]>([]);
  const [whatIfForm, setWhatIfForm] = useState({
    personId: '',
    projectName: '',
    allocationPercent: 50,
    validFrom: '',
    validTo: '',
  });

  useEffect(() => {
    void fetchResourcePools()
      .then((r) => setPools(r.items))
      .catch(() => undefined);

    void fetchTeams()
      .then((r) => setTeams(r.items ?? r))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    void fetchWorkloadPlanning({ poolId: poolId || undefined })
      .then((data) => {
        setPlanning(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load planning data.');
        setIsLoading(false);
      });
    void fetchCapacityForecast({ weeks: 12, poolId: poolId || undefined })
      .then(setForecast)
      .catch(() => undefined);
  }, [poolId]);

  function handleExtend(assignmentId: string): void {
    if (!planning) return;
    const assignment = planning.people
      .flatMap((p) => p.assignments)
      .find((a) => a.id === assignmentId);
    if (!assignment) return;

    const newValidTo = addDays(assignment.validTo ?? addDays(new Date().toISOString().slice(0, 10), 84), 7);
    void httpPatch(`/assignments/${assignmentId}`, { validTo: newValidTo })
      .then(() => {
        setPlanning((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            people: prev.people.map((p) => ({
              ...p,
              assignments: p.assignments.map((a) =>
                a.id === assignmentId ? { ...a, validTo: newValidTo } : a,
              ),
            })),
          };
        });
      })
      .catch(() => undefined);
  }

  function handleShorten(assignmentId: string): void {
    if (!planning) return;
    const assignment = planning.people
      .flatMap((p) => p.assignments)
      .find((a) => a.id === assignmentId);
    if (!assignment) return;

    const currentEnd = assignment.validTo ?? addDays(new Date().toISOString().slice(0, 10), 84);
    const newValidTo = addDays(currentEnd, -7);
    if (newValidTo <= assignment.validFrom) return;

    void httpPatch(`/assignments/${assignmentId}`, { validTo: newValidTo })
      .then(() => {
        setPlanning((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            people: prev.people.map((p) => ({
              ...p,
              assignments: p.assignments.map((a) =>
                a.id === assignmentId ? { ...a, validTo: newValidTo } : a,
              ),
            })),
          };
        });
      })
      .catch(() => undefined);
  }

  function handleAddWhatIf(): void {
    if (!whatIfForm.personId || !whatIfForm.projectName || !whatIfForm.validFrom) return;
    setWhatIfAssignments((prev) => [
      ...prev,
      {
        id: `whatif-${Date.now()}`,
        personId: whatIfForm.personId,
        projectName: whatIfForm.projectName,
        allocationPercent: whatIfForm.allocationPercent,
        validFrom: whatIfForm.validFrom,
        validTo: whatIfForm.validTo || null,
      },
    ]);
    setWhatIfForm({ personId: '', projectName: '', allocationPercent: 50, validFrom: '', validTo: '' });
  }

  function handleRemoveWhatIf(id: string): void {
    setWhatIfAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workload"
        subtitle="12-week forward planning view of team assignments, showing allocation per person per week."
        title="Workload Planning Timeline"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Resource Pool</span>
          <select
            className="field__control"
            onChange={(e) => setPoolId(e.target.value)}
            value={poolId}
          >
            <option value="">All pools</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="field__label">What-if mode</span>
          <input
            checked={whatIfMode}
            onChange={(e) => setWhatIfMode(e.target.checked)}
            type="checkbox"
          />
        </label>
      </FilterBar>

      {whatIfMode ? (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>
            What-If Mode — Add Hypothetical Assignment
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 140px' }}>
              <span className="field__label">Person</span>
              <select
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, personId: e.target.value }))}
                value={whatIfForm.personId}
              >
                <option value="">Select person…</option>
                {planning?.people.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </label>

            <label className="field" style={{ flex: '1 1 140px' }}>
              <span className="field__label">Project name</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, projectName: e.target.value }))}
                placeholder="Hypothetical project"
                type="text"
                value={whatIfForm.projectName}
              />
            </label>

            <label className="field" style={{ flex: '0 1 80px' }}>
              <span className="field__label">Allocation %</span>
              <input
                className="field__control"
                max={200}
                min={1}
                onChange={(e) => setWhatIfForm((f) => ({ ...f, allocationPercent: Number(e.target.value) }))}
                type="number"
                value={whatIfForm.allocationPercent}
              />
            </label>

            <label className="field" style={{ flex: '1 1 120px' }}>
              <span className="field__label">From</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, validFrom: e.target.value }))}
                type="date"
                value={whatIfForm.validFrom}
              />
            </label>

            <label className="field" style={{ flex: '1 1 120px' }}>
              <span className="field__label">To (optional)</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, validTo: e.target.value }))}
                type="date"
                value={whatIfForm.validTo}
              />
            </label>

            <button
              className="button button--primary"
              onClick={handleAddWhatIf}
              style={{ alignSelf: 'flex-end' }}
              type="button"
            >
              Add
            </button>
          </div>

          {whatIfAssignments.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <strong style={{ fontSize: '0.8rem' }}>Hypothetical assignments:</strong>
              <ul style={{ margin: '4px 0 0', padding: '0 0 0 1.2rem', fontSize: '0.8rem' }}>
                {whatIfAssignments.map((a) => (
                  <li key={a.id} style={{ marginBottom: '2px' }}>
                    {planning?.people.find((p) => p.id === a.personId)?.displayName ?? a.personId}
                    {' — '}
                    {a.projectName} ({a.allocationPercent}%) {a.validFrom} – {a.validTo ?? 'open'}
                    {' '}
                    <button
                      onClick={() => handleRemoveWhatIf(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}
                      type="button"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? <LoadingState label="Loading planning timeline..." /> : null}
      {error ? <ErrorState description={error} /> : null}

      {forecast.length > 0 ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
            12-Week Capacity Forecast
          </h3>
          <ResponsiveContainer height={220} width="100%">
            <AreaChart
              data={forecast.map((w) => ({
                week: w.week.slice(5),
                bench: w.projectedBench,
                atRisk: w.atRiskPeople.length,
                absorption: w.expectedAbsorptionDays,
                _raw: w,
              }))}
              margin={{ top: 4, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area
                dataKey="bench"
                fill="#bfdbfe"
                name="On Bench"
                stroke="#3b82f6"
                type="monotone"
              />
              <Area
                dataKey="atRisk"
                fill="#fca5a5"
                name="At Risk"
                onClick={(data: { _raw?: CapacityForecastWeek }) => {
                  if (data._raw) setAtRiskSelected(data._raw);
                }}
                stroke="#ef4444"
                style={{ cursor: 'pointer' }}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
          {atRiskSelected ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <strong style={{ fontSize: '0.8rem' }}>At-risk people — week of {atRiskSelected.week}</strong>
              {atRiskSelected.atRiskPeople.length === 0 ? (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>None</p>
              ) : (
                <ul style={{ margin: '4px 0 0', padding: '0 0 0 1.2rem', fontSize: '0.8rem' }}>
                  {atRiskSelected.atRiskPeople.map((p) => (
                    <li key={p.personId}>
                      {p.displayName} — assignment ends {p.assignmentEndsAt.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setAtRiskSelected(null)}
                style={{ marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && planning ? (
        planning.people.length === 0 ? (
          <EmptyState
            description="No assignments found in the next 12 weeks for the current filters."
            title="No planning data"
          />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                width: '100%',
              }}
            >
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: '#f3f4f6',
                      zIndex: 2,
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '160px',
                    }}
                  >
                    Person
                  </th>
                  {planning.weeks.map((week) => (
                    <th
                      key={week}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        borderBottom: '2px solid #e5e7eb',
                        minWidth: '80px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#374151',
                      }}
                    >
                      {week.slice(5)} {/* MM-DD */}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planning.people.map((person) => (
                  <tr key={person.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: 'white',
                        zIndex: 1,
                        padding: '6px 12px',
                        fontWeight: 500,
                        verticalAlign: 'top',
                      }}
                    >
                      {person.displayName}
                    </td>
                    {planning.weeks.map((week) => {
                      const total = getTotalAllocationForWeek(person.assignments, week, whatIfAssignments, person.id);
                      const weekAssignments = person.assignments.filter((a) =>
                        assignmentOverlapsWeek(a, week),
                      );
                      const bg = getCellBackground(total);
                      const textColor = getCellTextColor(total);

                      return (
                        <td
                          key={week}
                          style={{
                            background: bg,
                            padding: '4px',
                            verticalAlign: 'top',
                            minWidth: '80px',
                          }}
                        >
                          {total > 0 ? (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                color: textColor,
                                marginBottom: '2px',
                              }}
                            >
                              {total}%
                              {total > 100 ? (
                                <span
                                  style={{
                                    marginLeft: '2px',
                                    fontSize: '0.65rem',
                                    background: '#dc2626',
                                    color: 'white',
                                    borderRadius: '3px',
                                    padding: '0 3px',
                                  }}
                                  title="Over-allocated"
                                >
                                  !
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {weekAssignments.map((assignment) => (
                            <AssignmentBlock
                              assignment={assignment}
                              key={assignment.id}
                              onExtend={handleExtend}
                              onShorten={handleShorten}
                            />
                          ))}
                          {whatIfMode && whatIfAssignments
                            .filter((a) => a.personId === person.id && assignmentOverlapsWeek(a, week))
                            .map((a) => (
                              <div
                                key={a.id}
                                style={{
                                  display: 'inline-flex',
                                  background: '#fef3c7',
                                  borderRadius: '4px',
                                  padding: '2px 4px',
                                  fontSize: '0.7rem',
                                  marginBottom: '2px',
                                  border: '1px dashed #f59e0b',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {a.projectName} {a.allocationPercent}%
                              </div>
                            ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#bfdbfe', display: 'inline-block', borderRadius: 3 }} />
                1–49% allocated
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#93c5fd', display: 'inline-block', borderRadius: 3 }} />
                50–79%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#86efac', display: 'inline-block', borderRadius: 3 }} />
                80–100%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#fca5a5', display: 'inline-block', borderRadius: 3 }} />
                &gt;100% (conflict)
              </span>
              {whatIfMode ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 14, height: 14, background: '#fef3c7', border: '1px dashed #f59e0b', display: 'inline-block', borderRadius: 3 }} />
                  Hypothetical assignment
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
