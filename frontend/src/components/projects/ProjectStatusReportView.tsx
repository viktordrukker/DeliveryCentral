import type { ComputedRag, RagSnapshotDto, StaffingAlert, DimensionDetailsJson, SubCriterionValue } from '@/lib/api/project-rag';
import type { StaffingSummary } from '@/lib/api/project-role-plan';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';
import type { ProjectDetails } from '@/lib/api/project-registry';
import type { ProjectRiskDto } from '@/lib/api/project-risks';
import type { ProjectVendorEngagementDto } from '@/lib/api/vendors';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/format-date';

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
          <table className="dash-compact-table" style={{ fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 500 }}>Planned Headcount</td>
                <td style={NUM}>{staffingSummary.totalPlanned}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Internal Filled</td>
                <td style={NUM}>{staffingSummary.totalInternalFilled}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Vendor Filled</td>
                <td style={NUM}>{staffingSummary.totalVendorFilled}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Fill Rate</td>
                <td style={NUM}>{staffingSummary.fillRate}%</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Gap</td>
                <td style={NUM}>{staffingSummary.totalGap}</td>
              </tr>
            </tbody>
          </table>
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
          <table className="dash-compact-table" style={{ fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 500 }}>CAPEX (Capitalization)</td>
                <td style={NUM}>{formatCurrency(budgetDashboard.budget.capex)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>OPEX (Operational)</td>
                <td style={NUM}>{formatCurrency(budgetDashboard.budget.opex)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Total</td>
                <td style={NUM}>{formatCurrency(budgetDashboard.budget.total)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Forecast Remaining</td>
                <td style={NUM}>{formatCurrency(budgetDashboard.forecast.remainingBudget)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>On Track</td>
                <td>{budgetDashboard.forecast.onTrack ? 'Yes' : 'No'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Risk Posture */}
      {risks && risks.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Risk Posture
          </div>
          <table className="dash-compact-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Risk</th>
                <th style={{ width: 80 }}>Category</th>
                <th style={{ width: 60, textAlign: 'right' }}>Score</th>
                <th style={{ width: 80 }}>Status</th>
                <th style={{ width: 90 }}>Strategy</th>
              </tr>
            </thead>
            <tbody>
              {risks.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.category}</td>
                  <td style={{ ...NUM, fontWeight: 700 }}>{r.riskScore}</td>
                  <td><StatusBadge status={r.status} variant="chip" /></td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.strategy ?? '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Vendor Summary */}
      {vendorEngagements && vendorEngagements.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Vendor Summary
          </div>
          <table className="dash-compact-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Role</th>
                <th style={{ width: 50, textAlign: 'right' }}>HC</th>
                <th style={{ width: 80 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendorEngagements.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 500 }}>{v.vendorName}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{v.roleSummary}</td>
                  <td style={NUM}>{v.headcount}</td>
                  <td><StatusBadge status={v.status} variant="chip" /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
            return (
              <div key={dim} style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                  {DIMENSION_LABELS[dim] ?? dim}
                </div>
                <table className="dash-compact-table" style={{ fontSize: 12 }}>
                  <tbody>
                    {entries.map(([key, val]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: 500, width: 180 }}>{SUB_CRITERION_LABELS[key] ?? key}</td>
                        <td style={NUM}>{val.rating}/5</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{val.auto ? 'Auto' : 'Manual'}</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{val.note ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <table className="dash-compact-table" style={{ fontSize: 12 }}>
          <tbody>
            <tr><td style={{ fontWeight: 500, width: 140 }}>Status</td><td>{project.status}</td></tr>
            <tr><td style={{ fontWeight: 500 }}>Start Date</td><td style={NUM}>{project.startDate ? formatDate(project.startDate) : '\u2014'}</td></tr>
            <tr><td style={{ fontWeight: 500 }}>Planned End Date</td><td style={NUM}>{project.plannedEndDate ? formatDate(project.plannedEndDate) : '\u2014'}</td></tr>
            {project.engagementModel ? <tr><td style={{ fontWeight: 500 }}>Engagement Model</td><td>{project.engagementModel}</td></tr> : null}
            {project.priority ? <tr><td style={{ fontWeight: 500 }}>Priority</td><td>{project.priority}</td></tr> : null}
            {project.clientName ? <tr><td style={{ fontWeight: 500 }}>Client</td><td>{project.clientName}</td></tr> : null}
          </tbody>
        </table>
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-2)' }}>
        <button className="button button--primary" onClick={() => window.print()} type="button">
          Print Report
        </button>
      </div>
    </div>
  );
}
