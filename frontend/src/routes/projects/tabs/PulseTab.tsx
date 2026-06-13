import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  fetchProjectPulseSummary,
  type PulseSummaryDto,
  type PulseSignalKpi,
} from '@/lib/api/project-pulse';
import { fetchComputedRag, type ComputedRag, type RagRating } from '@/lib/api/project-rag';
import { fetchRisks, type ProjectRiskDto } from '@/lib/api/project-risks';
import { fetchProjectById, type ProjectExternalLink } from '@/lib/api/project-registry';
import { fetchMilestones, type ProjectMilestoneDto } from '@/lib/api/project-milestones';
import {
  fetchProjectBudgetDashboard,
  fetchPendingBudgetChangeRequests,
  type ProjectBudgetDashboard,
  type BudgetChangeRequest,
} from '@/lib/api/project-budget';
import { listProjectPositions, type ProjectPosition } from '@/lib/api/project-positions';
import { Button, Donut, Table, type Column, type DonutTone } from '@/components/ds';
import { useAuth } from '@/app/auth-context';

interface PulseTabProps {
  projectId: string;
}

type Tone = 'active' | 'warning' | 'danger' | 'info';

const RAG_TO_TONE: Record<RagRating, Tone> = {
  GREEN: 'active',
  AMBER: 'warning',
  RED: 'danger',
};

const RAG_LABEL: Record<RagRating, string> = {
  GREEN: 'Healthy',
  AMBER: 'At risk',
  RED: 'Over',
};

const RAG_SCORE: Record<RagRating, number> = {
  GREEN: 88,
  AMBER: 62,
  RED: 38,
};

// Tone thresholds keyed to the signals the BE pulse-summary actually emits
// (collectSignals: velocity / cpi / avgMood / openRisks / openCases / teamSize).
function signalTone(signal: PulseSignalKpi): Tone {
  const v = signal.value ?? 0;
  switch (signal.key) {
    case 'cpi': // Cost Performance Index — ≥1 means on/under budget
      if (v >= 1) return 'active';
      if (v >= 0.9) return 'warning';
      return 'danger';
    case 'avgMood': // 1–5 pulse scale
      if (v >= 4) return 'active';
      if (v >= 3) return 'info';
      if (v >= 2.5) return 'warning';
      return 'danger';
    case 'openRisks':
      if (v === 0) return 'active';
      if (v < 3) return 'info';
      if (v < 6) return 'warning';
      return 'danger';
    case 'openCases':
      if (v === 0) return 'active';
      if (v < 3) return 'info';
      return 'warning';
    case 'velocity': // hours logged over 28d — informational magnitude
    case 'teamSize': // active headcount — informational
    default:
      return 'info';
  }
}

function formatValue(s: PulseSignalKpi): { value: string; unit: string | null } {
  if (s.value == null) return { value: '—', unit: null };
  if (s.unit === '%') return { value: s.value.toFixed(1), unit: '%' };
  if (s.unit === 'h' || s.unit === 'hours') return { value: s.value.toFixed(0), unit: 'h' };
  if (s.unit === 'd' || s.unit === 'days') return { value: s.value.toFixed(0), unit: 'd' };
  return { value: s.value.toLocaleString(), unit: null };
}

// StatusBadge tone for risk-bucket labels — 'critical' maps to 'danger'
// since StatusTone doesn't include critical.
function riskBucket(riskScore: number): { tone: 'danger' | 'warning' | 'info'; label: string } {
  if (riskScore >= 15) return { tone: 'danger', label: 'Critical' };
  if (riskScore >= 9) return { tone: 'danger', label: 'High' };
  if (riskScore >= 4) return { tone: 'warning', label: 'Medium' };
  return { tone: 'info', label: 'Low' };
}

const POSITION_TONE: Record<ProjectPosition['fillStatus'], Tone> = {
  DRAFT: 'info',
  OPEN: 'warning',
  PROPOSED: 'info',
  BOOKED: 'info',
  ONBOARDING: 'active',
  ASSIGNED: 'active',
  ON_HOLD: 'warning',
  RELEASED: 'info',
};

const POSITION_LABEL: Record<ProjectPosition['fillStatus'], string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  PROPOSED: 'Proposed',
  BOOKED: 'Booked',
  ONBOARDING: 'Onboarding',
  ASSIGNED: 'Assigned',
  ON_HOLD: 'On hold',
  RELEASED: 'Released',
};

