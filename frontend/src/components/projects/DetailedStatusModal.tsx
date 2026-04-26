import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import {
  type PulseReportDto,
  upsertPulseReport,
} from '@/lib/api/pulse-report';

import { AXIS_LABELS } from './ProjectRadiator';

interface DetailedStatusModalProps {
  open: boolean;
  projectId: string;
  shape?: ProjectShape | null;
  report: PulseReportDto | null;
  onClose: () => void;
  onSaved: (next: PulseReportDto) => void;
}

/** Map sub-dim keys to their quadrant for grouping. Mirrors the backend order. */
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

export function DetailedStatusModal({
  open,
  projectId,
  shape,
  report,
  onClose,
  onSaved,
}: DetailedStatusModalProps): JSX.Element | null {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeAxes = useMemo(() => activeAxesFor(shape ?? null), [shape]);

  useEffect(() => {
    if (open && report) {
      const seed: Record<string, string> = {};
      const detailed = report.dimensions.detailed ?? {};
      for (const key of activeAxes) {
        const entry = detailed[key];
        if (entry?.narrative) seed[key] = entry.narrative;
      }
      setValues(seed);
    }
  }, [open, report, activeAxes]);

  if (!open) return null;

  const groupedByQuadrant = activeAxes.reduce<Record<string, string[]>>((acc, key) => {
    const q = SUB_TO_QUADRANT[key] ?? 'scope';
    (acc[q] ??= []).push(key);
    return acc;
  }, {});

  async function handleSave(submit: boolean): Promise<void> {
    setSaving(true);
    try {
      const detailed: Record<string, { narrative: string | null }> = {};
      for (const key of activeAxes) {
        const trimmed = (values[key] ?? '').trim();
        detailed[key] = { narrative: trimmed.length > 0 ? trimmed : null };
      }
      const next = await upsertPulseReport(projectId, {
        dimensions: { detailed },
        submit,
      });
      toast.success(submit ? 'Detailed status submitted' : 'Detailed draft saved');
      onSaved(next);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="confirm-dialog-overlay"
      data-testid="detailed-status-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
    >
      <div className="confirm-dialog" style={{ maxHeight: '88vh', maxWidth: 720, overflowY: 'auto' }}>
        <h3 className="confirm-dialog__title">Detailed status — per dimension</h3>
        <p className="confirm-dialog__message" style={{ marginBottom: 'var(--space-3)' }}>
          Fill in only the dimensions you need to explain. Blank fields stay blank — no ceremony.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {(Object.keys(QUADRANT_LABELS) as Array<'scope' | 'schedule' | 'budget' | 'people'>).map((q) => {
            const subs = groupedByQuadrant[q] ?? [];
            if (subs.length === 0) return null;
            return (
              <fieldset
                key={q}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-control)',
                  margin: 0,
                  padding: 'var(--space-3)',
                }}
              >
                <legend style={{ fontSize: 12, fontWeight: 600, padding: '0 6px' }}>
                  {QUADRANT_LABELS[q]}
                </legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {subs.map((key) => (
                    <label className="field" key={key}>
                      <span className="field__label">{AXIS_LABELS[key] ?? key}</span>
                      <textarea
                        className="field__control"
                        disabled={saving}
                        maxLength={600}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder="Optional narrative — leave blank if nothing to report."
                        rows={2}
                        style={{ fontSize: 12, resize: 'vertical' }}
                        value={values[key] ?? ''}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="confirm-dialog__actions" style={{ marginTop: 'var(--space-3)' }}>
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
            Submit detailed
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
