import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  DEFAULT_RAG_CUTOFFS,
  bandColor,
  bandForScore,
  bandLabel,
  formatScore,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import {
  fetchPulseReport,
  type PulseReportDto,
  upsertPulseReport,
} from '@/lib/api/pulse-report';
import {
  applyRadiatorOverride,
  type RadiatorSnapshotDto,
  type SubDimensionScore,
} from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';

interface DimensionDetailModalProps {
  open: boolean;
  projectId: string;
  snapshot: RadiatorSnapshotDto | null;
  /** Pre-loaded report; if omitted the modal fetches on open. */
  report?: PulseReportDto | null;
  shape?: ProjectShape | null;
  /** When opened from an axis click, scroll to this sub-dimension. */
  initialFocusKey?: string | null;
  cutoffs?: RagCutoffs;
  onClose: () => void;
  onSaved: (result: { snapshot: RadiatorSnapshotDto | null; report: PulseReportDto }) => void;
}

/** Sub-dim → quadrant grouping (matches the backend SUB_DIMENSION_QUADRANT). */
const SUB_TO_QUADRANT: Record<string, 'scope' | 'schedule' | 'budget' | 'people'> = {
  requirementsStability: 'scope',
  scopeCreep: 'scope',
  deliverableAcceptance: 'scope',
  changeRequestBurden: 'scope',
  milestoneAdherence: 'schedule',
  timelineDeviation: 'schedule',
  criticalPathHealth: 'schedule',
  velocityTrend: 'schedule',
  costPerformanceIndex: 'budget',
  spendRate: 'budget',
  forecastAccuracy: 'budget',
  capexCompliance: 'budget',
  staffingFillRate: 'people',
  teamMood: 'people',
  overAllocationRate: 'people',
  keyPersonRisk: 'people',
};

const QUADRANT_LABELS: Record<'scope' | 'schedule' | 'budget' | 'people', string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  people: 'People',
};

const MIN_OVERRIDE_REASON = 10;
const MAX_REASON = 1000;
const MAX_NARRATIVE = 600;

interface PendingChange {
  narrative: string;
  overrideScore: string; // string to preserve empty input state
  overrideReason: string;
}

function subByKey(snapshot: RadiatorSnapshotDto | null, key: string): SubDimensionScore | null {
  if (!snapshot) return null;
  for (const q of snapshot.quadrants) {
    for (const s of q.subs) if (s.key === key) return s;
  }
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function parseScore(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n * 10) / 10, 0, 4);
}

