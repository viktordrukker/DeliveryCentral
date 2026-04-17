import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { ANOMALY_TYPE_LABELS, humanizeEnum } from '@/lib/labels';
import { ActionDataTable, type ActionColumn, type QuickAction, type BatchAction, type QuickFilter } from '@/components/common/ActionDataTable';
import { CreateAssignmentModal, type AssignmentModalPreFill } from '@/components/assignments/CreateAssignmentModal';
import { BatchAssignmentConfirmModal } from '@/components/assignments/BatchAssignmentConfirmModal';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PersonSelect } from '@/components/common/PersonSelect';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { ReconciliationOverviewChart, type ReconciliationChartRow } from '@/components/charts/ReconciliationOverviewChart';
import { VarianceExplorerChart } from '@/components/charts/VarianceExplorerChart';
import { usePlannedVsActual } from '@/features/dashboard/usePlannedVsActual';
import {
  buildProjectVarianceRows,
  buildTimesheetPipelineRows,
  buildStaffingGapRows,
  buildOrgSubmissionRows,
  buildPoolSubmissionRows,
  buildOverSubmittedRows,
  buildPvaActionItems,
  buildMissingTimesheetItems,
  buildPvaKpis,
  buildTopMismatchedPeople,
  buildTopMismatchedProjects,
  buildVarianceExplorerDimensions,
  type MismatchedPersonRow,
  type MismatchedProjectRow,
  type PvaActionItem,
} from '@/features/dashboard/planned-vs-actual-selectors';
import type {
  AssignedButNoEvidenceItem,
  ComparisonAnomalyItem,
  EvidenceButNoApprovedAssignmentItem,
  MatchedRecordItem,
  ProjectPvaSummary,
  OrgUnitPvaSummary,
  ResourcePoolPvaSummary,
  UnstaffedProject,
} from '@/lib/api/planned-vs-actual';
import { fetchPersonDirectory, type PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchPlatformSettings } from '@/lib/api/platform-settings';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';
import { useOvertimeSummary } from '@/features/dashboard/useOvertimeSummary';
import type { OvertimePersonSummary, OvertimeProjectSummary } from '@/lib/api/overtime';
import { formatDateShort } from '@/lib/format-date';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const tc = (val: number, warn: number, danger: number, higherIsBad = true): string => {
  if (higherIsBad) {
    if (val >= danger) return 'var(--color-status-danger)';
    if (val >= warn) return 'var(--color-status-warning)';
    return 'var(--color-status-active)';
  }
  if (val <= danger) return 'var(--color-status-danger)';
  if (val <= warn) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
};

type DetailTab = 'matched' | 'noEvidence' | 'noAssignment' | 'anomalies';
type OrgDimension = 'department' | 'pool';

const WEEK_OPTIONS = [
  { label: 'This week', value: 1 },
  { label: 'Last 2 weeks', value: 2 },
  { label: 'Last 4 weeks', value: 4 },
  { label: 'Last 8 weeks', value: 8 },
  { label: 'Last 12 weeks', value: 12 },
];

