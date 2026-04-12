import { useEffect, useState } from 'react';

import { ANOMALY_TYPE_LABELS, humanizeEnum } from '@/lib/labels';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { PersonSelect } from '@/components/common/PersonSelect';
import { SectionCard } from '@/components/common/SectionCard';
import { PlannedVsActualBars } from '@/components/charts/PlannedVsActualBars';
import { DeviationScatter } from '@/components/charts/DeviationScatter';
import { usePlannedVsActual } from '@/features/dashboard/usePlannedVsActual';
import type {
  AssignedButNoEvidenceItem,
  ComparisonAnomalyItem,
  EvidenceButNoApprovedAssignmentItem,
  MatchedRecordItem,
} from '@/lib/api/planned-vs-actual';
import { fetchPlatformSettings } from '@/lib/api/platform-settings';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';

const PAGE_SIZE = 20;

type TabKey = 'matched' | 'noEvidence' | 'noAssignment' | 'anomalies';

export function PlannedVsActualPage(): JSX.Element {
  const [projectId, setProjectId] = useState('');
  const [personId, setPersonId] = useState('');
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [standardHoursPerWeek, setStandardHoursPerWeek] = useState(40);
  const [activeTab, setActiveTab] = useState<TabKey>('matched');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const state = usePlannedVsActual({ asOf, personId, projectId });

  // Reset pagination and expanded rows when filters change
  useEffect(() => { setPage(1); setExpandedRows(new Set()); }, [projectId, personId, asOf, activeTab]);

  // Fetch project list for autocomplete
  useEffect(() => {
    let active = true;
    void fetchProjectDirectory().then((r) => {
      if (active) setProjects(r.items);
    });
    return () => { active = false; };
  }, []);

  // Fetch standardHoursPerWeek from platform settings
  useEffect(() => {
    let active = true;
    void fetchPlatformSettings().then((s) => {
      if (active) setStandardHoursPerWeek(s.timesheets.standardHoursPerWeek);
    });
    return () => { active = false; };
  }, []);

  const counts = {
    matched: state.data?.matchedRecords.length ?? 0,
    noEvidence: state.data?.assignedButNoEvidence.length ?? 0,
    noAssignment: state.data?.evidenceButNoApprovedAssignment.length ?? 0,
    anomalies: state.data?.anomalies.length ?? 0,
  };

  const totalCount = counts.matched + counts.noEvidence + counts.noAssignment + counts.anomalies;

  // Build chart data from matchedRecords (group by person)
  const chartData = state.data
    ? buildPersonChartData(state.data.matchedRecords, standardHoursPerWeek)
    : [];

  // Get current tab items
  const currentItems = getCurrentTabItems(state.data, activeTab);
  const totalPages = Math.max(1, Math.ceil(currentItems.length / PAGE_SIZE));
  const pagedItems = currentItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <PageContainer testId="planned-vs-actual-page">
      <PageHeader
        eyebrow="Diagnostics"
        subtitle="Compare planned staffing against observed work."
        title="Planned vs Actual"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Project</span>
          <input
            className="field__control"
            list="pva-project-list"
            onChange={(event) => {
              const val = event.target.value;
              if (!val) { setProjectId(''); return; }
              const match = projects.find((p) => p.name === val || p.projectCode === val);
              if (match) setProjectId(match.id);
            }}
            placeholder="Search projects..."
            type="text"
          />
          <datalist id="pva-project-list">
            {projects.map((p) => (
              <option key={p.id} value={p.name}>{p.projectCode}</option>
            ))}
          </datalist>
        </label>
        <PersonSelect label="Person" onChange={setPersonId} value={personId} />
        <label className="field">
          <span className="field__label">As of</span>
          <input
            className="field__control"
            onChange={(event) => setAsOf(event.target.value)}
            type="datetime-local"
            value={asOf.slice(0, 16)}
          />
        </label>
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading planned vs actual comparison..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error && state.data ? (
        <>
          {/* Summary metric row */}
          <div className="stats-grid">
            <MetricCard label="Total Records" value={totalCount} />
            <MetricCard label="Matched" value={counts.matched} />
            <MetricCard label="No Evidence" value={counts.noEvidence} />
            <MetricCard label="Anomalies" value={counts.anomalies} />
          </div>

          {/* Charts (collapsed into compact row) */}
          {chartData.length > 0 ? (
            <div className="dashboard-grid">
              <SectionCard title="Planned vs Actual Hours">
                <PlannedVsActualBars data={chartData} />
              </SectionCard>
              <SectionCard title="Deviation Analysis">
                <DeviationScatter data={chartData} />
              </SectionCard>
            </div>
          ) : null}

          {/* Tab navigation */}
          <div className="pva-tabs" role="tablist">
            <TabButton active={activeTab === 'matched'} count={counts.matched} label="Matched Records" onClick={() => setActiveTab('matched')} />
            <TabButton active={activeTab === 'noEvidence'} count={counts.noEvidence} label="Assigned, No Evidence" onClick={() => setActiveTab('noEvidence')} />
            <TabButton active={activeTab === 'noAssignment'} count={counts.noAssignment} label="Evidence, No Assignment" onClick={() => setActiveTab('noAssignment')} />
            <TabButton active={activeTab === 'anomalies'} count={counts.anomalies} label="Anomalies" onClick={() => setActiveTab('anomalies')} />
          </div>

          {/* Summary table */}
          <SectionCard>
            {currentItems.length === 0 ? (
              <p className="placeholder-block__copy">No records in this category.</p>
            ) : (
              <>
                <div className="pva-table-container data-table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}></th>
                        {activeTab === 'matched' && <MatchedHeaders />}
                        {activeTab === 'noEvidence' && <NoEvidenceHeaders />}
                        {activeTab === 'noAssignment' && <NoAssignmentHeaders />}
                        {activeTab === 'anomalies' && <AnomalyHeaders />}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((item, idx) => {
                        const rowId = getRowId(item, activeTab, idx);
                        const isExpanded = expandedRows.has(rowId);
                        return (
                          <TableRow
                            key={rowId}
                            activeTab={activeTab}
                            expanded={isExpanded}
                            item={item}
                            onToggle={() => toggleRow(rowId)}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 ? (
                  <div className="pagination">
                    <button className="button button--secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
                      ← Previous
                    </button>
                    <span className="pagination__info">Page {page} of {totalPages} ({currentItems.length} records)</span>
                    <button className="button button--secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">
                      Next →
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </SectionCard>
        </>
      ) : null}

      {!state.isLoading && !state.error && state.data && totalCount === 0 ? (
        <SectionCard>
          <p className="placeholder-block__copy">No planned vs actual results</p>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}

// --- Sub-components ---

interface MetricCardProps { label: string; value: number; }
function MetricCard({ label, value }: MetricCardProps): JSX.Element {
  return (
    <SectionCard>
      <div className="metric-card">
        <div className="metric-card__value">{value}</div>
        <div className="metric-card__label">{label}</div>
      </div>
    </SectionCard>
  );
}

interface TabButtonProps { active: boolean; count: number; label: string; onClick: () => void; }
function TabButton({ active, count, label, onClick }: TabButtonProps): JSX.Element {
  return (
    <button
      className={`pva-tab${active ? ' pva-tab--active' : ''}`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label} <span className="pva-tab__count">({count})</span>
    </button>
  );
}

// Table headers per tab
function MatchedHeaders(): JSX.Element {
  return <><th>Person</th><th>Project</th><th>Role</th><th className="text-right">Alloc %</th><th className="text-right">Hours</th><th>Status</th></>;
}
function NoEvidenceHeaders(): JSX.Element {
  return <><th>Person</th><th>Project</th><th>Role</th><th className="text-right">Alloc %</th></>;
}
function NoAssignmentHeaders(): JSX.Element {
  return <><th>Person</th><th>Project</th><th>Source</th><th className="text-right">Hours</th><th>Date</th></>;
}
function AnomalyHeaders(): JSX.Element {
  return <><th>Type</th><th>Person</th><th>Project</th><th>Details</th></>;
}

// Table row component
type AnyItem = MatchedRecordItem | AssignedButNoEvidenceItem | EvidenceButNoApprovedAssignmentItem | ComparisonAnomalyItem;
interface TableRowProps { activeTab: TabKey; expanded: boolean; item: AnyItem; onToggle: () => void; }

function TableRow({ activeTab, expanded, item, onToggle }: TableRowProps): JSX.Element {
  return (
    <>
      <tr className={`pva-row${expanded ? ' pva-row--expanded' : ''}`} onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td className="pva-row__toggle">{expanded ? '▾' : '▸'}</td>
        {activeTab === 'matched' && <MatchedCells item={item as MatchedRecordItem} />}
        {activeTab === 'noEvidence' && <NoEvidenceCells item={item as AssignedButNoEvidenceItem} />}
        {activeTab === 'noAssignment' && <NoAssignmentCells item={item as EvidenceButNoApprovedAssignmentItem} />}
        {activeTab === 'anomalies' && <AnomalyCells item={item as ComparisonAnomalyItem} />}
      </tr>
      {expanded ? (
        <tr className="pva-detail-row">
          <td colSpan={10}>
            <div className="pva-detail">
              {activeTab === 'matched' && <MatchedDetail item={item as MatchedRecordItem} />}
              {activeTab === 'noEvidence' && <NoEvidenceDetail item={item as AssignedButNoEvidenceItem} />}
              {activeTab === 'noAssignment' && <NoAssignmentDetail item={item as EvidenceButNoApprovedAssignmentItem} />}
              {activeTab === 'anomalies' && <AnomalyDetail item={item as ComparisonAnomalyItem} />}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// Cell renderers
function MatchedCells({ item }: { item: MatchedRecordItem }): JSX.Element {
  const delta = item.effortHours - (item.allocationPercent * 0.4);
  const badge = delta > 2 ? 'badge--danger' : delta < -2 ? 'badge--warning' : 'badge--success';
  return (
    <>
      <td>{item.person.displayName}</td>
      <td><span className="text-muted">{item.project.projectCode}</span> {item.project.name}</td>
      <td>{item.staffingRole}</td>
      <td className="text-right">{item.allocationPercent}%</td>
      <td className="text-right">{item.effortHours}h</td>
      <td><span className={`badge ${badge}`}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}h</span></td>
    </>
  );
}

function NoEvidenceCells({ item }: { item: AssignedButNoEvidenceItem }): JSX.Element {
  return (
    <>
      <td>{item.person.displayName}</td>
      <td><span className="text-muted">{item.project.projectCode}</span> {item.project.name}</td>
      <td>{item.staffingRole}</td>
      <td className="text-right">{item.allocationPercent}%</td>
    </>
  );
}

function NoAssignmentCells({ item }: { item: EvidenceButNoApprovedAssignmentItem }): JSX.Element {
  return (
    <>
      <td>{item.person.displayName}</td>
      <td><span className="text-muted">{item.project.projectCode}</span> {item.project.name}</td>
      <td>{item.sourceType}</td>
      <td className="text-right">{item.effortHours}h</td>
      <td>{item.activityDate.slice(0, 10)}</td>
    </>
  );
}

function AnomalyCells({ item }: { item: ComparisonAnomalyItem }): JSX.Element {
  return (
    <>
      <td><span className="badge badge--warning">{humanizeEnum(item.type, ANOMALY_TYPE_LABELS)}</span></td>
      <td>{item.person.displayName}</td>
      <td>{item.project.name}</td>
      <td className="text-truncate">{item.message}</td>
    </>
  );
}

// Detail renderers
function MatchedDetail({ item }: { item: MatchedRecordItem }): JSX.Element {
  return (
    <dl className="pva-detail__dl">
      <dt>Assignment ID</dt><dd className="text-muted">{item.assignmentId}</dd>
      <dt>Evidence ID</dt><dd className="text-muted">{item.workEvidenceId}</dd>
      <dt>Allocation</dt><dd>{item.allocationPercent}%</dd>
      <dt>Effort</dt><dd>{item.effortHours}h</dd>
    </dl>
  );
}

function NoEvidenceDetail({ item }: { item: AssignedButNoEvidenceItem }): JSX.Element {
  return (
    <dl className="pva-detail__dl">
      <dt>Assignment ID</dt><dd className="text-muted">{item.assignmentId}</dd>
      <dt>Role</dt><dd>{item.staffingRole}</dd>
      <dt>Allocation</dt><dd>{item.allocationPercent}%</dd>
    </dl>
  );
}

function NoAssignmentDetail({ item }: { item: EvidenceButNoApprovedAssignmentItem }): JSX.Element {
  return (
    <dl className="pva-detail__dl">
      <dt>Evidence ID</dt><dd className="text-muted">{item.workEvidenceId}</dd>
      <dt>Source</dt><dd>{item.sourceType}</dd>
      <dt>Hours</dt><dd>{item.effortHours}h</dd>
      <dt>Date</dt><dd>{item.activityDate.slice(0, 10)}</dd>
    </dl>
  );
}

function AnomalyDetail({ item }: { item: ComparisonAnomalyItem }): JSX.Element {
  return (
    <dl className="pva-detail__dl">
      <dt>Type</dt><dd>{humanizeEnum(item.type, ANOMALY_TYPE_LABELS)}</dd>
      <dt>Message</dt><dd>{item.message}</dd>
    </dl>
  );
}

// --- Helpers ---

interface PersonChartRow { actual: number; person: string; planned: number; }

function buildPersonChartData(matchedRecords: MatchedRecordItem[], standardHoursPerWeek: number): PersonChartRow[] {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const record of matchedRecords) {
    const name = record.person.displayName;
    const existing = map.get(name) ?? { actual: 0, planned: 0 };
    map.set(name, {
      actual: existing.actual + record.effortHours,
      planned: existing.planned + (record.allocationPercent * (standardHoursPerWeek / 100)),
    });
  }
  return Array.from(map.entries()).map(([person, { planned, actual }]) => ({ actual, person, planned }));
}

function getCurrentTabItems(
  data: { anomalies: ComparisonAnomalyItem[]; assignedButNoEvidence: AssignedButNoEvidenceItem[]; evidenceButNoApprovedAssignment: EvidenceButNoApprovedAssignmentItem[]; matchedRecords: MatchedRecordItem[] } | null,
  tab: TabKey,
): AnyItem[] {
  if (!data) return [];
  switch (tab) {
    case 'matched': return data.matchedRecords;
    case 'noEvidence': return data.assignedButNoEvidence;
    case 'noAssignment': return data.evidenceButNoApprovedAssignment;
    case 'anomalies': return data.anomalies;
  }
}

function getRowId(item: AnyItem, tab: TabKey, index: number): string {
  if (tab === 'matched') return (item as MatchedRecordItem).assignmentId + '-' + (item as MatchedRecordItem).workEvidenceId;
  if (tab === 'noEvidence') return (item as AssignedButNoEvidenceItem).assignmentId;
  if (tab === 'noAssignment') return (item as EvidenceButNoApprovedAssignmentItem).workEvidenceId;
  return `anomaly-${index}`;
}
