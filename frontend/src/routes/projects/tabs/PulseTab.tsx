import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  fetchProjectPulseSummary,
  type PulseSummaryDto,
  type PulseSignalKpi,
} from '@/lib/api/project-pulse';
import { fetchComputedRag, type ComputedRag, type RagRating } from '@/lib/api/project-rag';
import { fetchRisks, type ProjectRiskDto } from '@/lib/api/project-risks';
import { fetchProjectById, type ProjectExternalLink } from '@/lib/api/project-registry';
import { fetchMilestones, type ProjectMilestoneDto } from '@/lib/api/project-milestones';
import { ExternalLinksPanel } from '@/components/projects/ExternalLinksPanel';
import { Button, Donut, type DonutTone } from '@/components/ds';
import { useAuth } from '@/app/auth-context';

interface PulseTabProps {
  projectId: string;
}

type Tone = 'active' | 'warning' | 'danger' | 'critical' | 'info';

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

function riskBucket(riskScore: number): { tone: Tone; label: string } {
  if (riskScore >= 15) return { tone: 'critical', label: 'Critical' };
  if (riskScore >= 9) return { tone: 'danger', label: 'High' };
  if (riskScore >= 4) return { tone: 'warning', label: 'Medium' };
  return { tone: 'info', label: 'Low' };
}

/**
 * Phase D1 — DS-canvas full-fidelity Project Pulse.
 *
 * Composition per DS/page-pulse.jsx:
 *   1. KPI strip (signals from /pulse-summary, tone-aware tiles)
 *   2. 4-quadrant RAG grid (from /rag-computed: Delivery / Budget /
 *      People / Overall)
 *   3. Activity timeline + risks two-column row
 *   4. Data-freshness footer
 *
 * Uses the .ds-refresh CSS class set landed in the D0 token + class
 * pack). All cards / tiles / badges / dots use DS canvas classes.
 */
export function PulseTab({ projectId }: PulseTabProps): JSX.Element {
  const [pulse, setPulse] = useState<PulseSummaryDto | null>(null);
  const [rag, setRag] = useState<ComputedRag | null>(null);
  const [risks, setRisks] = useState<ProjectRiskDto[]>([]);
  const [links, setLinks] = useState<ProjectExternalLink[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { principal } = useAuth();
  // B9 — footer Refresh re-triggers the load effect.
  const [reloadTick, setReloadTick] = useState(0);
  // B8 — All / Mine activity scope toggle.
  const [activityScope, setActivityScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [pulseData, ragData, risksData, linksData, milestonesData] = await Promise.all([
          fetchProjectPulseSummary(projectId),
          fetchComputedRag(projectId).catch(() => null),
          fetchRisks(projectId, { status: 'IDENTIFIED' }).catch(() => [] as ProjectRiskDto[]),
          fetchProjectById(projectId)
            .then((p) => p.externalLinks)
            .catch(() => [] as ProjectExternalLink[]),
          fetchMilestones(projectId).catch(() => [] as ProjectMilestoneDto[]),
        ]);
        if (active) {
          setPulse(pulseData);
          setRag(ragData);
          setRisks(risksData);
          setLinks(linksData);
          setMilestones(milestonesData);
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

  // B8 — filter the activity log to the current user when "Mine" is selected.
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

  return (
    <div data-testid="pulse-tab" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ---- KPI strip ---- */}
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

      {/* ---- Milestone progress ---- */}
      <div className="card" data-testid="pulse-milestones">
        <div className="card-header">
          <h3>Milestone progress</h3>
          <Link
            to={`/projects/${projectId}?tab=milestones`}
            className="compact"
            style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
          >
            View plan →
          </Link>
        </div>
        <div
          className="card-body"
          style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 'var(--space-4)' }}
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- 4-quadrant RAG ---- */}
      {rag ? (
        <div className="card" data-testid="pulse-rag-quadrant">
          <div className="card-header">
            <h3>RAG quadrant — this week</h3>
            <span className="compact-sm muted">Auto-computed</span>
          </div>
          <div className="quad-grid">
            {[
              { title: 'Delivery', rag: rag.scheduleRag, explanation: rag.scheduleExplanation },
              { title: 'Budget', rag: rag.budgetRag, explanation: rag.budgetExplanation },
              { title: 'People', rag: rag.staffingRag, explanation: rag.staffingExplanation },
              {
                title: 'Overall',
                rag: rag.overallRag,
                explanation: 'Composite of schedule, budget, people',
              },
            ].map((q) => {
              const tone = RAG_TO_TONE[q.rag];
              const score = RAG_SCORE[q.rag];
              return (
                <div key={q.title} className={`quad tone-${tone}`}>
                  <div className="quad-head">
                    <span className="quad-title">{q.title}</span>
                    <span className={`badge badge-${tone}`}>
                      <span className="dot" />
                      {RAG_LABEL[q.rag]}
                    </span>
                  </div>
                  <div className="quad-score">
                    {score}
                    <span className="out"> / 100</span>
                  </div>
                  <div className="quad-bar">
                    <i style={{ width: `${score}%` }} />
                  </div>
                  <div className="quad-meta">{q.explanation}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ---- Two-column: Activity + Risks ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent activity</h3>
            {/* B8 — All / Mine scope toggle (Mine = events I am the actor of) */}
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
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {shownActivity.length === 0 ? (
              <p className="compact muted" style={{ padding: '16px 20px', margin: 0 }}>
                {activityScope === 'mine'
                  ? 'No recent activity attributed to you on this project.'
                  : 'No recent activity recorded for this project.'}
              </p>
            ) : (
              <div data-testid="pulse-activity" style={{ position: 'relative', padding: '4px 0' }}>
                {/* B8 — continuous timeline rail behind the event dots */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 26,
                    top: 16,
                    bottom: 16,
                    width: 1,
                    background: 'var(--color-border-subtle)',
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
                      padding: '8px 20px',
                    }}
                  >
                    <span
                      className="tone-dot tone-info"
                      style={{ marginTop: 6, boxShadow: '0 0 0 3px var(--color-surface)' }}
                    />
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
        </div>

        <div className="card" data-testid="pulse-risks">
          <div className="card-header">
            <h3>Top risks</h3>
            <Link
              to={`/projects/${projectId}?tab=risks`}
              className="compact"
              style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              View all {risks.length} →
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {topRisks.length === 0 ? (
              <p className="compact muted" style={{ padding: '16px 20px', margin: 0 }}>
                No open risks.
              </p>
            ) : (
              topRisks.map((r, i) => {
                const bucket = riskBucket(r.riskScore);
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px 20px',
                      borderBottom:
                        i < topRisks.length - 1
                          ? '1px solid var(--color-border-subtle)'
                          : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${bucket.tone}`}>
                        <span className="dot" />
                        {bucket.label}
                      </span>
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
        </div>
      </div>

      {/* ---- External system links ---- */}
      <div className="card" data-testid="pulse-external-links">
        <div className="card-header">
          <h3>External systems</h3>
          <span className="compact-sm muted">Jira · Confluence · repos</span>
        </div>
        <div className="card-body" style={{ padding: 'var(--space-3)' }}>
          <ExternalLinksPanel links={links} />
        </div>
      </div>

      {/* ---- Data freshness ---- */}
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
        <span className="tone-dot tone-active" />
        <span>
          Data as of{' '}
          <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(pulse.asOf).toLocaleString()}
          </span>
        </span>
        <span>·</span>
        <span>Source: production DB</span>
        {/* B9 — re-fetch the pulse without a full page reload */}
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