/* ── Section wrapper (dashboard-hero style) ── */
function DashSection({ children, title, subtitle, actions, testId }: {
  actions?: React.ReactNode; children: React.ReactNode; subtitle?: string; testId?: string; title: string;
}): JSX.Element {
  return (
    <div className="dashboard-hero" data-testid={testId} style={{ position: 'relative', minHeight: 'auto' }}>
      <div className="dashboard-hero__header" style={actions ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' } : undefined}>
        <div>
          <div className="dashboard-hero__title">{title}</div>
          {subtitle && <div className="dashboard-hero__subtitle">{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function PlannedVsActualPage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const nav = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [personId, setPersonId] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [standardHoursPerWeek, setStandardHoursPerWeek] = useState(40);
  const [personDir, setPersonDir] = useState<PersonDirectoryItem[]>([]);
  const [detailTab, setDetailTab] = useState<DetailTab>('noAssignment');
  const [actionSeverityFilter, setActionSeverityFilter] = useState<string>('');
  const [orgDim, setOrgDim] = useState<OrgDimension>('department');
  const [pipelineView, setPipelineView] = useState<'chart' | 'table'>('chart');
  const [assignModalPreFill, setAssignModalPreFill] = useState<AssignmentModalPreFill | null>(null);
  const [batchItems, setBatchItems] = useState<AssignmentModalPreFill[]>([]);
  const { refetch, ...state } = usePlannedVsActual({ asOf, personId, projectId, weeks });
  const { data: otData } = useOvertimeSummary({ weeks, asOf });
  const [otDim, setOtDim] = useState<'person' | 'project' | 'department' | 'pool'>('person');

  // Title bar
  useEffect(() => {
    setActions(
      <>
        <label className="field">
          <span className="field__label">Project</span>
          <select className="field__control" onChange={(e) => setProjectId(e.target.value)} value={projectId}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectCode} — {p.name}</option>)}
          </select>
        </label>
        <PersonSelect label="Person" onChange={setPersonId} value={personId} />
        <label className="field">
          <span className="field__label">Period</span>
          <select className="field__control" onChange={(e) => setWeeks(Number(e.target.value))} value={weeks}>
            {WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label">As of</span>
          <input className="field__control" onChange={(e) => setAsOf(e.target.value)} type="datetime-local" value={asOf.slice(0, 16)} />
        </label>
        <Link className="button button--secondary button--sm" to="/assignments">Assignments</Link>
        <Link className="button button--secondary button--sm" to="/time-management">Time Management</Link>
        <Link className="button button--secondary button--sm" to="/projects">Projects</Link>
        <Link className="button button--secondary button--sm" to="/reports/time">Time Analytics</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, projects, personId, projectId, asOf, weeks]);

  useEffect(() => { let a = true; void fetchProjectDirectory().then((r) => { if (a) setProjects(r.items); }); return () => { a = false; }; }, []);
  useEffect(() => { let a = true; void fetchPlatformSettings().then((s) => { if (a) setStandardHoursPerWeek(s.timesheets.standardHoursPerWeek); }); return () => { a = false; }; }, []);
  useEffect(() => { let a = true; void fetchPersonDirectory({ page: 1, pageSize: 500 }).then((r) => { if (a) setPersonDir(r.items); }); return () => { a = false; }; }, []);

  /* ── Derived data ── */
  const kpis = useMemo(() => state.data ? buildPvaKpis(state.data) : null, [state.data]);

  const heroData = useMemo<ReconciliationChartRow[]>(() => {
    if (!state.data) return [];
    return buildProjectVarianceRows(state.data).map((r) => ({
      anomalyCount: 0, code: r.projectCode, evidenceHours: r.totalActualHours, id: r.projectId,
      label: r.projectName, matchRate: r.plannedHours > 0 ? Math.round((r.approvedHours / r.plannedHours) * 100) : 0,
      matchedHours: r.approvedHours, plannedHours: r.plannedHours,
      silentHours: Math.max(0, r.plannedHours - r.totalActualHours),
      unapprovedHours: r.submittedHours + r.draftHours, variance: r.variance,
    }));
  }, [state.data]);

  const pipelineRows = useMemo(() => state.data ? buildTimesheetPipelineRows(state.data) : [], [state.data]);
  const staffingGaps = useMemo(() => state.data ? buildStaffingGapRows(state.data) : [], [state.data]);
  const orgRows = useMemo(() => state.data ? buildOrgSubmissionRows(state.data) : [], [state.data]);
  const poolRows = useMemo(() => state.data ? buildPoolSubmissionRows(state.data) : [], [state.data]);
  const overSubmitted = useMemo(() => state.data ? buildOverSubmittedRows(state.data) : [], [state.data]);

  const personLookupMap = useMemo(() => {
    const map = new Map<string, { displayName: string }>();
    for (const p of personDir) map.set(p.id, { displayName: p.displayName });
    return map;
  }, [personDir]);

  const actionItems = useMemo(() => {
    if (!state.data) return [];
    const items = buildPvaActionItems(state.data);
    const missing = buildMissingTimesheetItems(state.data, personLookupMap);
    return [...items, ...missing];
  }, [state.data, personLookupMap]);

  const topProjects = useMemo(() => state.data ? buildTopMismatchedProjects(state.data) : [], [state.data]);
  const topPeople = useMemo(() => state.data ? buildTopMismatchedPeople(state.data) : [], [state.data]);

  const personLookup = useMemo(() => {
    const map = new Map<string, { department?: string; departmentId?: string; pool?: string; poolId?: string }>();
    for (const p of personDir) {
      const pools = (p.resourcePools ?? []) as Array<{ id: string; name: string }>;
      const firstPool = pools[0];
      map.set(p.id, {
        department: p.currentOrgUnit?.name, departmentId: p.currentOrgUnit?.id,
        pool: firstPool?.name, poolId: firstPool?.id,
      });
    }
    return map;
  }, [personDir]);

  const explorerDimensions = useMemo(
    () => state.data ? buildVarianceExplorerDimensions(state.data, standardHoursPerWeek, personLookup) : { department: [], person: [], pool: [], project: [] },
    [state.data, standardHoursPerWeek, personLookup],
  );

  /* ── Filtered action items ── */
  const filteredActionItems = useMemo(() => {
    if (!actionSeverityFilter) return actionItems;
    return actionItems.filter((i) => i.severity === actionSeverityFilter);
  }, [actionItems, actionSeverityFilter]);

  const detailCounts = {
    anomalies: kpis?.anomalyCount ?? 0,
    matched: kpis?.matchedCount ?? 0,
    noAssignment: state.data?.evidenceButNoApprovedAssignment.length ?? 0,
    noEvidence: state.data?.assignedButNoEvidence.length ?? 0,
  };

  /* ── Action table columns ── */
  const actionCols = useMemo<ActionColumn<PvaActionItem>[]>(() => [
    { key: 'severity', render: (item) => <StatusBadge label={item.severity} size="small" tone={item.severityTone} variant="dot" />, title: 'Severity', width: 80 },
    { key: 'category', render: (item) => item.category, title: 'Category', width: 130 },
    { key: 'project', render: (item) => item.project ? <><span style={{ color: 'var(--color-text-muted)', fontSize: 11, ...NUM }}>{item.projectCode}</span>{' '}<span style={{ fontWeight: 500 }}>{item.project}</span></> : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>, title: 'Project' },
    { key: 'person', render: (item) => item.person, title: 'Person', width: 140 },
    { key: 'impact', render: (item) => <span style={{ fontSize: 11 }}>{item.impact}</span>, title: 'Impact', width: 200 },
    { key: 'hours', align: 'right', render: (item) => item.hours !== null ? <span style={{ ...NUM, fontWeight: 600 }}>{item.hours.toFixed(1)}h</span> : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>, title: 'Hours', width: 60 },
  ], []);

  function openAssignModal(item: { personId: string; person: string; projectId: string; project: string; hours: number | null; activityDate: string | null }): void {
    const pd = personDir.find((p) => p.id === item.personId);
    setAssignModalPreFill({ personId: item.personId, personName: item.person, personStatus: pd?.lifecycleStatus, personTerminatedAt: pd?.terminatedAt, projectId: item.projectId, projectName: item.project, contextHours: item.hours, contextDate: item.activityDate });
  }

  const actionQuickActions = useMemo<QuickAction<PvaActionItem>[]>(() => [
    {
      label: 'Resolve', tone: 'primary',
      onClick: (item) => {
        if (item.sourceCategory === 'silent') nav('/assignments');
        else if (item.sourceCategory === 'missing') nav(`/people/${item.personId}`);
        else openAssignModal(item);
      },
    },
    {
      label: 'Assign', tone: 'secondary',
      onClick: (item) => openAssignModal(item),
      hidden: (item) => item.sourceCategory === 'silent' || item.sourceCategory === 'missing',
    },
  ], [nav]);

  const actionBatchActions = useMemo<BatchAction<PvaActionItem>[]>(() => [
    {
      label: 'Batch Assign', tone: 'primary',
      onClick: (items) => {
        const assignable = items.filter((i) => i.sourceCategory !== 'silent' && i.sourceCategory !== 'missing');
        if (assignable.length === 0) return;
        setBatchItems(assignable.map((i) => ({ personId: i.personId, personName: i.person, projectId: i.projectId, projectName: i.project, contextHours: i.hours, contextDate: i.activityDate })));
      },
    },
  ], []);

  const actionFilters = useMemo<QuickFilter[]>(() => [
    { label: 'All', active: !actionSeverityFilter, count: actionItems.length, onClick: () => setActionSeverityFilter('') },
    { label: 'Critical', active: actionSeverityFilter === 'Critical', count: actionItems.filter((i) => i.severity === 'Critical').length, onClick: () => setActionSeverityFilter('Critical') },
    { label: 'High', active: actionSeverityFilter === 'High', count: actionItems.filter((i) => i.severity === 'High').length, onClick: () => setActionSeverityFilter('High') },
    { label: 'Med', active: actionSeverityFilter === 'Med', count: actionItems.filter((i) => i.severity === 'Med').length, onClick: () => setActionSeverityFilter('Med') },
  ], [actionItems, actionSeverityFilter]);

  /* ── Detail table columns ── */
  const matchedCols = useMemo<ActionColumn<MatchedRecordItem>[]>(() => [
    { key: 'person', render: (item) => item.person.displayName, title: 'Person' },
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.project.projectCode}</span> {item.project.name}</>, title: 'Project' },
    { key: 'role', render: (item) => item.staffingRole, title: 'Role', width: 100 },
    { key: 'alloc', align: 'right', render: (item) => `${item.allocationPercent}%`, title: 'Alloc', width: 55 },
    { key: 'hours', align: 'right', render: (item) => `${item.effortHours}h`, title: 'Logged', width: 55 },
    { key: 'variance', render: (item) => { const d = item.effortHours - (item.allocationPercent * (standardHoursPerWeek / 100)); return <StatusBadge label={`${d > 0 ? '+' : ''}${d.toFixed(1)}h`} size="small" tone={d > 2 ? 'danger' : d < -2 ? 'warning' : 'active'} />; }, title: 'Var', width: 75 },
  ], [standardHoursPerWeek]);

  const noEvidenceCols = useMemo<ActionColumn<AssignedButNoEvidenceItem>[]>(() => [
    { key: 'person', render: (item) => item.person.displayName, title: 'Person' },
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.project.projectCode}</span> {item.project.name}</>, title: 'Project' },
    { key: 'role', render: (item) => item.staffingRole, title: 'Role', width: 100 },
    { key: 'alloc', align: 'right', render: (item) => `${item.allocationPercent}%`, title: 'Alloc', width: 55 },
    { key: 'status', render: () => <StatusBadge label="No Actual Time" size="small" tone="warning" />, title: 'Status', width: 110 },
  ], []);

  const noAssignmentCols = useMemo<ActionColumn<EvidenceButNoApprovedAssignmentItem>[]>(() => [
    { key: 'person', render: (item) => item.person.displayName, title: 'Person' },
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.project.projectCode}</span> {item.project.name}</>, title: 'Project' },
    { key: 'source', render: (item) => item.sourceType, title: 'Source', width: 90 },
    { key: 'hours', align: 'right', render: (item) => <span style={{ fontWeight: 600 }}>{item.effortHours}h</span>, title: 'Hours', width: 55 },
    { key: 'date', render: (item) => formatDateShort(item.activityDate), title: 'Date', width: 80 },
    { key: 'status', render: () => <StatusBadge label="No Assignment" size="small" tone="danger" />, title: 'Status', width: 110 },
  ], []);

  const anomalyCols = useMemo<ActionColumn<ComparisonAnomalyItem>[]>(() => [
    { key: 'type', render: (item) => <StatusBadge label={humanizeEnum(item.type, ANOMALY_TYPE_LABELS)} size="small" tone="warning" />, title: 'Type', width: 160 },
    { key: 'person', render: (item) => item.person.displayName, title: 'Person' },
    { key: 'project', render: (item) => item.project.name, title: 'Project' },
    { key: 'details', render: (item) => <span style={{ fontSize: 11 }}>{item.message}</span>, title: 'Details' },
  ], []);

  const detailQuickActions: Record<DetailTab, QuickAction<unknown>[]> = useMemo(() => ({
    matched: [{ label: 'View', tone: 'secondary' as const, onClick: (item: unknown) => nav(`/assignments/${(item as MatchedRecordItem).assignmentId}`) }],
    noEvidence: [{ label: 'Review Assignment', tone: 'secondary' as const, onClick: (item: unknown) => nav(`/assignments?personId=${(item as AssignedButNoEvidenceItem).person.id}`) }],
    noAssignment: [{
      label: 'Create Assignment', tone: 'primary' as const,
      onClick: (item: unknown) => {
        const e = item as EvidenceButNoApprovedAssignmentItem;
        openAssignModal({ personId: e.person.id, person: e.person.displayName, projectId: e.project.id, project: e.project.name, hours: e.effortHours, activityDate: e.activityDate });
      },
    }],
    anomalies: [{
      label: 'Resolve', tone: 'primary' as const,
      onClick: (item: unknown) => {
        const a = item as ComparisonAnomalyItem;
        openAssignModal({ personId: a.person.id, person: a.person.displayName, projectId: a.project.id, project: a.project.name, hours: null, activityDate: null });
      },
    }],
  }), []);

  /* ── Mismatch table columns ── */
  const projectMismatchCols = useMemo<DataTableColumn<MismatchedProjectRow>[]>(() => [
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.projectCode}</span> {item.projectName}</>, title: 'Project' },
    { key: 'noEvidence', align: 'right', render: (item) => item.noEvidenceCount || '\u2014', title: 'No Actual', width: 75 },
    { key: 'noAssignment', align: 'right', render: (item) => item.noAssignmentCount || '\u2014', title: 'No Assign', width: 75 },
    { key: 'anomalies', align: 'right', render: (item) => item.anomalyCount || '\u2014', title: 'Anomaly', width: 60 },
    { key: 'total', align: 'right', render: (item) => <span style={{ fontWeight: 600 }}>{item.totalIssues}</span>, title: 'Total', width: 50 },
  ], []);
  const peopleMismatchCols = useMemo<DataTableColumn<MismatchedPersonRow>[]>(() => [
    { key: 'person', render: (item) => item.personName, title: 'Person' },
    { key: 'noEvidence', align: 'right', render: (item) => item.noEvidenceCount || '\u2014', title: 'No Actual', width: 75 },
    { key: 'noAssignment', align: 'right', render: (item) => item.noAssignmentCount || '\u2014', title: 'No Assign', width: 75 },
    { key: 'anomalies', align: 'right', render: (item) => item.anomalyCount || '\u2014', title: 'Anomaly', width: 60 },
    { key: 'total', align: 'right', render: (item) => <span style={{ fontWeight: 600 }}>{item.totalIssues}</span>, title: 'Total', width: 50 },
  ], []);

  /* ── Staffing gap columns ── */
  const staffingCols = useMemo<DataTableColumn<UnstaffedProject>[]>(() => [
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.projectCode}</span> {item.projectName}</>, title: 'Project' },
    { key: 'open', align: 'right', render: (item) => item.openRequests, title: 'Open Req', width: 70 },
    { key: 'unfilled', align: 'right', render: (item) => <span style={{ fontWeight: 600, color: 'var(--color-status-danger)' }}>{item.unfilledHeadcount}</span>, title: 'Unfilled HC', width: 80 },
    { key: 'roles', render: (item) => <span style={{ fontSize: 11 }}>{item.roles.join(', ')}</span>, title: 'Roles Needed' },
  ], []);

  /* ── Over-submitted columns ── */
  const overSubCols = useMemo<DataTableColumn<ProjectPvaSummary>[]>(() => [
    { key: 'project', render: (item) => <><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.projectCode}</span> {item.projectName}</>, title: 'Project' },
    { key: 'planned', align: 'right', render: (item) => <span style={NUM}>{item.plannedHours}h</span>, title: 'Planned', width: 70 },
    { key: 'actual', align: 'right', render: (item) => <span style={NUM}>{item.totalActualHours}h</span>, title: 'Actual', width: 70 },
    { key: 'surplus', align: 'right', render: (item) => <span style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-danger)' }}>+{item.variance}h</span>, title: 'Surplus', width: 70 },
    { key: 'pct', align: 'right', render: (item) => <StatusBadge label={`+${item.variancePercent}%`} size="small" tone={item.variancePercent > 25 ? 'danger' : 'warning'} />, title: 'Var %', width: 70 },
  ], []);

  return (
    <PageContainer testId="planned-vs-actual-page">
      {state.isLoading ? <LoadingState label="Loading planned vs actual dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {kpis && state.data ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics" data-testid="kpi-strip">
            <a className="kpi-strip__item" href="#detail-explorer" onClick={(e) => { e.preventDefault(); setDetailTab('matched'); }} style={{ borderLeft: `3px solid ${tc(kpis.alignmentRate, 70, 50, false)}` }}>
              <TipBalloon tip="Percentage of time records that align to an approved assignment." arrow="left" />
              <span className="kpi-strip__value">{kpis.alignmentRate}%</span>
              <span className="kpi-strip__label">Alignment Rate</span>
              <div className="kpi-strip__progress"><div className="kpi-strip__progress-fill" style={{ width: `${Math.min(kpis.alignmentRate, 100)}%`, background: tc(kpis.alignmentRate, 70, 50, false) }} /></div>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>{kpis.matchedCount} of {kpis.totalRecords} aligned</span>
            </a>
            <a className="kpi-strip__item" href="#pipeline-section" onClick={(e) => { e.preventDefault(); document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ borderLeft: `3px solid var(--color-status-active)` }}>
              <TipBalloon tip="Total hours submitted or approved across all timesheets in the period." arrow="left" />
              <span className="kpi-strip__value">{kpis.totalSubmittedHours}h</span>
              <span className="kpi-strip__label">Total Submitted</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>approved + submitted</span>
            </a>
            <a className="kpi-strip__item" href="#pipeline-section" onClick={(e) => { e.preventDefault(); document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ borderLeft: `3px solid ${tc(kpis.pendingPipelineHours, 100, 300)}` }}>
              <TipBalloon tip="Hours in draft or submitted status — not yet approved." arrow="left" />
              <span className="kpi-strip__value">{kpis.pendingPipelineHours}h</span>
              <span className="kpi-strip__label">Pending Pipeline</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>draft + submitted</span>
            </a>
            <a className="kpi-strip__item" href="#staffing-section" onClick={(e) => { e.preventDefault(); document.getElementById('staffing-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ borderLeft: `3px solid ${tc(kpis.staffingGaps, 1, 5)}` }}>
              <TipBalloon tip="Total unfilled headcount from open staffing requests." arrow="left" />
              <span className="kpi-strip__value">{kpis.staffingGaps}</span>
              <span className="kpi-strip__label">Staffing Gaps</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>unfilled headcount</span>
            </a>
            <a className="kpi-strip__item" href="#oversub-section" onClick={(e) => { e.preventDefault(); document.getElementById('oversub-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ borderLeft: `3px solid ${tc(kpis.overSubmittedCount, 1, 3)}` }}>
              <TipBalloon tip="Projects where total submitted hours exceed planned capacity." arrow="left" />
              <span className="kpi-strip__value">{kpis.overSubmittedCount}</span>
              <span className="kpi-strip__label">Over-Submitted</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>projects over plan</span>
            </a>
            <a className="kpi-strip__item" href="#overtime-section" onClick={(e) => { e.preventDefault(); document.getElementById('overtime-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ borderLeft: `3px solid ${tc(otData?.totalOvertimeHours ?? 0, 20, 50)}` }}>
              <TipBalloon tip="Total overtime hours logged across all people in the period." arrow="left" />
              <span className="kpi-strip__value">{otData?.totalOvertimeHours ?? 0}h</span>
              <span className="kpi-strip__label">Overtime</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>{otData?.peopleWithOvertime ?? 0} people · {otData?.overtimeRate ?? 0}% rate</span>
            </a>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${tc(kpis.riskProjectCount, 2, 5)}`, cursor: 'default' }}>
              <TipBalloon tip="Projects with time variance exceeding 10%." arrow="left" />
              <span className="kpi-strip__value">{kpis.riskProjectCount}</span>
              <span className="kpi-strip__label">Risk Projects</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>variance &gt;10%</span>
            </div>
          </div>

          {/* ── HERO CHART ── */}
          <DashSection testId="hero-chart" title="Project Planned vs Actual" subtitle={`${heroData.length} projects — top 12 by variance`}>
            <TipBalloon tip="Green = approved hours. Red = submitted without assignment. Amber = planned with no actual. Blue line = alignment %." arrow="left" />
            {heroData.length > 0 ? (
              <div style={{ height: Math.max(380, Math.min(heroData.length, 12) * 40 + 80) }}>
                <ReconciliationOverviewChart data={heroData.slice(0, 12)} drillPrefix="/projects" />
              </div>
            ) : (
              <EmptyState description="No planned vs actual data." title="No data" />
            )}
          </DashSection>

          {/* ── WHAT NEEDS ATTENTION ── */}
          <ActionDataTable<PvaActionItem>
            title={`What Needs Attention (${actionItems.length})`}
            columns={actionCols}
            items={filteredActionItems}
            getRowKey={(item) => item.id}
            onRowClick={(item) => nav(item.href)}
            quickActions={actionQuickActions}
            batchActions={actionBatchActions}
            quickFilters={actionFilters}
            pageSize={10}
            totalLabel="issues"
            emptyState={<EmptyState description="No issues found." title="All clear" />}
          />

          {/* ── SECONDARY ANALYSIS (2×2 grid) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
            {/* Timesheet Pipeline */}
            <SectionCard title="Timesheet Pipeline" id="pipeline-section">
              {state.data.projectSummaries.length > 0 ? (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-2)' }}>
                    <button type="button" className={`button button--sm ${pipelineView === 'chart' ? 'button--primary' : 'button--secondary'}`} onClick={() => setPipelineView('chart')}>Chart</button>
                    <button type="button" className={`button button--sm ${pipelineView === 'table' ? 'button--primary' : 'button--secondary'}`} onClick={() => setPipelineView('table')}>Table</button>
                  </div>
                  {pipelineView === 'chart' ? (
                    <div style={{ height: Math.max(200, pipelineRows.length * 36 + 60) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineRows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                          <YAxis type="category" dataKey="projectCode" tick={{ fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => `${v}h`} />
                          <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={7} />
                          <Bar dataKey="approved" stackId="a" fill="var(--color-status-active)" name="Approved" />
                          <Bar dataKey="submitted" stackId="a" fill="var(--color-status-warning)" name="Submitted" />
                          <Bar dataKey="draft" stackId="a" fill="var(--color-status-neutral)" name="Draft" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th style={NUM}>Approved</th>
                          <th style={NUM}>Submitted</th>
                          <th style={NUM}>Draft</th>
                          <th style={NUM}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.projectSummaries.map((p) => (
                          <tr key={p.projectId} style={{ cursor: 'pointer' }} onClick={() => nav(`/projects/${p.projectId}`)}>
                            <td><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{p.projectCode}</span> {p.projectName}</td>
                            <td style={{ ...NUM, color: 'var(--color-status-active)' }}>{p.approvedHours}h</td>
                            <td style={{ ...NUM, color: p.submittedHours > 0 ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>{p.submittedHours}h</td>
                            <td style={{ ...NUM, color: p.draftHours > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{p.draftHours}h</td>
                            <td style={{ ...NUM, fontWeight: 600 }}>{p.totalActualHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {kpis.missingPersonCount > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-status-danger)', marginTop: 'var(--space-2)', padding: '0 var(--space-2)' }}>
                      {kpis.missingPersonCount} assigned {kpis.missingPersonCount === 1 ? 'person has' : 'people have'} not started their timesheet
                    </div>
                  )}
                </>
              ) : (
                <EmptyState description="No timesheet data for the period." title="No data" />
              )}
            </SectionCard>

            {/* Staffing Coverage */}
            <SectionCard title="Staffing Coverage" id="staffing-section">
              {staffingGaps.length > 0 ? (
                <DataTable columns={staffingCols} getRowKey={(item) => item.projectId} items={staffingGaps} variant="compact" onRowClick={(item) => nav(`/staffing-requests?projectId=${item.projectId}`)} />
              ) : (
                <EmptyState description="All projects are fully staffed." title="All staffed" />
              )}
            </SectionCard>

            {/* Dept/Pool Submission Rate */}
            <SectionCard title="Submission Rate by Org" id="submission-section">
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
                <button type="button" className={`button button--sm ${orgDim === 'department' ? 'button--primary' : 'button--secondary'}`} onClick={() => setOrgDim('department')}>Department</button>
                <button type="button" className={`button button--sm ${orgDim === 'pool' ? 'button--primary' : 'button--secondary'}`} onClick={() => setOrgDim('pool')}>Resource Pool</button>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                  Submission = (submitted + approved) / planned. Values above 100% indicate time logged to projects without matching assignment.
                </span>
              </div>
              {orgDim === 'department' && orgRows.length > 0 ? (
                <div style={{ height: Math.max(180, orgRows.length * 32 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orgRows} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} tickFormatter={(v: number) => `${v}%`} />
                      <YAxis type="category" dataKey="orgUnitName" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="submissionRate" name="Submission %" radius={[0, 3, 3, 0]}>
                        {orgRows.map((row, i) => (
                          <Cell key={i} fill={row.submissionRate >= 90 ? 'var(--color-status-active)' : row.submissionRate >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'} />
                        ))}
                      </Bar>
                      <ReferenceLine x={90} stroke="var(--color-status-active)" strokeDasharray="4 3" strokeWidth={1} />
                      {orgRows.some((r) => r.submissionRate > 100) && (
                        <ReferenceLine x={100} stroke="var(--color-status-danger)" strokeDasharray="4 3" strokeWidth={1} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : orgDim === 'pool' && poolRows.length > 0 ? (
                <div style={{ height: Math.max(180, poolRows.length * 32 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poolRows} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} tickFormatter={(v: number) => `${v}%`} />
                      <YAxis type="category" dataKey="poolName" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="submissionRate" name="Submission %" radius={[0, 3, 3, 0]}>
                        {poolRows.map((row, i) => (
                          <Cell key={i} fill={row.submissionRate >= 90 ? 'var(--color-status-active)' : row.submissionRate >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'} />
                        ))}
                      </Bar>
                      <ReferenceLine x={90} stroke="var(--color-status-active)" strokeDasharray="4 3" strokeWidth={1} />
                      {poolRows.some((r) => r.submissionRate > 100) && (
                        <ReferenceLine x={100} stroke="var(--color-status-danger)" strokeDasharray="4 3" strokeWidth={1} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState description="No submission data for this dimension." title="No data" />
              )}
            </SectionCard>

            {/* Over-Submitted Projects */}
            <SectionCard title="Over-Submitted Projects" id="oversub-section">
              {overSubmitted.length > 0 ? (
                <DataTable columns={overSubCols} getRowKey={(item) => item.projectId} items={overSubmitted} variant="compact" onRowClick={(item) => nav(`/projects/${item.projectId}`)} />
              ) : (
                <EmptyState description="No projects exceed planned hours." title="All within plan" />
              )}
            </SectionCard>
          </div>

          {/* ── OVERTIME ANALYSIS ── */}
          {otData && otData.totalOvertimeHours > 0 && (
            <SectionCard title="Overtime Analysis" id="overtime-section">
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
                {(['person', 'project', 'department', 'pool'] as const).map((d) => (
                  <button key={d} type="button" className={`button button--sm ${otDim === d ? 'button--primary' : 'button--secondary'}`} onClick={() => setOtDim(d)}>
                    {{ person: 'By Person', project: 'By Project', department: 'By Department', pool: 'By Pool' }[d]}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                  {otData.totalOvertimeHours}h total overtime across {otData.peopleWithOvertime} people ({otData.overtimeRate}% of standard hours)
                  {otData.peopleExceedingCap > 0 && <span style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}> · {otData.peopleExceedingCap} exceeding cap</span>}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Chart */}
                <div style={{ height: Math.max(200, (otDim === 'person' ? otData.personSummaries.filter((p) => p.overtimeHours > 0).length : otDim === 'project' ? otData.projectSummaries.length : otDim === 'department' ? otData.departmentSummaries.length : otData.poolSummaries.length) * 32 + 60) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {otDim === 'person' ? (
                      <BarChart data={otData.personSummaries.filter((p) => p.overtimeHours > 0)} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                        <YAxis type="category" dataKey="displayName" tick={{ fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${v}h`} />
                        <Bar dataKey="overtimeHours" name="Overtime" radius={[0, 3, 3, 0]}>
                          {otData.personSummaries.filter((p) => p.overtimeHours > 0).map((p, i) => (
                            <Cell key={i} fill={p.exceedsThreshold ? 'var(--color-status-danger)' : 'var(--color-status-warning)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : otDim === 'project' ? (
                      <BarChart data={otData.projectSummaries} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                        <YAxis type="category" dataKey="projectCode" tick={{ fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${v}h`} />
                        <Bar dataKey="overtimeHours" name="Overtime" fill="var(--color-status-warning)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    ) : otDim === 'department' ? (
                      <BarChart data={otData.departmentSummaries} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                        <YAxis type="category" dataKey="orgUnitName" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${v}h`} />
                        <Bar dataKey="totalOvertimeHours" name="Overtime" fill="var(--color-status-warning)" radius={[0, 3, 3, 0]}>
                          {otData.departmentSummaries.map((d, i) => (
                            <Cell key={i} fill={d.exceedingPolicyCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-warning)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart data={otData.poolSummaries} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                        <YAxis type="category" dataKey="poolName" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${v}h`} />
                        <Bar dataKey="totalOvertimeHours" name="Overtime" fill="var(--color-status-warning)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                {/* Table */}
                <div style={{ overflow: 'auto', maxHeight: 400 }}>
                  {otDim === 'person' && (
                    <table className="dash-compact-table">
                      <thead><tr><th>Person</th><th style={NUM}>Total</th><th style={NUM}>Std</th><th style={NUM}>OT</th><th style={NUM}>Cap</th><th>Status</th></tr></thead>
                      <tbody>
                        {otData.personSummaries.filter((p) => p.overtimeHours > 0).map((p) => (
                          <tr key={p.personId} style={{ cursor: 'pointer' }} onClick={() => nav(`/people/${p.personId}`)}>
                            <td style={{ fontWeight: 500 }}>{p.displayName}</td>
                            <td style={NUM}>{p.totalHours}h</td>
                            <td style={NUM}>{p.standardHours}h</td>
                            <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{p.overtimeHours}h</td>
                            <td style={NUM}>{p.effectiveThreshold}h/wk</td>
                            <td><StatusBadge label={p.exceedsThreshold ? 'Over Cap' : p.hasException ? 'Exception' : 'Within Cap'} size="small" tone={p.exceedsThreshold ? 'danger' : 'active'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {otDim === 'project' && (
                    <table className="dash-compact-table">
                      <thead><tr><th>Project</th><th style={NUM}>OT Hours</th><th style={NUM}>People</th></tr></thead>
                      <tbody>
                        {otData.projectSummaries.map((p) => (
                          <tr key={p.projectId} style={{ cursor: 'pointer' }} onClick={() => nav(`/projects/${p.projectId}`)}>
                            <td><span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{p.projectCode}</span> {p.projectName}</td>
                            <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{p.overtimeHours}h</td>
                            <td style={NUM}>{p.contributorCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {otDim === 'department' && (
                    <table className="dash-compact-table">
                      <thead><tr><th>Department</th><th style={NUM}>People</th><th style={NUM}>OT Hours</th><th style={NUM}>Policy Cap</th><th style={NUM}>Exceeding</th></tr></thead>
                      <tbody>
                        {otData.departmentSummaries.map((d) => (
                          <tr key={d.orgUnitId}>
                            <td style={{ fontWeight: 500 }}>{d.orgUnitName}</td>
                            <td style={NUM}>{d.personCount}</td>
                            <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{d.totalOvertimeHours}h</td>
                            <td style={NUM}>{d.policyMaxHours != null ? `${d.policyMaxHours}h/wk` : 'Default'}</td>
                            <td style={{ ...NUM, color: d.exceedingPolicyCount > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{d.exceedingPolicyCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {otDim === 'pool' && (
                    <table className="dash-compact-table">
                      <thead><tr><th>Pool</th><th style={NUM}>People</th><th style={NUM}>OT Hours</th><th style={NUM}>Policy Cap</th><th style={NUM}>Exceeding</th></tr></thead>
                      <tbody>
                        {otData.poolSummaries.map((p) => (
                          <tr key={p.poolId}>
                            <td style={{ fontWeight: 500 }}>{p.poolName}</td>
                            <td style={NUM}>{p.personCount}</td>
                            <td style={{ ...NUM, fontWeight: 600, color: 'var(--color-status-warning)' }}>{p.totalOvertimeHours}h</td>
                            <td style={NUM}>{p.policyMaxHours != null ? `${p.policyMaxHours}h/wk` : 'Default'}</td>
                            <td style={{ ...NUM, color: p.exceedingPolicyCount > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>{p.exceedingPolicyCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              {otData.pendingExceptions.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-status-warning)', marginBottom: 'var(--space-1)' }}>
                    {otData.pendingExceptions.length} pending overtime exception {otData.pendingExceptions.length === 1 ? 'request' : 'requests'}
                  </div>
                  {otData.pendingExceptions.map((ex) => (
                    <div key={ex.caseId} style={{ fontSize: 11, display: 'flex', gap: 'var(--space-2)', padding: '2px 0' }}>
                      <span style={{ fontWeight: 500 }}>{ex.personName}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>requesting {ex.requestedMaxHours}h/wk — {ex.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ── TOP MISMATCHED ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
            <DashSection title="Top Mismatched Projects">
              {topProjects.length > 0 ? (
                <DataTable columns={projectMismatchCols} getRowKey={(item) => item.projectId} items={topProjects} variant="compact" onRowClick={(item) => nav(`/projects/${item.projectId}`)} />
              ) : (
                <EmptyState description="No mismatched projects" title="All clear" />
              )}
            </DashSection>
            <DashSection title="Top Mismatched People">
              {topPeople.length > 0 ? (
                <DataTable columns={peopleMismatchCols} getRowKey={(item) => item.personId} items={topPeople} variant="compact" onRowClick={(item) => nav(`/people/${item.personId}`)} />
              ) : (
                <EmptyState description="No mismatched people" title="All clear" />
              )}
            </DashSection>
          </div>

          {/* ── VARIANCE EXPLORER ── */}
          <DashSection title="Variance Explorer" subtitle="Compare planned vs actual hours across people, projects, departments, and resource pools.">
            <TipBalloon tip="Switch dimension. Check items to compare. Grey = planned, purple = actual." arrow="left" />
            <div style={{ height: 420 }}>
              <VarianceExplorerChart dimensions={explorerDimensions} drillPrefixes={{ department: '/org', person: '/people', pool: '/org', project: '/projects' }} />
            </div>
          </DashSection>

          {/* ── RECONCILIATION DETAIL ── */}
          <div id="detail-explorer">
            {detailTab === 'matched' && (
              <ActionDataTable<MatchedRecordItem>
                title="Activity Detail"
                titleExtra={<div style={{ display: 'flex', gap: 'var(--space-1)' }}>{(['noAssignment', 'noEvidence', 'matched', 'anomalies'] as DetailTab[]).map((t) => {
                  const labels: Record<DetailTab, string> = { matched: 'Matched', noEvidence: 'Staffed, No Actual Time', noAssignment: 'Unplanned Work', anomalies: 'Anomalies' };
                  return <button key={t} className={`button ${detailTab === t ? 'button--primary' : 'button--secondary'} button--sm`} onClick={() => setDetailTab(t)} type="button">{labels[t]} ({detailCounts[t]})</button>;
                })}</div>}
                columns={matchedCols}
                items={state.data.matchedRecords}
                getRowKey={(item) => `${item.assignmentId}-${item.workEvidenceId}`}
                onRowClick={(item) => nav(`/assignments/${item.assignmentId}`)}
                quickActions={detailQuickActions.matched as QuickAction<MatchedRecordItem>[]}
                totalLabel="matched records"
                emptyState={<EmptyState description="No matched records." title="Empty" />}
              />
            )}
            {detailTab === 'noEvidence' && (
              <ActionDataTable<AssignedButNoEvidenceItem>
                title="Activity Detail"
                titleExtra={<div style={{ display: 'flex', gap: 'var(--space-1)' }}>{(['noAssignment', 'noEvidence', 'matched', 'anomalies'] as DetailTab[]).map((t) => {
                  const labels: Record<DetailTab, string> = { matched: 'Matched', noEvidence: 'Staffed, No Actual Time', noAssignment: 'Unplanned Work', anomalies: 'Anomalies' };
                  return <button key={t} className={`button ${detailTab === t ? 'button--primary' : 'button--secondary'} button--sm`} onClick={() => setDetailTab(t)} type="button">{labels[t]} ({detailCounts[t]})</button>;
                })}</div>}
                columns={noEvidenceCols}
                items={state.data.assignedButNoEvidence}
                getRowKey={(item) => item.assignmentId}
                onRowClick={(item) => nav(`/assignments?personId=${item.person.id}`)}
                quickActions={detailQuickActions.noEvidence as QuickAction<AssignedButNoEvidenceItem>[]}
                totalLabel="staffed records without approved time"
                emptyState={<EmptyState description="No staffed records are missing approved time." title="Empty" />}
              />
            )}
            {detailTab === 'noAssignment' && (
              <ActionDataTable<EvidenceButNoApprovedAssignmentItem>
                title="Activity Detail"
                titleExtra={<div style={{ display: 'flex', gap: 'var(--space-1)' }}>{(['noAssignment', 'noEvidence', 'matched', 'anomalies'] as DetailTab[]).map((t) => {
                  const labels: Record<DetailTab, string> = { matched: 'Matched', noEvidence: 'Staffed, No Actual Time', noAssignment: 'Unplanned Work', anomalies: 'Anomalies' };
                  return <button key={t} className={`button ${detailTab === t ? 'button--primary' : 'button--secondary'} button--sm`} onClick={() => setDetailTab(t)} type="button">{labels[t]} ({detailCounts[t]})</button>;
                })}</div>}
                columns={noAssignmentCols}
                items={state.data.evidenceButNoApprovedAssignment}
                getRowKey={(item) => item.workEvidenceId}
                onRowClick={(item) => openAssignModal({ personId: item.person.id, person: item.person.displayName, projectId: item.project.id, project: item.project.name, hours: item.effortHours, activityDate: item.activityDate })}
                quickActions={detailQuickActions.noAssignment as QuickAction<EvidenceButNoApprovedAssignmentItem>[]}
                totalLabel="unplanned records"
                emptyState={<EmptyState description="No unplanned work." title="Empty" />}
              />
            )}
            {detailTab === 'anomalies' && (
              <ActionDataTable<ComparisonAnomalyItem>
                title="Activity Detail"
                titleExtra={<div style={{ display: 'flex', gap: 'var(--space-1)' }}>{(['noAssignment', 'noEvidence', 'matched', 'anomalies'] as DetailTab[]).map((t) => {
                  const labels: Record<DetailTab, string> = { matched: 'Matched', noEvidence: 'Staffed, No Actual Time', noAssignment: 'Unplanned Work', anomalies: 'Anomalies' };
                  return <button key={t} className={`button ${detailTab === t ? 'button--primary' : 'button--secondary'} button--sm`} onClick={() => setDetailTab(t)} type="button">{labels[t]} ({detailCounts[t]})</button>;
                })}</div>}
                columns={anomalyCols}
                items={state.data.anomalies}
                getRowKey={(_, i) => `anomaly-${i}`}
                onRowClick={(item) => nav(`/projects/${item.project.id}`)}
                quickActions={detailQuickActions.anomalies as QuickAction<ComparisonAnomalyItem>[]}
                totalLabel="anomalies"
                emptyState={<EmptyState description="No anomalies." title="Empty" />}
              />
            )}
          </div>

          {kpis.alignmentRate === 100 && kpis.anomalyCount === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-status-active)' }}>
              <span style={{ fontSize: 22 }}>{'\u2713'}</span>{' '}
              <span style={{ fontWeight: 600 }}>Fully reconciled</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>All recorded activity matches approved assignments</span>
            </div>
          )}

          {/* ── DATA FRESHNESS ── */}
          <div className="data-freshness">
            Showing {state.data.weeksIncluded} {state.data.weeksIncluded === 1 ? 'week' : 'weeks'} ending {formatDateShort(state.data.weekEnd)}{' '}
            <button type="button" className="button button--secondary button--sm" onClick={refetch} style={{ marginLeft: 'var(--space-2)' }}>{'\u21bb'} Refresh</button>
          </div>
        </>
      ) : null}

      {!state.isLoading && !state.error && state.data && kpis && kpis.totalRecords === 0 && kpis.anomalyCount === 0 ? (
        <EmptyState description="No planned vs actual data found." title="No planned vs actual data" />
      ) : null}

      {/* ── Inline assignment modals ── */}
      <CreateAssignmentModal
        open={assignModalPreFill !== null}
        preFill={assignModalPreFill}
        onSuccess={() => { setAssignModalPreFill(null); toast.success('Assignment created — the time variance view will refresh after approval'); refetch(); }}
        onCancel={() => setAssignModalPreFill(null)}
      />
      <BatchAssignmentConfirmModal
        open={batchItems.length > 0}
        items={batchItems}
        onSuccess={(result) => {
          setBatchItems([]);
          toast.success(`Created ${result.createdCount} of ${result.totalCount} assignments`);
          if (result.failedCount > 0) toast.warning(`${result.failedCount} failed — check for conflicts`);
          refetch();
        }}
        onCancel={() => setBatchItems([])}
      />
    </PageContainer>
  );
}
