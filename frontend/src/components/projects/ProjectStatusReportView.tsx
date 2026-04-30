import type { ComputedRag, RagSnapshotDto, StaffingAlert, DimensionDetailsJson, SubCriterionValue } from '@/lib/api/project-rag';
import type { StaffingSummary } from '@/lib/api/project-role-plan';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';
import type { ProjectDetails } from '@/lib/api/project-registry';
import type { ProjectRiskDto } from '@/lib/api/project-risks';
import type { ProjectVendorEngagementDto } from '@/lib/api/vendors';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/format-date';
import { Button, DescriptionList, type DescriptionListItem, Table, type Column } from '@/components/ds';

interface ProjectStatusReportViewProps {
  project: ProjectDetails;
  computed: ComputedRag | null;
  latestSnapshot: RagSnapshotDto | null;
  staffingSummary: StaffingSummary | null;
  alerts: StaffingAlert[];
  budgetDashboard: ProjectBudgetDashboard | null;
  risks?: ProjectRiskDto[];
  vendorEngagements?: ProjectVendorEngagementDto[];
  dimensionDetails?: DimensionDetailsJson | null;
}

const RAG_COLORS: Record<string, string> = {
  GREEN: 'var(--color-status-active)',
  AMBER: 'var(--color-status-warning)',
  RED: 'var(--color-status-danger)',
};

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('en-US')}`;
}

const DIMENSION_LABELS: Record<string, string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  business: 'Business',
};

const SUB_CRITERION_LABELS: Record<string, string> = {
  staffingFill: 'Staffing Fill',
  requirementsStability: 'Requirements Stability',
  scopeCreep: 'Scope Creep',
  deliverableAcceptance: 'Deliverable Acceptance',
  changeRequestVolume: 'Change Requests',
  milestoneAdherence: 'Milestone Adherence',
  velocity: 'Velocity',
  timelineDeviation: 'Timeline Deviation',
  criticalPathHealth: 'Critical Path Health',
  spendRate: 'Spend Rate',
  forecastAccuracy: 'Forecast Accuracy',
  capexCompliance: 'CAPEX Compliance',
  costVariance: 'Cost Variance',
  clientSatisfaction: 'Client Satisfaction',
  stakeholderEngagement: 'Stakeholder Engagement',
  businessValueDelivery: 'Value Delivery',
  strategicAlignment: 'Strategic Alignment',
  teamMood: 'Team Mood',
};

interface RiskRow {
  id: string;
  title: string;
  category: string;
  riskScore: number;
  status: string;
  strategy: string | null;
}

interface VendorRow {
  id: string;
  vendorName: string;
  roleSummary: string;
  headcount: number;
  status: string;
}

interface DimensionRow {
  key: string;
  label: string;
  rating: number;
  source: string;
  note: string;
}

export function ProjectStatusReportView({
  project,
  computed,
  latestSnapshot,
  staffingSummary,
  alerts,
  budgetDashboard,
  risks,
  vendorEngagements,
  dimensionDetails,
}: ProjectStatusReportViewProps): JSX.Element {
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const staffingItems: DescriptionListItem[] = staffingSummary ? [
    { label: 'Planned Headcount', value: <span style={NUM}>{staffingSummary.totalPlanned}</span> },
    { label: 'Internal Filled', value: <span style={NUM}>{staffingSummary.totalInternalFilled}</span> },
    { label: 'Vendor Filled', value: <span style={NUM}>{staffingSummary.totalVendorFilled}</span> },
    { label: 'Fill Rate', value: <span style={NUM}>{staffingSummary.fillRate}%</span> },
    { label: 'Gap', value: <span style={NUM}>{staffingSummary.totalGap}</span> },
  ] : [];

  const budgetItems: DescriptionListItem[] = budgetDashboard?.budget ? [
    { label: 'CAPEX (Capitalization)', value: <span style={NUM}>{formatCurrency(budgetDashboard.budget.capex)}</span> },
    { label: 'OPEX (Operational)', value: <span style={NUM}>{formatCurrency(budgetDashboard.budget.opex)}</span> },
    { label: 'Total', value: <span style={NUM}>{formatCurrency(budgetDashboard.budget.total)}</span> },
    { label: 'Forecast Remaining', value: <span style={NUM}>{formatCurrency(budgetDashboard.forecast.remainingBudget)}</span> },
    { label: 'On Track', value: budgetDashboard.forecast.onTrack ? 'Yes' : 'No' },
  ] : [];

  const projectDetailItems: DescriptionListItem[] = (() => {
    const items: DescriptionListItem[] = [
      { label: 'Status', value: project.status },
      { label: 'Start Date', value: <span style={NUM}>{project.startDate ? formatDate(project.startDate) : '—'}</span> },
      { label: 'Planned End Date', value: <span style={NUM}>{project.plannedEndDate ? formatDate(project.plannedEndDate) : '—'}</span> },
    ];
    if (project.engagementModel) items.push({ label: 'Engagement Model', value: project.engagementModel });
    if (project.priority) items.push({ label: 'Priority', value: project.priority });
    if (project.clientName) items.push({ label: 'Client', value: project.clientName });
    return items;
  })();

  const riskColumns: Column<RiskRow>[] = [
    { key: 'title', title: 'Risk', getValue: (r) => r.title, render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
    { key: 'category', title: 'Category', width: 80, getValue: (r) => r.category, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.category}</span> },
    { key: 'score', title: 'Score', align: 'right', width: 60, getValue: (r) => r.riskScore, render: (r) => <span style={{ ...NUM, fontWeight: 700 }}>{r.riskScore}</span> },
    { key: 'status', title: 'Status', width: 80, getValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} variant="chip" /> },
    { key: 'strategy', title: 'Strategy', width: 90, getValue: (r) => r.strategy ?? '—', render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.strategy ?? '—'}</span> },
  ];

  const vendorColumns: Column<VendorRow>[] = [
    { key: 'vendor', title: 'Vendor', getValue: (v) => v.vendorName, render: (v) => <span style={{ fontWeight: 500 }}>{v.vendorName}</span> },
    { key: 'role', title: 'Role', getValue: (v) => v.roleSummary, render: (v) => <span style={{ color: 'var(--color-text-muted)' }}>{v.roleSummary}</span> },
    { key: 'hc', title: 'HC', align: 'right', width: 50, getValue: (v) => v.headcount, render: (v) => <span style={NUM}>{v.headcount}</span> },
    { key: 'status', title: 'Status', width: 80, getValue: (v) => v.status, render: (v) => <StatusBadge status={v.status} variant="chip" /> },
  ];

  const dimensionColumns: Column<DimensionRow>[] = [
    { key: 'label', title: 'Criterion', width: 180, getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
    { key: 'rating', title: 'Rating', align: 'right', width: 70, getValue: (r) => r.rating, render: (r) => <span style={NUM}>{r.rating}/5</span> },
    { key: 'source', title: 'Source', width: 80, getValue: (r) => r.source, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.source}</span> },
    { key: 'note', title: 'Note', getValue: (r) => r.note, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.note}</span> },
  ];

  const topRisks = (risks ?? []).slice(0, 5);

  return (
    <div className="project-status-report" data-testid="project-status-report" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Report Header */}
      <div style={{ borderBottom: '2px solid var(--color-border-strong)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
          Project Status Report
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
          {project.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          {project.projectCode} &middot; {reportDate}
          {project.projectManagerDisplayName ? ` · PM: ${project.projectManagerDisplayName}` : ''}
        </div>
      </div>

      {/* RAG Status */}
      {computed ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            RAG Status
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {(['staffingRag', 'scheduleRag', 'budgetRag', 'overallRag'] as const).map((dim) => {
              const rating = computed[dim] as string;
              const label = dim.replace('Rag', '').replace(/^./, (c) => c.toUpperCase());
              return (
                <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: RAG_COLORS[rating] ?? 'var(--color-border)',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: dim === 'overallRag' ? 700 : 400, color: 'var(--color-text)' }}>
                    {label}: {rating}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Weekly Narrative */}
      {latestSnapshot ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Weekly Update — {latestSnapshot.weekStarting.slice(0, 10)}
          </div>
          {latestSnapshot.narrative ? (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>Status: </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{latestSnapshot.narrative}</span>
            </div>
          ) : null}
          {latestSnapshot.accomplishments ? (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>Accomplishments: </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{latestSnapshot.accomplishments}</span>
            </div>
          ) : null}
          {latestSnapshot.nextSteps ? (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>Next Steps: </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{latestSnapshot.nextSteps}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Staffing Summary */}
      {staffingSummary ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staffing
          </div>
          <DescriptionList items={staffingItems} />
        </div>
      ) : null}

      {/* Alerts */}
      {alerts.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Alerts ({alerts.length})
          </div>
          {alerts.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <StatusBadge
                status={alert.severity === 'CRITICAL' ? 'critical' : alert.severity === 'HIGH' ? 'high' : 'medium'}
                label={alert.severity}
                variant="chip"
              />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{alert.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Budget Summary */}
      {budgetDashboard?.budget ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Budget — FY{budgetDashboard.budget.fiscalYear}
          </div>
          <DescriptionList items={budgetItems} />
        </div>
      ) : null}

      {/* Risk Posture */}
      {topRisks.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Risk Posture
          </div>
          <Table
            variant="compact"
            columns={riskColumns}
            rows={topRisks.map((r) => ({ id: r.id, title: r.title, category: r.category, riskScore: r.riskScore, status: r.status, strategy: r.strategy ?? null }))}
            getRowKey={(r) => r.id}
          />
        </div>
      ) : null}

      {/* Vendor Summary */}
      {vendorEngagements && vendorEngagements.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Vendor Summary
          </div>
          <Table
            variant="compact"
            columns={vendorColumns}
            rows={vendorEngagements.map((v) => ({ id: v.id, vendorName: v.vendorName, roleSummary: v.roleSummary, headcount: v.headcount, status: v.status }))}
            getRowKey={(v) => v.id}
          />
        </div>
      ) : null}

      {/* Dimension Details */}
      {dimensionDetails ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Dimension Details
          </div>
          {(Object.keys(dimensionDetails) as Array<keyof DimensionDetailsJson>).map((dim) => {
            const dimData = dimensionDetails[dim];
            if (!dimData) return null;
            const entries = Object.entries(dimData as Record<string, SubCriterionValue>).filter(
              ([, v]) => v && typeof v === 'object' && 'rating' in v,
            );
            if (entries.length === 0) return null;
            const dimensionRows: DimensionRow[] = entries.map(([key, val]) => ({
              key,
              label: SUB_CRITERION_LABELS[key] ?? key,
              rating: val.rating,
              source: val.auto ? 'Auto' : 'Manual',
              note: val.note ?? '',
            }));
            return (
              <div key={dim} style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                  {DIMENSION_LABELS[dim] ?? dim}
                </div>
                <Table
                  variant="compact"
                  columns={dimensionColumns}
                  rows={dimensionRows}
                  getRowKey={(r) => r.key}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Project Details */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Project Details
        </div>
        <DescriptionList items={projectDetailItems} />
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" onClick={() => window.print()} type="button">
          Print Report
        </Button>
      </div>
    </div>
  );
}