export function DimensionDetailModal({
  open,
  projectId,
  snapshot,
  report: reportProp,
  shape,
  initialFocusKey,
  cutoffs = DEFAULT_RAG_CUTOFFS,
  onClose,
  onSaved,
}: DimensionDetailModalProps): JSX.Element | null {
  const activeKeys = useMemo(() => activeAxesFor(shape ?? null), [shape]);
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<PulseReportDto | null>(reportProp ?? null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  // Sync external report prop.
  useEffect(() => {
    if (reportProp !== undefined) setReport(reportProp);
  }, [reportProp]);

  // Fetch report lazily when modal opens and we don't yet have one.
  useEffect(() => {
    if (!open) return;
    if (report !== null) return;
    let active = true;
    fetchPulseReport(projectId)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, projectId, report]);

  // Re-seed pending state whenever the modal opens or the source data changes.
  useEffect(() => {
    if (!open) return;
    const seed: Record<string, PendingChange> = {};
    for (const key of activeKeys) {
      const currentNarrative = report?.dimensions.detailed?.[key]?.narrative ?? '';
      seed[key] = {
        narrative: currentNarrative,
        overrideScore: '',
        overrideReason: '',
      };
    }
    setPending(seed);
  }, [open, activeKeys, report]);

  // Scroll to focus key after open.
  useEffect(() => {
    if (!open || !initialFocusKey) return;
    const el = rowRefs.current[initialFocusKey];
    if (el) {
      // Defer to next frame so the modal DOM has mounted.
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [open, initialFocusKey, pending]);

  if (!open) return null;

  const groupedByQuadrant = activeKeys.reduce<Record<string, string[]>>((acc, key) => {
    const q = SUB_TO_QUADRANT[key] ?? 'scope';
    (acc[q] ??= []).push(key);
    return acc;
  }, {});

  function patch(key: string, next: Partial<PendingChange>): void {
    setPending((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));
  }

  async function handleSave(submit: boolean): Promise<void> {
    if (saving) return;

    // Validate overrides: if score provided, reason must be ≥ MIN.
    const errors: string[] = [];
    const overridesToApply: Array<{ key: string; score: number; reason: string }> = [];
    for (const key of activeKeys) {
      const p = pending[key];
      if (!p) continue;
      const parsed = parseScore(p.overrideScore);
      const reason = p.overrideReason.trim();
      if (parsed !== null && reason.length < MIN_OVERRIDE_REASON) {
        errors.push(`${AXIS_LABELS[key] ?? key}: reason must be ≥ ${MIN_OVERRIDE_REASON} chars`);
        continue;
      }
      if (parsed !== null) {
        overridesToApply.push({ key, score: parsed, reason });
      }
    }
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      // Build the detailed-narratives map for the pulse-report upsert.
      const detailed: Record<string, { narrative: string | null }> = {};
      for (const key of activeKeys) {
        const trimmed = (pending[key]?.narrative ?? '').trim();
        detailed[key] = { narrative: trimmed.length > 0 ? trimmed : null };
      }

      // Fire overrides in sequence to keep server-side audit ordering deterministic.
      let latestSnap: RadiatorSnapshotDto | null = snapshot;
      for (const o of overridesToApply) {
        latestSnap = await applyRadiatorOverride(projectId, {
          subDimensionKey: o.key,
          overrideScore: o.score,
          reason: o.reason,
        });
      }

      const nextReport = await upsertPulseReport(projectId, {
        dimensions: { detailed },
        submit,
      });

      toast.success(submit ? 'Detailed status submitted' : 'Detailed draft saved');
      onSaved({ snapshot: latestSnap, report: nextReport });
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const quadrantOrder: Array<'scope' | 'schedule' | 'budget' | 'people'> = [
    'scope',
    'schedule',
    'budget',
    'people',
  ];

  const changedOverrideCount = Object.values(pending).filter((p) => parseScore(p.overrideScore) !== null).length;
  const changedNarrativeCount = Object.entries(pending).filter(([k, p]) => {
    const existing = report?.dimensions.detailed?.[k]?.narrative ?? '';
    return p.narrative.trim() !== existing.trim();
  }).length;

  return (
    <div
      aria-modal="true"
      className="confirm-dialog-overlay"
      data-testid="dimension-detail-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
    >
      <div className="confirm-dialog" style={{ maxHeight: '90vh', maxWidth: 860, overflowY: 'auto', width: '96%' }}>
        <h3 className="confirm-dialog__title">Detailed status per dimension</h3>
        <p className="confirm-dialog__message" style={{ marginBottom: 'var(--space-3)' }}>
          Add a narrative and/or override the auto-calculated score. Fill only what you need —
          blank fields stay blank. Overrides require a reason so future PMs can trace intent.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {quadrantOrder.map((q) => {
            const subs = groupedByQuadrant[q] ?? [];
            if (subs.length === 0) return null;
            return (
              <div key={q} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {QUADRANT_LABELS[q]}
                </div>
                {subs.map((key) => {
                  const sub = subByKey(snapshot, key);
                  const effective = sub?.effectiveScore ?? null;
                  const auto = sub?.autoScore ?? null;
                  const band = bandForScore(effective, cutoffs);
                  const tone = bandColor(band);
                  const isOverridden = sub?.overrideScore !== null && sub?.overrideScore !== undefined;
                  const p = pending[key] ?? { narrative: '', overrideScore: '', overrideReason: '' };
                  const pendingScore = parseScore(p.overrideScore);
                  const pendingBand = pendingScore !== null ? bandForScore(pendingScore, cutoffs) : null;
                  const reasonChars = p.overrideReason.trim().length;
                  const reasonRequired = pendingScore !== null;
                  const reasonValid = !reasonRequired || reasonChars >= MIN_OVERRIDE_REASON;
                  const isFocused = initialFocusKey === key;

                  return (
                    <fieldset
                      key={key}
                      ref={(el) => {
                        rowRefs.current[key] = el;
                      }}
                      style={{
                        border: `1px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderLeft: `3px solid ${tone}`,
                        borderRadius: 'var(--radius-control)',
                        margin: 0,
                        padding: 'var(--space-3)',
                        ...(isFocused ? { boxShadow: 'var(--shadow-card)' } : {}),
                      }}
                    >
                      <legend style={{ fontSize: 12, fontWeight: 700, padding: '0 6px' }}>
                        {AXIS_LABELS[key] ?? key}
                      </legend>

                      <div
                        style={{
                          alignItems: 'center',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          fontSize: 11,
                          gap: 'var(--space-2)',
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        <span>Auto: <strong style={{ color: 'var(--color-text)' }}>{formatScore(auto)}</strong></span>
                        <span>Effective: <strong style={{ color: 'var(--color-text)' }}>{formatScore(effective)}</strong></span>
                        {band ? (
                          <span
                            style={{
                              background: tone,
                              borderRadius: 'var(--radius-control)',
                              color: 'var(--color-surface)',
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              padding: '1px 6px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {bandLabel(band)}
                          </span>
                        ) : null}
                        {isOverridden ? (
                          <span style={{ color: 'var(--color-status-warning)' }} title={sub?.reason ?? ''}>
                            ⚙ Overridden
                          </span>
                        ) : null}
                        {sub?.explanation ? (
                          <span style={{ flex: 1, minWidth: 200 }}>· {sub.explanation}</span>
                        ) : null}
                      </div>

                      <div style={{ display: 'grid', gap: 'var(--space-2)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        <label className="field">
                          <span className="field__label">
                            Narrative{' '}
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                              — optional, goes to detailed report
                            </span>
                          </span>
                          <textarea
                            className="field__control"
                            disabled={saving}
                            maxLength={MAX_NARRATIVE}
                            onChange={(e) => patch(key, { narrative: e.target.value })}
                            placeholder="What changed, what's in flight, what needs help. Blank = nothing to add."
                            rows={3}
                            style={{ fontSize: 12, resize: 'vertical' }}
                            value={p.narrative}
                          />
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                          <label className="field">
                            <span className="field__label">
                              Override score <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— optional (0.0 – 4.0)</span>
                            </span>
                            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                              <input
                                className="field__control"
                                disabled={saving}
                                max={4}
                                min={0}
                                onChange={(e) => patch(key, { overrideScore: e.target.value })}
                                placeholder="Blank = no override"
                                step={0.1}
                                style={{ width: 100 }}
                                type="number"
                                value={p.overrideScore}
                              />
                              {pendingBand ? (
                                <span
                                  style={{
                                    background: bandColor(pendingBand),
                                    borderRadius: 'var(--radius-control)',
                                    color: 'var(--color-surface)',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    padding: '1px 6px',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {bandLabel(pendingBand)}
                                </span>
                              ) : null}
                            </div>
                          </label>

                          {reasonRequired ? (
                            <label className="field">
                              <span className="field__label">
                                Reason{' '}
                                <span
                                  style={{
                                    color: reasonValid ? 'var(--color-text-muted)' : 'var(--color-status-danger)',
                                    fontWeight: 400,
                                  }}
                                >
                                  — required ({reasonChars}/{MIN_OVERRIDE_REASON} min)
                                </span>
                              </span>
                              <textarea
                                className="field__control"
                                disabled={saving}
                                maxLength={MAX_REASON}
                                onChange={(e) => patch(key, { overrideReason: e.target.value })}
                                placeholder="Why override the auto score? Auditable."
                                rows={2}
                                style={{ fontSize: 12, resize: 'vertical' }}
                                value={p.overrideReason}
                              />
                            </label>
                          ) : null}
                        </div>
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 11,
            marginTop: 'var(--space-3)',
          }}
        >
          {changedOverrideCount > 0 ? `${changedOverrideCount} override${changedOverrideCount === 1 ? '' : 's'} pending · ` : ''}
          {changedNarrativeCount > 0 ? `${changedNarrativeCount} narrative${changedNarrativeCount === 1 ? '' : ' changes'} pending` : 'No pending changes'}
        </div>

        <div className="confirm-dialog__actions" style={{ marginTop: 'var(--space-2)' }}>
          <button
            className="button--project-detail"
            disabled={saving}
            onClick={() => void handleSave(false)}
            type="button"
          >
            {saving ? 'Saving...' : 'Save draft'}
          </button>
          <button
            className="button--project-detail button--primary"
            disabled={saving}
            onClick={() => void handleSave(true)}
            type="button"
          >
            Save + Submit
          </button>
          <button
            className="button button--secondary"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
