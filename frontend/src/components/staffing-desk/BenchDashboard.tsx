import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import {
  fetchBenchDashboard,
  type BenchDashboardResponse,
  type BenchPersonItem,
  type BenchAgingBucket,
  type BenchRollOff,
} from '@/lib/api/staffing-desk';
import { formatDateShort } from '@/lib/format-date';
import { Button, Table, type Column } from '@/components/ds';

interface Props {
  poolId?: string;
  orgUnitId?: string;
}

const S_KPI: React.CSSProperties = { textAlign: 'center', padding: 'var(--space-2) var(--space-3)' };
const S_KPI_VAL: React.CSSProperties = { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
const S_KPI_LABEL: React.CSSProperties = { fontSize: 10, color: 'var(--color-text-muted)' };
const S_SECTION: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-subtle)', margin: 'var(--space-3) 0 var(--space-1)' };
const S_BAR: React.CSSProperties = { height: 16, borderRadius: 3, minWidth: 2, transition: 'width 200ms' };

const AGING_COLORS = ['var(--color-status-active)', 'var(--color-status-info)', 'var(--color-status-warning)', 'var(--color-status-danger)', '#991b1b'];

export function BenchDashboard({ poolId, orgUnitId }: Props): JSX.Element {
  const [data, setData] = useState<BenchDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<BenchPersonItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBenchDashboard({ poolId, orgUnitId })
      .then((r) => { if (active) setData(r); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load bench data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [poolId, orgUnitId]);

  const propose = useCallback((personId: string, personName: string, requestId: string | null) => {
    setSelectedPerson(null);
    setTimeout(() => navigate(`/assignments/new${requestId ? `?personId=${personId}` : ''}`), 50);
  }, [navigate]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="page" />;
  if (error) return <ErrorState description={error} />;
  if (!data) return <ErrorState description="No bench data available." />;

  const { kpis, agingBuckets, rollOffs, benchPeople, distribution, trend } = data;
  const maxBucket = Math.max(1, ...agingBuckets.map((b) => b.count));
  const maxDist = (items: Array<{ count: number }>) => Math.max(1, ...items.map((i) => i.count));

  return (
    <div>
      {/* KPI Strip */}
      <div className="kpi-strip" style={{ marginBottom: 'var(--space-2)' }}>
        <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${kpis.benchCount > 5 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
          <span className="kpi-strip__value">{kpis.benchCount}</span>
          <span className="kpi-strip__label">On Bench</span>
          <span className="kpi-strip__context">{kpis.benchRate}% of {kpis.totalPeople}</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-info)' }}>
          <span className="kpi-strip__value">{kpis.avgDaysOnBench}d</span>
          <span className="kpi-strip__label">Avg Duration</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${kpis.atRiskCount > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
          <span className="kpi-strip__value">{kpis.atRiskCount}</span>
          <span className="kpi-strip__label">At Risk</span>
          <span className="kpi-strip__context">roll-off in 14d</span>
        </div>
        <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${kpis.longestBenchDays > 60 ? 'var(--color-status-danger)' : 'var(--color-status-info)'}` }}>
          <span className="kpi-strip__value">{kpis.longestBenchDays}d</span>
          <span className="kpi-strip__label">Longest Bench</span>
        </div>
      </div>

      {/* Two-column: Aging + Roll-offs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {/* Aging Chart */}
        <div>
          <div style={S_SECTION}>Bench Aging</div>
          {agingBuckets.map((bucket, i) => (
            <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
              <span style={{ width: 50, fontSize: 10, textAlign: 'right', color: 'var(--color-text-muted)' }}>{bucket.label}</span>
              <div style={{ flex: 1, background: 'var(--color-surface-alt)', borderRadius: 3, height: 16 }}>
                <div style={{ ...S_BAR, width: `${(bucket.count / maxBucket) * 100}%`, background: AGING_COLORS[i] }} />
              </div>
              <span style={{ width: 20, fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{bucket.count}</span>
            </div>
          ))}
        </div>

        {/* Roll-offs */}
        <div>
          <div style={S_SECTION}>Upcoming Roll-offs</div>
          {rollOffs.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', padding: 'var(--space-2)' }}>No roll-offs in the next 12 weeks.</div>
          ) : (
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {rollOffs.slice(0, 10).map((r) => (
                <div key={`${r.personId}-${r.assignmentEndDate}`} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0',
                  borderBottom: '1px solid var(--color-border)', fontSize: 11,
                }}>
                  <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 30, color: r.daysUntilRollOff <= 14 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                    {r.daysUntilRollOff}d
                  </span>
                  <span style={{ flex: 1 }}>{r.displayName}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{r.projectName}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{r.allocationPercent}%</span>
                  {r.hasFollowOn && <StatusBadge label="Follow-on" tone="active" variant="dot" size="small" />}
                  {!r.hasFollowOn && <StatusBadge label="No next" tone="danger" variant="dot" size="small" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distribution charts */}
      <div style={S_SECTION}>Distribution</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {[
          { title: 'By Grade', items: distribution.byGrade },
          { title: 'By Skill', items: distribution.bySkill.slice(0, 8) },
          { title: 'By Pool', items: distribution.byPool },
          { title: 'By Org Unit', items: distribution.byOrgUnit },
        ].map((chart) => (
          <div key={chart.title}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{chart.title}</div>
            {chart.items.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontSize: 10 }}>
                <span style={{ width: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <div style={{ flex: 1, background: 'var(--color-surface-alt)', borderRadius: 2, height: 10 }}>
                  <div style={{ height: 10, borderRadius: 2, background: 'var(--color-accent)', width: `${(item.count / maxDist(chart.items)) * 100}%` }} />
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 14, textAlign: 'right' }}>{item.count}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Trend sparkline */}
      {trend.length > 0 && (
        <>
          <div style={S_SECTION}>12-Week Bench Forecast</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 40, marginBottom: 'var(--space-2)' }}>
            {trend.map((t, i) => {
              const maxCount = Math.max(1, ...trend.map((x) => x.benchCount));
              const h = (t.benchCount / maxCount) * 100;
              return (
                <div key={t.week} title={`${formatDateShort(t.week)}: ${t.benchCount} bench (${t.benchRate}%)`} style={{
                  flex: 1, background: i === 0 ? 'var(--color-accent)' : 'var(--color-status-info)',
                  height: `${Math.max(4, h)}%`, borderRadius: '2px 2px 0 0', opacity: 0.7,
                }} />
              );
            })}
          </div>
        </>
      )}

      {/* Bench Roster */}
      <div style={S_SECTION}>Bench Roster ({benchPeople.length})</div>
      {benchPeople.length === 0 ? (
        <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No one on bench.</div>
      ) : (
        <Table
          variant="compact"
          columns={[
            { key: 'name', title: 'Name', getValue: (p) => p.displayName, render: (p) => <span style={{ fontWeight: 500, color: 'var(--color-accent)' }}>{p.displayName}</span> },
            { key: 'grade', title: 'Grade', getValue: (p) => p.grade ?? '', render: (p) => p.grade ?? '—' },
            { key: 'skills', title: 'Skills', getValue: (p) => p.skills.map((s) => s.name).join(', '), render: (p) => (
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {p.skills.slice(0, 3).map((s) => s.name).join(', ')}{p.skills.length > 3 ? ` +${p.skills.length - 3}` : ''}
              </span>
            ) },
            { key: 'pool', title: 'Pool', getValue: (p) => p.poolName ?? '', render: (p) => <span style={{ fontSize: 10 }}>{p.poolName ?? '—'}</span> },
            { key: 'days', title: 'Days', align: 'right', getValue: (p) => p.daysOnBench, render: (p) => (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: p.daysOnBench > 60 ? 'var(--color-status-danger)' : p.daysOnBench > 30 ? 'var(--color-status-warning)' : 'var(--color-text)' }}>
                {p.daysOnBench}
              </span>
            ) },
            { key: 'lastProject', title: 'Last Project', getValue: (p) => p.lastProjectName ?? '', render: (p) => <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{p.lastProjectName ?? '—'}</span> },
            { key: 'match', title: 'Best Match', render: (p) => (
              p.bestMatchScore !== null ? (
                <span style={{ fontSize: 10 }}>
                  <StatusBadge label={`${Math.round(p.bestMatchScore * 100)}%`} tone={p.bestMatchScore >= 0.7 ? 'active' : p.bestMatchScore >= 0.4 ? 'warning' : 'neutral'} variant="chip" size="small" />
                  {' '}<span style={{ color: 'var(--color-text-muted)' }}>{p.bestMatchRole}</span>
                </span>
              ) : <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>No match</span>
            ) },
          ] as Column<BenchPersonItem>[]}
          rows={benchPeople}
          getRowKey={(p) => p.personId}
          onRowClick={(p) => setSelectedPerson(p)}
        />
      )}

      {/* Person detail drawer */}
      {selectedPerson && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} onClick={() => setSelectedPerson(null)} />
          <div style={{ position: 'relative', width: 460, maxWidth: '90vw', height: '100%', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedPerson.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {selectedPerson.grade ?? ''} {selectedPerson.role ? `· ${selectedPerson.role}` : ''}
                  {' · '}{selectedPerson.daysOnBench}d on bench
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedPerson(null)} type="button">&times;</Button>
            </div>
            <div style={{ padding: 'var(--space-3) var(--space-4)', flex: 1, overflowY: 'auto' }}>
              {/* Profile */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '3px var(--space-2)', fontSize: 12, marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Manager</span><span>{selectedPerson.managerName ?? '—'}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Pool</span><span>{selectedPerson.poolName ?? '—'}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Department</span><span>{selectedPerson.orgUnitName ?? '—'}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Last Project</span><span>{selectedPerson.lastProjectName ?? '—'}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Bench Since</span><span>{formatDateShort(selectedPerson.benchStartDate)}</span>
              </div>

              {/* Skills */}
              {selectedPerson.skills.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {selectedPerson.skills.map((s) => (
                      <span key={s.name} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                        {s.name} ({s.proficiency})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Workload Timeline</div>
                <WorkloadTimeline personId={selectedPerson.personId} />
              </div>

              {/* Best match */}
              {selectedPerson.bestMatchScore !== null && (
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Best Matching Request</div>
                  <div style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 500 }}>{selectedPerson.bestMatchRole}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                      Match score: {Math.round(selectedPerson.bestMatchScore * 100)}%
                    </div>
                    <Button variant="primary" size="sm" style={{ marginTop: 'var(--space-1)', fontSize: 10 }} onClick={() => propose(selectedPerson.personId, selectedPerson.displayName, selectedPerson.bestMatchRequestId)} type="button">
                      Propose Assignment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