function positionColumns(projectId: string): Column<ProjectPosition>[] {
  return [
    {
      key: 'role',
      title: 'Role',
      getValue: (r) => r.role,
      render: (r) => <div style={{ fontWeight: 500 }}>{r.role}</div>,
    },
    {
      key: 'alloc',
      title: 'Alloc',
      align: 'right',
      getValue: (r) => r.requiredAllocationPercent,
      render: (r) => (
        <span className="mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.requiredAllocationPercent}%
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      getValue: (r) => POSITION_LABEL[r.fillStatus],
      render: (r) => (
        <StatusBadge
          tone={POSITION_TONE[r.fillStatus]}
          label={POSITION_LABEL[r.fillStatus]}
          variant="chip"
        />
      ),
    },
    {
      key: 'activeFill',
      title: 'Active fill',
      getValue: (r) => (r.activePersonId ? 'Booked' : 'Vacant'),
      render: (r) =>
        r.activePersonId ? (
          <span className="body-sm">Booked</span>
        ) : (
          <span className="muted compact-sm">— Vacant —</span>
        ),
    },
    {
      key: 'open',
      title: '',
      align: 'right',
      getValue: () => null,
      render: (r) => (
        <Link
          to={`/projects/${projectId}?position=${r.id}`}
          className="compact"
          style={{ color: 'var(--color-accent)' }}
        >
          Open →
        </Link>
      ),
    },
  ];
}

// SoT PR 5 — 8-section Pulse tab per DS/page-pulse.jsx exactly:
//   1. PageHeader (rendered by DetailLayout above)
//   2. Banner banner-danger ("Decision needed by ...")
//   3. KPI strip (signals)
//   4. 1.4fr/1fr grid: RAG quad-grid + Decisions awaiting you
//   5. 1.4fr/1fr grid: Open positions table + Top risks
//   6. 1fr/1fr grid: Next milestone Donut + Activity timeline
//   7. ExternalLinkTiles (4 tiles auto-fit minmax(220px))
//   8. FreshnessFooter
// ZERO raw heading tags — all section titles use SectionCard.title.
export function PulseTab({ projectId }: PulseTabProps): JSX.Element {
  const [pulse, setPulse] = useState<PulseSummaryDto | null>(null);
  const [rag, setRag] = useState<ComputedRag | null>(null);
  const [risks, setRisks] = useState<ProjectRiskDto[]>([]);
  const [links, setLinks] = useState<ProjectExternalLink[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [budget, setBudget] = useState<ProjectBudgetDashboard | null>(null);
  const [pendingBudgetChanges, setPendingBudgetChanges] = useState<BudgetChangeRequest[]>([]);
  const [positions, setPositions] = useState<ProjectPosition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { principal } = useAuth();
  const [reloadTick, setReloadTick] = useState(0);
  const [activityScope, setActivityScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [
          pulseData,
          ragData,
          risksData,
          linksData,
          milestonesData,
          budgetData,
          pendingChanges,
          positionsData,
        ] = await Promise.all([
          fetchProjectPulseSummary(projectId),
          fetchComputedRag(projectId).catch(() => null),
          fetchRisks(projectId, { status: 'IDENTIFIED' }).catch(() => [] as ProjectRiskDto[]),
          fetchProjectById(projectId)
            .then((p) => p.externalLinks)
            .catch(() => [] as ProjectExternalLink[]),
          fetchMilestones(projectId).catch(() => [] as ProjectMilestoneDto[]),
          fetchProjectBudgetDashboard(projectId).catch(() => null),
          fetchPendingBudgetChangeRequests(projectId).catch(() => [] as BudgetChangeRequest[]),
          listProjectPositions({ projectId, take: 50 })
            .then((r) => r.positions)
            .catch(() => [] as ProjectPosition[]),
        ]);
        if (active) {
          setPulse(pulseData);
          setRag(ragData);
          setRisks(risksData);
          setLinks(linksData);
          setMilestones(milestonesData);
          setBudget(budgetData);
          setPendingBudgetChanges(pendingChanges);
          setPositions(positionsData);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load pulse');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId, reloadTick]);

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  }
  if (!pulse) return <ErrorState description="No pulse data available." />;

  const topRisks = [...risks].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);

  const myName = principal?.displayName ?? null;
  const shownActivity =
    activityScope === 'mine' && myName
      ? pulse.activity.filter((e) => e.actorDisplayName === myName)
      : pulse.activity;

  const msTotal = milestones.length;
  const msHit = milestones.filter((m) => m.status === 'HIT').length;
  const msInProgress = milestones.filter((m) => m.status === 'IN_PROGRESS').length;
  const msMissed = milestones.filter((m) => m.status === 'MISSED').length;
  const msPct = msTotal > 0 ? Math.round((msHit / msTotal) * 100) : 0;
  const msTone: DonutTone =
    msMissed > 0 ? 'warning' : msPct >= 90 ? 'active' : msPct >= 60 ? 'info' : msPct >= 30 ? 'warning' : 'danger';

  // Next milestone — earliest IN_PROGRESS or upcoming planned milestone.
  const nextMilestone =
    milestones.find((m) => m.status === 'IN_PROGRESS') ??
    milestones.find((m) => m.status === 'PLANNED') ??
    null;

  // Budget variance — surfaces the "Decision needed" banner when variance
  // exceeds the 5% red threshold.
  const budgetTotal = budget?.budget?.total ?? 0;
  const projected = budget?.forecast?.projectedTotalCost ?? 0;
  const budgetVariance = budgetTotal > 0 ? projected - budgetTotal : 0;
  const variancePct = budgetTotal > 0 ? (budgetVariance / budgetTotal) * 100 : 0;
  const showBudgetDecisionBanner = budgetVariance > 0 && Math.abs(variancePct) > 5;

  // Decisions awaiting — pending budget-change requests + critical risks
  // without owners. Two simplest signals available end-to-end today.
  const decisions: Array<{
    id: string;
    tone: Tone;
    title: string;
    owner: string;
    href: string;
  }> = [];
  for (const r of pendingBudgetChanges) {
    decisions.push({
      id: `bc-${r.id}`,
      tone: 'warning',
      title: 'Approve budget change request',
      owner: 'Director',
      href: `/projects/${projectId}?tab=money`,
    });
  }
  for (const r of risks.filter((x) => x.riskScore >= 15 && !x.ownerPersonId).slice(0, 3)) {
    decisions.push({
      id: `risk-${r.id}`,
      tone: 'danger',
      title: `Assign owner — ${r.title}`,
      owner: 'PM',
      href: `/projects/${projectId}?tab=risks`,
    });
  }

  // Open & in-flight positions — DS canvas shows up to ~6 rows.
  const visiblePositions = positions
    .filter((p) =>
      ['DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED'].includes(p.fillStatus),
    )
    .slice(0, 6);

  // Linked workspaces — DS canvas section 7. Always 4 fixed tiles per spec:
  //   Jira PPM / Confluence / Teams / Smartsheet. Each tile is a link when
  //   a matching ProjectExternalLink exists; otherwise renders as a
  //   disabled tile prompting the user to link the workspace.
  const linkByProvider = (provider: string): ProjectExternalLink | null =>
    links.find((l) => l.provider.toUpperCase() === provider) ?? null;
  const linkedWorkspaces: Array<{
    provider: string;
    title: string;
    fallback: string;
    icon: string;
    link: ProjectExternalLink | null;
  }> = [
    { provider: 'JIRA', title: 'Jira PPM', fallback: 'No Jira project linked', icon: '\u{1F4CB}', link: linkByProvider('JIRA') },
    { provider: 'CONFLUENCE', title: 'Confluence', fallback: 'No Confluence space linked', icon: '\u{1F4D6}', link: linkByProvider('CONFLUENCE') },
    { provider: 'TEAMS', title: 'Teams', fallback: 'No Teams channel linked', icon: '\u{1F4AC}', link: linkByProvider('TEAMS') },
    { provider: 'SMARTSHEET', title: 'Smartsheet', fallback: 'No Smartsheet linked', icon: '\u{1F4CA}', link: linkByProvider('SMARTSHEET') },
  ];

  return (
    <div data-testid="pulse-tab" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ---- 2. Banner banner-danger — Decision needed by ... ---- */}
      {showBudgetDecisionBanner ? (
        <div
          className="banner banner-danger"
          data-testid="pulse-decision-banner"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 16,
            borderRadius: 'var(--radius-card, 8px)',
            border: '1px solid var(--color-status-danger)',
            background: 'var(--color-status-danger-bg, var(--color-surface-alt))',
          }}
        >
          <div style={{ color: 'var(--color-status-danger)', fontSize: 18 }}>!</div>
          <div style={{ flex: 1 }}>
            <div className="banner-title" style={{ fontWeight: 600 }}>
              Decision needed — budget projection over baseline
            </div>
            <div className="banner-body" style={{ marginTop: 2, color: 'var(--color-text-muted)' }}>
              Forecast EAC exceeds baseline by {budgetVariance >= 1000 ? `$${(budgetVariance / 1000).toFixed(0)}k` : `$${budgetVariance.toFixed(0)}`}
              {' '}({variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%). Open a change request or re-baseline.
            </div>
          </div>
          <Button as={Link} variant="primary" size="sm" to={`/projects/${projectId}?tab=money`}>
            Open decision →
          </Button>
        </div>
      ) : null}

      {/* ---- 3. KPI strip ---- */}
      <div className="kpi-strip" data-testid="pulse-kpi-strip">
        {pulse.signals.map((s) => {
          const tone = signalTone(s);
          const { value, unit } = formatValue(s);
          return (
            <Link
              key={s.key}
              to={`/projects/${projectId}?tab=radiator`}
              className={`kpi tone-${tone}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={s.explanation}
            >
              <span className="kpi-label">{s.label}</span>
              <span className="kpi-value">
                {value}
                {unit ? <span className="unit">{unit}</span> : null}
              </span>
              <span className="kpi-foot">{s.explanation}</span>
            </Link>
          );
        })}
      </div>

      {/* ---- 4. 1.4fr/1fr — RAG quad-grid + Decisions awaiting you ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {rag ? (
          <SectionCard title="RAG quadrant — this week">
            <div data-testid="pulse-rag-quadrant" className="quad-grid">
              {[
                { title: 'Delivery', rag: rag.scheduleRag, explanation: rag.scheduleExplanation, hasData: rag.scheduleHasData },
                { title: 'Budget', rag: rag.budgetRag, explanation: rag.budgetExplanation, hasData: rag.budgetHasData },
                { title: 'People', rag: rag.staffingRag, explanation: rag.staffingExplanation, hasData: rag.staffingHasData },
                {
                  title: 'Overall',
                  rag: rag.overallRag,
                  explanation: 'Composite of schedule, budget, people',
                  hasData: rag.overallHasData,
                },
              ].map((q) => {
                // F-HEALTH-EMPTY — no input for this dimension → N/A, not a
                // fabricated GREEN/88. Only an explicit `false` triggers it.
                const noData = q.hasData === false;
                const tone = noData ? 'neutral' : RAG_TO_TONE[q.rag];
                const score = RAG_SCORE[q.rag];
                return (
                  <div key={q.title} className={`quad tone-${tone}`}>
                    <div className="quad-head">
                      <span className="quad-title">{q.title}</span>
                      <StatusBadge tone={tone} label={noData ? 'No data' : RAG_LABEL[q.rag]} variant="chip" />
                    </div>
                    <div className="quad-score">
                      {noData ? 'N/A' : score}
                      {noData ? null : <span className="out"> / 100</span>}
                    </div>
                    <div className="quad-bar">
                      <i style={{ width: `${noData ? 0 : score}%` }} />
                    </div>
                    <div className="quad-meta">{q.explanation}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="RAG quadrant — this week">
            <p className="compact muted" style={{ margin: 0, padding: 8 }}>
              RAG snapshot not available yet.
            </p>
          </SectionCard>
        )}

        <SectionCard title="Decisions awaiting you">
          <div data-testid="pulse-decisions" style={{ padding: '4px 0' }}>
            {decisions.length === 0 ? (
              <p className="compact muted" style={{ padding: '12px 4px', margin: 0 }}>
                No decisions awaiting you on this project.
              </p>
            ) : (
              decisions.map((d, i) => (
                <div
                  key={d.id}
                  style={{
                    padding: '12px 0',
                    borderBottom:
                      i < decisions.length - 1 ? '1px solid var(--color-border)' : 0,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <StatusBadge tone={d.tone} label="" variant="dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="body-sm" style={{ fontWeight: 500 }}>
                      {d.title}
                    </div>
                    <div className="compact-sm muted" style={{ marginTop: 2 }}>
                      Owner · {d.owner}
                    </div>
                  </div>
                  <Button as={Link} variant="secondary" size="sm" to={d.href}>
                    Open →
                  </Button>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ---- 5. 1.4fr/1fr — Open positions + Top risks ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <SectionCard title="Open & in-flight positions">
          <div data-testid="pulse-positions">
            {visiblePositions.length === 0 ? (
              <p className="compact muted" style={{ padding: '12px 4px', margin: 0 }}>
                No open positions on this project.
              </p>
            ) : (
              <Table<ProjectPosition>
                variant="embedded"
                columns={positionColumns(projectId)}
                rows={visiblePositions}
                getRowKey={(row) => row.id}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Top risks">
          <div data-testid="pulse-risks" style={{ padding: 0 }}>
            {topRisks.length === 0 ? (
              <p className="compact muted" style={{ padding: '12px 4px', margin: 0 }}>
                No open risks.
              </p>
            ) : (
              topRisks.map((r, i) => {
                const bucket = riskBucket(r.riskScore);
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px 0',
                      borderBottom:
                        i < topRisks.length - 1
                          ? '1px solid var(--color-border)'
                          : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge tone={bucket.tone} label={bucket.label} variant="chip" />
                      <span className="compact-sm muted">
                        Owner · {r.ownerDisplayName ?? 'unassigned'}
                      </span>
                      <span className="compact-sm muted" style={{ marginLeft: 'auto' }}>
                        Score {r.riskScore}
                      </span>
                    </div>
                    <div className="body-sm" style={{ marginTop: 6 }}>
                      {r.title}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>

      {/* ---- 6. 1fr/1fr — Next milestone + Activity timeline ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SectionCard title="Next milestone">
          <div
            data-testid="pulse-milestones"
            style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}
          >
            {msTotal === 0 ? (
              <p className="compact muted" style={{ margin: 0 }}>
                No milestones defined for this project yet.
              </p>
            ) : (
              <>
                <Donut
                  value={msHit}
                  max={msTotal}
                  size={96}
                  thickness={10}
                  tone={msTone}
                  label={`${msPct}%`}
                  ariaLabel={`${msHit} of ${msTotal} milestones hit`}
                />
                <div style={{ display: 'grid', gap: 6 }}>
                  <div className="body-sm">
                    <strong>{msHit}</strong> / {msTotal} milestones hit
                  </div>
                  <div className="compact-sm muted">
                    {msInProgress} in progress · {msMissed} missed
                  </div>
                  {nextMilestone ? (
                    <div className="compact-sm" style={{ marginTop: 4 }}>
                      Next: <strong>{nextMilestone.name}</strong>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Activity">
          <div
            data-testid="pulse-activity-wrap"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="Activity scope">
              <Button
                variant={activityScope === 'all' ? 'primary' : 'secondary'}
                size="sm"
                type="button"
                onClick={() => setActivityScope('all')}
              >
                All
              </Button>
              <Button
                variant={activityScope === 'mine' ? 'primary' : 'secondary'}
                size="sm"
                type="button"
                disabled={!principal?.displayName}
                onClick={() => setActivityScope('mine')}
              >
                Mine
              </Button>
            </div>
            {shownActivity.length === 0 ? (
              <p className="compact muted" style={{ margin: 0 }}>
                {activityScope === 'mine'
                  ? 'No recent activity attributed to you on this project.'
                  : 'No recent activity recorded for this project.'}
              </p>
            ) : (
              <div data-testid="pulse-activity" style={{ position: 'relative', padding: '4px 0' }}>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: 16,
                    bottom: 16,
                    width: 1,
                    background: 'var(--color-border)',
                  }}
                />
                {shownActivity.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'grid',
                      gridTemplateColumns: '14px 1fr auto',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '8px 0',
                    }}
                  >
                    <StatusBadge tone="info" label="" variant="dot" />
                    <div className="body-sm" style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 500 }}>{evt.actorDisplayName ?? 'System'}</span>{' '}
                      <span className="muted">
                        {evt.eventName.toLowerCase().replace(/_/g, ' ')}
                      </span>{' '}
                      — {evt.summary}
                    </div>
                    <span className="compact-sm muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(evt.occurredAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ---- 7. External link tiles — 4 tiles auto-fit minmax(220px) ---- */}
      <div
        data-testid="pulse-external-links"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {linkedWorkspaces.map((w) => {
          const href = w.link?.externalUrl ?? null;
          const Tile = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 'var(--radius-card, 8px)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                textDecoration: 'none',
                color: 'var(--color-text)',
                opacity: href ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--color-surface-alt)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)',
                  fontSize: 18,
                }}
              >
                {w.icon}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="body-sm" style={{ fontWeight: 500 }}>
                  {w.title}
                </div>
                <div
                  className="compact-sm muted"
                  style={{
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {w.link
                    ? `${w.link.externalProjectName} · ${w.link.externalProjectKey}`
                    : w.fallback}
                </div>
              </div>
            </div>
          );
          return href ? (
            <a
              key={w.provider}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              {Tile}
            </a>
          ) : (
            <div key={w.provider}>{Tile}</div>
          );
        })}
      </div>

      {/* ---- 8. Data freshness footer ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 0',
          color: 'var(--color-text-subtle)',
          fontSize: 11,
        }}
      >
        <StatusBadge tone="active" label="" variant="dot" />
        <span>
          Data as of{' '}
          <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(pulse.asOf).toLocaleString()}
          </span>
        </span>
        <span>·</span>
        <span>Source: production DB</span>
        <span style={{ marginLeft: 'auto' }}>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            data-testid="pulse-refresh"
          >
            ↻ Refresh
          </Button>
        </span>
      </div>
    </div>
  );
}
