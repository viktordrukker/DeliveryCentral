import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/common/StatusBadge';
import { exceptionActionFor } from '@/features/project-pulse/exception-actions';
import {
  DEFAULT_RAG_CUTOFFS,
  bandForScore,
  formatScore,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import {
  type ExceptionRow,
  type ExceptionSeverity,
  fetchProjectExceptions,
  markRiskReviewed,
} from '@/lib/api/project-exceptions';
import type { RadiatorSnapshotDto, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';
import { Button } from '@/components/ds';

interface PulseExceptionConsoleProps {
  projectId: string;
  snapshot: RadiatorSnapshotDto;
  hasLiveSpcRates?: boolean;
  cutoffs?: RagCutoffs;
}

/** Sub-dimensions whose signal comes from seeded EVM/CPM columns rather than live data flows. */
const DEMO_WHEN_SEEDED: ReadonlySet<string> = new Set([
  'costPerformanceIndex',
  'spendRate',
  'forecastAccuracy',
  'capexCompliance',
  'deliverableAcceptance',
  'criticalPathHealth',
  'timelineDeviation',
]);

type RowSource = 'live' | 'demo';

type RowAction =
  | { kind: 'link'; href: string; label?: string }
  | { kind: 'mark-reviewed'; postPath: string; label?: string };

interface MergedRow {
  id: string;
  severity: ExceptionSeverity;
  label: string;
  sublabel: string;
  diagnostic: string;
  action: RowAction | null;
  source: RowSource;
}

function severityFromBand(score: number | null, cutoffs: RagCutoffs): ExceptionSeverity | null {
  const band = bandForScore(score, cutoffs);
  if (band === 'CRITICAL') return 'critical';
  if (band === 'RED') return 'red';
  if (band === 'AMBER') return 'amber';
  return null;
}

function toneFor(sev: ExceptionSeverity): 'danger' | 'warning' {
  return sev === 'amber' ? 'warning' : 'danger';
}

function severityLabel(sev: ExceptionSeverity): string {
  if (sev === 'critical') return 'Critical';
  if (sev === 'red') return 'Red';
  return 'Amber';
}

function severityRank(sev: ExceptionSeverity): number {
  return sev === 'critical' ? 0 : sev === 'red' ? 1 : 2;
}

function axisRowFromSub(
  projectId: string,
  sub: SubDimensionScore,
  sev: ExceptionSeverity,
  source: RowSource,
): MergedRow {
  const action = exceptionActionFor(sub.key);
  const label = AXIS_LABELS[sub.key] ?? sub.key;
  return {
    id: `axis:${sub.key}`,
    severity: sev,
    label,
    sublabel: `${severityLabel(sev)} · ${formatScore(sub.effectiveScore)}/4`,
    diagnostic: action?.diagnostic ?? sub.explanation,
    action: action
      ? { kind: 'link', href: action.href(projectId), label: action.label }
      : null,
    source,
  };
}

function mergeServerRow(r: ExceptionRow): MergedRow {
  return {
    id: r.id,
    severity: r.severity,
    label: r.subjectLabel,
    sublabel: triggerLabel(r.trigger),
    diagnostic: r.diagnostic,
    action: r.action
      ? r.action.kind === 'mark-reviewed' && r.action.postPath
        ? { kind: 'mark-reviewed', postPath: r.action.postPath, label: r.action.label }
        : r.action.href
          ? { kind: 'link', href: r.action.href, label: r.action.label }
          : null
      : null,
    source: 'live',
  };
}

function triggerLabel(t: ExceptionRow['trigger']): string {
  switch (t) {
    case 'risk-overdue-review':
      return 'Risk · overdue';
    case 'risk-past-due':
      return 'Risk · past due';
    case 'milestone-slipped':
      return 'Milestone · slipped';
    case 'cr-stale':
      return 'CR · stale';
    case 'timesheet-gap':
      return 'Timesheet · gap';
    case 'vacant-role':
      return 'Role · vacant';
    default:
      return t;
  }
}

function proactiveHint(
  snapshot: RadiatorSnapshotDto,
  cutoffs: RagCutoffs,
): Array<{ key: string; label: string; score: number; distance: number }> {
  // Find axes whose effective score is in GREEN but closest to the AMBER cutoff.
  const candidates = snapshot.quadrants
    .flatMap((q) => q.subs)
    .filter((s): s is SubDimensionScore & { effectiveScore: number } =>
      s.effectiveScore !== null && s.effectiveScore >= cutoffs.amber,
    )
    .map((s) => ({
      key: s.key,
      label: AXIS_LABELS[s.key] ?? s.key,
      score: s.effectiveScore,
      distance: s.effectiveScore - cutoffs.amber,
    }))
    .sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, 3);
}

export function PulseExceptionConsole({
  projectId,
  snapshot,
  hasLiveSpcRates = true,
  cutoffs = DEFAULT_RAG_CUTOFFS,
}: PulseExceptionConsoleProps): JSX.Element {
  const [serverRows, setServerRows] = useState<ExceptionRow[]>([]);
  const [reloading, setReloading] = useState(false);
  const [showDemo, setShowDemo] = useState(!hasLiveSpcRates);

  useEffect(() => {
    let active = true;
    fetchProjectExceptions(projectId)
      .then((dto) => {
        if (active) setServerRows(dto.rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId, reloading]);

  const allRows: MergedRow[] = useMemo(() => {
    const axisRows: MergedRow[] = [];
    for (const q of snapshot.quadrants) {
      for (const s of q.subs) {
        const sev = severityFromBand(s.effectiveScore, cutoffs);
        if (!sev) continue;
        const source: RowSource =
          !hasLiveSpcRates && DEMO_WHEN_SEEDED.has(s.key) ? 'demo' : 'live';
        axisRows.push(axisRowFromSub(projectId, s, sev, source));
      }
    }
    return [...axisRows, ...serverRows.map(mergeServerRow)].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity),
    );
  }, [snapshot, serverRows, hasLiveSpcRates, cutoffs, projectId]);

  const liveRows = useMemo(() => allRows.filter((r) => r.source === 'live'), [allRows]);
  const demoCount = allRows.length - liveRows.length;
  const visible = showDemo ? allRows : liveRows;

  async function handleMarkReviewed(row: MergedRow): Promise<void> {
    if (!row.action || row.action.kind !== 'mark-reviewed') return;
    const match = /\/risks\/([^/]+)\/mark-reviewed/.exec(row.action.postPath);
    if (!match) return;
    try {
      await markRiskReviewed(projectId, match[1]);
      toast.success('Risk marked reviewed');
      setReloading((n) => !n);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark reviewed');
    }
  }

  const hint = proactiveHint(snapshot, cutoffs);

  return (
    <div data-testid="pulse-exception-console">
      <div
        style={{
          alignItems: 'center',
          color: 'var(--color-text-muted)',
          display: 'flex',
          fontSize: 11,
          gap: 'var(--space-2)',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span>
          {liveRows.length} live
          {demoCount > 0 ? ` · ${demoCount} demo ${showDemo ? 'shown' : 'hidden'}` : ''}
        </span>
        {demoCount > 0 ? (
          <Button
            variant={showDemo ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={showDemo}
            onClick={() => setShowDemo((v) => !v)}
          >
            {showDemo ? 'Hide demo 🌱' : 'Show demo 🌱'}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-3)',
          }}
        >
          <p style={{ color: 'var(--color-text)', fontSize: 12, margin: 0, fontWeight: 600 }}>
            Nothing to action this week — project is on track.
          </p>
          {hint.length > 0 ? (
            <>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 11,
                  margin: '6px 0 4px 0',
                }}
              >
                Closest to amber — worth watching:
              </p>
              <ul
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 11,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {hint.map((h) => (
                  <li key={h.key}>
                    · <strong>{h.label}</strong> at {formatScore(h.score)} (Δ {h.distance.toFixed(1)} above amber)
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : (
        <ul
          aria-label="Exception rows"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {visible.map((row) => (
            <li
              key={row.id}
              style={{
                alignItems: 'center',
                borderLeft: `3px solid ${
                  row.severity === 'amber'
                    ? 'var(--color-status-warning)'
                    : row.severity === 'critical'
                      ? 'var(--color-status-critical)'
                      : 'var(--color-status-danger)'
                }`,
                display: 'grid',
                fontSize: 12,
                gap: 8,
                gridTemplateColumns: '180px 120px 1fr auto auto',
                opacity: row.source === 'demo' ? 0.7 : 1,
                padding: '6px 8px',
              }}
            >
              <span style={{ fontWeight: 600 }}>{row.label}</span>
              <StatusBadge label={row.sublabel} tone={toneFor(row.severity)} variant="chip" />
              <span style={{ color: 'var(--color-text-muted)' }}>{row.diagnostic}</span>
              {row.source === 'demo' ? (
                <span
                  aria-label="Demo data"
                  style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}
                  title="Awaiting live data source"
                >
                  🌱
                </span>
              ) : (
                <span />
              )}
              {row.action?.kind === 'link' ? (
                <Button as={Link} variant="secondary" size="sm" to={row.action.href}>
                  {row.action.label ?? 'Open'}
                </Button>
              ) : row.action?.kind === 'mark-reviewed' ? (
                <Button variant="secondary" size="sm" onClick={() => void handleMarkReviewed(row)}>
                  {row.action.label ?? 'Mark reviewed'}
                </Button>
              ) : (
                <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>—</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
